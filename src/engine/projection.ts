import type { Account, PersonId, Plan, Scope } from '../model/types'
import { autoAccountFromId, TAXABLE_GROWTH } from './accounts'
import { toUSD } from './money'
import { amortizeMonths } from './mortgage'
import { computePlan, type ComputeOptions, type PlanResult } from './plan'
import { marginalRateAt } from './tax/brackets'
import { ltcgRate } from './tax/federal'

export interface ProjectionOptions {
  years?: number
  extra?: ComputeOptions['extra']
  /** Added to the expected return of every non-cash account (percentage points). */
  returnShiftPct?: number
  savingsRateOverridePct?: ComputeOptions['savingsRateOverridePct']
}

export type ScopeValues = Record<Scope, number>

/** Snapshot as of January 1 of `year`. */
export interface ProjectionYear {
  year: number
  t: number
  accounts: Record<string, number>
  investable: ScopeValues
  propertyValueUsd: number
  mortgageUsd: number
  equity: ScopeValues
  debtsUsd: ScopeValues
  netWorth: ScopeValues
  /** Contributions during the year ending at this snapshot. */
  contributions: ScopeValues
  /** Investment growth during the year ending at this snapshot. */
  growth: ScopeValues
  /** Multiply nominal values by this for today's dollars. */
  deflator: number
}

export interface MonthPoint {
  investable: ScopeValues
  equity: ScopeValues
}

export interface Projection {
  years: ProjectionYear[]
  /** monthly[m] = balances after m months (monthly[0] = start). */
  monthly: MonthPoint[]
  accounts: Account[]
  firstYear: PlanResult
}

export const SCOPES: Scope[] = ['jerry', 'sophia', 'household']
const zero = (): ScopeValues => ({ jerry: 0, sophia: 0, household: 0 })

export function scopeShare(owner: PersonId | 'joint', scope: Scope): number {
  if (scope === 'household') return 1
  if (owner === 'joint') return 0.5
  return owner === scope ? 1 : 0
}

/** Months from the plan start (Jan 1 of the plan year) to the goal date. */
export function goalDate(plan: Plan): { year: number; month: number; monthsAway: number } {
  const by = plan.goal.by
  let year: number
  let month: number
  if (by.mode === 'date') {
    year = by.year
    month = Math.min(12, Math.max(1, by.month))
  } else {
    const person = plan.people.find((p) => p.id === by.personId) ?? plan.people[0]
    year = person.birthYear + by.age
    month = 1
  }
  const monthsAway = Math.max(1, (year - plan.settings.planYear) * 12 + (month - 1))
  return { year, month, monthsAway }
}

export function defaultProjectionYears(plan: Plan): number {
  return Math.min(70, Math.max(30, Math.ceil(goalDate(plan).monthsAway / 12) + 5))
}

interface OwnerRates {
  ltcg: number
  ordinary: number
}

function ownerRates(r: PlanResult): Record<PersonId | 'joint', OwnerRates> {
  const t = r.tables
  const of = (id: PersonId): OwnerRates => {
    const tx = r.people[id].taxes.all
    const state = marginalRateAt(tx.nyTaxable, t.ny.brackets) + marginalRateAt(tx.nyTaxable, t.nyc.brackets)
    return {
      ltcg: ltcgRate(tx.federalTaxable, t) + state,
      ordinary: marginalRateAt(tx.federalTaxable, t.federal.brackets) + state,
    }
  }
  const j = of('jerry')
  const s = of('sophia')
  return { jerry: j, sophia: s, joint: { ltcg: (j.ltcg + s.ltcg) / 2, ordinary: (j.ordinary + s.ordinary) / 2 } }
}

function netAnnualReturn(acc: Account, plan: Plan, rates: OwnerRates, shiftPct: number): number {
  const a = plan.assumptions
  if (acc.type === 'cash') {
    const y = (acc.expectedReturnPct ?? a.cashYieldPct) / 100
    return y * (1 - rates.ordinary)
  }
  const gross = ((acc.expectedReturnPct ?? a.stockReturnPct) + shiftPct) / 100
  const drag = TAXABLE_GROWTH.has(acc.type) ? (a.dividendYieldPct / 100) * rates.ltcg : 0
  return gross - drag
}

export function projectPlan(plan: Plan, opts: ProjectionOptions = {}): Projection {
  const years = opts.years ?? defaultProjectionYears(plan)
  const fx = plan.settings.fxCadPerUsd > 0 ? plan.settings.fxCadPerUsd : 1.4
  const infl = plan.assumptions.inflationPct / 100
  const shift = opts.returnShiftPct ?? 0

  const accounts: Account[] = plan.accounts.map((a) => ({ ...a }))
  const accById = new Map(accounts.map((a) => [a.id, a]))
  const balances: Record<string, number> = {}
  for (const a of accounts) balances[a.id] = (balances[a.id] ?? 0) + toUSD(a.balance, a.currency, fx)

  const rentalBalances: Record<string, number> = {}
  const propertyValues: Record<string, number> = {}
  for (const p of plan.properties) {
    rentalBalances[p.id] = p.mortgage.balance
    propertyValues[p.id] = p.marketValue
  }
  const debtBalances: Record<string, number | null> = {}
  for (const d of plan.debts) debtBalances[d.id] = d.balance
  const paidOffDebts: Record<string, boolean> = {}

  const investable = (): ScopeValues => {
    const out = zero()
    for (const [id, bal] of Object.entries(balances)) {
      const owner = accById.get(id)?.ownerId ?? 'joint'
      for (const s of SCOPES) out[s] += bal * scopeShare(owner, s)
    }
    return out
  }
  const equityNow = () => {
    const out = zero()
    let value = 0
    let mortgage = 0
    for (const p of plan.properties) {
      const share = p.ownershipPct / 100
      const v = (propertyValues[p.id] * share) / fx
      const m = (rentalBalances[p.id] * share) / fx
      value += v
      mortgage += m
      for (const s of SCOPES) out[s] += (v - m) * scopeShare(p.ownerId, s)
    }
    return { equity: out, value, mortgage }
  }
  const debtsNow = (): ScopeValues => {
    const out = zero()
    for (const d of plan.debts) {
      const bal = debtBalances[d.id]
      if (bal == null) continue
      const usd = toUSD(bal, d.currency, fx)
      for (const s of SCOPES) out[s] += usd * scopeShare(d.ownerId, s)
    }
    return out
  }
  const snapshot = (t: number, contributions: ScopeValues, prevInvestable: ScopeValues | null): ProjectionYear => {
    const inv = investable()
    const eq = equityNow()
    const debts = debtsNow()
    const netWorth = zero()
    const growth = zero()
    for (const s of SCOPES) {
      netWorth[s] = inv[s] + eq.equity[s] - debts[s]
      growth[s] = prevInvestable ? inv[s] - prevInvestable[s] - contributions[s] : 0
    }
    return {
      year: plan.settings.planYear + t,
      t,
      accounts: { ...balances },
      investable: inv,
      propertyValueUsd: eq.value,
      mortgageUsd: eq.mortgage,
      equity: eq.equity,
      debtsUsd: debts,
      netWorth,
      contributions,
      growth,
      deflator: 1 / (1 + infl) ** t,
    }
  }

  const out: ProjectionYear[] = [snapshot(0, zero(), null)]
  const monthly: MonthPoint[] = [{ investable: out[0].investable, equity: out[0].equity }]
  let firstYear: PlanResult | null = null

  for (let y = 0; y < years; y++) {
    const r = computePlan(plan, {
      year: plan.settings.planYear + y,
      rentalBalances: { ...rentalBalances },
      paidOffDebts: { ...paidOffDebts },
      savingsRateOverridePct: opts.savingsRateOverridePct,
      extra: opts.extra,
      skipInsights: y > 0,
    })
    firstYear ??= r

    const flows = r.savings.household.byAccount
    for (const id of Object.keys(flows)) {
      if (!accById.has(id)) {
        const auto = autoAccountFromId(id, plan)
        if (auto) {
          accounts.push(auto)
          accById.set(id, auto)
        }
      }
      balances[id] ??= 0
    }

    const rates = ownerRates(r)
    const monthlyRate: Record<string, number> = {}
    for (const id of Object.keys(balances)) {
      const acc = accById.get(id)
      const annual = acc ? netAnnualReturn(acc, plan, rates[acc.ownerId], shift) : plan.assumptions.stockReturnPct / 100
      monthlyRate[id] = (1 + annual) ** (1 / 12) - 1
    }

    const contributions = zero()
    for (const [id, amt] of Object.entries(flows)) {
      const owner = accById.get(id)?.ownerId ?? 'joint'
      for (const s of SCOPES) contributions[s] += amt * scopeShare(owner, s)
    }
    const prevInvestable = out[out.length - 1].investable

    for (let m = 0; m < 12; m++) {
      for (const id of Object.keys(balances)) balances[id] = balances[id] * (1 + monthlyRate[id]) + (flows[id] ?? 0) / 12
      for (const p of plan.properties) {
        propertyValues[p.id] *= (1 + p.appreciationPct / 100) ** (1 / 12)
        rentalBalances[p.id] = amortizeMonths(rentalBalances[p.id], p.mortgage.annualRatePct, p.mortgage.compounding, p.mortgage.monthlyPayment, 1).endBalance
      }
      for (const d of plan.debts) {
        const bal = debtBalances[d.id]
        if (bal == null || bal <= 0) continue
        debtBalances[d.id] = amortizeMonths(bal, d.annualRatePct, 'monthly', d.monthlyPayment, 1).endBalance
      }
      const eq = equityNow()
      monthly.push({ investable: investable(), equity: eq.equity })
    }

    for (const d of plan.debts) {
      const bal = debtBalances[d.id]
      if (bal != null && bal <= 0) paidOffDebts[d.id] = true
    }
    out.push(snapshot(y + 1, contributions, prevInvestable))
  }

  return { years: out, monthly, accounts, firstYear: firstYear ?? computePlan(plan) }
}

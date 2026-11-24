import type { Account, Insight, PersonId, Plan, Scope } from '../model/types'
import { autoAccountFromId, resolveAccountId } from './accounts'
import { computeBudgets, type BudgetResult } from './budget'
import { buildInsights } from './insights'
import { toUSD } from './money'
import { computePerson, type PersonResult } from './payroll'
import { computeRentalYear, type RentalYear } from './rental'
import { computeSavings, mergeSavings, type SavingsResult } from './savings'
import { getTables, type TaxTables } from './tax/tables'

export interface ComputeOptions {
  year?: number
  /** Whole-property mortgage balances (CAD) at the start of the year. */
  rentalBalances?: Record<string, number>
  paidOffDebts?: Record<string, boolean>
  savingsRateOverridePct?: Partial<Record<PersonId, number>>
  extra?: { monthly: number; ownerId: PersonId | 'joint' }
  /** Skip insight generation (projections call computePlan once per year). */
  skipInsights?: boolean
}

export interface RentalResult extends RentalYear {
  id: string
  ownerId: PersonId
  rentalTaxUsd: number
  cashFlowAnnualUsd: number
  cashFlowMonthlyUsd: number
}

export interface PlanResult {
  year: number
  yearIndex: number
  tables: TaxTables
  growthFactor: number
  inflationFactor: number
  people: Record<PersonId, PersonResult>
  rentals: Record<string, RentalResult>
  budgets: Record<Scope, BudgetResult>
  savings: Record<Scope, SavingsResult>
  autoAccounts: Account[]
  insights: Insight[]
}

const RENTAL_SUM_KEYS = [
  'grossRent', 'expenses', 'interest', 'principal', 'mortgagePaid', 'balanceEnd', 'netBeforeTax', 'canadaTax',
  'canadaTaxIfNoNr6', 'canadaTaxWithNr6', 'canadaTaxUsd', 'depreciationUsd', 'scheduleENetUsd',
  'cashFlowBeforeUsTaxUsd', 'principalUsd',
] as const satisfies readonly (keyof RentalYear)[]

function combineRentals(years: RentalYear[]): RentalYear {
  const out = { ...years[0] }
  for (const y of years.slice(1)) for (const k of RENTAL_SUM_KEYS) out[k] += y[k]
  return out
}

export function computePlan(plan: Plan, opts: ComputeOptions = {}): PlanResult {
  const year = opts.year ?? plan.settings.planYear
  const yearIndex = Math.max(0, year - plan.settings.planYear)
  const a = plan.assumptions
  const tables = getTables(year, a.inflationPct)
  const growthFactor = (1 + a.salaryGrowthPct / 100) ** yearIndex
  const inflationFactor = (1 + a.inflationPct / 100) ** yearIndex
  const fx = plan.settings.fxCadPerUsd > 0 ? plan.settings.fxCadPerUsd : 1.4

  const rentalYears = plan.properties.map((p) => ({
    p,
    y: computeRentalYear(p, {
      year,
      yearIndex,
      balanceStart: opts.rentalBalances?.[p.id] ?? p.mortgage.balance,
      fx,
      tables,
      inflationFactor,
    }),
  }))

  const people = {} as Record<PersonId, PersonResult>
  const rentals: Record<string, RentalResult> = {}
  for (const person of plan.people) {
    const owned = rentalYears.filter((r) => r.p.ownerId === person.id)
    const traditionalIraBalance = plan.accounts
      .filter((acc) => acc.ownerId === person.id && acc.type === 'ira_traditional')
      .reduce((s, acc) => s + toUSD(acc.balance, acc.currency, fx), 0)
    const pr = computePerson(person, {
      tables,
      year,
      growthFactor,
      rental: owned.length ? combineRentals(owned.map((o) => o.y)) : null,
      traditionalIraBalance,
    })
    people[person.id] = pr

    const weightTotal = owned.reduce((s, o) => s + Math.abs(o.y.scheduleENetUsd), 0)
    for (const o of owned) {
      const w = weightTotal > 0 ? Math.abs(o.y.scheduleENetUsd) / weightTotal : 1 / owned.length
      const rentalTaxUsd = pr.taxes.rentalTax * w
      const cashFlowAnnualUsd = o.y.cashFlowBeforeUsTaxUsd - rentalTaxUsd
      rentals[o.p.id] = { ...o.y, id: o.p.id, ownerId: o.p.ownerId, rentalTaxUsd, cashFlowAnnualUsd, cashFlowMonthlyUsd: cashFlowAnnualUsd / 12 }
    }
  }

  const budgets = computeBudgets(plan, people, {
    inflationFactor,
    fx,
    paidOffDebts: opts.paidOffDebts ?? {},
    savingsRateOverridePct: opts.savingsRateOverridePct,
  })

  const extraAnnual = (opts.extra?.monthly ?? 0) * 12
  const personSavings = (id: PersonId): SavingsResult => {
    const owned = Object.values(rentals).filter((r) => r.ownerId === id)
    return computeSavings({
      plan,
      person: plan.people.find((p) => p.id === id)!,
      result: people[id],
      budget: budgets[id],
      rentalCashFlowAnnual: owned.reduce((s, r) => s + r.cashFlowAnnualUsd, 0),
      equityBuildAnnual: owned.reduce((s, r) => s + r.principalUsd, 0),
      extraAnnual: opts.extra?.ownerId === id ? extraAnnual : 0,
    })
  }
  const jerry = personSavings('jerry')
  const sophia = personSavings('sophia')
  const jointExtra: Record<string, number> =
    opts.extra?.ownerId === 'joint' && extraAnnual !== 0 ? { [resolveAccountId(plan, 'joint', 'brokerage')]: extraAnnual } : {}
  const savings: Record<Scope, SavingsResult> = { jerry, sophia, household: mergeSavings(plan, jerry, sophia, jointExtra) }

  const autoIds = new Set(Object.keys(savings.household.byAccount).filter((id) => id.startsWith('auto:')))
  const autoAccounts = [...autoIds].map((id) => autoAccountFromId(id, plan)).filter((x): x is Account => x !== null)

  const partial = { year, yearIndex, tables, growthFactor, inflationFactor, people, rentals, budgets, savings, autoAccounts }
  return { ...partial, insights: opts.skipInsights ? [] : buildInsights(plan, partial) }
}

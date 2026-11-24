import type { Person, Plan } from '../model/types'
import { accountType, BUCKET_OF, emptyBuckets, resolveAccountId, type Bucket } from './accounts'
import type { BudgetResult } from './budget'
import { toUSD } from './money'
import type { PersonResult } from './payroll'

export interface SavingsResult {
  /** Annual USD contributions per account id (may include `auto:` ids). */
  byAccount: Record<string, number>
  byBucket: Record<Bucket, number>
  /** Everything flowing into accounts, including employer money and net rental cash flow. */
  totalAnnual: number
  takeHomeSavingsAnnual: number
  rentalCashFlowAnnual: number
  /** Mortgage principal repaid (owner's share) — savings that build property equity. */
  equityBuildAnnual: number
  employerAnnual: number
  iraContribution: number
  iraBackdoor: boolean
  grossIncome: number
  /** (account contributions + equity build) ÷ gross income. */
  savingsRateOfGross: number
}

function add(map: Record<string, number>, id: string, amount: number) {
  if (amount === 0) return
  map[id] = (map[id] ?? 0) + amount
}

export interface SavingsInputs {
  plan: Plan
  person: Person
  result: PersonResult
  budget: BudgetResult
  rentalCashFlowAnnual: number
  equityBuildAnnual: number
  extraAnnual: number
}

export function computeSavings(i: SavingsInputs): SavingsResult {
  const { plan, person, result: r } = i
  const owner = person.id
  const byAccount: Record<string, number> = {}
  const c = r.contributions

  add(byAccount, resolveAccountId(plan, owner, 'k401_traditional'), c.k401Trad + c.match)
  add(byAccount, resolveAccountId(plan, owner, 'k401_roth'), c.k401Roth + c.k401AfterTax)
  add(byAccount, resolveAccountId(plan, owner, 'hsa'), c.hsaEmployee + c.hsaEmployer)
  add(byAccount, resolveAccountId(plan, owner, 'brokerage'), r.rsuNet + c.esppShares)

  const takeHomeSavingsAnnual = i.budget.savings * 12 + r.bonusAfterTax
  let pool = takeHomeSavingsAnnual + i.rentalCashFlowAnnual + i.extraAnnual

  const iraContribution = Math.min(Math.max(0, person.ira.annualContribution), r.iraLimit, Math.max(0, pool))
  const iraType = person.ira.kind === 'roth' ? 'ira_roth' : 'ira_traditional'
  add(byAccount, resolveAccountId(plan, owner, iraType), iraContribution)
  pool -= iraContribution
  const iraBackdoor = iraContribution > 0 && person.ira.kind === 'roth' && iraContribution > r.rothIraDirectLimit + 0.005

  for (const a of plan.accounts) {
    if (a.ownerId !== owner || !(a.type === 'rrsp' || a.type === 'tfsa' || a.type === 'fhsa')) continue
    const contrib = toUSD(Math.max(0, a.annualContribution ?? 0), a.currency, plan.settings.fxCadPerUsd)
    add(byAccount, a.id, contrib)
    pool -= contrib
  }

  const allocation = person.savingsAllocation.filter((s) => s.pct > 0)
  const totalPct = allocation.reduce((a, s) => a + s.pct, 0)
  if (allocation.length === 0 || totalPct <= 0) {
    add(byAccount, resolveAccountId(plan, owner, 'brokerage'), pool)
  } else {
    for (const s of allocation) add(byAccount, s.accountId, (pool * s.pct) / totalPct)
  }

  const byBucket = bucketsOf(plan, byAccount)
  const totalAnnual = Object.values(byAccount).reduce((a, b) => a + b, 0)

  return {
    grossIncome: r.grossIncome,
    byAccount,
    byBucket,
    totalAnnual,
    takeHomeSavingsAnnual,
    rentalCashFlowAnnual: i.rentalCashFlowAnnual,
    equityBuildAnnual: i.equityBuildAnnual,
    employerAnnual: c.match + c.hsaEmployer,
    iraContribution,
    iraBackdoor,
    savingsRateOfGross: r.grossIncome > 0 ? (totalAnnual + i.equityBuildAnnual) / r.grossIncome : 0,
  }
}

export function mergeSavings(plan: Plan, a: SavingsResult, b: SavingsResult, extra: Record<string, number> = {}): SavingsResult {
  const byAccount: Record<string, number> = { ...a.byAccount }
  for (const [id, v] of Object.entries(b.byAccount)) add(byAccount, id, v)
  for (const [id, v] of Object.entries(extra)) add(byAccount, id, v)
  const byBucket = bucketsOf(plan, byAccount)
  const totalAnnual = Object.values(byAccount).reduce((s, v) => s + v, 0)
  const grossIncome = a.grossIncome + b.grossIncome
  const equity = a.equityBuildAnnual + b.equityBuildAnnual
  return {
    byAccount,
    byBucket,
    totalAnnual,
    takeHomeSavingsAnnual: a.takeHomeSavingsAnnual + b.takeHomeSavingsAnnual,
    rentalCashFlowAnnual: a.rentalCashFlowAnnual + b.rentalCashFlowAnnual,
    equityBuildAnnual: equity,
    employerAnnual: a.employerAnnual + b.employerAnnual,
    iraContribution: a.iraContribution + b.iraContribution,
    iraBackdoor: a.iraBackdoor || b.iraBackdoor,
    grossIncome,
    savingsRateOfGross: grossIncome > 0 ? (totalAnnual + equity) / grossIncome : 0,
  }
}

function bucketsOf(plan: Plan, byAccount: Record<string, number>): Record<Bucket, number> {
  const byBucket = emptyBuckets()
  for (const [id, amount] of Object.entries(byAccount)) byBucket[BUCKET_OF[accountType(plan, id)]] += amount
  return byBucket
}

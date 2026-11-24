import type { CategoryId, Expense, PersonId, Plan, Scope, SplitRule, TravelPlan } from '../model/types'
import { toUSD } from './money'
import type { PersonResult } from './payroll'

export interface BudgetLine {
  id: string
  name: string
  category: CategoryId
  /** Monthly-equivalent USD (yearly items ÷ 12). */
  monthlyUsd: number
  frequency: 'monthly' | 'yearly'
  source: 'personal' | 'shared' | 'debt' | 'travel'
}

export interface BudgetResult {
  takeHome: number
  savingsRatePct: number
  savings: number
  allowance: number
  fixed: number
  yearlyMonthly: number
  discretionary: number
  sharedShare: number
  /** Savings rate at which discretionary would be exactly zero. */
  breakEvenSavingsRatePct: number
  lines: BudgetLine[]
}

export function travelAnnual(t: TravelPlan): number {
  return t.trips * t.travelers * (t.flightPerPerson + t.activitiesPerTripPerPerson + t.daysPerTrip * (t.hotelPerNightPerPerson + t.diningPerDayPerPerson))
}

export function splitWeights(rule: SplitRule, takeHomeJerry: number, takeHomeSophia: number): Record<PersonId, number> {
  if (rule.kind === 'custom') {
    const j = Math.min(100, Math.max(0, rule.jerryPct)) / 100
    return { jerry: j, sophia: Math.round((1 - j) * 1e10) / 1e10 }
  }
  if (rule.kind === 'income') {
    const total = Math.max(0, takeHomeJerry) + Math.max(0, takeHomeSophia)
    if (total > 0) {
      const j = Math.max(0, takeHomeJerry) / total
      return { jerry: j, sophia: 1 - j }
    }
  }
  return { jerry: 0.5, sophia: 0.5 }
}

export interface BudgetOptions {
  inflationFactor: number
  fx: number
  /** Debts with a known balance that has reached zero. */
  paidOffDebts: Record<string, boolean>
  savingsRateOverridePct?: Partial<Record<PersonId, number>>
}

function expenseLine(e: Expense, fx: number, infl: number, weight: number, source: BudgetLine['source']): BudgetLine {
  const usd = toUSD(Math.max(0, e.amount), e.currency, fx) * infl * weight
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    monthlyUsd: e.frequency === 'yearly' ? usd / 12 : usd,
    frequency: e.frequency,
    source,
  }
}

function summarize(takeHome: number, savingsRatePct: number, lines: BudgetLine[]): BudgetResult {
  const savings = takeHome * (savingsRatePct / 100)
  const allowance = takeHome - savings
  const fixed = lines.filter((l) => l.frequency === 'monthly').reduce((a, l) => a + l.monthlyUsd, 0)
  const yearlyMonthly = lines.filter((l) => l.frequency === 'yearly').reduce((a, l) => a + l.monthlyUsd, 0)
  const sharedShare = lines.filter((l) => l.source === 'shared' || l.source === 'travel').reduce((a, l) => a + l.monthlyUsd, 0)
  const breakEven = takeHome > 0 ? ((takeHome - fixed - yearlyMonthly) / takeHome) * 100 : 0
  return {
    takeHome,
    savingsRatePct,
    savings,
    allowance,
    fixed,
    yearlyMonthly,
    discretionary: allowance - fixed - yearlyMonthly,
    sharedShare,
    breakEvenSavingsRatePct: breakEven,
    lines,
  }
}

export function computeBudgets(plan: Plan, people: Record<PersonId, PersonResult>, o: BudgetOptions): Record<Scope, BudgetResult> {
  const weights = splitWeights(plan.shared.split, people.jerry.takeHomeMonthly, people.sophia.takeHomeMonthly)
  const travel = travelAnnual(plan.shared.travel) * o.inflationFactor

  const linesFor = (id: PersonId, weight: number): BudgetLine[] => {
    const person = plan.people.find((p) => p.id === id)!
    const lines: BudgetLine[] = person.expenses.map((e) => expenseLine(e, o.fx, o.inflationFactor, 1, 'personal'))
    for (const d of plan.debts) {
      if (d.ownerId !== id || o.paidOffDebts[d.id]) continue
      lines.push({
        id: d.id,
        name: d.name,
        category: 'debt',
        monthlyUsd: toUSD(Math.max(0, d.monthlyPayment), d.currency, o.fx),
        frequency: 'monthly',
        source: 'debt',
      })
    }
    if (weight > 0) {
      for (const e of plan.shared.expenses) lines.push(expenseLine(e, o.fx, o.inflationFactor, weight, 'shared'))
      lines.push({ id: 'travel', name: 'Travel', category: 'travel', monthlyUsd: (travel * weight) / 12, frequency: 'yearly', source: 'travel' })
    }
    return lines
  }

  const rateFor = (id: PersonId) => {
    const override = o.savingsRateOverridePct?.[id]
    const person = plan.people.find((p) => p.id === id)!
    return Math.min(100, Math.max(0, override ?? person.savingsRatePct))
  }

  const jerry = summarize(people.jerry.takeHomeMonthly, rateFor('jerry'), linesFor('jerry', weights.jerry))
  const sophia = summarize(people.sophia.takeHomeMonthly, rateFor('sophia'), linesFor('sophia', weights.sophia))

  const personalOnly = (id: PersonId) => linesFor(id, 0)
  const householdLines: BudgetLine[] = [
    ...personalOnly('jerry'),
    ...personalOnly('sophia'),
    ...plan.shared.expenses.map((e) => expenseLine(e, o.fx, o.inflationFactor, 1, 'shared')),
    { id: 'travel', name: 'Travel', category: 'travel', monthlyUsd: travel / 12, frequency: 'yearly', source: 'travel' },
  ]
  const takeHome = jerry.takeHome + sophia.takeHome
  const savings = jerry.savings + sophia.savings
  const household = summarize(takeHome, takeHome > 0 ? (savings / takeHome) * 100 : 0, householdLines)

  return { jerry, sophia, household }
}

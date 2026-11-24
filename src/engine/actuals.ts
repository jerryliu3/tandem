import { produce } from 'immer'
import type { Account, Actuals, MonthCheckIn, MonthKey, PersonId, Plan, Scope } from '../model/types'
import { splitWeights } from './budget'
import { goalTarget } from './goal'
import type { PlanResult } from './plan'
import { projectPlan, SCOPES, type Projection, type ProjectionOptions } from './projection'

const PEOPLE: PersonId[] = ['jerry', 'sophia']

export function monthKey(d: Date): MonthKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const [y1, m1] = from.split('-').map(Number)
  const [y2, m2] = to.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}

export interface MonthPlan {
  takeHome: Record<PersonId, number>
  saving: Record<PersonId, number>
  share: Record<PersonId, number>
  shared: number
  personal: Record<PersonId, number>
  /** Total planned spending (personal + shared). */
  total: number
  savingTotal: number
}

export function monthPlan(r: PlanResult, plan: Plan): MonthPlan {
  const takeHome = { jerry: r.people.jerry.takeHomeMonthly, sophia: r.people.sophia.takeHomeMonthly }
  const saving = { jerry: r.budgets.jerry.savings, sophia: r.budgets.sophia.savings }
  const share = splitWeights(plan.shared.split, takeHome.jerry, takeHome.sophia)
  const shared = r.budgets.household.sharedShare
  const personal = {} as Record<PersonId, number>
  for (const id of PEOPLE) personal[id] = Math.max(0, takeHome[id] - saving[id] - share[id] * shared)
  return {
    takeHome,
    saving,
    share,
    shared,
    personal,
    total: personal.jerry + personal.sophia + shared,
    savingTotal: saving.jerry + saving.sophia,
  }
}

export interface MonthActual {
  spend: Record<Scope, number>
  saved: Record<Scope, number>
  difference: Record<Scope, number>
  /** Shared spending (whole household). */
  shared: number
}

export function hasCheckIn(c: MonthCheckIn | undefined): c is MonthCheckIn {
  return !!c && (c.jerry !== null || c.sophia !== null || c.shared !== null)
}

export function monthActual(mp: MonthPlan, c: MonthCheckIn | undefined): MonthActual {
  const shared = c?.shared ?? mp.shared
  const spend = { jerry: 0, sophia: 0, household: 0 }
  const saved = { jerry: 0, sophia: 0, household: 0 }
  const difference = { jerry: 0, sophia: 0, household: 0 }
  for (const id of PEOPLE) {
    spend[id] = (c?.[id] ?? mp.personal[id]) + mp.share[id] * shared
    saved[id] = mp.takeHome[id] - spend[id]
    difference[id] = saved[id] - mp.saving[id]
  }
  spend.household = (c?.jerry ?? mp.personal.jerry) + (c?.sophia ?? mp.personal.sophia) + shared
  saved.household = saved.jerry + saved.sophia
  difference.household = difference.jerry + difference.sophia
  return { spend, saved, difference, shared }
}

export interface Progress {
  /** Savings difference per person since the latest balance update. */
  soFar: Record<Scope, number>
  monthsCounted: number
  /** Average household difference over the last three check-ins, or null with none. */
  runRate: number | null
  /** Calendar-year totals for the current year. */
  year: { months: number; spend: number; planSpend: number; saved: number; planSaved: number }
}

export function latestSnapshotMonth(actuals: Actuals): MonthKey | null {
  let latest: string | null = null
  for (const s of actuals.snapshots) if (!latest || s.date > latest) latest = s.date
  return latest ? latest.slice(0, 7) : null
}

export function progress(mp: MonthPlan, actuals: Actuals, today: MonthKey): Progress {
  const cutoff = latestSnapshotMonth(actuals)
  const keys = Object.keys(actuals.months)
    .filter((k) => k <= today && hasCheckIn(actuals.months[k]))
    .sort()
  const soFar = { jerry: 0, sophia: 0, household: 0 }
  let monthsCounted = 0
  const year = { months: 0, spend: 0, planSpend: 0, saved: 0, planSaved: 0 }
  for (const k of keys) {
    const a = monthActual(mp, actuals.months[k])
    if (!cutoff || k > cutoff) {
      for (const s of SCOPES) soFar[s] += a.difference[s]
      monthsCounted++
    }
    if (k.slice(0, 4) === today.slice(0, 4)) {
      year.months++
      year.spend += a.spend.household
      year.planSpend += mp.total
      year.saved += a.saved.household
      year.planSaved += mp.savingTotal
    }
  }
  const last = keys.slice(-3)
  const runRate = last.length ? last.reduce((s, k) => s + monthActual(mp, actuals.months[k]).difference.household, 0) / last.length : null
  return { soFar, monthsCounted, runRate, year }
}

function destination(plan: Plan, id: PersonId): Account | null {
  const person = plan.people.find((p) => p.id === id)!
  for (const a of person.savingsAllocation) {
    const acc = plan.accounts.find((x) => x.id === a.accountId)
    if (acc) return acc
  }
  return (
    plan.accounts.find((a) => a.ownerId === id && (a.type === 'brokerage' || a.type === 'cash')) ??
    plan.accounts.find((a) => a.ownerId === 'joint' && (a.type === 'brokerage' || a.type === 'cash')) ??
    null
  )
}

/** The plan with each person's so-far savings difference added to their first savings destination. */
export function adjustedPlan(plan: Plan, soFar: Record<Scope, number>): Plan {
  if (soFar.jerry === 0 && soFar.sophia === 0) return plan
  const fx = plan.settings.fxCadPerUsd > 0 ? plan.settings.fxCadPerUsd : 1.4
  return produce(plan, (d) => {
    for (const id of PEOPLE) {
      const usd = soFar[id]
      if (usd === 0) continue
      const acc = destination(d as Plan, id)
      if (acc) {
        acc.balance = Math.max(0, acc.balance + (acc.currency === 'CAD' ? usd * fx : usd))
      } else if (usd > 0) {
        d.accounts.push({ id: `so-far-${id}`, name: 'Extra savings', type: 'brokerage', ownerId: id, balance: usd, currency: 'USD' })
      }
    }
  })
}

/** Months from the plan start until the goal is first met, or null. */
export function goalHitMonth(plan: Plan, proj: Projection): number | null {
  const g = goalTarget(plan)
  const t = plan.goal.target
  const infl = 1 + plan.assumptions.inflationPct / 100
  const scope = plan.goal.scope
  for (let m = 0; m < proj.monthly.length; m++) {
    const pt = proj.monthly[m]
    const assets = pt.investable[scope] + (plan.goal.includeRealEstateEquity ? pt.equity[scope] : 0)
    const target = t.mode === 'amount' && t.dollars === 'future' ? g.nominal : g.today * infl ** (m / 12)
    if (assets >= target) return m
  }
  return null
}

export interface GoalEffect {
  baseMonth: number | null
  soFarMonth: number | null
  paceMonth: number | null
}

export function goalEffect(plan: Plan, base: Projection, p: Progress): GoalEffect {
  const baseMonth = goalHitMonth(plan, base)
  const adj = adjustedPlan(plan, p.soFar)
  const years = base.years.length - 1
  const soFarMonth = adj === plan ? baseMonth : goalHitMonth(plan, projectPlan(adj, { years }))
  let paceMonth: number | null = null
  if (p.runRate !== null) {
    const opts: ProjectionOptions = { years, extra: { monthly: p.runRate, ownerId: 'joint' } }
    paceMonth = goalHitMonth(plan, projectPlan(adj, opts))
  }
  return { baseMonth, soFarMonth, paceMonth }
}

export function createBaseline(proj: Projection, startMonth: MonthKey): Actuals['baseline'] {
  const n = Math.min(361, proj.monthly.length)
  const invested = { jerry: [], sophia: [], household: [] } as Record<Scope, number[]>
  for (let i = 0; i < n; i++) for (const s of SCOPES) invested[s].push(Math.round(proj.monthly[i].investable[s]))
  return { createdAt: new Date().toISOString(), startMonth, invested }
}

import { ArrowRight } from 'lucide-react'
import { hasCheckIn, monthActual, type MonthPlan } from '../../engine/actuals'
import { toUSD } from '../../engine/money'
import { scopeShare } from '../../engine/projection'
import type { PersonId, Scope } from '../../model/types'
import { currentMonth, useGoal, useGoalEffect, useMonteCarlo, useMonthPlan, usePlan, usePlanResult, useProgress } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../cn'
import { Card, StatRow } from '../components/Card'
import { CheckInInput, goalEffectText, InvestedChart, monthLabel, planMonthLabel } from '../components/checkin'
import { filterInsights, InsightList } from '../components/feedback'
import { Button } from '../components/inputs'
import { formatPct, useMoney } from '../format'
import { GoalRing } from '../viz/GoalRing'

function plannedSpend(mp: MonthPlan, scope: Scope): number {
  return scope === 'household' ? mp.total : mp.personal[scope] + mp.share[scope] * mp.shared
}

function plannedSaving(mp: MonthPlan, scope: Scope): number {
  return scope === 'household' ? mp.savingTotal : mp.saving[scope]
}

function Status({ scope }: { scope: Scope }) {
  const plan = usePlan()
  const goal = useGoal()
  const mc = useMonteCarlo()
  const { money, compact } = useMoney()
  const fx = plan.settings.fxCadPerUsd
  const invested = plan.accounts.reduce((s, a) => s + toUSD(a.balance, a.currency, fx) * scopeShare(a.ownerId, scope), 0)
  const t = goal.target
  const early = goal.hitYear !== null ? t.year - goal.hitYear : null
  const pct = goal.onTrackPct * 100
  const who = plan.goal.scope === 'household' ? 'household goal' : `${plan.people.find((p) => p.id === plan.goal.scope)!.name}’s goal`
  return (
    <Card className="col-span-12" bodyClassName="p-6">
      <div className="flex flex-wrap items-center gap-6">
        <GoalRing pct={goal.onTrackPct} size={112} stroke={10}>
          <div className={cn('num text-xl font-semibold', pct >= 100 ? 'text-positive' : 'text-ink')}>{formatPct(Math.min(pct, 999), 0)}</div>
          <div className="text-[10px] text-faint">of goal</div>
        </GoalRing>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-muted">{scope === plan.goal.scope ? 'Retirement goal' : `Retirement goal · ${who}`}</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            <span className="text-gradient">{compact(t.today)}</span> by {goal.hitYear ?? t.year}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {early === null ? 'Not reached within the projection' : early > 0 ? `${early} yr${early === 1 ? '' : 's'} before your ${t.year} target` : early === 0 ? 'Right on time' : `${-early} yrs late`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-1">
          <div>
            <div className="text-xs text-muted">Odds of making it</div>
            <div className="num mt-1 text-xl font-semibold">{formatPct(mc.probability * 100, 0)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Invested today</div>
            <div className="num mt-1 text-xl font-semibold">{money(invested)}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ThisMonth({ scope }: { scope: Scope }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const { money } = useMoney()
  const month = currentMonth()
  const c = plan.actuals.months[month]
  const a = monthActual(mp, c)
  const fields: { field: PersonId | 'shared'; label: string }[] = [
    { field: 'jerry', label: plan.people[0].name },
    { field: 'sophia', label: plan.people[1].name },
    { field: 'shared', label: 'Shared' },
  ]
  return (
    <Card className="col-span-12 lg:col-span-7" title="This month" subtitle={`${monthLabel(month, true)} · total spending, rent and bills included, savings excluded`}>
      <div className="grid grid-cols-3 gap-4">
        {fields.map((f) => (
          <div key={f.field} className="rounded-xl bg-surface-2/60 px-4 py-3">
            <div className="text-xs text-muted">{f.label}</div>
            <CheckInInput month={month} field={f.field} size="lg" showDiff className="mt-1" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">
        {hasCheckIn(c) ? 'Saved' : 'Planned to save'} <span className="num font-medium text-ink">{money(a.saved[scope])}</span> this month
        {hasCheckIn(c) && (
          <>
            {' '}· plan {money(plannedSaving(mp, scope))}
          </>
        )}
        {scope !== 'household' && <span className="text-faint"> · includes {formatPct(mp.share[scope] * 100, 0)} of shared</span>}
      </p>
    </Card>
  )
}

function YearSoFar({ scope }: { scope: Scope }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const p = useProgress()
  const effect = useGoalEffect()
  const { money } = useMoney()
  const today = currentMonth()
  const keys = Object.keys(plan.actuals.months).filter((k) => k <= today && k.slice(0, 4) === today.slice(0, 4) && hasCheckIn(plan.actuals.months[k]))
  let spend = 0
  let saved = 0
  for (const k of keys) {
    const a = monthActual(mp, plan.actuals.months[k])
    spend += a.spend[scope]
    saved += a.saved[scope]
  }
  const planSpend = plannedSpend(mp, scope) * keys.length
  const planSaved = plannedSaving(mp, scope) * keys.length
  const diff = saved - planSaved
  return (
    <Card className="col-span-12 lg:col-span-5" title={`${today.slice(0, 4)} so far`} subtitle={keys.length ? `${keys.length} month${keys.length === 1 ? '' : 's'} checked in` : 'No months checked in yet'}>
      <StatRow label="Spent" value={money(spend)} hint={`plan ${money(planSpend)}`} />
      <StatRow label="Saved" value={money(saved)} hint={`plan ${money(planSaved)}`} />
      <StatRow label="Difference" value={money(diff, { sign: true })} tone={diff < -0.5 ? 'negative' : diff > 0.5 ? 'positive' : undefined} strong />
      <div className="mt-3 space-y-1 text-xs text-muted">
        {p.monthsCounted > 0 && (
          <p>
            Since the last balance update: {money(p.soFar.household, { sign: true })} together · {goalEffectText(plan, effect)}.
          </p>
        )}
        {effect.paceMonth !== null || p.runRate !== null ? (
          <p>
            At this pace ({money(p.runRate ?? 0, { sign: true })}/mo vs plan):{' '}
            <span className="font-medium text-ink">{effect.paceMonth === null ? 'goal not reached' : `goal in ${planMonthLabel(plan, effect.paceMonth)}`}</span>
          </p>
        ) : null}
      </div>
    </Card>
  )
}

export function HomePage() {
  const plan = usePlan()
  const r = usePlanResult()
  const scope = useUiStore((s) => s.scope)
  const setPage = useUiStore((s) => s.setPage)
  const setBalancesOpen = useUiStore((s) => s.setBalancesOpen)
  const hasUpdates = plan.actuals.snapshots.length > 0
  return (
    <div className="grid grid-cols-12 gap-5">
      <Status scope={scope} />
      <ThisMonth scope={scope} />
      <YearSoFar scope={scope} />
      <Card
        className="col-span-12 xl:col-span-8"
        title="Invested vs baseline"
        subtitle={hasUpdates ? 'Account balances: projection, the plan when you started tracking, and your updates' : 'Projected account balances'}
        action={
          <Button size="sm" variant="outline" onClick={() => {
            setPage('months')
            setBalancesOpen(true)
          }}>
            Update balances <ArrowRight size={13} />
          </Button>
        }
      >
        <InvestedChart scope={scope} height={260} />
      </Card>
      <Card className="col-span-12 xl:col-span-4" title="Insights" subtitle="What to look at next">
        <InsightList insights={filterInsights(r.insights, scope)} limit={3} clamp />
      </Card>
    </div>
  )
}

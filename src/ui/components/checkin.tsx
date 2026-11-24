import { RotateCcw } from 'lucide-react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, latestSnapshotMonth, monthsBetween, type GoalEffect } from '../../engine/actuals'
import { toUSD } from '../../engine/money'
import { scopeShare } from '../../engine/projection'
import type { BalanceSnapshot, MonthCheckIn, MonthKey, PersonId, Plan, Scope } from '../../model/types'
import { usePlanStore } from '../../store/planStore'
import { currentMonth, useMonthPlan, usePlan, useProjection } from '../../store/selectors'
import { cn } from '../cn'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from './charts'
import { EditableNumber } from './inputs'
import { useMoney } from '../format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export type CheckInField = keyof MonthCheckIn

export function monthLabel(key: MonthKey, long = false): string {
  const [y, m] = key.split('-').map(Number)
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`
}

/** Months from the plan start (Jan of the plan year) → "Mar 2044". */
export function planMonthLabel(plan: Plan, m: number): string {
  return monthLabel(addMonths(`${plan.settings.planYear}-01`, m))
}

export function setCheckIn(month: MonthKey, field: CheckInField, value: number | null): void {
  usePlanStore.getState().update((d) => {
    const cur = d.actuals.months[month] ?? { jerry: null, sophia: null, shared: null }
    cur[field] = value === null ? null : Math.max(0, value)
    if (cur.jerry === null && cur.sophia === null && cur.shared === null) delete d.actuals.months[month]
    else d.actuals.months[month] = cur
  })
}

export function plannedFor(field: CheckInField, mp: ReturnType<typeof useMonthPlan>): number {
  return field === 'shared' ? mp.shared : mp.personal[field as PersonId]
}

/** Editable spend for one person (or shared) in one month; blank shows the plan. */
export function CheckInInput({ month, field, showDiff, size = 'md', className }: { month: MonthKey; field: CheckInField; showDiff?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const { money } = useMoney()
  const value = plan.actuals.months[month]?.[field] ?? null
  const planned = plannedFor(field, mp)
  const diff = value === null ? 0 : value - planned
  return (
    <div className={cn('group/ci', className)}>
      <div className="flex items-center gap-0.5">
        <EditableNumber
          value={value}
          onChange={(v) => setCheckIn(month, field, v)}
          prefix="$"
          min={0}
          step={50}
          size={size}
          placeholder={`$${Math.round(planned).toLocaleString('en-US')}`}
          ariaLabel={`${field} spending ${monthLabel(month)}`}
          className="-ml-2"
        />
        {value !== null && (
          <button type="button" onClick={() => setCheckIn(month, field, null)} title="Back to planned" aria-label="Back to planned" className="rounded-md p-1 text-faint opacity-0 transition-opacity group-hover/ci:opacity-100 hover:text-ink focus-visible:opacity-100">
            <RotateCcw size={12} />
          </button>
        )}
      </div>
      {showDiff && (
        <div className={cn('text-[11px]', value === null ? 'text-faint' : diff > 0.5 ? 'text-negative' : 'text-positive')}>
          {value === null ? 'as planned' : Math.abs(diff) < 0.5 ? 'right on plan' : `${money(Math.abs(diff))} ${diff > 0 ? 'over' : 'under'} plan`}
        </div>
      )}
    </div>
  )
}

export function goalEffectText(plan: Plan, e: GoalEffect): string {
  if (e.baseMonth === null && e.soFarMonth === null) return 'goal not reached in the projection either way'
  if (e.baseMonth === null) return `goal reached by ${planMonthLabel(plan, e.soFarMonth!)}`
  if (e.soFarMonth === null) return 'goal no longer reached in the projection'
  const d = e.baseMonth - e.soFarMonth
  if (d === 0) return 'goal date unchanged'
  const n = Math.abs(d)
  return `goal ${n} month${n === 1 ? '' : 's'} ${d > 0 ? 'sooner' : 'later'}`
}

export function snapshotTotal(plan: Plan, snap: BalanceSnapshot, scope: Scope): number {
  const fx = plan.settings.fxCadPerUsd
  let total = 0
  for (const a of plan.accounts) {
    const bal = snap.balances[a.id]
    if (typeof bal === 'number') total += toUSD(bal, a.currency, fx) * scopeShare(a.ownerId, scope)
  }
  return total
}

interface Point {
  i: number
  projection?: number
  baseline?: number
  update?: number
}

export function InvestedChart({ scope, height = 280, years = 10 }: { scope: Scope; height?: number; years?: number }) {
  const plan = usePlan()
  const proj = useProjection()
  const { compact, money } = useMoney()
  const { baseline, snapshots } = plan.actuals
  const projStart = latestSnapshotMonth(plan.actuals) ?? currentMonth()
  const start = [baseline?.startMonth, projStart, ...snapshots.map((s) => s.date.slice(0, 7))].filter((x): x is string => !!x).sort()[0]
  const end = addMonths(projStart, years * 12)
  const n = monthsBetween(start, end)
  const pts: Point[] = Array.from({ length: n + 1 }, (_, i) => ({ i }))
  const off = monthsBetween(start, projStart)
  for (let k = 0; k + off <= n && k < proj.monthly.length; k++) pts[k + off].projection = proj.monthly[k].investable[scope]
  if (baseline) {
    const bo = monthsBetween(start, baseline.startMonth)
    baseline.invested[scope].forEach((v, k) => {
      if (k + bo <= n) pts[k + bo].baseline = v
    })
  }
  for (const s of snapshots) {
    const k = monthsBetween(start, s.date.slice(0, 7))
    if (k >= 0 && k <= n) pts[k].update = snapshotTotal(plan, s, scope)
  }
  const label = (i: unknown) => monthLabel(addMonths(start, Number(i)))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={pts} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="i" type="number" domain={[0, n]} {...AXIS_PROPS} ticks={pts.filter((p) => addMonths(start, p.i).endsWith('-01')).map((p) => p.i)} tickFormatter={(i: number) => addMonths(start, i).slice(0, 4)} />
        <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => compact(v)} />
        <Tooltip content={(p) => <ChartTooltip {...p} format={(v) => money(v)} labelFormat={label} />} />
        {baseline && <Line dataKey="baseline" name="Baseline" stroke="var(--faint)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
        <Line dataKey="projection" name="Projection" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        <Scatter dataKey="update" name="Balance update" fill="var(--positive)" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

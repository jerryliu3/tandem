import { produce } from 'immer'
import { History, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addMonths, createBaseline, hasCheckIn, monthActual } from '../../engine/actuals'
import { projectPlan } from '../../engine/projection'
import type { Plan } from '../../model/types'
import { usePlanStore } from '../../store/planStore'
import { currentMonth, useMonthPlan, usePlan, useProjection } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../cn'
import { Card } from '../components/Card'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from '../components/charts'
import { CheckInInput, monthLabel, snapshotTotal } from '../components/checkin'
import { EmptyState } from '../components/feedback'
import { Button, CURRENCY_PREFIX, CurrencyPill, EditableNumber } from '../components/inputs'
import { ConfirmDialog, Drawer } from '../components/overlays'
import { useMoney } from '../format'

const newId = () => Math.random().toString(36).slice(2, 9)
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function useMonthRows(): [string[], () => void] {
  const plan = usePlan()
  const today = currentMonth()
  const earliestCheckIn = Object.keys(plan.actuals.months).filter((k) => k <= today).sort()[0] ?? today
  const [added, setAdded] = useState(0)
  const first = addMonths(earliestCheckIn < today ? earliestCheckIn : today, -added)
  const rows: string[] = []
  for (let k = today; k >= first; k = addMonths(k, -1)) rows.push(k)
  return [rows, () => setAdded((n) => n + 1)]
}

function MonthsTable({ rows, onAddEarlier }: { rows: string[]; onAddEarlier: () => void }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const { money } = useMoney()
  const th = 'px-3 py-2 text-right text-[11px] font-medium tracking-wide text-faint uppercase'
  return (
    <Card title="Spending by month" subtitle="Blank means it went as planned. Amounts in USD, savings excluded.">
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className={cn(th, 'text-left')}>Month</th>
              <th className={th}>{plan.people[0].name}</th>
              <th className={th}>{plan.people[1].name}</th>
              <th className={th}>Shared</th>
              <th className={th}>Total</th>
              <th className={th}>Plan</th>
              <th className={th}>Difference</th>
              <th className={th}>Saved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const c = plan.actuals.months[k]
              const a = monthActual(mp, c)
              const checked = hasCheckIn(c)
              const diff = a.spend.household - mp.total
              return (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-3 py-1.5 font-medium text-ink">{monthLabel(k)}</td>
                  {(['jerry', 'sophia', 'shared'] as const).map((f) => (
                    <td key={f} className="px-3 py-1.5">
                      <CheckInInput month={k} field={f} size="sm" className="flex justify-end" />
                    </td>
                  ))}
                  <td className={cn('num px-3 py-1.5 text-right', checked ? 'text-ink' : 'text-faint')}>{money(a.spend.household)}</td>
                  <td className="num px-3 py-1.5 text-right text-muted">{money(mp.total)}</td>
                  <td className={cn('num px-3 py-1.5 text-right', !checked || Math.abs(diff) < 0.5 ? 'text-faint' : diff > 0 ? 'text-negative' : 'text-positive')}>
                    {checked ? money(diff, { sign: true }) : '—'}
                  </td>
                  <td className={cn('num px-3 py-1.5 text-right', checked ? 'text-ink' : 'text-faint')}>{money(a.saved.household)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Button size="sm" className="mt-2" onClick={onAddEarlier}>
        <Plus size={14} /> Add earlier month
      </Button>
    </Card>
  )
}

function MonthsChart({ rows }: { rows: string[] }) {
  const plan = usePlan()
  const mp = useMonthPlan()
  const { money, compact } = useMoney()
  let running = 0
  const data = [...rows].reverse().map((k) => {
    const c = plan.actuals.months[k]
    const a = monthActual(mp, c)
    if (hasCheckIn(c)) running += a.difference.household
    return { k, label: monthLabel(k), spend: a.spend.household, plan: mp.total, running }
  })
  return (
    <Card title="Spending vs plan" subtitle="Bars are total spending; the line is how far savings are ahead (+) or behind (−) plan">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => compact(v)} />
          <Tooltip cursor={{ fill: 'var(--surface)' }} content={(p) => <ChartTooltip {...p} hideZero={false} format={(v) => money(v)} />} />
          <Bar dataKey="spend" name="Spent" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line dataKey="plan" name="Plan" stroke="var(--faint)" strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="running" name="Savings vs plan" stroke="var(--positive)" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

function saveBalances(plan: Plan, date: string, balances: Record<string, number>) {
  const next = produce(plan, (d) => {
    for (const a of d.accounts) if (typeof balances[a.id] === 'number') a.balance = balances[a.id]
  })
  const baseline = plan.actuals.baseline ?? createBaseline(projectPlan(next), date.slice(0, 7))
  usePlanStore.getState().update((d) => {
    for (const a of d.accounts) if (typeof balances[a.id] === 'number') a.balance = balances[a.id]
    d.actuals.snapshots.push({ id: `snap-${newId()}`, date, balances })
    d.actuals.baseline = baseline
  })
}

function BalancesDrawer() {
  const plan = usePlan()
  const open = useUiStore((s) => s.balancesOpen)
  const setOpen = useUiStore((s) => s.setBalancesOpen)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [date, setDate] = useState(todayIso)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDraft(Object.fromEntries(plan.accounts.map((a) => [a.id, a.balance])))
      setDate(todayIso())
    }
  }
  return (
    <Drawer open={open} onOpenChange={setOpen} title="Update balances" description="Enter each account’s balance today, in its own currency.">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <span className="text-sm text-ink">As of</span>
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-lg bg-surface-2 px-2 py-1 text-sm text-ink outline-none focus:ring-1 focus:ring-accent/50"
        />
      </div>
      <div className="space-y-0.5">
        {plan.accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-0">
            <div className="min-w-0">
              <div className="truncate text-sm text-ink">{a.name}</div>
              <div className="text-[11px] text-faint">{a.ownerId === 'joint' ? 'Joint' : plan.people.find((p) => p.id === a.ownerId)?.name}</div>
            </div>
            <div className="flex items-center gap-1">
              <EditableNumber value={draft[a.id] ?? a.balance} onChange={(v) => setDraft((d) => ({ ...d, [a.id]: v }))} prefix={CURRENCY_PREFIX[a.currency]} min={0} step={1000} ariaLabel={`${a.name} balance`} />
              <CurrencyPill value={a.currency} />
            </div>
          </div>
        ))}
      </div>
      {plan.accounts.length === 0 && <p className="text-sm text-faint">Add accounts in Setup first.</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          variant="primary"
          disabled={plan.accounts.length === 0}
          onClick={() => {
            saveBalances(plan, date, Object.fromEntries(plan.accounts.map((a) => [a.id, draft[a.id] ?? a.balance])))
            setOpen(false)
          }}
        >
          Save balances
        </Button>
      </div>
    </Drawer>
  )
}

function SnapshotsCard() {
  const plan = usePlan()
  const proj = useProjection()
  const update = usePlanStore((s) => s.update)
  const setOpen = useUiStore((s) => s.setBalancesOpen)
  const { money } = useMoney()
  const snaps = [...plan.actuals.snapshots].sort((a, b) => b.date.localeCompare(a.date))
  const baseline = plan.actuals.baseline
  return (
    <Card
      title="Balance updates"
      subtitle={baseline ? `Baseline from ${monthLabel(baseline.startMonth)}` : 'Your first update sets the baseline to compare against'}
      action={
        <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
          <Wallet size={14} /> Update balances
        </Button>
      }
    >
      {snaps.length === 0 ? (
        <EmptyState icon={<History size={20} />} title="No updates yet">
          Every few months, enter your account balances to see how you’re tracking against the plan.
        </EmptyState>
      ) : (
        <ul className="-mx-2">
          {snaps.map((s) => (
            <li key={s.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface">
              <span className="flex-1 text-sm text-ink">{new Date(`${s.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="num text-sm text-muted">{money(snapshotTotal(plan, s, 'household'))}</span>
              <button
                type="button"
                aria-label="Delete update"
                onClick={() => update((d) => void (d.actuals.snapshots = d.actuals.snapshots.filter((x) => x.id !== s.id)))}
                className="rounded-lg p-1.5 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-negative/10 hover:text-negative focus-visible:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {baseline && (
        <ConfirmDialog
          trigger={
            <Button size="sm" className="mt-2">
              <RotateCcw size={14} /> Reset baseline
            </Button>
          }
          title="Reset the baseline?"
          description="The dashed line on the chart will restart from today’s projection. You can undo this."
          confirmLabel="Reset"
          onConfirm={() => update((d) => void (d.actuals.baseline = createBaseline(proj, currentMonth())))}
        />
      )}
    </Card>
  )
}

export function MonthsPage() {
  const [rows, addEarlier] = useMonthRows()
  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 xl:col-span-8">
        <MonthsTable rows={rows} onAddEarlier={addEarlier} />
        <MonthsChart rows={rows} />
      </div>
      <div className="col-span-12 xl:col-span-4">
        <SnapshotsCard />
      </div>
      <BalancesDrawer />
    </div>
  )
}

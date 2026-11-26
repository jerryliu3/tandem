import type { PersonId, Plan, Scope } from '../../../model/types'
import { usePlanStore } from '../../../store/planStore'
import { useGoal, usePlan } from '../../../store/selectors'
import { Card, StatRow } from '../../components/Card'
import { Badge } from '../../components/feedback'
import { EditableNumber, Field, MoneyField, NumberField, Segmented, SelectMenu, Switch } from '../../components/inputs'
import { useMoney } from '../../format'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'household', label: 'Together' },
  { value: 'jerry', label: 'Jerry' },
  { value: 'sophia', label: 'Sophia' },
]

function SetupCard({ plan }: { plan: Plan }) {
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const g = plan.goal
  const edit = (fn: (goal: Plan['goal']) => void) => update((d) => fn(d.goal))
  const sample = plan.placeholders.includes('goal')
  return (
    <Card className="col-span-12 lg:col-span-7" title="Your goal" action={sample ? <Badge tone="warning">Sample — make it yours</Badge> : undefined}>
      <Field label="For">
        <Segmented size="sm" value={g.scope} onChange={(v) => edit((x) => void (x.scope = v))} options={SCOPE_OPTIONS} />
      </Field>
      <Field label="Target">
        <Segmented
          size="sm"
          value={g.target.mode}
          onChange={(v) =>
            edit((x) => {
              if (v === x.target.mode) return
              x.target = v === 'amount' ? { mode: 'amount', amount: Math.round(goalAmountToday(x) / 50000) * 50000 || 2000000, dollars: 'today' } : { mode: 'spending', annualSpendingToday: 100000, withdrawalRatePct: 4 }
            })
          }
          options={[
            { value: 'amount', label: 'Amount' },
            { value: 'spending', label: 'Yearly spending' },
          ]}
        />
      </Field>
      {g.target.mode === 'amount' ? (
        <>
          <MoneyField label="Nest egg" value={g.target.amount} onChange={(v) => edit((x) => x.target.mode === 'amount' && void (x.target.amount = v))} step={50000} />
          <Field label="In">
            <Segmented
              size="sm"
              value={g.target.dollars}
              onChange={(v) => edit((x) => x.target.mode === 'amount' && void (x.target.dollars = v))}
              options={[
                { value: 'today', label: 'Today’s $' },
                { value: 'future', label: 'Future $' },
              ]}
            />
          </Field>
        </>
      ) : (
        <>
          <MoneyField label="Yearly spending" hint="in today’s dollars" value={g.target.annualSpendingToday} onChange={(v) => edit((x) => x.target.mode === 'spending' && void (x.target.annualSpendingToday = v))} step={5000} />
          <NumberField label="Withdrawal rate" hint={`Nest egg ≈ ${money(g.target.annualSpendingToday / (Math.max(0.5, g.target.withdrawalRatePct) / 100), { compact: true })}`} value={g.target.withdrawalRatePct} onChange={(v) => edit((x) => x.target.mode === 'spending' && void (x.target.withdrawalRatePct = v))} suffix="%" decimals={1} min={0.5} max={10} step={0.1} />
        </>
      )}
      <Field label="By">
        <Segmented
          size="sm"
          value={g.by.mode}
          onChange={(v) =>
            edit((x) => {
              if (v === x.by.mode) return
              const year = x.by.mode === 'date' ? x.by.year : 0
              const person = plan.people[0]
              x.by = v === 'date' ? { mode: 'date', year: plan.settings.planYear + 25, month: 1 } : { mode: 'age', personId: person.id, age: year ? year - person.birthYear : 60 }
            })
          }
          options={[
            { value: 'date', label: 'Date' },
            { value: 'age', label: 'Age' },
          ]}
        />
      </Field>
      {g.by.mode === 'date' ? (
        <Field label="Date">
          <div className="flex items-center gap-1">
            <SelectMenu value={String(g.by.month)} onChange={(v) => edit((x) => x.by.mode === 'date' && void (x.by.month = Number(v)))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m.slice(0, 3) }))} ariaLabel="Month" />
            <EditableNumber value={g.by.year} onChange={(v) => edit((x) => x.by.mode === 'date' && void (x.by.year = Math.round(v)))} min={plan.settings.planYear + 1} max={plan.settings.planYear + 70} grouping={false} ariaLabel="Year" />
          </div>
        </Field>
      ) : (
        <Field label="When">
          <div className="flex items-center gap-2">
            <SelectMenu<PersonId> value={g.by.personId} onChange={(v) => edit((x) => x.by.mode === 'age' && void (x.by.personId = v))} options={plan.people.map((p) => ({ value: p.id, label: p.name }))} ariaLabel="Person" />
            <span className="text-sm text-muted">turns</span>
            <EditableNumber value={g.by.age} onChange={(v) => edit((x) => x.by.mode === 'age' && void (x.by.age = Math.round(v)))} min={20} max={100} ariaLabel="Age" />
          </div>
        </Field>
      )}
      <Field label="Count condo equity" hint="Home equity isn’t easy to spend">
        <Switch checked={g.includeRealEstateEquity} onChange={(v) => edit((x) => void (x.includeRealEstateEquity = v))} />
      </Field>
    </Card>
  )
}

function goalAmountToday(g: Plan['goal']): number {
  return g.target.mode === 'amount' ? g.target.amount : g.target.annualSpendingToday / (Math.max(0.5, g.target.withdrawalRatePct) / 100)
}

export function GoalSection() {
  const plan = usePlan()
  const goal = useGoal()
  const { money, compact } = useMoney()
  const t = goal.target
  return (
    <div className="grid grid-cols-12 gap-5">
      <SetupCard plan={plan} />
      <Card className="col-span-12 lg:col-span-5" title="Where the plan lands">
        <StatRow label="Target" value={compact(t.today)} hint="today’s dollars" />
        <StatRow label="Target then" value={compact(t.nominal)} hint={`${t.year} dollars`} />
        <StatRow label="Projected then" value={compact(goal.projectedAtTarget)} />
        <StatRow label="Reached in" value={goal.hitYear ?? '—'} />
        <StatRow label={goal.gapMonthly > 1 ? 'Extra saving needed' : 'Ahead by'} value={`${money(Math.abs(goal.gapMonthly))}/mo`} tone={goal.gapMonthly > 1 ? 'negative' : 'positive'} strong />
      </Card>
    </div>
  )
}

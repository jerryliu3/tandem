import { Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Select } from 'radix-ui'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Currency, Debt, Expense, PersonId, Plan, Scope } from '../../model/types'
import { CATEGORIES, categoryOf } from '../../model/categories'
import { travelAnnual, splitWeights, type BudgetResult } from '../../engine/budget'
import { usePlanStore } from '../../store/planStore'
import { usePlan, usePlanResult } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { Card, StatRow } from '../components/Card'
import { CategoryBadge, CategoryIcon } from '../components/CategoryIcon'
import { ChartTooltip } from '../components/charts'
import { Badge } from '../components/feedback'
import { Button, CURRENCY_PREFIX, CurrencyPill, EditableNumber, EditableText, NumberField, MoneyField, Segmented, SliderField } from '../components/inputs'
import { Explain } from '../components/overlays'
import { cn } from '../cn'
import { formatPct, useMoney } from '../format'
import { scopePeople } from '../data'

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10))

function BudgetBar({ b }: { b: BudgetResult }) {
  const { money } = useMoney()
  const over = b.discretionary < 0
  const total = Math.max(b.takeHome, b.savings + b.fixed + b.yearlyMonthly)
  const segs = [
    { key: 'savings', label: 'Savings', value: b.savings, color: 'var(--positive)' },
    { key: 'fixed', label: 'Fixed bills', value: b.fixed, color: 'var(--chart-4)' },
    { key: 'yearly', label: 'Yearly ÷ 12', value: b.yearlyMonthly, color: 'var(--chart-7)' },
    { key: 'free', label: over ? 'Over budget' : 'Free to spend', value: Math.abs(b.discretionary), color: over ? 'var(--negative)' : 'var(--chart-3)' },
  ]
  return (
    <div>
      <div className="relative flex h-4 w-full overflow-hidden rounded-full bg-track">
        {segs.slice(0, over ? 3 : 4).map((s) => (
          <motion.div key={s.key} className="h-full" style={{ background: s.color }} initial={false} animate={{ width: `${(s.value / total) * 100}%` }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} />
        ))}
        {over && <div className="absolute inset-y-0 border-l-2 border-dashed border-ink/70" style={{ left: `${(b.takeHome / total) * 100}%` }} title="Take-home" />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {segs.map((s) => (
          <div key={s.key}>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </div>
            <div className={cn('num mt-1 text-xl font-semibold', s.key === 'free' && over && 'text-negative')}>{money(s.key === 'free' ? b.discretionary : s.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoryPicker({ value, onChange }: { value: Expense['category']; onChange: (v: Expense['category']) => void }) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as Expense['category'])}>
      <Select.Trigger aria-label="Category" className="rounded-xl outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent/50">
        <CategoryBadge id={value} />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={6} className="popover-surface anim-pop z-50 max-h-80 overflow-hidden rounded-xl p-1">
          <Select.Viewport>
            {CATEGORIES.filter((c) => c.id !== 'debt').map((c) => (
              <Select.Item key={c.id} value={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink outline-none select-none data-[highlighted]:bg-surface-2">
                <CategoryIcon id={c.id} />
                <Select.ItemText>{c.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

type ListTarget = PersonId | 'shared'

function listOf(d: Plan, target: ListTarget): Expense[] {
  return target === 'shared' ? d.shared.expenses : d.people.find((p) => p.id === target)!.expenses
}

function ExpenseList({ target, title, subtitle, share }: { target: ListTarget; title: string; subtitle?: string; share?: number }) {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const fx = plan.settings.fxCadPerUsd
  const items = listOf(plan, target)
  const edit = (id: string, fn: (e: Expense) => void) =>
    update((d) => {
      const e = listOf(d, target).find((x) => x.id === id)
      if (e) fn(e)
    })
  const monthlyUsd = (e: Expense) => (e.currency === 'CAD' ? e.amount / fx : e.amount) / (e.frequency === 'yearly' ? 12 : 1)
  const total = items.reduce((s, e) => s + monthlyUsd(e), 0)

  return (
    <Card
      title={title}
      subtitle={subtitle}
      action={
        <div className="flex items-center gap-2">
          <span className="num text-sm text-muted">
            {money(total)}/mo{share !== undefined && share < 0.999 ? <span className="text-faint"> · your share {money(total * share)}</span> : null}
          </span>
        </div>
      }
    >
      <ul className="-mx-2">
        <AnimatePresence initial={false}>
          {items.map((e) => (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface"
            >
              <CategoryPicker value={e.category} onChange={(v) => edit(e.id, (x) => void (x.category = v))} />
              <div className="min-w-0 flex-1">
                <EditableText value={e.name} onChange={(v) => edit(e.id, (x) => void (x.name = v))} className="w-full" />
                {e.frequency === 'yearly' && e.amount > 0 && <div className="px-2 text-[11px] text-faint">≈ {money(monthlyUsd(e))}/mo set aside</div>}
              </div>
              <Segmented
                size="sm"
                value={e.frequency}
                onChange={(v) => edit(e.id, (x) => void (x.frequency = v))}
                options={[
                  { value: 'monthly', label: 'mo', title: 'Monthly' },
                  { value: 'yearly', label: 'yr', title: 'Yearly' },
                ]}
              />
              <EditableNumber value={e.amount} onChange={(v) => edit(e.id, (x) => void (x.amount = v))} prefix={CURRENCY_PREFIX[e.currency]} min={0} step={10} className="w-28 justify-end" ariaLabel={`${e.name} amount`} />
              <CurrencyPill value={e.currency} onChange={(c: Currency) => edit(e.id, (x) => void (x.currency = c))} />
              <button
                type="button"
                aria-label={`Delete ${e.name}`}
                onClick={() => update((d) => void listOf(d, target).splice(listOf(d, target).findIndex((x) => x.id === e.id), 1))}
                className="rounded-lg p-1.5 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-negative/10 hover:text-negative focus-visible:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <Button
        size="sm"
        className="mt-2"
        onClick={() => update((d) => void listOf(d, target).push({ id: `${target === 'shared' ? 's' : target[0]}-${newId()}`, name: 'New expense', category: 'other', amount: 0, currency: 'USD', frequency: 'monthly' }))}
      >
        <Plus size={14} /> Add expense
      </Button>
    </Card>
  )
}

function monthsToPayoff(balance: number, ratePct: number, payment: number): number | null {
  const i = ratePct / 100 / 12
  if (payment <= balance * i) return null
  if (i === 0) return Math.ceil(balance / payment)
  return Math.ceil(-Math.log(1 - (balance * i) / payment) / Math.log(1 + i))
}

function DebtsCard({ owners }: { owners: PersonId[] }) {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const debts = plan.debts.filter((d) => owners.includes(d.ownerId))
  const edit = (id: string, fn: (d: Debt) => void) =>
    update((p) => {
      const d = p.debts.find((x) => x.id === id)
      if (d) fn(d)
    })
  return (
    <Card title="Debts" subtitle="Payments come out of the monthly budget until paid off">
      {debts.length === 0 && <p className="text-sm text-faint">No debts.</p>}
      <div className="space-y-3">
        {debts.map((d) => {
          const months = d.balance === null ? null : monthsToPayoff(d.balance, d.annualRatePct, d.monthlyPayment)
          const ownerName = plan.people.find((p) => p.id === d.ownerId)!.name
          return (
            <div key={d.id} className="group rounded-xl border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <CategoryBadge id="debt" />
                <EditableText value={d.name} onChange={(v) => edit(d.id, (x) => void (x.name = v))} className="flex-1 font-medium" />
                {owners.length > 1 && <Badge>{ownerName}</Badge>}
                <button type="button" aria-label={`Delete ${d.name}`} onClick={() => update((p) => void (p.debts = p.debts.filter((x) => x.id !== d.id)))} className="rounded-lg p-1.5 text-faint opacity-0 transition-all group-hover:opacity-100 hover:text-negative">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-faint">Payment</div>
                  <EditableNumber value={d.monthlyPayment} onChange={(v) => edit(d.id, (x) => void (x.monthlyPayment = v))} prefix={CURRENCY_PREFIX[d.currency]} suffix="/mo" min={0} className="-ml-2" />
                </div>
                <div>
                  <div className="text-faint">Balance</div>
                  <EditableNumber value={d.balance} placeholder="Unknown" onChange={(v) => edit(d.id, (x) => void (x.balance = v))} prefix={CURRENCY_PREFIX[d.currency]} min={0} className="-ml-2" />
                </div>
                <div>
                  <div className="text-faint">Rate</div>
                  <EditableNumber value={d.annualRatePct} onChange={(v) => edit(d.id, (x) => void (x.annualRatePct = v))} suffix="%" decimals={2} min={0} max={40} className="-ml-2" />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
                <span>{d.balance === null ? 'Add the balance to project the payoff date' : months === null ? 'Payment doesn’t cover interest' : `Paid off in ${Math.floor(months / 12)}y ${months % 12}m`}</span>
                <CurrencyPill value={d.currency} onChange={(c) => edit(d.id, (x) => void (x.currency = c))} />
              </div>
            </div>
          )
        })}
      </div>
      <Button size="sm" className="mt-2" onClick={() => update((p) => void p.debts.push({ id: `debt-${newId()}`, name: 'New loan', ownerId: owners[0], balance: null, annualRatePct: 5, monthlyPayment: 0, currency: 'USD' }))}>
        <Plus size={14} /> Add debt
      </Button>
    </Card>
  )
}

function CategoryDonut({ scope }: { scope: Scope }) {
  const r = usePlanResult()
  const { money } = useMoney()
  const byCat = new Map<string, number>()
  for (const l of r.budgets[scope].lines) byCat.set(l.category, (byCat.get(l.category) ?? 0) + l.monthlyUsd)
  const data = [...byCat.entries()]
    .filter(([, v]) => v > 0.5)
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => ({ id, name: categoryOf(id as Expense['category']).label, value: v, color: categoryOf(id as Expense['category']).color }))
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <Card title="Spending by category" subtitle="Monthly, including yearly costs ÷ 12">
      <div className="flex items-center gap-5">
        <div className="relative size-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" cornerRadius={4} isAnimationActive animationDuration={600}>
                {data.map((d) => (
                  <Cell key={d.id} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={(p) => <ChartTooltip {...p} format={(v) => `${money(v)}/mo`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-lg font-semibold">{money(total)}</div>
            <div className="text-[11px] text-faint">per month</div>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {data.slice(0, 7).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-muted">
                <CategoryIcon id={d.id as Expense['category']} size={13} />
                <span className="truncate">{d.name}</span>
              </span>
              <span className="num shrink-0 text-ink">{formatPct((d.value / total) * 100, 0)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function SplitCard() {
  const plan = usePlan()
  const r = usePlanResult()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const split = plan.shared.split
  const w = splitWeights(split, r.people.jerry.takeHomeMonthly, r.people.sophia.takeHomeMonthly)
  const sharedTotal = r.budgets.jerry.sharedShare + r.budgets.sophia.sharedShare
  const [j, s] = plan.people
  return (
    <Card title="Sharing costs" subtitle="How shared expenses and travel are split">
      <Segmented
        value={split.kind}
        onChange={(kind) => update((d) => void (d.shared.split = kind === 'custom' ? { kind, jerryPct: Math.round(w.jerry * 100) } : { kind }))}
        options={[
          { value: 'even', label: '50 / 50' },
          { value: 'income', label: 'By income' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {split.kind === 'custom' && (
        <SliderField label={`${j.name}'s share`} value={split.jerryPct} onChange={(v) => update((d) => void (d.shared.split = { kind: 'custom', jerryPct: v }))} min={0} max={100} suffix="%" className="mt-3" />
      )}
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
        <motion.div className="h-full bg-[var(--chart-1)]" initial={false} animate={{ width: `${w.jerry * 100}%` }} />
        <motion.div className="h-full bg-[var(--chart-2)]" initial={false} animate={{ width: `${w.sophia * 100}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted">{j.name} · {formatPct(w.jerry * 100, 0)}</div>
          <div className="num font-medium">{money(r.budgets.jerry.sharedShare)}/mo</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">{s.name} · {formatPct(w.sophia * 100, 0)}</div>
          <div className="num font-medium">{money(r.budgets.sophia.sharedShare)}/mo</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-faint">{money(sharedTotal)}/mo of shared costs and travel in total.</p>
    </Card>
  )
}

function TravelCard() {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const t = plan.shared.travel
  const annual = travelAnnual(t)
  const set = (fn: (t: Plan['shared']['travel']) => void) => update((d) => fn(d.shared.travel))
  return (
    <Card
      title="Travel"
      subtitle="Planned as a yearly set-aside"
      action={
        <Explain
          title="Travel budget"
          lines={[
            { label: 'Flights', value: money(t.trips * t.travelers * t.flightPerPerson) },
            { label: 'Hotels', value: money(t.trips * t.travelers * t.daysPerTrip * t.hotelPerNightPerPerson), kind: 'add' },
            { label: 'Dining', value: money(t.trips * t.travelers * t.daysPerTrip * t.diningPerDayPerPerson), kind: 'add' },
            { label: 'Activities', value: money(t.trips * t.travelers * t.activitiesPerTripPerPerson), kind: 'add' },
            { label: 'Per year', value: money(annual), kind: 'total' },
          ]}
        />
      }
    >
      <div className="mb-3 flex items-baseline justify-between">
        <span className="num text-2xl font-semibold">{money(annual)}<span className="text-sm font-normal text-muted">/yr</span></span>
        <span className="num text-sm text-muted">{money(annual / 12)}/mo</span>
      </div>
      <NumberField label="Trips per year" value={t.trips} onChange={(v) => set((x) => void (x.trips = v))} min={0} max={24} />
      <NumberField label="Travelers" value={t.travelers} onChange={(v) => set((x) => void (x.travelers = v))} min={1} max={8} />
      <NumberField label="Days per trip" value={t.daysPerTrip} onChange={(v) => set((x) => void (x.daysPerTrip = v))} min={1} max={60} />
      <MoneyField label="Flight" hint="per person" value={t.flightPerPerson} onChange={(v) => set((x) => void (x.flightPerPerson = v))} step={50} />
      <MoneyField label="Hotel" hint="per person, per night" value={t.hotelPerNightPerPerson} onChange={(v) => set((x) => void (x.hotelPerNightPerPerson = v))} step={10} />
      <MoneyField label="Dining" hint="per person, per day" value={t.diningPerDayPerPerson} onChange={(v) => set((x) => void (x.diningPerDayPerPerson = v))} step={10} />
      <MoneyField label="Activities" hint="per person, per trip" value={t.activitiesPerTripPerPerson} onChange={(v) => set((x) => void (x.activitiesPerTripPerPerson = v))} step={50} />
    </Card>
  )
}

function SavingsRates({ scope }: { scope: Scope }) {
  const plan = usePlan()
  const r = usePlanResult()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  return (
    <div className="space-y-1">
      {scopePeople(scope).map((id) => {
        const p = plan.people.find((x) => x.id === id)!
        const b = r.budgets[id]
        return (
          <SliderField
            key={id}
            label={scope === 'household' ? `${p.name} saves` : 'Savings rate'}
            hint={`${money(b.savings)}/mo · break-even ${formatPct(Math.max(0, b.breakEvenSavingsRatePct), 0)}`}
            value={p.savingsRatePct}
            onChange={(v) => update((d) => void (d.people.find((x) => x.id === id)!.savingsRatePct = v))}
            min={0}
            max={90}
            suffix="%"
          />
        )
      })}
    </div>
  )
}

export function BudgetPage() {
  const plan = usePlan()
  const r = usePlanResult()
  const scope = useUiStore((s) => s.scope)
  const { money } = useMoney()
  const b = r.budgets[scope]
  const people = scopePeople(scope)
  const w = splitWeights(plan.shared.split, r.people.jerry.takeHomeMonthly, r.people.sophia.takeHomeMonthly)

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12" bodyClassName="p-6">
        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-12 lg:col-span-8">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <div className="text-[13px] text-muted">Monthly take-home{scope === 'household' ? ' · together' : ''}</div>
                <div className="num mt-1 text-3xl font-semibold tracking-tight">{money(b.takeHome)}</div>
              </div>
              {b.discretionary < 0 ? (
                <Badge tone="negative">{money(-b.discretionary)}/mo over</Badge>
              ) : (
                <Badge tone="positive">{money(b.discretionary)}/mo to spare</Badge>
              )}
            </div>
            <BudgetBar b={b} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <SavingsRates scope={scope} />
          </div>
        </div>
      </Card>

      <div className="col-span-12 space-y-5 xl:col-span-7">
        {people.map((id) => (
          <ExpenseList key={id} target={id} title={`${plan.people.find((p) => p.id === id)!.name}'s expenses`} subtitle="Personal costs, paid from their own take-home" />
        ))}
        <ExpenseList target="shared" title="Shared expenses" subtitle={scope === 'household' ? 'Split between you' : `Split ${formatPct(w[scope as PersonId] * 100, 0)} to you`} share={scope === 'household' ? undefined : w[scope as PersonId]} />
        <DebtsCard owners={people} />
      </div>
      <div className="col-span-12 space-y-5 xl:col-span-5">
        <CategoryDonut scope={scope} />
        <SplitCard />
        <TravelCard />
        <Card title="Monthly summary">
          <StatRow label="Take-home" value={money(b.takeHome)} />
          <StatRow label={`Savings (${formatPct(b.savingsRatePct, 0)})`} value={money(-b.savings)} tone="muted" />
          <StatRow label="Fixed bills" value={money(-b.fixed)} tone="muted" />
          <StatRow label="Yearly costs ÷ 12" value={money(-b.yearlyMonthly)} tone="muted" />
          <StatRow label="Free to spend" value={money(b.discretionary)} tone={b.discretionary < 0 ? 'negative' : 'positive'} strong />
        </Card>
      </div>
    </div>
  )
}

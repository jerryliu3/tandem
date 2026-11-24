import { motion } from 'motion/react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PersonId, Plan, RentalProperty } from '../../model/types'
import { propertyTimeline, rentalExpenses } from '../../engine/rental'
import type { PlanResult, RentalResult } from '../../engine/plan'
import { usePlanStore } from '../../store/planStore'
import { usePlan, usePlanResult } from '../../store/selectors'
import { Card, Metric, StatRow } from '../components/Card'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from '../components/charts'
import { Badge, EmptyState } from '../components/feedback'
import { Button, EditableText, Field, MoneyField, NumberField, Segmented, SelectMenu, Switch } from '../components/inputs'
import { ConfirmDialog, type ExplainLine } from '../components/overlays'
import { cn } from '../cn'
import { formatCurrency, formatPct } from '../format'

const cad = (v: number, o: { sign?: boolean; compact?: boolean } = {}) => formatCurrency(v, 'CAD', o)
const usd = (v: number, o: { sign?: boolean; compact?: boolean } = {}) => formatCurrency(v, 'USD', o)
const newId = () => Math.random().toString(36).slice(2, 9)

interface Step {
  label: string
  value: number
  hint?: string
  kind: 'in' | 'out' | 'equity' | 'total'
}

function buildSteps(p: RentalProperty, rr: RentalResult, r: PlanResult, fx: number): Step[] {
  const b = rentalExpenses(p, r.inflationFactor)
  const m = (annual: number) => annual / 12
  const usTaxCad = rr.rentalTaxUsd * fx
  const steps: Step[] = [
    { label: 'Rent', value: m(b.grossRent), kind: 'in', hint: p.vacancyPct > 0 ? `after ${formatPct(p.vacancyPct, 0)} vacancy` : undefined },
    { label: 'Condo fees', value: -m(b.condoFees), kind: 'out' },
    { label: 'Property tax', value: -m(b.propertyTax), kind: 'out' },
    { label: 'Insurance', value: -m(b.insurance), kind: 'out' },
    { label: 'Maintenance', value: -m(b.maintenance), kind: 'out' },
    { label: 'Management', value: -m(b.management), kind: 'out' },
    { label: 'Mortgage interest', value: -m(rr.interest), kind: 'out' },
    { label: 'Mortgage principal', value: -m(rr.principal), kind: 'equity', hint: 'builds equity' },
    { label: 'Canadian tax', value: -m(rr.canadaTax), kind: 'out', hint: p.canada.nr6Elected ? 'Section 216' : 'Part XIII' },
    { label: usTaxCad < 0 ? 'US tax saved' : 'US tax', value: -m(usTaxCad), kind: usTaxCad < 0 ? 'in' : 'out', hint: usTaxCad < 0 ? 'loss offsets other income' : undefined },
  ]
  return steps.filter((s) => Math.abs(s.value) >= 0.5 || s.kind === 'in')
}

function Waterfall({ steps }: { steps: Step[] }) {
  const rows: (Step & { from: number; to: number })[] = []
  let run = 0
  for (const s of steps) {
    rows.push({ ...s, from: run, to: run + s.value })
    run += s.value
  }
  rows.push({ label: 'Net cash flow', value: run, kind: 'total', from: 0, to: run })
  const points = rows.flatMap((x) => [x.from, x.to])
  const lo = Math.min(0, ...points)
  const hi = Math.max(0, ...points)
  const span = hi - lo || 1
  const color = (s: (typeof rows)[number]) =>
    s.kind === 'in' ? 'var(--positive)' : s.kind === 'equity' ? 'var(--accent)' : s.kind === 'total' ? (s.value >= 0 ? 'var(--positive)' : 'var(--negative)') : 'var(--negative)'

  return (
    <div className="space-y-1">
      {rows.map((s, i) => {
        const left = ((Math.min(s.from, s.to) - lo) / span) * 100
        const width = Math.max(0.4, (Math.abs(s.to - s.from) / span) * 100)
        return (
          <div key={s.label} className={cn('grid grid-cols-[150px_minmax(0,1fr)_96px] items-center gap-3 py-1', s.kind === 'total' && 'mt-1 border-t border-line pt-2.5')}>
            <div className="min-w-0">
              <div className={cn('truncate text-sm', s.kind === 'total' ? 'font-medium text-ink' : 'text-muted')}>{s.label}</div>
              {s.hint && <div className="truncate text-[11px] text-faint">{s.hint}</div>}
            </div>
            <div className="relative h-5 rounded-md bg-surface/60">
              <div className="absolute inset-y-0 w-px bg-line" style={{ left: `${((0 - lo) / span) * 100}%` }} />
              <motion.div
                className="absolute inset-y-0.5 rounded-[5px]"
                style={{ background: color(s), opacity: s.kind === 'total' ? 1 : 0.85 }}
                initial={false}
                animate={{ left: `${left}%`, width: `${width}%` }}
                transition={{ type: 'spring', stiffness: 260, damping: 30, delay: i * 0.015 }}
              />
            </div>
            <div className={cn('num text-right text-sm', s.kind === 'total' ? (s.value >= 0 ? 'font-semibold text-positive' : 'font-semibold text-negative') : 'text-muted')}>
              {cad(s.value, { sign: s.kind !== 'total' || s.value > 0 })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CanadaTaxCard({ p, rr, onToggle }: { p: RentalProperty; rr: RentalResult; onToggle: (v: boolean) => void }) {
  const saving = rr.canadaTaxIfNoNr6 - rr.canadaTaxWithNr6
  const tile = (active: boolean, title: string, sub: string, amount: number) => (
    <div className={cn('flex-1 rounded-xl border p-3.5 transition-colors', active ? 'border-accent/50 bg-accent/10' : 'border-line bg-surface/40')}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{title}</span>
        {active && <Badge tone="accent">Current</Badge>}
      </div>
      <div className="mt-0.5 text-[11px] text-faint">{sub}</div>
      <div className="num mt-3 text-xl font-semibold">{cad(amount)}</div>
      <div className="text-[11px] text-faint">per year</div>
    </div>
  )
  return (
    <Card title="Canadian tax on the rent" subtitle="Non-resident landlord rules" action={<Switch checked={p.canada.nr6Elected} onChange={onToggle} label="NR6 filed" />}>
      <div className="flex gap-3">
        {tile(!p.canada.nr6Elected, 'Part XIII', '25% of gross rent', rr.canadaTaxIfNoNr6)}
        {tile(p.canada.nr6Elected, 'NR6 + Section 216', 'graduated rates on net rent', rr.canadaTaxWithNr6)}
      </div>
      {saving > 0.5 && (
        <p className="mt-3 text-sm text-muted">
          Filing NR6 {p.canada.nr6Elected ? 'saves' : 'would save'} <span className="num font-medium text-positive">{cad(saving)}</span> a year.
        </p>
      )}
      <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-faint">
        <li>File form NR6 before January 1 (or the first rent payment) so your agent withholds on net rent, then file a Section 216 return by June 30.</li>
        <li>Canadian tax paid is credited against the US tax on the same income (foreign tax credit).</li>
      </ul>
    </Card>
  )
}

function ScheduleECard({ p, rr, r, fx }: { p: RentalProperty; rr: RentalResult; r: PlanResult; fx: number }) {
  const owner = r.people[p.ownerId]
  const b = rentalExpenses(p, r.inflationFactor)
  const net = rr.scheduleENetUsd
  return (
    <Card title="US tax (Schedule E)" subtitle={`Reported in USD by ${p.ownerId === 'jerry' ? 'Jerry' : 'Sophia'}`}>
      <StatRow label="Rent" value={usd(b.grossRent / fx)} />
      <StatRow label="Operating expenses" value={usd(-b.total / fx)} />
      <StatRow label="Mortgage interest" value={usd(-rr.interest / fx)} />
      <StatRow label="Depreciation" hint="30-yr straight line" value={usd(-rr.depreciationUsd)} />
      <StatRow strong label={net < 0 ? 'Rental loss' : 'Rental income'} value={usd(net)} />
      {net < 0 && (
        <div className="mt-2 rounded-xl bg-surface/60 p-3 text-xs">
          <div className="flex justify-between text-muted">
            <span>Deductible this year</span>
            <span className="num text-ink">{usd(owner.passive.allowed)}</span>
          </div>
          <div className="mt-1 flex justify-between text-muted">
            <span>Carried forward</span>
            <span className="num text-ink">{usd(owner.passive.suspended)}</span>
          </div>
          <p className="mt-2 leading-relaxed text-faint">Up to $25k of rental losses offset wages, phasing out between $100k and $150k of income. The rest carries forward to future rental income or a sale.</p>
        </div>
      )}
      <StatRow strong label={rr.rentalTaxUsd < 0 ? 'Federal + NY + NYC tax saved' : 'Federal + NY + NYC tax'} value={usd(Math.abs(rr.rentalTaxUsd))} tone={rr.rentalTaxUsd < 0 ? 'positive' : 'negative'} />
    </Card>
  )
}

function EquityChart({ p, startYear }: { p: RentalProperty; startYear: number }) {
  const horizon = 30
  const tl = propertyTimeline(p, startYear, horizon)
  const payoff = tl.find((x) => x.balance <= 0.5)
  const share = p.ownershipPct / 100
  const data = tl.map((x) => ({ year: x.year, value: x.value * share, balance: x.balance * share, equity: x.equity }))
  return (
    <Card
      title="Value, mortgage & equity"
      subtitle={payoff ? `Mortgage paid off in ${payoff.year}` : `Mortgage still ${cad(tl[tl.length - 1].balance, { compact: true })} after ${horizon} years`}
      action={
        <div className="flex gap-3 text-xs text-muted">
          {[
            ['Equity', 'var(--accent)'],
            ['Mortgage', 'var(--negative)'],
            ['Value', 'var(--muted)'],
          ].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      }
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="mort-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--negative)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--negative)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="year" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={30} />
          <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => cad(v, { compact: true })} />
          <Tooltip content={(props) => <ChartTooltip {...props} format={(v) => cad(v)} />} />
          {payoff && <ReferenceLine x={payoff.year} stroke="var(--positive)" strokeDasharray="4 4" />}
          <Area type="monotone" dataKey="balance" name="Mortgage" stroke="var(--negative)" strokeWidth={1.5} fill="url(#mort-fill)" />
          <Area type="monotone" dataKey="equity" name="Equity" stroke="var(--accent)" strokeWidth={2} fill="url(#eq-fill)" />
          <Line type="monotone" dataKey="value" name="Value" stroke="var(--muted)" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

function DetailsCard({ p, plan, edit }: { p: RentalProperty; plan: Plan; edit: (fn: (x: RentalProperty) => void) => void }) {
  const C = 'CAD' as const
  const group = (title: string, children: React.ReactNode) => (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</div>
      {children}
    </div>
  )
  return (
    <Card title="Property details" subtitle="Everything in CAD unless noted">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
        {group(
          'Property',
          <>
            <Field label="Owner">
              <SelectMenu<PersonId> value={p.ownerId} onChange={(v) => edit((x) => void (x.ownerId = v))} options={plan.people.map((x) => ({ value: x.id, label: x.name }))} ariaLabel="Owner" />
            </Field>
            <NumberField label="Ownership" value={p.ownershipPct} onChange={(v) => edit((x) => void (x.ownershipPct = v))} suffix="%" min={0} max={100} />
            <MoneyField label="Market value" currency={C} showCurrency={false} value={p.marketValue} onChange={(v) => edit((x) => void (x.marketValue = v))} step={5000} />
            <NumberField label="Appreciation" hint="per year" value={p.appreciationPct} onChange={(v) => edit((x) => void (x.appreciationPct = v))} suffix="%" decimals={1} min={-10} max={20} step={0.5} />
          </>,
        )}
        {group(
          'Mortgage',
          <>
            <MoneyField label="Balance" currency={C} showCurrency={false} value={p.mortgage.balance} onChange={(v) => edit((x) => void (x.mortgage.balance = v))} step={5000} />
            <NumberField label="Rate" value={p.mortgage.annualRatePct} onChange={(v) => edit((x) => void (x.mortgage.annualRatePct = v))} suffix="%" decimals={2} min={0} max={20} step={0.05} />
            <MoneyField label="Payment" hint="per month" currency={C} showCurrency={false} value={p.mortgage.monthlyPayment} onChange={(v) => edit((x) => void (x.mortgage.monthlyPayment = v))} step={50} />
            <Field label="Compounding">
              <Segmented
                size="sm"
                value={p.mortgage.compounding}
                onChange={(v) => edit((x) => void (x.mortgage.compounding = v))}
                options={[
                  { value: 'semi-annual', label: 'Semi-annual' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </Field>
          </>,
        )}
        {group(
          'Rent & costs',
          <>
            <MoneyField label="Rent" hint="per month" currency={C} showCurrency={false} value={p.monthlyRent} onChange={(v) => edit((x) => void (x.monthlyRent = v))} step={50} />
            <NumberField label="Vacancy" value={p.vacancyPct} onChange={(v) => edit((x) => void (x.vacancyPct = v))} suffix="%" decimals={1} min={0} max={100} />
            <MoneyField label="Condo fees" hint="per month" currency={C} showCurrency={false} value={p.condoFeesMonthly} onChange={(v) => edit((x) => void (x.condoFeesMonthly = v))} step={10} />
            <MoneyField label="Property tax" hint="per year" currency={C} showCurrency={false} value={p.propertyTaxAnnual} onChange={(v) => edit((x) => void (x.propertyTaxAnnual = v))} step={100} />
            <MoneyField label="Insurance" hint="per year" currency={C} showCurrency={false} value={p.insuranceAnnual} onChange={(v) => edit((x) => void (x.insuranceAnnual = v))} step={100} />
            <MoneyField label="Maintenance" hint="per year" currency={C} showCurrency={false} value={p.maintenanceAnnual} onChange={(v) => edit((x) => void (x.maintenanceAnnual = v))} step={100} />
            <NumberField label="Management" hint="of rent" value={p.managementPct} onChange={(v) => edit((x) => void (x.managementPct = v))} suffix="%" decimals={1} min={0} max={50} />
          </>,
        )}
        {group(
          'US tax basis',
          <>
            <MoneyField label="Purchase price" currency={C} showCurrency={false} value={p.us.purchasePrice} onChange={(v) => edit((x) => void (x.us.purchasePrice = v))} step={5000} />
            <NumberField label="Year placed in service" value={p.us.purchaseYear} onChange={(v) => edit((x) => void (x.us.purchaseYear = v))} min={1980} max={2100} grouping={false} />
            <NumberField label="Land share" hint="not depreciable" value={p.us.landPct} onChange={(v) => edit((x) => void (x.us.landPct = v))} suffix="%" min={0} max={100} />
            <NumberField label="CAD per USD then" hint="sets the USD basis" value={p.us.fxAtPurchase} onChange={(v) => edit((x) => void (x.us.fxAtPurchase = v))} decimals={3} min={0.5} max={3} step={0.01} />
          </>,
        )}
      </div>
    </Card>
  )
}

function PropertyView({ p }: { p: RentalProperty }) {
  const plan = usePlan()
  const r = usePlanResult()
  const update = usePlanStore((s) => s.update)
  const fx = plan.settings.fxCadPerUsd
  const rr = r.rentals[p.id]
  const edit = (fn: (x: RentalProperty) => void) =>
    update((d) => {
      const x = d.properties.find((q) => q.id === p.id)
      if (x) fn(x)
    })
  const share = p.ownershipPct / 100
  const steps = buildSteps(p, rr, r, fx)
  const cashMonthlyCad = rr.cashFlowMonthlyUsd * fx
  const tl = propertyTimeline(p, r.year, 40)
  const payoff = tl.find((x) => x.balance <= 0.5)
  const equity = (p.marketValue - p.mortgage.balance) * share
  const economicMonthly = cashMonthlyCad + rr.principal / 12 + ((p.marketValue * share * p.appreciationPct) / 100) / 12
  const cashLines: ExplainLine[] = [
    ...steps.map((s) => ({ label: s.label, value: cad(s.value, { sign: true }), kind: s.value >= 0 ? ('add' as const) : ('sub' as const) })),
    { label: 'Net cash flow', value: cad(cashMonthlyCad), kind: 'total' },
  ]

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Market value" value={p.marketValue * share} format={(v) => cad(v)} sub={`≈ ${usd((p.marketValue * share) / fx)} · ${formatPct(p.appreciationPct, 1)}/yr growth`} />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Mortgage" value={p.mortgage.balance * share} format={(v) => cad(v)} tone="negative" sub={payoff ? `Paid off in ${payoff.year}` : 'Payment doesn’t cover interest'} />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Equity" value={equity} format={(v) => cad(v)} tone="accent" sub={`+${cad(rr.principal)} principal this year`} />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric
          label="Monthly cash flow"
          value={cashMonthlyCad}
          format={(v) => cad(v, { sign: v > 0 })}
          tone={cashMonthlyCad >= 0 ? 'positive' : 'negative'}
          sub={`${usd(rr.cashFlowMonthlyUsd)} · after all taxes`}
          explain={{ title: 'Monthly cash flow (CAD)', lines: cashLines, note: 'A shortfall is covered from take-home pay before savings.' }}
        />
      </Card>

      <Card
        className="col-span-12 xl:col-span-7"
        title="Where the rent goes"
        subtitle="Per month, your share"
        action={
          <Badge tone={economicMonthly >= 0 ? 'positive' : 'warning'}>
            {economicMonthly >= 0 ? 'Builds wealth' : 'Costs'} {cad(Math.abs(economicMonthly))}/mo incl. equity
          </Badge>
        }
      >
        <Waterfall steps={steps} />
      </Card>
      <div className="col-span-12 xl:col-span-5">
        <CanadaTaxCard p={p} rr={rr} onToggle={(v) => edit((x) => void (x.canada.nr6Elected = v))} />
      </div>

      <div className="col-span-12 xl:col-span-7">
        <EquityChart p={p} startYear={r.year} />
      </div>
      <div className="col-span-12 xl:col-span-5">
        <ScheduleECard p={p} rr={rr} r={r} fx={fx} />
      </div>

      <div className="col-span-12">
        <DetailsCard p={p} plan={plan} edit={edit} />
      </div>
    </div>
  )
}

function blankProperty(owner: PersonId, year: number): RentalProperty {
  return {
    id: `property-${newId()}`,
    name: 'New property',
    ownerId: owner,
    ownershipPct: 100,
    currency: 'CAD',
    marketValue: 0,
    appreciationPct: 2,
    mortgage: { balance: 0, annualRatePct: 5, monthlyPayment: 0, compounding: 'semi-annual' },
    monthlyRent: 0,
    vacancyPct: 0,
    condoFeesMonthly: 0,
    propertyTaxAnnual: 0,
    insuranceAnnual: 0,
    managementPct: 0,
    maintenanceAnnual: 0,
    canada: { nr6Elected: true },
    us: { purchasePrice: 0, purchaseYear: year, landPct: 20, fxAtPurchase: 1.35 },
  }
}

export function PropertyPage() {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const [selected, setSelected] = useState(plan.properties[0]?.id ?? '')
  const current = plan.properties.find((p) => p.id === selected) ?? plan.properties[0]

  const add = () => {
    const p = blankProperty(plan.people[0].id, plan.settings.planYear)
    update((d) => void d.properties.push(p))
    setSelected(p.id)
  }

  if (!current) {
    return (
      <div className="glass rounded-2xl">
        <EmptyState icon={<Building2 size={20} />} title="No rental property">
          <p className="mb-4 max-w-sm text-sm text-muted">Add a Canadian rental to model its cash flow, cross-border taxes and equity.</p>
          <Button variant="primary" onClick={add}>
            <Plus size={14} /> Add property
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {plan.properties.length > 1 ? (
          <Segmented value={current.id} onChange={setSelected} options={plan.properties.map((p) => ({ value: p.id, label: p.name }))} />
        ) : (
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Building2 size={18} className="text-accent" />
            <EditableText value={current.name} onChange={(v) => update((d) => void (d.properties.find((p) => p.id === current.id)!.name = v))} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="ghost">
                <Trash2 size={14} /> Remove
              </Button>
            }
            title={`Remove ${current.name}?`}
            description="Its cash flow, taxes and equity will drop out of the plan. You can undo this."
            confirmLabel="Remove"
            destructive
            onConfirm={() => update((d) => void (d.properties = d.properties.filter((p) => p.id !== current.id)))}
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={14} /> Add property
          </Button>
        </div>
      </div>
      <PropertyView key={current.id} p={current} />
    </div>
  )
}

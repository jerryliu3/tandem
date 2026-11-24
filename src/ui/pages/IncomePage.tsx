import { motion } from 'motion/react'
import { useState } from 'react'
import type { Person, PersonId } from '../../model/types'
import type { PersonResult } from '../../engine/payroll'
import type { Bracket } from '../../engine/tax/brackets'
import type { TaxTables } from '../../engine/tax/tables'
import { usePlanStore } from '../../store/planStore'
import { usePlan, usePlanResult } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { Card, StatRow } from '../components/Card'
import { Badge, filterInsights, InsightList } from '../components/feedback'
import { EditableNumber, Field, MoneyField, NumberField, Segmented, Switch } from '../components/inputs'
import { cn } from '../cn'
import { formatCurrency, formatPct, useMoney } from '../format'

type Period = 'month' | 'year'

function usePersonUpdate(id: PersonId) {
  const update = usePlanStore((s) => s.update)
  return (fn: (p: Person) => void) =>
    update((d) => {
      const p = d.people.find((x) => x.id === id)
      if (p) fn(p)
    })
}

function CompensationCard({ person, result }: { person: Person; result: PersonResult }) {
  const set = usePersonUpdate(person.id)
  const i = person.income
  return (
    <Card title="Compensation" subtitle={`${person.name} · age ${result.age} in ${person.birthYear + result.age}`}>
      <MoneyField label="Base salary" value={i.baseSalary} onChange={(v) => set((p) => void (p.income.baseSalary = v))} suffix="/yr" step={1000} />
      <NumberField label="Target bonus" hint={formatCurrency(result.bonus, 'USD') + ' a year'} value={i.bonusPct} onChange={(v) => set((p) => void (p.income.bonusPct = v))} suffix="%" min={0} max={200} />
      <Field label="Bonus goes to savings" hint={i.bonusToSavings ? 'Invested when paid, not spent monthly' : 'Spread across the monthly budget'}>
        <Switch checked={i.bonusToSavings} onChange={(v) => set((p) => void (p.income.bonusToSavings = v))} label="Bonus goes to savings" />
      </Field>
      <MoneyField label="RSU vesting" hint="Taxed as wages; net shares are kept" value={i.rsuAnnualVest} onChange={(v) => set((p) => void (p.income.rsuAnnualVest = v))} suffix="/yr" step={1000} />
      <NumberField label="ESPP contribution" hint="% of base salary" value={i.esppContribPct} onChange={(v) => set((p) => void (p.income.esppContribPct = v))} suffix="%" min={0} max={15} />
      {i.esppContribPct > 0 && <NumberField label="ESPP discount" value={i.esppDiscountPct} onChange={(v) => set((p) => void (p.income.esppDiscountPct = v))} suffix="%" min={0} max={15} />}
      <MoneyField label="Other taxable income" hint="Interest, side income" value={i.otherTaxableIncome} onChange={(v) => set((p) => void (p.income.otherTaxableIncome = v))} suffix="/yr" />
      <NumberField label="Birth year" value={person.birthYear} onChange={(v) => set((p) => void (p.birthYear = v))} min={1940} max={2010} grouping={false} />
    </Card>
  )
}

function BenefitsCard({ person, result }: { person: Person; result: PersonResult }) {
  const set = usePersonUpdate(person.id)
  const { money } = useMoney()
  const pay = person.payroll
  const c = result.contributions
  return (
    <Card title="Retirement & benefits" subtitle="Taken from each paycheck">
      <NumberField label="401(k) traditional" hint={`${money(c.k401Trad)}/yr · pre-tax`} value={pay.k401TraditionalPct} onChange={(v) => set((p) => void (p.payroll.k401TraditionalPct = v))} suffix="%" min={0} max={100} />
      <NumberField label="401(k) Roth" hint={`${money(c.k401Roth)}/yr · after-tax, grows tax-free`} value={pay.k401RothPct} onChange={(v) => set((p) => void (p.payroll.k401RothPct = v))} suffix="%" min={0} max={100} />
      <NumberField label="401(k) after-tax" hint="Mega backdoor, if your plan allows" value={pay.k401AfterTaxPct} onChange={(v) => set((p) => void (p.payroll.k401AfterTaxPct = v))} suffix="%" min={0} max={100} />
      <Field label="Employer match" hint={c.match > 0 ? `${money(c.match)}/yr from your employer` : 'Matched % of what you defer'}>
        <span className="flex items-center gap-1 text-sm text-muted">
          <EditableNumber value={pay.matchPct} onChange={(v) => set((p) => void (p.payroll.matchPct = v))} suffix="%" min={0} max={200} ariaLabel="Match rate" />
          up to
          <EditableNumber value={pay.matchUpToPct} onChange={(v) => set((p) => void (p.payroll.matchUpToPct = v))} suffix="%" min={0} max={100} ariaLabel="Match limit" />
        </span>
      </Field>
      <Field label="HSA coverage" hint="Requires a high-deductible health plan">
        <Segmented
          size="sm"
          value={pay.hsaCoverage}
          onChange={(v) => set((p) => void (p.payroll.hsaCoverage = v))}
          options={[
            { value: 'none', label: 'None' },
            { value: 'self', label: 'Self' },
            { value: 'family', label: 'Family' },
          ]}
        />
      </Field>
      {pay.hsaCoverage !== 'none' && (
        <>
          <MoneyField label="HSA contribution" value={pay.hsaAnnual} onChange={(v) => set((p) => void (p.payroll.hsaAnnual = v))} suffix="/yr" />
          <MoneyField label="Employer HSA" value={pay.hsaEmployerAnnual} onChange={(v) => set((p) => void (p.payroll.hsaEmployerAnnual = v))} suffix="/yr" />
        </>
      )}
      <MoneyField label="Pre-tax premiums" hint="Health, dental, vision" value={pay.preTaxPremiumsMonthly} onChange={(v) => set((p) => void (p.payroll.preTaxPremiumsMonthly = v))} suffix="/mo" step={10} />
      {result.caps.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {result.caps.map((cap) => (
            <div key={cap} className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              {cap}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

interface Slice {
  key: string
  label: string
  value: number
  color: string
}

function paycheckSlices(r: PersonResult): Slice[] {
  const w = r.taxes.wage
  const c = r.contributions
  return [
    { key: 'federal', label: 'Federal income tax', value: w.federal + w.additionalMedicare + w.niit, color: 'var(--chart-3)' },
    { key: 'fica', label: 'Social Security + Medicare', value: w.socialSecurity + w.medicare, color: 'var(--chart-7)' },
    { key: 'ny', label: 'New York State', value: w.nyState, color: 'var(--chart-4)' },
    { key: 'nyc', label: 'New York City', value: w.nyc - w.nycCredits, color: 'var(--chart-6)' },
    { key: 'pfl', label: 'NY PFL + SDI', value: w.pfl + w.sdi, color: 'var(--faint)' },
    { key: 'k401', label: '401(k)', value: c.k401Trad + c.k401Roth + c.k401AfterTax, color: 'var(--chart-5)' },
    { key: 'hsa', label: 'HSA', value: c.hsaEmployee, color: 'var(--chart-8)' },
    { key: 'other', label: 'Premiums + ESPP', value: r.premiums + c.esppContribution, color: 'var(--chart-1)' },
    { key: 'take', label: 'Take-home', value: r.takeHomeAnnual, color: 'var(--accent-2)' },
  ].filter((s) => s.value > 0.5)
}

function PaycheckCard({ result, period, onPeriod }: { result: PersonResult; period: Period; onPeriod: (p: Period) => void }) {
  const { money } = useMoney()
  const div = period === 'month' ? 12 : 1
  const slices = paycheckSlices(result)
  const total = result.cashComp
  const [hover, setHover] = useState<string | null>(null)
  return (
    <Card
      title="Paycheck"
      subtitle="Where each dollar of salary and bonus goes"
      action={<Segmented size="sm" value={period} onChange={onPeriod} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} />}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted">Take-home</div>
          <div className="num text-gradient mt-1 text-4xl font-semibold tracking-tight">{money(result.takeHomeAnnual / div)}</div>
          <div className="mt-1 text-xs text-faint">
            {period === 'month' ? `${money(result.takeHomeMonthly)}/mo budgeted` : 'per year'}
            {result.bonusAfterTax > 0 ? ` · ${money(result.bonusAfterTax)} bonus to savings` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-muted">Gross cash pay</div>
          <div className="num mt-1 text-xl font-medium">{money(total / div)}</div>
        </div>
      </div>
      <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-track">
        {slices.map((s) => (
          <motion.div
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ background: s.color, opacity: hover && hover !== s.key ? 0.35 : 1 }}
            initial={false}
            animate={{ width: `${(s.value / total) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {slices.map((s) => (
          <div
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className={cn('flex items-center justify-between gap-3 border-b border-line py-2 text-sm transition-opacity', hover && hover !== s.key && 'opacity-50')}
          >
            <span className="flex items-center gap-2 text-muted">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="num text-ink">{money(s.value / div)}</span>
              <span className="num w-10 text-right text-xs text-faint">{formatPct((s.value / total) * 100, 0)}</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TaxSummaryCard({ result }: { result: PersonResult }) {
  const { money } = useMoney()
  const all = result.taxes.all
  return (
    <Card title="Tax picture" subtitle={`All income · ${all.deduction.kind === 'itemized' ? 'itemizing SALT' : 'standard deduction'}`}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[13px] text-muted">Effective rate</div>
          <div className="num mt-1 text-2xl font-semibold">{formatPct(result.effectiveRate * 100, 1)}</div>
          <div className="text-xs text-faint">on wage income</div>
        </div>
        <div>
          <div className="text-[13px] text-muted">Marginal rate</div>
          <div className="num mt-1 text-2xl font-semibold">{formatPct(result.marginalRate * 100, 1)}</div>
          <div className="text-xs text-faint">on the next dollar earned</div>
        </div>
      </div>
      <div className="mt-4">
        <StatRow label="Adjusted gross income" value={money(all.agi)} />
        <StatRow label="Federal taxable income" value={money(all.federalTaxable)} hint={`− ${money(all.deduction.amount)} deduction`} />
        <StatRow label="NY taxable income" value={money(all.nyTaxable)} />
        {result.taxes.rsuTax > 0.5 && <StatRow label="Tax on RSUs" value={money(result.taxes.rsuTax)} hint="withheld from shares" />}
        {Math.abs(result.taxes.rentalTax) > 0.5 && (
          <StatRow
            label="Condo effect on US taxes"
            value={money(result.taxes.rentalTax, { sign: true })}
            tone={result.taxes.rentalTax < 0 ? 'positive' : 'negative'}
            hint={result.passive.suspended > 0 ? `${money(result.passive.suspended)} loss suspended` : undefined}
          />
        )}
        {all.foreignTaxCredit > 0.5 && <StatRow label="Foreign tax credit" value={money(-all.foreignTaxCredit)} tone="positive" hint="for Canadian tax on rent" />}
        <StatRow label="Total taxes" value={money(all.total)} strong />
      </div>
    </Card>
  )
}

function Ladder({ label, brackets, taxable, note }: { label: string; brackets: readonly Bracket[]; taxable: number; note?: string }) {
  const { compact } = useMoney()
  const idx = brackets.findIndex((b) => taxable <= b.upTo)
  const nextBoundary = brackets[Math.min(brackets.length - 1, Math.max(0, idx) + 1)]?.upTo ?? taxable * 1.5
  const max = Math.max(taxable * 1.3, Number.isFinite(nextBoundary) ? Math.min(nextBoundary, taxable * 2.2) : taxable * 1.5, 50000)
  let lo = 0
  const segs = []
  for (const b of brackets) {
    if (lo >= max) break
    const hi = Math.min(b.upTo, max)
    segs.push({ lo, hi, rate: b.rate, active: taxable > lo && taxable <= b.upTo })
    lo = b.upTo
  }
  const current = brackets[Math.max(0, idx)]?.rate ?? 0
  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm text-ink">{label}</span>
        <span className="text-xs text-muted">
          <span className="num text-ink">{formatPct(current * 100, current * 100 < 10 ? 2 : 1)}</span> bracket · {compact(taxable)} taxable
        </span>
      </div>
      <div className="relative">
        <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-lg">
          {segs.map((s, i) => {
            const t = segs.length > 1 ? i / (segs.length - 1) : 1
            return (
              <div
                key={i}
                className={cn('relative flex items-center justify-center text-[10px] font-medium', s.active ? 'text-white' : 'text-muted')}
                style={{
                  width: `${((s.hi - s.lo) / max) * 100}%`,
                  background: s.active ? 'linear-gradient(100deg, var(--accent), var(--accent-2))' : `color-mix(in oklab, var(--accent) ${12 + Math.min(1, t) * 22}%, transparent)`,
                }}
                title={`${formatPct(s.rate * 100, 2)} from ${compact(s.lo)} to ${Number.isFinite(brackets[i]?.upTo) ? compact(brackets[i].upTo) : '∞'}`}
              >
                {(s.hi - s.lo) / max > 0.07 && formatPct(s.rate * 100, s.rate * 100 < 10 ? 1 : 0)}
              </div>
            )
          })}
        </div>
        <motion.div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-ink shadow-[0_0_0_2px_var(--bg)]" initial={false} animate={{ left: `${Math.min(100, (taxable / max) * 100)}%` }} transition={{ duration: 0.5 }} />
      </div>
      {note && <div className="mt-1.5 text-[11px] leading-relaxed text-faint">{note}</div>}
    </div>
  )
}

function BracketsCard({ result, tables }: { result: PersonResult; tables: TaxTables }) {
  const all = result.taxes.all
  return (
    <Card title="Tax brackets" subtitle={`${tables.year} single-filer brackets${tables.projected ? ' (projected with inflation)' : ''}`}>
      <Ladder label="Federal" brackets={tables.federal.brackets} taxable={all.federalTaxable} />
      <Ladder
        label="New York State"
        brackets={tables.ny.brackets}
        taxable={all.nyTaxable}
        note={all.agi > 107650 ? 'Above $107,650 of income, NY phases out its lower brackets, so the whole income is taxed closer to the top rate.' : undefined}
      />
      <Ladder label="New York City" brackets={tables.nyc.brackets} taxable={all.nyTaxable} />
    </Card>
  )
}

function NextDollarCard({ result }: { result: PersonResult }) {
  const { money } = useMoney()
  const keep = 1000 * (1 - result.marginalRate)
  const k401Saves = 1000 * (result.marginalRate - 0.0765)
  return (
    <Card title="The next $1,000">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">A $1,000 raise adds</span>
          <span className="num text-lg font-semibold text-positive">{money(keep)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">$1,000 more to a traditional 401(k) costs</span>
          <span className="num text-lg font-semibold">{money(1000 - k401Saves)}</span>
        </div>
        <p className="text-xs leading-relaxed text-faint">
          Pre-tax 401(k) dollars skip federal, NY and NYC income tax ({formatPct((result.marginalRate - 0.0765) * 100, 0)} here) but not Social Security or Medicare.
        </p>
      </div>
    </Card>
  )
}

function PersonView({ id, period, setPeriod }: { id: PersonId; period: Period; setPeriod: (p: Period) => void }) {
  const plan = usePlan()
  const r = usePlanResult()
  const person = plan.people.find((p) => p.id === id)!
  const pr = r.people[id]
  const insights = filterInsights(r.insights, id).filter((i) => i.page === 'income' && i.personId === id)
  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 space-y-5 lg:col-span-5">
        <CompensationCard person={person} result={pr} />
        <BenefitsCard person={person} result={pr} />
      </div>
      <div className="col-span-12 space-y-5 lg:col-span-7">
        <PaycheckCard result={pr} period={period} onPeriod={setPeriod} />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <TaxSummaryCard result={pr} />
          <div className="space-y-5">
            <NextDollarCard result={pr} />
            {insights.length > 0 && (
              <Card title="Suggestions">
                <InsightList insights={insights} />
              </Card>
            )}
          </div>
        </div>
        <BracketsCard result={pr} tables={r.tables} />
      </div>
    </div>
  )
}

function CompareView({ period }: { period: Period }) {
  const plan = usePlan()
  const r = usePlanResult()
  const setScope = useUiStore((s) => s.setScope)
  const { money } = useMoney()
  const div = period === 'month' ? 12 : 1
  const j = r.people.jerry
  const s = r.people.sophia
  const rows: { label: string; get: (p: PersonResult) => number; fmt?: 'pct'; strong?: boolean }[] = [
    { label: 'Base salary', get: (p) => p.base },
    { label: 'Bonus', get: (p) => p.bonus },
    { label: 'RSUs', get: (p) => p.rsu },
    { label: 'Gross income', get: (p) => p.grossIncome, strong: true },
    { label: 'Taxes on pay', get: (p) => p.taxes.wageTotal },
    { label: '401(k) + HSA', get: (p) => p.contributions.k401Trad + p.contributions.k401Roth + p.contributions.k401AfterTax + p.contributions.hsaEmployee },
    { label: 'Employer match', get: (p) => p.contributions.match + p.contributions.hsaEmployer },
    { label: 'Take-home', get: (p) => p.takeHomeAnnual, strong: true },
  ]
  const maxGross = Math.max(j.cashComp, s.cashComp)
  return (
    <div className="space-y-5">
      <Card title="Side by side" subtitle={`${period === 'month' ? 'Monthly' : 'Yearly'} amounts · pick a name above to edit just one person`}>
        <div className="grid grid-cols-[1fr_repeat(3,minmax(0,140px))] gap-x-4 text-sm">
          <div />
          {plan.people.map((p) => (
            <button key={p.id} type="button" onClick={() => setScope(p.id)} className="py-2 text-right font-medium text-ink hover:text-accent">
              {p.name}
            </button>
          ))}
          <div className="py-2 text-right font-medium text-muted">Together</div>
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <div className={cn('border-t border-line py-2', row.strong ? 'font-medium text-ink' : 'text-muted')}>{row.label}</div>
              {[j, s].map((p) => (
                <div key={p.id} className={cn('num border-t border-line py-2 text-right', row.strong && 'font-medium')}>
                  {money(row.get(p) / div)}
                </div>
              ))}
              <div className={cn('num border-t border-line py-2 text-right', row.strong ? 'font-semibold' : 'text-muted')}>{money((row.get(j) + row.get(s)) / div)}</div>
            </div>
          ))}
          {(['Effective rate', 'Marginal rate'] as const).map((label) => (
            <div key={label} className="contents">
              <div className="border-t border-line py-2 text-muted">{label}</div>
              {[j, s].map((p) => (
                <div key={p.id} className="num border-t border-line py-2 text-right">
                  {formatPct((label === 'Effective rate' ? p.effectiveRate : p.marginalRate) * 100, 1)}
                </div>
              ))}
              <div className="border-t border-line py-2" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[j, s].map((p) => {
            const slices = paycheckSlices(p)
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm text-muted">{plan.people.find((x) => x.id === p.id)!.name}</span>
                <div className="flex h-3 overflow-hidden rounded-full bg-track" style={{ width: `${(p.cashComp / maxGross) * 100}%` }}>
                  {slices.map((sl) => (
                    <div key={sl.key} title={`${sl.label}: ${money(sl.value / div)}`} style={{ width: `${(sl.value / p.cashComp) * 100}%`, background: sl.color }} />
                  ))}
                </div>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-[76px]">
            {paycheckSlices(j).map((sl) => (
              <span key={sl.key} className="flex items-center gap-1.5 text-[11px] text-faint">
                <span className="size-2 rounded-full" style={{ background: sl.color }} />
                {sl.label}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {plan.people.map((p) => (
          <div key={p.id} className="space-y-5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-medium">{p.name}</span>
              <Badge tone="accent">{money(r.people[p.id].takeHomeMonthly)}/mo take-home</Badge>
            </div>
            <CompensationCard person={p} result={r.people[p.id]} />
            <BenefitsCard person={p} result={r.people[p.id]} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function IncomePage() {
  const scope = useUiStore((s) => s.scope)
  const [period, setPeriod] = useState<Period>('month')
  if (scope === 'household') {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Segmented size="sm" value={period} onChange={setPeriod} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} />
        </div>
        <CompareView period={period} />
      </div>
    )
  }
  return <PersonView id={scope} period={period} setPeriod={setPeriod} />
}

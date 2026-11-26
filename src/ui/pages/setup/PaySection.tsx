import type { Person, PersonId } from '../../../model/types'
import type { PersonResult } from '../../../engine/payroll'
import { usePlanStore } from '../../../store/planStore'
import { usePlan, usePlanResult } from '../../../store/selectors'
import { Card, StatRow } from '../../components/Card'
import { EditableNumber, EditableText, Field, MoneyField, NumberField, Segmented, Switch } from '../../components/inputs'
import { formatCurrency, formatPct, useMoney } from '../../format'

export function PaySection() {
  const plan = usePlan()
  const r = usePlanResult()
  const { money } = useMoney()
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {plan.people.map((person) => {
        const pr = r.people[person.id]
        const gross = pr.grossIncome
        const tax = pr.taxes.wageTotal + pr.taxes.rsuTax + pr.taxes.rentalTax
        return (
          <div key={person.id} className="space-y-5">
            <CompensationCard person={person} result={pr} />
            <BenefitsCard person={person} result={pr} />
            <Card title="Result">
              <StatRow label="Take-home" value={`${money(pr.takeHomeMonthly)}/mo`} />
              <StatRow label="Taxes" value={`${money(tax)}/yr`} hint={gross > 0 ? `${formatPct((tax / gross) * 100, 1)} effective` : undefined} />
              <StatRow label="Marginal rate" value={formatPct(pr.marginalRate * 100, 0)} />
            </Card>
          </div>
        )
      })}
    </div>
  )
}

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
    <Card title={<EditableText value={person.name} onChange={(v) => set((p) => void (p.name = v))} className="-ml-2 font-medium text-ink" />} subtitle={`Compensation · age ${result.age} in ${person.birthYear + result.age}`}>
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

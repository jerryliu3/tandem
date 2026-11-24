import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../model/defaults'
import type { Person } from '../model/types'
import { computePerson, type PersonContext } from './payroll'
import { computeRentalYear } from './rental'
import { getTables } from './tax/tables'

const t2027 = getTables(2027, 2.5)
const plan = createDefaultPlan()
const jerry = plan.people[0]

function ctx(overrides: Partial<PersonContext> = {}): PersonContext {
  return { tables: t2027, year: 2027, growthFactor: 1, rental: null, traditionalIraBalance: 0, ...overrides }
}

function withPerson(patch: (p: Person) => void): Person {
  const p = structuredClone(jerry)
  patch(p)
  return p
}

describe('computePerson: Jerry 2027 defaults (no rental)', () => {
  const r = computePerson(jerry, ctx())

  it('computes every tax line precisely', () => {
    const w = r.taxes.wage
    expect(w.federal).toBeCloseTo(16189.5, 2)
    expect(w.nyState).toBeCloseTo(5721.75, 2)
    expect(w.nyc).toBeCloseTo(4022.32, 2)
    expect(w.nycCredits).toBeCloseTo(300.6, 2)
    expect(w.socialSecurity).toBeCloseTo(7130, 2)
    expect(w.medicare).toBeCloseTo(1667.5, 2)
    expect(w.pfl).toBeCloseTo(451.81, 2)
    expect(w.sdi).toBeCloseTo(31.2, 2)
    expect(w.deduction.kind).toBe('standard')
    expect(r.taxes.wageTotal).toBeCloseTo(34913.48, 1)
  })

  it('derives take-home and rates', () => {
    expect(r.takeHomeMonthly).toBeCloseTo((115000 - 34913.48) / 12, 1)
    expect(r.effectiveRate).toBeCloseTo(0.3036, 3)
    expect(r.marginalRate).toBeGreaterThan(0.4)
    expect(r.marginalRate).toBeLessThan(0.45)
  })
})

describe('computePerson: contributions and limits', () => {
  it('caps 401(k) deferrals at the 2027 limit', () => {
    const r = computePerson(withPerson((p) => (p.payroll.k401TraditionalPct = 30)), ctx())
    expect(r.contributions.k401Trad).toBe(25500)
    expect(r.caps.length).toBeGreaterThan(0)
  })

  it('allows the age-50 catch-up', () => {
    const r = computePerson(withPerson((p) => { p.payroll.k401TraditionalPct = 30; p.birthYear = 1977 }), ctx())
    expect(r.contributions.k401Trad).toBe(30000)
    expect(r.caps).toHaveLength(0)
  })

  it('computes the employer match', () => {
    const r = computePerson(withPerson((p) => { p.payroll.k401TraditionalPct = 6; p.payroll.matchPct = 100; p.payroll.matchUpToPct = 4 }), ctx())
    expect(r.contributions.match).toBe(4000)
  })

  it('traditional 401(k) reduces income-tax wages but not FICA wages', () => {
    const base = computePerson(jerry, ctx())
    const r = computePerson(withPerson((p) => (p.payroll.k401TraditionalPct = 10)), ctx())
    expect(r.taxes.wage.agi).toBeCloseTo(105000, 6)
    expect(r.taxes.wage.socialSecurity).toBeCloseTo(base.taxes.wage.socialSecurity, 6)
    expect(r.takeHomeAnnual).toBeGreaterThan(base.takeHomeAnnual - 10000)
  })

  it('charges RSUs their incremental tax and sends the net to savings', () => {
    const r = computePerson(withPerson((p) => (p.income.rsuAnnualVest = 20000)), ctx())
    expect(r.taxes.rsuTax).toBeGreaterThan(0.3 * 20000)
    expect(r.taxes.rsuTax).toBeLessThan(0.5 * 20000)
    expect(r.rsuNet).toBeCloseTo(20000 - r.taxes.rsuTax, 6)
    expect(r.takeHomeAnnual).toBeCloseTo(computePerson(jerry, ctx()).takeHomeAnnual, 6)
  })

  it('flags when direct Roth IRA contributions are not allowed', () => {
    const r = computePerson(withPerson((p) => (p.income.baseSalary = 139200)), ctx())
    expect(r.magi).toBeGreaterThan(158000)
    expect(r.rothIraAllowedDirect).toBe(false)
    expect(computePerson(jerry, ctx()).rothIraAllowedDirect).toBe(true)
  })

  it('routes the after-tax bonus to savings when asked', () => {
    const r = computePerson(withPerson((p) => (p.income.bonusToSavings = true)), ctx())
    expect(r.bonusAfterTax).toBeGreaterThan(15000 * 0.5)
    expect(r.bonusAfterTax).toBeLessThan(15000)
    expect(r.takeHomeMonthly).toBeCloseTo((r.takeHomeAnnual - r.bonusAfterTax) / 12, 6)
  })
})

describe('computePerson: with the Canadian condo', () => {
  it('lets depreciation create an allowed passive loss that lowers tax', () => {
    const rental = computeRentalYear(plan.properties[0], { year: 2027, yearIndex: 0, balanceStart: 280000, fx: 1.4, tables: t2027, inflationFactor: 1 })
    const r = computePerson(jerry, ctx({ rental }))
    expect(r.passive.allowed).toBeGreaterThan(0)
    expect(r.passive.suspended).toBe(0)
    expect(r.taxes.rentalTax).toBeLessThan(0)
    expect(r.taxes.wageTotal).toBeCloseTo(34913.48, 1)
  })
})

import { describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../model/defaults'
import { amortizeMonths, monthlyRate } from './mortgage'
import { computeRentalYear, passiveAllowance, propertyTimeline, rentalExpenses } from './rental'
import { canadaFederalTax, partXIIITax, section216Tax } from './tax/canada'
import { getTables } from './tax/tables'

const t2026 = getTables(2026, 2.5)
const t2027 = getTables(2027, 2.5)

describe('Canadian non-resident tax', () => {
  it('computes federal tax on the 2026 brackets', () => {
    expect(canadaFederalTax(100000, t2026)).toBeCloseTo(0.14 * 58523 + 0.205 * (100000 - 58523), 2)
  })

  it('compares Part XIII withholding with a Section 216 return', () => {
    expect(partXIIITax(28200, t2026)).toBe(7050)
    expect(section216Tax(3536, t2026)).toBeCloseTo(3536 * 0.14 * 1.48, 2)
    expect(section216Tax(-500, t2026)).toBe(0)
  })
})

describe('mortgage', () => {
  it('converts semi-annual (Canadian) and monthly compounding to a monthly rate', () => {
    expect(monthlyRate(5, 'semi-annual')).toBeCloseTo(0.0041239, 6)
    expect(monthlyRate(6, 'monthly')).toBeCloseTo(0.005, 10)
  })

  it('amortizes: interest + principal equals payments', () => {
    const r = amortizeMonths(280000, 5.42, 'semi-annual', 2500, 12)
    expect(r.interest + r.principal).toBeCloseTo(30000, 6)
    expect(r.endBalance).toBeCloseTo(280000 - r.principal, 6)
    expect(r.interest).toBeCloseTo(14632, -1)
    expect(r.paidOffMonth).toBeNull()
  })

  it('stops at payoff and reports the month', () => {
    const r = amortizeMonths(1000, 0, 'monthly', 300, 12)
    expect(r.principal).toBe(1000)
    expect(r.paid).toBe(1000)
    expect(r.endBalance).toBe(0)
    expect(r.paidOffMonth).toBe(4)
  })
})

describe('passive loss allowance', () => {
  it('phases out between $100k and $150k of MAGI', () => {
    expect(passiveAllowance(90000)).toBe(25000)
    expect(passiveAllowance(115000)).toBe(17500)
    expect(passiveAllowance(160000)).toBe(0)
  })
})

describe('rental year (default condo)', () => {
  const condo = createDefaultPlan().properties[0]
  const y = computeRentalYear(condo, { year: 2027, yearIndex: 0, balanceStart: 280000, fx: 1.4, tables: t2027, inflationFactor: 1 })

  it('computes operating figures in CAD', () => {
    expect(y.grossRent).toBe(28200)
    expect(y.expenses).toBe(580 * 12 + 2804)
    expect(y.interest + y.principal).toBeCloseTo(30000, 6)
    expect(y.netBeforeTax).toBeCloseTo(28200 - 9764 - y.interest, 6)
  })

  it('shows NR6 / Section 216 is far cheaper than 25% of gross rent', () => {
    expect(y.canadaTaxIfNoNr6).toBe(7050)
    expect(y.canadaTax).toBeCloseTo(y.netBeforeTax * 0.14 * 1.48, 2)
    expect(y.canadaTax).toBeLessThan(y.canadaTaxIfNoNr6)
  })

  it('depreciates the building over 30 years (ADS, foreign residential) in USD', () => {
    expect(y.depreciationUsd).toBeCloseTo((500000 * 0.8) / 1.4 / 30, 2)
    expect(y.scheduleENetUsd).toBeCloseTo(y.netBeforeTax / 1.4 - y.depreciationUsd, 6)
    expect(y.scheduleENetUsd).toBeLessThan(0)
  })

  it('computes cash flow after the full mortgage payment and Canadian tax', () => {
    expect(y.cashFlowBeforeUsTaxUsd).toBeCloseTo((28200 - 9764 - 30000 - y.canadaTax) / 1.4, 6)
    expect(y.principalUsd).toBeCloseTo(y.principal / 1.4, 6)
  })

  it('itemizes operating expenses so they sum to the total', () => {
    const b = rentalExpenses(condo, 1.1)
    expect(b.grossRent).toBeCloseTo(28200 * 1.1, 6)
    expect(b.condoFees + b.propertyTax + b.insurance + b.maintenance + b.management).toBeCloseTo(b.total, 9)
    expect(b.total).toBeCloseTo(9764 * 1.1, 6)
  })

  it('projects value, balance and equity year by year', () => {
    const tl = propertyTimeline(condo, 2027, 3)
    expect(tl).toHaveLength(4)
    expect(tl[0]).toMatchObject({ year: 2027, value: condo.marketValue, balance: condo.mortgage.balance })
    expect(tl[1].value).toBeCloseTo(condo.marketValue * (1 + condo.appreciationPct / 100), 6)
    expect(tl[1].balance).toBeCloseTo(amortizeMonths(condo.mortgage.balance, condo.mortgage.annualRatePct, condo.mortgage.compounding, condo.mortgage.monthlyPayment, 12).endBalance, 6)
    expect(tl[3].equity).toBeGreaterThan(tl[0].equity)
  })

  it('scales by ownership share', () => {
    const half = computeRentalYear({ ...condo, ownershipPct: 50 }, { year: 2027, yearIndex: 0, balanceStart: 280000, fx: 1.4, tables: t2027, inflationFactor: 1 })
    expect(half.grossRent).toBe(14100)
    expect(half.balanceEnd).toBeCloseTo(y.balanceEnd, 6)
  })
})

import { describe, expect, it } from 'vitest'
import { nycSchoolCredits, nycTax, nyRecaptureConstants, nyStateTax } from './newYork'
import { getTables } from './tables'

const t2026 = getTables(2026, 2.5)
const t2027 = getTables(2027, 2.5)

describe('NY tax benefit recapture constants', () => {
  it('reproduces the official 2026 single-filer worksheet constants', () => {
    expect(nyRecaptureConstants(t2026).map((c) => [c.base, c.incr])).toEqual([
      [567, 2047],
      [2614, 30172],
      [32786, 32500],
    ])
  })

  it('derives 2027 constants from the 2027 rates', () => {
    const [first] = nyRecaptureConstants(t2027)
    expect(first.base).toBe(568) // round(5.8% × 80,650 − 4,110)
  })
})

describe('NY State tax (single)', () => {
  it('uses the plain schedule when NYAGI ≤ $107,650', () => {
    expect(nyStateTax(107000, 100000, t2026)).toBeCloseTo(5745.65, 2)
  })

  it('phases in the recapture between $107,650 and $157,650 of NYAGI', () => {
    // sched 5,745.65; flat 6,313; (6,313 − 5,745.65) × 0.147 = 83.40
    expect(nyStateTax(107000, 115000, t2026)).toBeCloseTo(5829.05, 2)
  })

  it('becomes a flat rate once NYAGI ≥ $157,650 (TI ≤ $215,400)', () => {
    expect(nyStateTax(150000, 200000, t2026)).toBeCloseTo(8850, 2)
    expect(nyStateTax(150000, 200000, t2027)).toBeCloseTo(8700, 2)
  })

  it('applies recapture base + incremental benefit above $215,400', () => {
    // TI 232,000, NYAGI 240,000: sched = 12,141 + 6.85% × 16,600; + 567 + 2,047 × round4(24,600 / 50,000)
    const expected = 12141 + 0.0685 * (232000 - 215400) + 567 + 2047 * 0.492
    expect(nyStateTax(232000, 240000, t2026)).toBeCloseTo(expected, 2)
    // Fully phased in once NYAGI is $50k past the bracket start.
    expect(nyStateTax(300000, 308000, t2026)).toBeCloseTo(12141 + 0.0685 * 84600 + 567 + 2047, 2)
  })

  it('taxes everything at 10.9% above $25M NYAGI', () => {
    expect(nyStateTax(100, 30_000_000, t2026)).toBeCloseTo(10.9, 6)
  })

  it('is zero for non-positive income', () => {
    expect(nyStateTax(0, 0, t2026)).toBe(0)
    expect(nyStateTax(-10, 50000, t2026)).toBe(0)
  })
})

describe('NYC', () => {
  it('computes resident tax from the city schedule', () => {
    expect(nycTax(107000, t2026)).toBeCloseTo(4022.32, 2)
    expect(nycTax(10000, t2026)).toBeCloseTo(307.8, 2)
  })

  it('computes the school tax credits', () => {
    expect(nycSchoolCredits(115000, 107000)).toEqual({ fixed: 63, rateReduction: 237.6 })
    expect(nycSchoolCredits(300000, 280000).fixed).toBe(0)
    expect(nycSchoolCredits(600000, 550000)).toEqual({ fixed: 0, rateReduction: 0 })
    expect(nycSchoolCredits(20000, 10000).rateReduction).toBeCloseTo(17.1, 6)
  })
})

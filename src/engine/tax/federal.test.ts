import { describe, expect, it } from 'vitest'
import { baseAt, marginalRateAt, scheduleTax } from './brackets'
import { federalIncomeTax, ltcgRate, saltCapFor } from './federal'
import { getTables } from './tables'

const t2026 = getTables(2026, 2.5)
const t2027 = getTables(2027, 2.5)

describe('federal income tax (single)', () => {
  it('matches Rev. Proc. 2025-32 for 2026', () => {
    expect(federalIncomeTax(98900, t2026)).toBeCloseTo(16470, 2)
    expect(federalIncomeTax(1_000_000, t2026)).toBeCloseTo(192979.25 + 0.37 * (1_000_000 - 640600), 2)
  })

  it('matches Rev. Proc. 2026-35 for 2027', () => {
    expect(federalIncomeTax(98400, t2027)).toBeCloseTo(16189.5, 2)
    expect(federalIncomeTax(150000, t2027)).toBeCloseTo(18549 + 0.24 * (150000 - 109125), 2)
  })

  it('never taxes negative income', () => {
    expect(federalIncomeTax(-5000, t2026)).toBe(0)
  })

  it('reports marginal rates', () => {
    expect(marginalRateAt(98900, t2026.federal.brackets)).toBe(0.22)
    expect(marginalRateAt(110000, t2027.federal.brackets)).toBe(0.24)
  })
})

describe('bracket schedule with rounded bases (NY/NYC convention)', () => {
  it('rounds cumulative base amounts half-up', () => {
    // NY 2026 single: income over 80,650 is "$4,191 plus 5.90% of the excess" (exact base 4,190.10).
    expect(scheduleTax(107000, t2026.ny.brackets, true)).toBeCloseTo(5745.65, 2)
    expect(scheduleTax(107000, t2026.ny.brackets, false)).toBeCloseTo(5744.75, 2)
    expect(baseAt(80650, t2026.ny.brackets, true)).toBe(4191)
    expect(baseAt(215400, t2026.ny.brackets, true)).toBe(12141)
  })
})

describe('SALT cap', () => {
  it('phases down 30% above the threshold with a $10k floor', () => {
    expect(saltCapFor(200000, t2026)).toBe(40400)
    expect(saltCapFor(600000, t2026)).toBeCloseTo(40400 - 0.3 * 95000, 2)
    expect(saltCapFor(2_000_000, t2026)).toBe(10000)
  })

  it('follows the statute after 2027', () => {
    expect(getTables(2028, 2.5).federal.saltCap).toBeCloseTo(41212.04, 2)
    expect(getTables(2030, 2.5).federal.saltCap).toBe(10000)
    expect(saltCapFor(2_000_000, getTables(2030, 2.5))).toBe(10000)
  })
})

describe('capital gains rate', () => {
  it('uses LTCG thresholds', () => {
    expect(ltcgRate(40000, t2026)).toBe(0)
    expect(ltcgRate(98900, t2026)).toBe(0.15)
    expect(ltcgRate(600000, t2027)).toBe(0.2)
  })
})

describe('indexing beyond 2027', () => {
  it('indexes federal values but keeps NY/NYC fixed', () => {
    const t2028 = getTables(2028, 2.5)
    expect(t2028.federal.standardDeduction).toBeGreaterThan(16600)
    expect(t2028.federal.brackets[0].upTo).toBe(13100) // 12,800 × 1.025 = 13,120 → next lowest $25
    expect(t2028.ny.brackets).toEqual(t2027.ny.brackets)
    expect(t2028.nyc.brackets).toEqual(t2027.nyc.brackets)
    expect(t2028.limits.k401).toBe(26000) // 25,500 × 1.025 = 26,137.5 → rounded down to $500
    expect(t2028.fica.ssWageBase).toBe(197100) // 192,300 × 1.025 = 197,107.5 → $300 multiple
  })

  it('clamps years before 2026 to 2026', () => {
    expect(getTables(2024, 2.5)).toEqual({ ...t2026, year: 2026 })
  })
})

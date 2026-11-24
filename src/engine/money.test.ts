import { describe, expect, it } from 'vitest'
import { clamp, fromUSD, num, round4, roundDollar, sum, toUSD } from './money'

describe('money', () => {
  it('converts between CAD and USD using CAD-per-USD fx', () => {
    expect(toUSD(1400, 'CAD', 1.4)).toBeCloseTo(1000, 10)
    expect(fromUSD(1000, 'CAD', 1.4)).toBeCloseTo(1400, 10)
    expect(toUSD(500, 'USD', 1.4)).toBe(500)
  })

  it('rounds like tax worksheets', () => {
    expect(round4(7350 / 50000)).toBe(0.147)
    expect(roundDollar(4190.5)).toBe(4191)
    expect(roundDollar(567.35)).toBe(567)
  })

  it('has safe numeric helpers', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(sum([1, 2, 3])).toBe(6)
    expect(num(Number.NaN, 7)).toBe(7)
    expect(num('x')).toBe(0)
  })
})

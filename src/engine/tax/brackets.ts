import { roundDollar } from '../money'

/** A bracket covers income from the previous `upTo` (or 0) up to this `upTo`. Last bracket uses Infinity. */
export interface Bracket {
  upTo: number
  rate: number
}

/**
 * Progressive tax on `income`.
 * `roundBases` rounds the cumulative tax at each threshold to whole dollars, which is how the
 * NY State and NYC rate schedules print their base amounts.
 */
export function scheduleTax(income: number, brackets: readonly Bracket[], roundBases = false): number {
  if (!(income > 0)) return 0
  let base = 0
  let lower = 0
  for (const { upTo, rate } of brackets) {
    if (income <= upTo) return base + rate * (income - lower)
    base += rate * (upTo - lower)
    if (roundBases) base = roundDollar(base)
    lower = upTo
  }
  return base
}

/** Cumulative tax base at a bracket threshold, as printed in rate schedules ("$X plus r% of the excess"). */
export function baseAt(threshold: number, brackets: readonly Bracket[], roundBases = false): number {
  let base = 0
  let lower = 0
  for (const { upTo, rate } of brackets) {
    if (threshold <= lower) break
    base += rate * (Math.min(upTo, threshold) - lower)
    if (roundBases) base = roundDollar(base)
    lower = upTo
  }
  return base
}

export function marginalRateAt(income: number, brackets: readonly Bracket[]): number {
  for (const { upTo, rate } of brackets) {
    if (income < upTo) return rate
  }
  return brackets[brackets.length - 1].rate
}

/** Lower bound of each bracket, aligned with the brackets array. */
export function lowerBounds(brackets: readonly Bracket[]): number[] {
  return brackets.map((_, i) => (i === 0 ? 0 : brackets[i - 1].upTo))
}

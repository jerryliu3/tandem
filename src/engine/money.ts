import type { Currency } from '../model/types'

/** fx is CAD per 1 USD (e.g. 1.40). */
export function toUSD(amount: number, currency: Currency, fx: number): number {
  return currency === 'CAD' ? amount / fx : amount
}

export function fromUSD(usd: number, currency: Currency, fx: number): number {
  return currency === 'CAD' ? usd * fx : usd
}

export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100
}

export function round4(x: number): number {
  return Math.round((x + Number.EPSILON) * 10000) / 10000
}

/** Round half-up to whole dollars (tax-table convention). */
export function roundDollar(x: number): number {
  return Math.floor(x + 0.5 + 1e-9)
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

export function sum(xs: readonly number[]): number {
  let total = 0
  for (const x of xs) total += x
  return total
}

/** Coerce possibly-invalid user input into a finite number. */
export function num(x: unknown, fallback = 0): number {
  return typeof x === 'number' && Number.isFinite(x) ? x : fallback
}

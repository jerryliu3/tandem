import { round4, roundDollar } from '../money'
import { baseAt, lowerBounds, scheduleTax } from './brackets'
import type { TaxTables } from './tables'

const RECAPTURE_START = 107650
const PHASE_WIDTH = 50000
const FLAT_FULL_AT = RECAPTURE_START + PHASE_WIDTH
const MILLIONAIRE_NYAGI = 25_000_000
/** Index of the bracket that starts at $80,650 (single); its rate is the first worksheet's flat rate. */
const FLAT_BRACKET = 4
/** Brackets starting at $215,400, $1,077,550 and $5,000,000 use the base + incremental worksheets. */
const FIRST_HIGH_BRACKET = 5
const LAST_HIGH_BRACKET = 7

export interface RecaptureConstant {
  lower: number
  base: number
  incr: number
}

/**
 * Recapture base and incremental benefit for each high bracket, derived from the rate schedule the
 * same way the IT-201 / IT-2105 worksheets print them (whole dollars).
 */
export function nyRecaptureConstants(t: TaxTables): RecaptureConstant[] {
  const brackets = t.ny.brackets
  const lows = lowerBounds(brackets)
  const flatLow = lows[FLAT_BRACKET]
  let base = roundDollar(brackets[FLAT_BRACKET].rate * flatLow - baseAt(flatLow, brackets, true))
  const out: RecaptureConstant[] = []
  for (let k = FIRST_HIGH_BRACKET; k <= LAST_HIGH_BRACKET; k++) {
    const lower = lows[k]
    const incr = roundDollar(brackets[k].rate * lower - baseAt(lower, brackets, true) - base)
    out.push({ lower, base, incr })
    base += incr
  }
  return out
}

/** New York State resident tax for a single filer, including the tax benefit recapture. */
export function nyStateTax(taxableIncome: number, nyagi: number, t: TaxTables): number {
  const ti = taxableIncome
  if (!(ti > 0)) return 0
  const brackets = t.ny.brackets
  const sched = scheduleTax(ti, brackets, true)
  if (nyagi <= RECAPTURE_START) return sched
  if (nyagi > MILLIONAIRE_NYAGI) return ti * brackets[brackets.length - 1].rate

  const lows = lowerBounds(brackets)
  if (ti <= lows[FIRST_HIGH_BRACKET]) {
    const flat = ti * brackets[FLAT_BRACKET].rate
    if (nyagi >= FLAT_FULL_AT) return flat
    return sched + (flat - sched) * round4((nyagi - RECAPTURE_START) / PHASE_WIDTH)
  }

  const constants = nyRecaptureConstants(t)
  let c = constants[0]
  for (const candidate of constants) if (ti > candidate.lower) c = candidate
  const phase = round4(Math.min(Math.max(0, nyagi - c.lower), PHASE_WIDTH) / PHASE_WIDTH)
  return sched + c.base + c.incr * phase
}

export function nycTax(cityTaxableIncome: number, t: TaxTables): number {
  return scheduleTax(Math.max(0, cityTaxableIncome), t.nyc.brackets, true)
}

/** NYC school tax credit (fixed amount + rate reduction amount), single filer. Claimed on the NY State return. */
export function nycSchoolCredits(fagi: number, cityTaxableIncome: number): { fixed: number; rateReduction: number } {
  const fixed = fagi <= 250000 ? 63 : 0
  const ti = cityTaxableIncome
  let rateReduction = 0
  if (ti > 0 && ti <= 500000) {
    rateReduction = ti <= 12000 ? 0.00171 * ti : 21 + 0.00228 * (ti - 12000)
    rateReduction = Math.round(rateReduction * 100) / 100
  }
  return { fixed, rateReduction }
}

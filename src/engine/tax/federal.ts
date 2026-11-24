import { scheduleTax } from './brackets'
import type { TaxTables } from './tables'

export function federalIncomeTax(taxableIncome: number, t: TaxTables): number {
  return scheduleTax(Math.max(0, taxableIncome), t.federal.brackets)
}

/** SALT deduction cap after the high-income phase-down (30% of MAGI over the start, never below the floor). */
export function saltCapFor(magi: number, t: TaxTables): number {
  const { saltCap, saltPhaseStart, saltFloor } = t.federal
  if (!Number.isFinite(saltPhaseStart)) return saltCap
  return Math.max(saltFloor, saltCap - 0.3 * Math.max(0, magi - saltPhaseStart))
}

/** Federal long-term capital gains / qualified dividend rate at a given taxable income. */
export function ltcgRate(taxableIncome: number, t: TaxTables): number {
  if (taxableIncome <= t.federal.ltcg0Max) return 0
  if (taxableIncome <= t.federal.ltcg15Max) return 0.15
  return 0.2
}

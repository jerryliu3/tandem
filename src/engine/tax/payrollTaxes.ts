import { round2 } from '../money'
import type { TaxTables } from './tables'

export interface FicaTaxes {
  socialSecurity: number
  medicare: number
  additionalMedicare: number
}

export function ficaTaxes(ficaWages: number, t: TaxTables): FicaTaxes {
  const w = Math.max(0, ficaWages)
  const f = t.fica
  return {
    socialSecurity: round2(f.ssRate * Math.min(w, f.ssWageBase)),
    medicare: round2(f.medicareRate * w),
    additionalMedicare: round2(f.addlMedicareRate * Math.max(0, w - f.addlMedicareThreshold)),
  }
}

/** NY Paid Family Leave and disability (SDI) employee contributions. */
export function nyPayroll(grossWages: number, t: TaxTables): { pfl: number; sdi: number } {
  const w = Math.max(0, grossWages)
  const p = t.nyPayroll
  return {
    pfl: round2(Math.min(w * p.pflRate, p.pflMax)),
    sdi: round2(Math.min(w * p.sdiRate, p.sdiMax)),
  }
}

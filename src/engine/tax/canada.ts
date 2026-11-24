import { scheduleTax } from './brackets'
import type { TaxTables } from './tables'

export function canadaFederalTax(income: number, t: TaxTables): number {
  return scheduleTax(Math.max(0, income), t.canada.brackets)
}

/**
 * Section 216 return for a non-resident: federal tax on net Canadian rent with no personal credits,
 * plus the non-resident surtax in lieu of provincial tax.
 */
export function section216Tax(netRent: number, t: TaxTables): number {
  return canadaFederalTax(netRent, t) * (1 + t.canada.nonResidentSurtax)
}

/** Part XIII withholding on gross rent when no NR6 undertaking is filed. */
export function partXIIITax(grossRent: number, t: TaxTables): number {
  return Math.max(0, grossRent) * t.canada.partXIIIRate
}

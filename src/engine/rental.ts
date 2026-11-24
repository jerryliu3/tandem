import type { RentalProperty } from '../model/types'
import { amortizeMonths } from './mortgage'
import { partXIIITax, section216Tax } from './tax/canada'
import type { TaxTables } from './tax/tables'

/** ADS recovery period for residential rental property located outside the US (placed in service after 2017). */
export const FOREIGN_RESIDENTIAL_RECOVERY_YEARS = 30

export interface RentalYear {
  /** All CAD amounts are the owner's share. */
  grossRent: number
  expenses: number
  interest: number
  principal: number
  mortgagePaid: number
  /** Whole-property mortgage balance at year end. */
  balanceEnd: number
  netBeforeTax: number
  canadaTax: number
  canadaTaxIfNoNr6: number
  canadaTaxWithNr6: number
  canadaTaxUsd: number
  depreciationUsd: number
  scheduleENetUsd: number
  cashFlowBeforeUsTaxUsd: number
  principalUsd: number
}

export interface RentalYearOptions {
  year: number
  yearIndex: number
  /** Whole-property mortgage balance at the start of the year (CAD). */
  balanceStart: number
  fx: number
  tables: TaxTables
  /** Cumulative inflation applied to rent and operating costs. */
  inflationFactor: number
}

/** $25,000 special allowance for actively-managed rentals, phased out 50% of MAGI over $100k. */
export function passiveAllowance(magi: number): number {
  return Math.max(0, 25000 - 0.5 * Math.max(0, magi - 100000))
}

function depreciationFor(p: RentalProperty, year: number): number {
  const { purchasePrice, purchaseYear, landPct, fxAtPurchase } = p.us
  if (!(purchasePrice > 0) || !(fxAtPurchase > 0) || year < purchaseYear) return 0
  const annual = (purchasePrice * (1 - landPct / 100)) / fxAtPurchase / FOREIGN_RESIDENTIAL_RECOVERY_YEARS
  if (year === purchaseYear) return annual * (11.5 / 12)
  if (year > purchaseYear + FOREIGN_RESIDENTIAL_RECOVERY_YEARS) return 0
  return annual
}

export interface RentalExpenseBreakdown {
  /** Owner's share, CAD per year. */
  grossRent: number
  condoFees: number
  propertyTax: number
  insurance: number
  maintenance: number
  management: number
  total: number
}

export function rentalExpenses(p: RentalProperty, inflationFactor: number): RentalExpenseBreakdown {
  const share = p.ownershipPct / 100
  const k = inflationFactor * share
  const grossRent = p.monthlyRent * 12 * (1 - p.vacancyPct / 100) * k
  const condoFees = p.condoFeesMonthly * 12 * k
  const propertyTax = p.propertyTaxAnnual * k
  const insurance = p.insuranceAnnual * k
  const maintenance = p.maintenanceAnnual * k
  const management = (p.managementPct / 100) * grossRent
  return { grossRent, condoFees, propertyTax, insurance, maintenance, management, total: condoFees + propertyTax + insurance + maintenance + management }
}

export interface PropertyTimelinePoint {
  year: number
  /** Whole-property CAD values at the start of the year. */
  value: number
  balance: number
  /** Owner's share of value − balance. */
  equity: number
}

export function propertyTimeline(p: RentalProperty, startYear: number, years: number): PropertyTimelinePoint[] {
  const share = p.ownershipPct / 100
  const out: PropertyTimelinePoint[] = []
  let value = p.marketValue
  let balance = p.mortgage.balance
  for (let t = 0; t <= years; t++) {
    out.push({ year: startYear + t, value, balance, equity: (value - balance) * share })
    value *= 1 + p.appreciationPct / 100
    balance = amortizeMonths(balance, p.mortgage.annualRatePct, p.mortgage.compounding, p.mortgage.monthlyPayment, 12).endBalance
  }
  return out
}

export function computeRentalYear(p: RentalProperty, o: RentalYearOptions): RentalYear {
  const share = p.ownershipPct / 100
  const breakdown = rentalExpenses(p, o.inflationFactor)
  const am = amortizeMonths(o.balanceStart, p.mortgage.annualRatePct, p.mortgage.compounding, p.mortgage.monthlyPayment, 12)

  const grossRent = breakdown.grossRent
  const expenses = breakdown.total
  const interest = am.interest * share
  const principal = am.principal * share
  const mortgagePaid = am.paid * share
  const netBeforeTax = grossRent - expenses - interest

  const canadaTaxIfNoNr6 = partXIIITax(grossRent, o.tables)
  const canadaTaxWithNr6 = section216Tax(netBeforeTax, o.tables)
  const canadaTax = p.canada.nr6Elected ? canadaTaxWithNr6 : canadaTaxIfNoNr6

  const depreciationUsd = depreciationFor(p, o.year) * share

  return {
    grossRent,
    expenses,
    interest,
    principal,
    mortgagePaid,
    balanceEnd: am.endBalance,
    netBeforeTax,
    canadaTax,
    canadaTaxIfNoNr6,
    canadaTaxWithNr6,
    canadaTaxUsd: canadaTax / o.fx,
    depreciationUsd,
    scheduleENetUsd: netBeforeTax / o.fx - depreciationUsd,
    cashFlowBeforeUsTaxUsd: (grossRent - expenses - mortgagePaid - canadaTax) / o.fx,
    principalUsd: principal / o.fx,
  }
}

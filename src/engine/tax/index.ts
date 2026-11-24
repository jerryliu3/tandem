import { federalIncomeTax, saltCapFor } from './federal'
import { nycSchoolCredits, nycTax, nyStateTax } from './newYork'
import { ficaTaxes, nyPayroll } from './payrollTaxes'
import type { TaxTables } from './tables'

export interface IncomeTaxInput {
  /** Federal (W-2 box 1) wages: gross minus traditional 401(k), HSA and pre-tax premiums. */
  wages: number
  /** Social Security / Medicare wages: gross minus HSA and pre-tax premiums. */
  ficaWages: number
  /** Gross wages for NY PFL / SDI. */
  nyPayrollWages: number
  otherIncome: number
  /** Schedule E amount included in AGI: net income, or an allowed loss as a negative number. */
  scheduleE: number
  foreignTaxPaidUsd: number
  /** Foreign-source income included in taxable income (for the FTC limitation). */
  foreignIncomeUsd: number
  /** Net investment income for NIIT. */
  investmentIncome: number
  iraDeduction: number
  tables: TaxTables
}

export interface TaxBreakdown {
  agi: number
  nyTaxable: number
  federalTaxable: number
  deduction: { kind: 'standard' | 'itemized'; amount: number; saltClaimed: number }
  federalBeforeCredits: number
  foreignTaxCredit: number
  federal: number
  additionalMedicare: number
  niit: number
  socialSecurity: number
  medicare: number
  nyState: number
  nyc: number
  nycCredits: number
  pfl: number
  sdi: number
  total: number
}

export function computeIncomeTaxes(i: IncomeTaxInput): TaxBreakdown {
  const t = i.tables
  const agi = i.wages + i.otherIncome + i.scheduleE - i.iraDeduction

  const nyTaxable = Math.max(0, agi - t.ny.standardDeduction)
  const nyState = nyStateTax(nyTaxable, agi, t)
  const nyc = nycTax(nyTaxable, t)
  const credits = nycSchoolCredits(agi, nyTaxable)
  const nycCredits = credits.fixed + credits.rateReduction

  const saltClaimed = Math.min(nyState + nyc, saltCapFor(agi, t))
  const itemized = saltClaimed > t.federal.standardDeduction
  const deductionAmount = itemized ? saltClaimed : t.federal.standardDeduction
  const federalTaxable = Math.max(0, agi - deductionAmount)

  const federalBeforeCredits = federalIncomeTax(federalTaxable, t)
  const foreignShare = federalTaxable > 0 ? Math.min(1, Math.max(0, i.foreignIncomeUsd) / federalTaxable) : 0
  const foreignTaxCredit = Math.min(Math.max(0, i.foreignTaxPaidUsd), federalBeforeCredits * foreignShare)
  const federal = federalBeforeCredits - foreignTaxCredit

  const fica = ficaTaxes(i.ficaWages, t)
  const payroll = nyPayroll(i.nyPayrollWages, t)
  const niit =
    agi > t.fica.niitThreshold ? t.fica.niitRate * Math.max(0, Math.min(i.investmentIncome, agi - t.fica.niitThreshold)) : 0

  const total =
    federal +
    fica.additionalMedicare +
    niit +
    fica.socialSecurity +
    fica.medicare +
    nyState +
    nyc -
    nycCredits +
    payroll.pfl +
    payroll.sdi

  return {
    agi,
    nyTaxable,
    federalTaxable,
    deduction: { kind: itemized ? 'itemized' : 'standard', amount: deductionAmount, saltClaimed },
    federalBeforeCredits,
    foreignTaxCredit,
    federal,
    additionalMedicare: fica.additionalMedicare,
    niit,
    socialSecurity: fica.socialSecurity,
    medicare: fica.medicare,
    nyState,
    nyc,
    nycCredits,
    pfl: payroll.pfl,
    sdi: payroll.sdi,
    total,
  }
}

import type { Person } from '../model/types'
import { clamp } from './money'
import { passiveAllowance, type RentalYear } from './rental'
import { computeIncomeTaxes, type IncomeTaxInput, type TaxBreakdown } from './tax'
import type { TaxTables } from './tax/tables'

export interface PersonContext {
  tables: TaxTables
  year: number
  /** Cumulative salary growth applied to base salary and RSUs. */
  growthFactor: number
  /** Owner's share of the rental for this year, or null. */
  rental: RentalYear | null
  /** Pre-tax IRA balances (for the backdoor Roth pro-rata warning). */
  traditionalIraBalance: number
}

export interface Contributions {
  k401Trad: number
  k401Roth: number
  k401AfterTax: number
  match: number
  hsaEmployee: number
  hsaEmployer: number
  esppContribution: number
  esppShares: number
}

export interface PersonResult {
  id: Person['id']
  age: number
  base: number
  bonus: number
  cashComp: number
  rsu: number
  esppDiscountIncome: number
  otherIncome: number
  /** Employment + other income (excludes rental). */
  grossIncome: number
  contributions: Contributions
  premiums: number
  caps: string[]
  taxes: {
    /** Taxes on wages and other income only (what the paycheck pays). */
    wage: TaxBreakdown
    /** All layers: wages + RSU + rental. */
    all: TaxBreakdown
    wageTotal: number
    rsuTax: number
    /** Incremental US/NY/NYC tax from the rental (negative when an allowed loss saves tax). */
    rentalTax: number
  }
  rsuNet: number
  takeHomeAnnual: number
  takeHomeMonthly: number
  bonusAfterTax: number
  effectiveRate: number
  marginalRate: number
  magi: number
  iraDeduction: number
  iraLimit: number
  rothIraAllowedDirect: boolean
  /** Max direct Roth contribution given the phase-out. */
  rothIraDirectLimit: number
  passive: { allowed: number; suspended: number }
}

function deferralLimit(t: TaxTables, age: number): number {
  const catchUp = age >= 60 && age <= 63 ? t.limits.k401CatchUp6063 : age >= 50 ? t.limits.k401CatchUp50 : 0
  return t.limits.k401 + catchUp
}

function hsaLimit(t: TaxTables, coverage: Person['payroll']['hsaCoverage'], age: number): number {
  if (coverage === 'none') return 0
  return (coverage === 'family' ? t.limits.hsaFamily : t.limits.hsaSelf) + (age >= 55 ? t.limits.hsaCatchUp : 0)
}

const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`

export function computePerson(person: Person, ctx: PersonContext): PersonResult {
  const t = ctx.tables
  const { income, payroll } = person
  const age = ctx.year - person.birthYear
  const caps: string[] = []

  const base = Math.max(0, income.baseSalary) * ctx.growthFactor
  const bonus = base * (Math.max(0, income.bonusPct) / 100)
  const cashComp = base + bonus
  const rsu = Math.max(0, income.rsuAnnualVest) * ctx.growthFactor
  const discount = clamp(income.esppDiscountPct, 0, 50) / 100
  const esppContribution = base * (clamp(income.esppContribPct, 0, 100) / 100)
  const esppDiscountIncome = discount < 1 ? (esppContribution * discount) / (1 - discount) : 0
  const otherIncome = Math.max(0, income.otherTaxableIncome)

  // 401(k)
  const limit = deferralLimit(t, age)
  const tradReq = base * (Math.max(0, payroll.k401TraditionalPct) / 100)
  const rothReq = base * (Math.max(0, payroll.k401RothPct) / 100)
  const k401Trad = Math.min(tradReq, limit)
  const k401Roth = Math.min(rothReq, limit - k401Trad)
  if (tradReq + rothReq > limit + 0.005) caps.push(`401(k) deferrals capped at the ${t.year} limit of ${money(limit)}`)
  const deferralPct = base > 0 ? ((k401Trad + k401Roth) / base) * 100 : 0
  const match = base * (Math.max(0, payroll.matchPct) / 100) * (Math.min(deferralPct, Math.max(0, payroll.matchUpToPct)) / 100)
  const afterTaxReq = base * (Math.max(0, payroll.k401AfterTaxPct) / 100)
  const afterTaxRoom = Math.max(0, t.limits.dc415c - Math.min(k401Trad + k401Roth, t.limits.k401) - match)
  const k401AfterTax = Math.min(afterTaxReq, afterTaxRoom)
  if (afterTaxReq > afterTaxRoom + 0.005) caps.push(`After-tax 401(k) capped by the ${money(t.limits.dc415c)} total contribution limit`)

  // HSA
  const hLimit = hsaLimit(t, payroll.hsaCoverage, age)
  const hsaEmployer = Math.min(Math.max(0, payroll.hsaEmployerAnnual), hLimit)
  const hsaEmployee = Math.min(Math.max(0, payroll.hsaAnnual), Math.max(0, hLimit - hsaEmployer))
  if (payroll.hsaAnnual > hsaEmployee + 0.005) {
    caps.push(hLimit === 0 ? 'HSA contributions need HDHP coverage' : `HSA contributions capped at ${money(hLimit)}`)
  }
  const premiums = Math.max(0, payroll.preTaxPremiumsMonthly) * 12

  // Layered taxes: wages → +RSU → +rental.
  const grossWages = cashComp + esppDiscountIncome
  const preTax = k401Trad + hsaEmployee + premiums
  const iraLimit = t.limits.ira + (age >= 50 ? t.limits.iraCatchUp : 0)
  const iraContribution = Math.min(Math.max(0, person.ira.annualContribution), iraLimit)

  const layer = (extraWages: number, rental: Partial<IncomeTaxInput>, iraDeduction: number): TaxBreakdown =>
    computeIncomeTaxes({
      wages: grossWages + extraWages - preTax,
      ficaWages: grossWages + extraWages - hsaEmployee - premiums,
      nyPayrollWages: grossWages + extraWages,
      otherIncome,
      scheduleE: 0,
      foreignTaxPaidUsd: 0,
      foreignIncomeUsd: 0,
      investmentIncome: otherIncome,
      iraDeduction,
      tables: t,
      ...rental,
    })

  // MAGI excludes IRA deductions and any rental loss.
  const rentalNet = ctx.rental?.scheduleENetUsd ?? 0
  const magi = grossWages + rsu - preTax + otherIncome + Math.max(0, rentalNet)

  let iraDeduction = 0
  if (person.ira.kind === 'traditional' && iraContribution > 0) {
    const span = t.limits.tradIraPhaseEnd - t.limits.tradIraPhaseStart
    const deductible = 1 - clamp((magi - t.limits.tradIraPhaseStart) / span, 0, 1)
    iraDeduction = iraContribution * deductible
  }

  const wage = layer(0, {}, iraDeduction)
  const withRsu = rsu > 0 ? layer(rsu, {}, iraDeduction) : wage

  let passive = { allowed: 0, suspended: 0 }
  let all = withRsu
  if (ctx.rental) {
    const r = ctx.rental
    let scheduleE = rentalNet
    if (rentalNet < 0) {
      const allowed = Math.min(-rentalNet, passiveAllowance(magi))
      passive = { allowed, suspended: -rentalNet - allowed }
      scheduleE = -allowed
    }
    all = layer(rsu, {
      scheduleE,
      foreignTaxPaidUsd: r.canadaTaxUsd,
      foreignIncomeUsd: Math.max(0, rentalNet),
      investmentIncome: otherIncome + Math.max(0, rentalNet),
    }, iraDeduction)
  }

  const wageTotal = wage.total
  const rsuTax = withRsu.total - wage.total
  const rentalTax = all.total - withRsu.total

  const takeHomeAnnual =
    cashComp - wageTotal - k401Trad - k401Roth - k401AfterTax - hsaEmployee - premiums - esppContribution

  let bonusAfterTax = 0
  if (income.bonusToSavings && bonus > 0) {
    const noBonus = computeIncomeTaxes({
      wages: grossWages - bonus - preTax,
      ficaWages: grossWages - bonus - hsaEmployee - premiums,
      nyPayrollWages: grossWages - bonus,
      otherIncome,
      scheduleE: 0,
      foreignTaxPaidUsd: 0,
      foreignIncomeUsd: 0,
      investmentIncome: otherIncome,
      iraDeduction,
      tables: t,
    })
    bonusAfterTax = bonus - (wageTotal - noBonus.total)
  }
  const takeHomeMonthly = (takeHomeAnnual - bonusAfterTax) / 12

  const bump = layer(1000, {}, iraDeduction)
  const marginalRate = (bump.total - wage.total) / 1000

  const grossIncome = cashComp + esppDiscountIncome + otherIncome + rsu
  const wageIncome = cashComp + esppDiscountIncome + otherIncome
  const span = t.limits.rothPhaseEnd - t.limits.rothPhaseStart
  const rothIraDirectLimit = iraLimit * clamp((t.limits.rothPhaseEnd - magi) / span, 0, 1)

  return {
    id: person.id,
    age,
    base,
    bonus,
    cashComp,
    rsu,
    esppDiscountIncome,
    otherIncome,
    grossIncome,
    contributions: {
      k401Trad,
      k401Roth,
      k401AfterTax,
      match,
      hsaEmployee,
      hsaEmployer,
      esppContribution,
      esppShares: esppContribution + esppDiscountIncome,
    },
    premiums,
    caps,
    taxes: { wage, all, wageTotal, rsuTax, rentalTax },
    rsuNet: rsu - rsuTax,
    takeHomeAnnual,
    takeHomeMonthly,
    bonusAfterTax,
    effectiveRate: wageIncome > 0 ? wageTotal / wageIncome : 0,
    marginalRate,
    magi,
    iraDeduction,
    iraLimit,
    rothIraAllowedDirect: magi < t.limits.rothPhaseStart,
    rothIraDirectLimit,
    passive,
  }
}

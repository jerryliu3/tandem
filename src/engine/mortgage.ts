export type Compounding = 'semi-annual' | 'monthly'

/** Canadian fixed-rate mortgages compound semi-annually; most others monthly. */
export function monthlyRate(annualPct: number, compounding: Compounding): number {
  const r = annualPct / 100
  return compounding === 'semi-annual' ? (1 + r / 2) ** (1 / 6) - 1 : r / 12
}

export interface AmortizationResult {
  interest: number
  principal: number
  /** Total actually paid (less than months × payment once the loan is paid off). */
  paid: number
  endBalance: number
  /** 1-based month within this window when the balance hit zero, or null. */
  paidOffMonth: number | null
}

export function amortizeMonths(
  balance: number,
  annualPct: number,
  compounding: Compounding,
  payment: number,
  months: number,
): AmortizationResult {
  const i = monthlyRate(annualPct, compounding)
  let bal = Math.max(0, balance)
  let interest = 0
  let principal = 0
  let paid = 0
  let paidOffMonth: number | null = null
  for (let m = 1; m <= months && bal > 0; m++) {
    const int = bal * i
    const pay = Math.min(Math.max(0, payment), bal + int)
    interest += int
    principal += pay - int
    paid += pay
    bal = bal + int - pay
    if (bal <= 1e-9) {
      bal = 0
      paidOffMonth = m
    }
  }
  return { interest, principal, paid, endBalance: bal, paidOffMonth }
}

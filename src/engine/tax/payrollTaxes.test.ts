import { describe, expect, it } from 'vitest'
import { ficaTaxes, nyPayroll } from './payrollTaxes'
import { getTables } from './tables'

const t2026 = getTables(2026, 2.5)
const t2027 = getTables(2027, 2.5)

describe('FICA', () => {
  it('computes Social Security and Medicare below the wage base', () => {
    const f = ficaTaxes(115000, t2026)
    expect(f.socialSecurity).toBeCloseTo(7130, 2)
    expect(f.medicare).toBeCloseTo(1667.5, 2)
    expect(f.additionalMedicare).toBe(0)
  })

  it('caps Social Security and adds the 0.9% Additional Medicare tax over $200k', () => {
    const f = ficaTaxes(250000, t2027)
    expect(f.socialSecurity).toBeCloseTo(11922.6, 2)
    expect(f.medicare).toBeCloseTo(3625, 2)
    expect(f.additionalMedicare).toBeCloseTo(450, 2)
  })
})

describe('NY payroll deductions', () => {
  it('caps Paid Family Leave and SDI', () => {
    expect(nyPayroll(115000, t2027)).toEqual({ pfl: 451.81, sdi: 31.2 })
    expect(nyPayroll(115000, t2026)).toEqual({ pfl: 411.91, sdi: 31.2 })
  })

  it('charges PFL proportionally below the cap', () => {
    expect(nyPayroll(20000, t2026).pfl).toBeCloseTo(86.4, 6)
    expect(nyPayroll(0, t2026)).toEqual({ pfl: 0, sdi: 0 })
  })
})

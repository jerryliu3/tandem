import { PLACEHOLDERS } from '../model/placeholders'
import type { Insight, PersonId, Plan } from '../model/types'
import type { PlanResult } from './plan'

const fmt = (x: number) => `$${Math.round(Math.abs(x)).toLocaleString('en-US')}`
const cad = (x: number) => `C$${Math.round(Math.abs(x)).toLocaleString('en-US')}`
const pct = (x: number) => `${Math.round(x)}%`

export function buildInsights(plan: Plan, r: Omit<PlanResult, 'insights'>): Insight[] {
  const out: Insight[] = []
  const t = r.tables

  for (const person of plan.people) {
    const id = person.id as PersonId
    const pr = r.people[id]
    const b = r.budgets[id]
    const name = person.name

    if (b.discretionary < -0.5) {
      out.push({
        id: `negative-discretionary-${id}`,
        severity: 'critical',
        title: `${name}'s spending plan is ${fmt(b.discretionary)}/mo short`,
        detail: `After saving ${pct(b.savingsRatePct)} (${fmt(b.savings)}/mo), fixed costs of ${fmt(b.fixed)} and yearly set-asides of ${fmt(b.yearlyMonthly)}/mo exceed the ${fmt(b.allowance)} spending allowance. A ${pct(Math.max(0, b.breakEvenSavingsRatePct))} savings rate would balance it.`,
        personId: id,
        page: 'budget',
      })
    }

    pr.caps.forEach((cap, n) =>
      out.push({ id: `cap-${id}-${n}`, severity: 'warn', title: cap, detail: `${name}'s requested contribution exceeds the limit; the excess is ignored.`, personId: id, page: 'income' }),
    )

    const deferralPct = pr.base > 0 ? ((pr.contributions.k401Trad + pr.contributions.k401Roth) / pr.base) * 100 : 0
    if (person.payroll.matchPct > 0 && deferralPct + 0.01 < person.payroll.matchUpToPct) {
      const missed = pr.base * (person.payroll.matchPct / 100) * ((person.payroll.matchUpToPct - deferralPct) / 100)
      out.push({
        id: `unused-match-${id}`,
        severity: 'warn',
        title: `${name} is leaving ${fmt(missed)}/yr of employer match on the table`,
        detail: `Defer at least ${person.payroll.matchUpToPct}% of salary to the 401(k) to collect the full match.`,
        personId: id,
        page: 'income',
      })
    }

    if (pr.contributions.k401Trad === 0 && pr.contributions.k401Roth === 0) {
      out.push({
        id: `no-401k-${id}`,
        severity: 'info',
        title: `${name}: each $1,000 in a traditional 401(k) saves ~${fmt(pr.marginalRate * 1000 - 7.65 * 10)} in tax`,
        detail: `Pre-tax deferrals skip federal, NY and NYC income tax (not FICA). Room this year: ${fmt(t.limits.k401)}.`,
        personId: id,
        page: 'income',
      })
    }

    const s = r.savings[id]
    if (s.iraBackdoor) {
      const proRata = plan.accounts.some((a) => a.ownerId === id && a.type === 'ira_traditional' && a.balance > 0)
      out.push({
        id: `backdoor-roth-${id}`,
        severity: proRata ? 'warn' : 'info',
        title: `${name}: contribute through a backdoor Roth`,
        detail: `MAGI of ${fmt(pr.magi)} exceeds the ${t.year} Roth IRA phase-out (${fmt(t.limits.rothPhaseStart)}–${fmt(t.limits.rothPhaseEnd)}). Make a non-deductible traditional IRA contribution and convert it.${proRata ? ' A pre-tax IRA balance triggers the pro-rata rule — roll it into the 401(k) first.' : ''}`,
        personId: id,
        page: 'accounts',
      })
    } else if (person.ira.annualContribution === 0) {
      out.push({
        id: `ira-room-${id}`,
        severity: 'info',
        title: `${name} has ${fmt(pr.iraLimit)} of unused IRA room`,
        detail: pr.rothIraAllowedDirect
          ? 'A Roth IRA contribution grows tax-free and can be made directly at this income.'
          : 'Income is above the Roth limit; use the backdoor Roth.',
        personId: id,
        page: 'accounts',
      })
    }

    if (pr.passive.suspended > 0) {
      out.push({
        id: `suspended-loss-${id}`,
        severity: 'info',
        title: `${fmt(pr.passive.suspended)} of rental loss is suspended`,
        detail: 'Above $100k of MAGI the $25,000 passive-loss allowance phases out; the excess carries forward to future years or a sale.',
        personId: id,
        page: 'property',
      })
    }

    if (pr.taxes.all.deduction.kind === 'itemized') {
      out.push({
        id: `itemized-${id}`,
        severity: 'info',
        title: `${name} itemizes: ${fmt(pr.taxes.all.deduction.saltClaimed)} of NY + NYC income tax deducted`,
        detail: `State and local taxes exceed the ${fmt(t.federal.standardDeduction)} standard deduction (SALT cap ${fmt(t.federal.saltCap)}).`,
        personId: id,
        page: 'income',
      })
    }
  }

  for (const p of plan.properties) {
    const ry = r.rentals[p.id]
    if (!ry) continue
    if (!p.canada.nr6Elected) {
      out.push({
        id: `nr6-${p.id}`,
        severity: 'critical',
        title: `File an NR6 for the ${p.name}: save ${cad(ry.canadaTaxIfNoNr6 - ry.canadaTaxWithNr6)}/yr`,
        detail: 'Without an NR6, Canada withholds 25% of gross rent. With it you pay tax on net rent via a Section 216 return.',
        page: 'property',
      })
    }
    if (ry.rentalTaxUsd < -1) {
      out.push({
        id: `rental-loss-${p.id}`,
        severity: 'positive',
        title: `Condo depreciation lowers US taxes by ${fmt(ry.rentalTaxUsd)}/yr`,
        detail: 'The required 30-year depreciation turns positive cash rent into a deductible Schedule E loss.',
        page: 'property',
      })
    }
    if (ry.cashFlowAnnualUsd < 0) {
      out.push({
        id: `condo-cash-${p.id}`,
        severity: 'info',
        title: `The ${p.name} draws ${fmt(ry.cashFlowMonthlyUsd)}/mo from savings`,
        detail: `Rent doesn't cover the full mortgage payment, but ${fmt(ry.principalUsd / 12)}/mo of principal builds equity.`,
        page: 'property',
      })
    }
  }

  for (const a of plan.accounts) {
    if ((a.type === 'tfsa' || a.type === 'fhsa') && (a.annualContribution ?? 0) > 0) {
      out.push({
        id: `tfsa-contrib-${a.id}`,
        severity: 'warn',
        title: `${a.name}: contributions as a non-resident are penalized`,
        detail: 'Canada charges 1% per month on TFSA contributions made while non-resident, and the US taxes TFSA/FHSA growth annually.',
        page: 'accounts',
      })
    }
    if (a.type === 'rrsp' && (a.annualContribution ?? 0) > 0) {
      out.push({
        id: `rrsp-contrib-${a.id}`,
        severity: 'info',
        title: `${a.name}: RRSP deductions may be worth little as a non-resident`,
        detail: 'Growth stays tax-deferred in the US under the treaty, but there is no US deduction for contributions.',
        page: 'accounts',
      })
    }
  }

  const missing = plan.placeholders.map((k) => PLACEHOLDERS[k]?.label).filter(Boolean)
  if (missing.length > 0) {
    out.push({
      id: 'placeholders',
      severity: 'info',
      title: `${missing.length} inputs are still placeholders`,
      detail: `Update ${missing.join(', ')} for sharper numbers.`,
      page: 'settings',
    })
  }

  const order = { critical: 0, warn: 1, positive: 2, info: 3 }
  return out.sort((x, y) => order[x.severity] - order[y.severity])
}

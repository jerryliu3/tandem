import type { PersonId, Scope } from '../model/types'
import { BUCKET_OF, type Bucket } from '../engine/accounts'
import type { PlanResult } from '../engine/plan'
import { scopeShare, type Projection } from '../engine/projection'

export function scopePeople(scope: Scope): PersonId[] {
  return scope === 'household' ? ['jerry', 'sophia'] : [scope]
}

export function sumPeople(r: PlanResult, scope: Scope, fn: (p: PlanResult['people'][PersonId]) => number): number {
  return scopePeople(scope).reduce((s, id) => s + fn(r.people[id]), 0)
}

export const BUCKET_ORDER: Bucket[] = ['preTax', 'roth', 'taxable', 'cash', 'canadian']
export const BUCKET_COLOR: Record<Bucket | 'realEstate', string> = {
  preTax: 'var(--chart-1)',
  roth: 'var(--chart-2)',
  taxable: 'var(--chart-5)',
  cash: 'var(--chart-4)',
  canadian: 'var(--chart-3)',
  realEstate: 'var(--chart-7)',
}

export interface WealthPoint {
  year: number
  preTax: number
  roth: number
  taxable: number
  cash: number
  canadian: number
  realEstate: number
  debts: number
  netWorth: number
  investable: number
}

/** Year-by-year balances by bucket for a scope; `real` deflates to today's dollars. */
export function wealthSeries(proj: Projection, scope: Scope, real: boolean): WealthPoint[] {
  const meta = new Map(proj.accounts.map((a) => [a.id, a]))
  return proj.years.map((y) => {
    const f = real ? y.deflator : 1
    const pt: WealthPoint = { year: y.year, preTax: 0, roth: 0, taxable: 0, cash: 0, canadian: 0, realEstate: y.equity[scope] * f, debts: -y.debtsUsd[scope] * f, netWorth: y.netWorth[scope] * f, investable: y.investable[scope] * f }
    for (const [id, bal] of Object.entries(y.accounts)) {
      const acc = meta.get(id)
      const bucket = acc ? BUCKET_OF[acc.type] : 'taxable'
      pt[bucket] += bal * scopeShare(acc?.ownerId ?? 'joint', scope) * f
    }
    return pt
  })
}

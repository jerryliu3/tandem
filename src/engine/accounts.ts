import type { Account, AccountType, PersonId, Plan } from '../model/types'

export type Bucket = 'preTax' | 'roth' | 'taxable' | 'cash' | 'canadian'

export const BUCKET_OF: Record<AccountType, Bucket> = {
  k401_traditional: 'preTax',
  ira_traditional: 'preTax',
  k401_roth: 'roth',
  ira_roth: 'roth',
  hsa: 'roth',
  brokerage: 'taxable',
  cash: 'cash',
  rrsp: 'canadian',
  tfsa: 'canadian',
  fhsa: 'canadian',
}

export const BUCKET_LABEL: Record<Bucket, string> = {
  preTax: 'Pre-tax',
  roth: 'Roth & HSA',
  taxable: 'Taxable',
  cash: 'Cash',
  canadian: 'Canadian',
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  k401_traditional: '401(k) · Traditional',
  k401_roth: '401(k) · Roth',
  ira_traditional: 'Traditional IRA',
  ira_roth: 'Roth IRA',
  hsa: 'HSA',
  brokerage: 'Brokerage',
  cash: 'Cash / HYSA',
  rrsp: 'RRSP',
  tfsa: 'TFSA',
  fhsa: 'FHSA',
}

/** Accounts taxed annually in the US on growth (tax drag). */
export const TAXABLE_GROWTH: ReadonlySet<AccountType> = new Set(['brokerage', 'tfsa', 'fhsa'])

export function emptyBuckets(): Record<Bucket, number> {
  return { preTax: 0, roth: 0, taxable: 0, cash: 0, canadian: 0 }
}

/** First account matching owner + type, or a synthetic `auto:` id created on demand. */
export function resolveAccountId(plan: Plan, ownerId: PersonId | 'joint', type: AccountType): string {
  const found = plan.accounts.find((a) => a.ownerId === ownerId && a.type === type)
  return found ? found.id : `auto:${ownerId}:${type}`
}

export function autoAccountFromId(id: string, plan: Plan): Account | null {
  const m = /^auto:(jerry|sophia|joint):([a-z0-9_]+)$/.exec(id)
  if (!m) return null
  const ownerId = m[1] as PersonId | 'joint'
  const type = m[2] as AccountType
  const ownerName = ownerId === 'joint' ? 'Joint' : plan.people.find((p) => p.id === ownerId)?.name ?? ownerId
  return { id, name: `${ownerName} · ${ACCOUNT_TYPE_LABEL[type]}`, type, ownerId, balance: 0, currency: 'USD' }
}

export function accountType(plan: Plan, id: string): AccountType {
  return plan.accounts.find((a) => a.id === id)?.type ?? autoAccountFromId(id, plan)?.type ?? 'brokerage'
}

/** A balance as returned by our /api/balances endpoint. Transactions are never included. */
export interface RemoteBalance {
  id: string
  name: string
  currency: string
  balance: number
  org: string | null
  /** Unix seconds, when the bank reported the balance. */
  balanceDate: number | null
}

export interface BankLinkRef {
  accountId: string | null
}

export interface LinkedAccount {
  id: string
  name: string
  currency: string
}

export function parseRemoteBalances(raw: unknown): { accounts: RemoteBalance[]; warnings: string[] } {
  if (typeof raw !== 'object' || raw === null) throw new Error('SimpleFIN returned something that was not an account list.')
  const body = raw as { errors?: unknown; accounts?: unknown }
  const warnings = Array.isArray(body.errors) ? body.errors.filter((e): e is string => typeof e === 'string') : []
  if (!Array.isArray(body.accounts)) throw new Error(warnings[0] ?? 'SimpleFIN returned no accounts.')
  const accounts: RemoteBalance[] = []
  for (const item of body.accounts) {
    if (typeof item !== 'object' || item === null) continue
    const a = item as Record<string, unknown>
    const balance = typeof a.balance === 'string' ? Number(a.balance) : typeof a.balance === 'number' ? a.balance : NaN
    if (typeof a.id !== 'string' || typeof a.name !== 'string' || !Number.isFinite(balance)) continue
    const org = a.org
    const orgName =
      typeof org === 'object' && org !== null
        ? stringField(org as Record<string, unknown>, 'name') ?? stringField(org as Record<string, unknown>, 'domain')
        : null
    const date = typeof a['balance-date'] === 'number' && Number.isFinite(a['balance-date']) ? a['balance-date'] : null
    accounts.push({
      id: a.id,
      name: a.name,
      currency: typeof a.currency === 'string' && a.currency ? a.currency.toUpperCase() : 'USD',
      balance,
      org: orgName,
      balanceDate: date !== null && date > 1e12 ? Math.round(date / 1000) : date,
    })
  }
  return { accounts, warnings }
}

function stringField(o: Record<string, unknown>, key: string): string | null {
  return typeof o[key] === 'string' && o[key] ? (o[key] as string) : null
}

/** Balances to write, in the Tandem account's own currency. Problems are described and skipped. */
export function matchedBalances(
  accounts: LinkedAccount[],
  links: Record<string, BankLinkRef | undefined>,
  remote: RemoteBalance[],
): { balances: Record<string, number>; notices: string[] } {
  const byTarget = new Map<string, RemoteBalance[]>()
  for (const r of remote) {
    const link = links[r.id]
    if (!link || link.accountId === null) continue
    const list = byTarget.get(link.accountId) ?? []
    list.push(r)
    byTarget.set(link.accountId, list)
  }
  const balances: Record<string, number> = {}
  const notices: string[] = []
  for (const [accountId, group] of byTarget) {
    const acc = accounts.find((a) => a.id === accountId)
    const names = group.map((g) => g.name).join(' and ')
    if (!acc) {
      notices.push(`${names} is linked to an account that no longer exists.`)
      continue
    }
    if (group.length > 1) {
      notices.push(`${names} both point at ${acc.name}, so neither was applied.`)
      continue
    }
    const r = group[0]
    if (r.currency !== acc.currency) {
      notices.push(`${r.name} is in ${r.currency}, but ${acc.name} is ${acc.currency}.`)
      continue
    }
    if (r.balance < 0) {
      notices.push(`${r.name} has a negative balance, so ${acc.name} was left unchanged.`)
      continue
    }
    balances[acc.id] = Math.round(r.balance * 100) / 100
  }
  return { balances, notices }
}

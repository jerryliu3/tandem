import { parseRemoteBalances, type RemoteBalance } from '../engine/bankSync.ts'

export interface BalancesBody {
  accounts?: RemoteBalance[]
  warnings?: string[]
  error?: string
}

export interface BalancesResult {
  status: number
  body: BalancesBody
}

function parsedAccessUrl(accessUrl: string): URL {
  const trimmed = accessUrl.trim().replace(/\/+$/, '')
  const base = trimmed.endsWith('/accounts') ? trimmed.slice(0, -'/accounts'.length) : trimmed
  let url: URL
  try {
    url = new URL(base)
  } catch {
    throw new Error('SIMPLEFIN_ACCESS_URL is not a valid URL.')
  }
  if (url.protocol !== 'https:') throw new Error('SIMPLEFIN_ACCESS_URL must start with https.')
  if (!url.username || !url.password) throw new Error('SIMPLEFIN_ACCESS_URL is missing the username or password from SimpleFIN.')
  return url
}

/** Accounts endpoint with the password removed, so it is safe to log or pass to fetch. */
export function accountsUrl(accessUrl: string): string {
  const url = parsedAccessUrl(accessUrl)
  return `https://${url.host}${url.pathname}/accounts?balances-only=1`
}

export function simplefinAuthorization(accessUrl: string): string {
  const url = parsedAccessUrl(accessUrl)
  return `Basic ${btoa(`${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`)}`
}

export async function fetchBalances(accessUrl: string): Promise<{ accounts: RemoteBalance[]; warnings: string[] }> {
  let res: Response
  try {
    res = await fetch(accountsUrl(accessUrl), { headers: { Accept: 'application/json', Authorization: simplefinAuthorization(accessUrl) } })
  } catch {
    throw new Error('Could not reach SimpleFIN.')
  }
  if (res.status === 403) throw new Error('SimpleFIN refused the access URL. Claim a new setup token.')
  if (res.status === 402) throw new Error('The SimpleFIN subscription needs attention.')
  if (res.status === 429) throw new Error('SimpleFIN rate limit reached. Try again tomorrow.')
  if (!res.ok) throw new Error(`SimpleFIN returned status ${res.status}.`)
  return parseRemoteBalances(await res.json())
}

export async function balancesResponse(input: {
  method: string
  authorization: string | undefined
  accessUrl: string | undefined
  syncSecret: string | undefined
}): Promise<BalancesResult> {
  if (input.method !== 'GET') return { status: 405, body: { error: 'Method not allowed' } }
  if (!input.accessUrl || !input.syncSecret) return { status: 503, body: { error: 'Sync is not configured on the server.' } }
  if (input.authorization !== `Bearer ${input.syncSecret}`) return { status: 401, body: { error: 'That sync token does not match the server.' } }
  try {
    const { accounts, warnings } = await fetchBalances(input.accessUrl)
    return { status: 200, body: { accounts, warnings } }
  } catch (e) {
    return { status: 502, body: { error: e instanceof Error ? e.message : 'Could not reach SimpleFIN.' } }
  }
}

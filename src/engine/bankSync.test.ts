import { describe, expect, it } from 'vitest'
import { matchedBalances, parseRemoteBalances } from './bankSync'
import { accountsUrl, balancesResponse } from '../server/simplefin'

const accounts = [
  { id: 'brokerage', name: 'Brokerage', currency: 'USD' },
  { id: 'tfsa', name: 'TFSA', currency: 'CAD' },
]

describe('accountsUrl', () => {
  it('points at balances only and keeps the access path', () => {
    expect(accountsUrl('https://user:pass@bridge.simplefin.org/simplefin/')).toBe(
      'https://user:pass@bridge.simplefin.org/simplefin/accounts?balances-only=1',
    )
    expect(accountsUrl('https://user:pass@bridge.simplefin.org/simplefin/accounts')).toBe(
      'https://user:pass@bridge.simplefin.org/simplefin/accounts?balances-only=1',
    )
  })

  it('refuses a request before calling SimpleFIN when the token or server is missing', async () => {
    const url = 'https://user:pass@bridge.simplefin.org/simplefin'
    expect((await balancesResponse({ method: 'POST', authorization: 'Bearer s', accessUrl: url, syncSecret: 's' })).status).toBe(405)
    expect((await balancesResponse({ method: 'GET', authorization: 'Bearer s', accessUrl: undefined, syncSecret: 's' })).status).toBe(503)
    expect((await balancesResponse({ method: 'GET', authorization: 'Bearer wrong', accessUrl: url, syncSecret: 's' })).status).toBe(401)
  })

  it('rejects a URL that is not an access URL', () => {
    expect(() => accountsUrl('http://user:pass@bridge.simplefin.org/simplefin')).toThrow(/https/)
    expect(() => accountsUrl('https://bridge.simplefin.org/simplefin')).toThrow(/password/)
  })
})

describe('parseRemoteBalances', () => {
  it('keeps balances and drops transactions', () => {
    const parsed = parseRemoteBalances({
      errors: ['One bank is down'],
      accounts: [
        {
          id: 'chk',
          name: 'Checking',
          currency: 'usd',
          balance: '1250.50',
          'balance-date': 1_700_000_000,
          org: { name: 'Chase' },
          transactions: [{ id: 't1', amount: '-4.00', description: 'coffee' }],
        },
        { id: 'bad', name: 'Broken' },
      ],
    })
    expect(parsed.warnings).toEqual(['One bank is down'])
    expect(parsed.accounts).toEqual([
      { id: 'chk', name: 'Checking', currency: 'USD', balance: 1250.5, org: 'Chase', balanceDate: 1_700_000_000 },
    ])
    expect(JSON.stringify(parsed)).not.toContain('coffee')
  })
})

describe('matchedBalances', () => {
  const remote = [
    { id: 's1', name: 'Checking', currency: 'USD', balance: 1250.5, org: 'Chase', balanceDate: null },
    { id: 's2', name: 'TFSA', currency: 'CAD', balance: 800, org: null, balanceDate: null },
    { id: 's3', name: 'Card', currency: 'USD', balance: -40, org: null, balanceDate: null },
  ]

  it('fills linked accounts in their own currency', () => {
    const links = { s1: { accountId: 'brokerage' }, s2: { accountId: 'tfsa' }, s3: { accountId: null } }
    expect(matchedBalances(accounts, links, remote)).toEqual({
      balances: { brokerage: 1250.5, tfsa: 800 },
      notices: [],
    })
  })

  it('skips a negative balance and two bank accounts pointing at one account', () => {
    const links = { s1: { accountId: 'tfsa' }, s2: { accountId: 'tfsa' }, s3: { accountId: 'brokerage' } }
    const result = matchedBalances(accounts, links, remote)
    expect(result.balances).toEqual({})
    expect(result.notices).toHaveLength(2)
  })
})

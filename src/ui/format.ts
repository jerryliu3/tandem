import { useCallback, useMemo } from 'react'
import type { Currency } from '../model/types'
import { usePlanStore } from '../store/planStore'

export interface MoneyOptions {
  compact?: boolean
  decimals?: number
  /** Show "+" for positive values. */
  sign?: boolean
  /** Format in this currency without converting (value already in it). */
  native?: Currency
}

const SYMBOL: Record<Currency, string> = { USD: '$', CAD: 'C$' }

export function formatCurrency(value: number, currency: Currency, o: Omit<MoneyOptions, 'native'> = {}): string {
  const neg = value < 0 || Object.is(value, -0)
  const abs = Math.abs(value)
  let body: string
  if (o.compact && abs >= 1000) {
    const [div, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1e3, 'k']
    const v = abs / div
    const digits = o.decimals ?? (v >= 100 ? 0 : v >= 10 ? 1 : 2)
    body = `${v.toFixed(digits).replace(/\.0+$|(\.\d*?)0+$/, '$1')}${suffix}`
  } else {
    const digits = o.decimals ?? 0
    body = abs.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  }
  const isZero = Number(body.replace(/[^\d.]/g, '')) === 0
  const prefix = neg && !isZero ? '−' : o.sign && !isZero ? '+' : ''
  return `${prefix}${SYMBOL[currency]}${body}`
}

/** `pct` is a percent number (15 = 15%). */
export function formatPct(pct: number, decimals = 1): string {
  if (!Number.isFinite(pct)) return '—'
  const s = pct.toFixed(decimals).replace(/\.0+$/, '')
  return `${s === '-0' ? '0' : s.replace('-', '−')}%`
}

export function formatNumber(x: number, decimals = 0): string {
  return x.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Formatter for engine values (USD) in the user's display currency. */
export function useMoney() {
  const currency = usePlanStore((s) => s.plan.settings.displayCurrency)
  const fx = usePlanStore((s) => s.plan.settings.fxCadPerUsd)
  const toDisplay = useCallback((usd: number) => (currency === 'CAD' ? usd * fx : usd), [currency, fx])
  const money = useCallback(
    (usd: number, o: MoneyOptions = {}) =>
      o.native ? formatCurrency(usd, o.native, o) : formatCurrency(toDisplay(usd), currency, o),
    [currency, toDisplay],
  )
  return useMemo(
    () => ({ money, compact: (usd: number) => money(usd, { compact: true }), toDisplay, currency, fx, symbol: SYMBOL[currency] }),
    [money, toDisplay, currency, fx],
  )
}

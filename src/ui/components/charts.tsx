import type { ReactNode } from 'react'

export interface TooltipItem {
  name?: unknown
  value?: unknown
  color?: string
  fill?: string
  stroke?: string
  dataKey?: unknown
  payload?: unknown
}

export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
  footer,
  hideZero = true,
}: {
  active?: boolean
  payload?: readonly TooltipItem[]
  label?: unknown
  format: (v: number) => string
  labelFormat?: (label: unknown) => ReactNode
  footer?: (payload: readonly TooltipItem[]) => ReactNode
  hideZero?: boolean
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => typeof p.value === 'number' && (!hideZero || Math.abs(p.value) > 0.5))
  return (
    <div className="popover-surface min-w-44 rounded-xl px-3 py-2.5 text-xs">
      {label !== undefined && <div className="mb-1.5 font-medium text-ink">{labelFormat ? labelFormat(label) : String(label)}</div>}
      <div className="space-y-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="size-2 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill }} />
              {String(p.name ?? p.dataKey ?? '')}
            </span>
            <span className="num text-ink">{format(p.value as number)}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-1.5 border-t border-line pt-1.5">{footer(payload)}</div>}
    </div>
  )
}

export const AXIS_PROPS = {
  stroke: 'var(--faint)',
  tick: { fill: 'var(--faint)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const GRID_PROPS = {
  stroke: 'var(--grid)',
  strokeDasharray: '0',
  vertical: false,
} as const

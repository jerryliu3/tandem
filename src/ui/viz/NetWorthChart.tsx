import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Scope } from '../../model/types'
import { BUCKET_LABEL } from '../../engine/accounts'
import type { Projection } from '../../engine/projection'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from '../components/charts'
import { BUCKET_COLOR, BUCKET_ORDER, wealthSeries } from '../data'
import { useMoney } from '../format'

const SERIES = [
  ...BUCKET_ORDER.map((b) => ({ key: b, label: BUCKET_LABEL[b], color: BUCKET_COLOR[b] })),
  { key: 'realEstate' as const, label: 'Real estate equity', color: BUCKET_COLOR.realEstate },
]

export function NetWorthChart({
  projection,
  scope,
  real,
  height = 300,
  goal,
  untilYear,
}: {
  projection: Projection
  scope: Scope
  real: boolean
  height?: number
  goal?: { year: number; amount: number }
  untilYear?: number
}) {
  const { money, compact } = useMoney()
  const data = wealthSeries(projection, scope, real).filter((d) => !untilYear || d.year <= untilYear)
  const active = SERIES.filter((s) => data.some((d) => Math.abs(d[s.key]) > 1))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {active.map((s) => (
            <linearGradient key={s.key} id={`nw-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: s.color, stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: s.color, stopOpacity: 0.08 }} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="year" {...AXIS_PROPS} minTickGap={24} />
        <YAxis {...AXIS_PROPS} width={56} tickFormatter={(v: number) => compact(v)} />
        <Tooltip
          cursor={{ stroke: 'var(--faint)', strokeDasharray: '3 3' }}
          content={(p) => (
            <ChartTooltip
              {...p}
              format={(v) => money(v)}
              footer={(payload) => {
                const total = payload.reduce((s, it) => s + (typeof it.value === 'number' ? it.value : 0), 0)
                return (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Total</span>
                    <span className="num font-semibold text-ink">{money(total)}</span>
                  </div>
                )
              }}
            />
          )}
        />
        {goal && <ReferenceLine y={goal.amount} stroke="var(--positive)" strokeDasharray="5 5" strokeOpacity={0.8} label={{ value: `Goal ${compact(goal.amount)}`, position: 'insideTopLeft', fill: 'var(--positive)', fontSize: 11 }} />}
        {goal && <ReferenceLine x={goal.year} stroke="var(--faint)" strokeDasharray="3 3" />}
        {active.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stackId="1" stroke={s.color} strokeWidth={1.5} fill={`url(#nw-${s.key})`} isAnimationActive animationDuration={700} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function NetWorthLegend({ projection, scope }: { projection: Projection; scope: Scope }) {
  const data = wealthSeries(projection, scope, false)
  const active = SERIES.filter((s) => data.some((d) => Math.abs(d[s.key]) > 1))
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {active.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

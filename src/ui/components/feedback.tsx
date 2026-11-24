import { AlertTriangle, ArrowUpRight, Lightbulb, OctagonAlert, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Insight, Scope } from '../../model/types'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../cn'

const BADGE_TONE = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent/15 text-accent',
  positive: 'bg-positive/15 text-positive',
  negative: 'bg-negative/15 text-negative',
  warning: 'bg-warning/15 text-warning',
} as const

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: keyof typeof BADGE_TONE; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', BADGE_TONE[tone], className)}>{children}</span>
}

export function ProgressBar({
  value,
  max = 1,
  tone = 'accent',
  className,
  height = 'h-1.5',
}: {
  value: number
  max?: number
  tone?: 'accent' | 'positive' | 'negative' | 'warning'
  className?: string
  height?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const bg = tone === 'accent' ? 'bg-accent-gradient' : tone === 'positive' ? 'bg-positive' : tone === 'negative' ? 'bg-negative' : 'bg-warning'
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-track', height, className)}>
      <motion.div className={cn('h-full rounded-full', bg)} initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  )
}

const SEVERITY = {
  critical: { icon: OctagonAlert, cls: 'text-negative bg-negative/12' },
  warn: { icon: AlertTriangle, cls: 'text-warning bg-warning/12' },
  positive: { icon: Sparkles, cls: 'text-positive bg-positive/12' },
  info: { icon: Lightbulb, cls: 'text-accent bg-accent/12' },
} as const

export function filterInsights(insights: Insight[], scope: Scope): Insight[] {
  return scope === 'household' ? insights : insights.filter((i) => !i.personId || i.personId === scope)
}

export function InsightList({ insights, limit, clamp, empty = 'Nothing needs attention.' }: { insights: Insight[]; limit?: number; clamp?: boolean; empty?: ReactNode }) {
  const setPage = useUiStore((s) => s.setPage)
  const shown = limit ? insights.slice(0, limit) : insights
  if (shown.length === 0) return <p className="text-sm text-faint">{empty}</p>
  return (
    <ul className="-mx-2 space-y-1">
      {shown.map((i) => {
        const S = SEVERITY[i.severity]
        const Icon = S.icon
        return (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => i.section && setPage('setup', i.section)}
              className="group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', S.cls)}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug font-medium text-ink">{i.title}</span>
                <span className={cn('mt-0.5 text-xs leading-relaxed text-muted', clamp ? 'line-clamp-2' : 'block')} title={clamp ? i.detail : undefined}>
                  {i.detail}
                </span>
              </span>
              {i.section && <ArrowUpRight size={14} className="mt-1 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">{icon}</div>
      <div className="font-medium text-ink">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function Legend({ items }: { items: { label: ReactNode; color: string; value?: ReactNode }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="truncate text-muted">{it.label}</span>
          </span>
          {it.value !== undefined && <span className="num shrink-0 text-ink">{it.value}</span>}
        </li>
      ))}
    </ul>
  )
}

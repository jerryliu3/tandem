import type { ReactNode } from 'react'
import { cn } from '../cn'
import { AnimatedNumber } from './AnimatedNumber'
import { Explain, type ExplainLine } from './overlays'

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('glass rounded-2xl', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h3 className="text-[13px] font-medium tracking-wide text-muted">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-faint">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn('p-5', Boolean(title || action) && 'pt-3', bodyClassName)}>{children}</div>
    </section>
  )
}

const TONE = {
  default: 'text-ink',
  positive: 'text-positive',
  negative: 'text-negative',
  accent: 'text-gradient',
} as const

const SIZE = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-[32px] leading-none',
  xl: 'text-5xl leading-none tracking-tight',
} as const

export function Metric({
  label,
  value,
  format,
  sub,
  tone = 'default',
  size = 'md',
  explain,
  className,
}: {
  label: ReactNode
  value: number
  format: (v: number) => string
  sub?: ReactNode
  tone?: keyof typeof TONE
  size?: keyof typeof SIZE
  explain?: { title: string; lines: ExplainLine[]; note?: ReactNode }
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1 text-[13px] text-muted">
        <span className="truncate">{label}</span>
        {explain && <Explain {...explain} />}
      </div>
      <div className={cn('mt-1.5 font-semibold', SIZE[size], TONE[tone])}>
        <AnimatedNumber value={value} format={format} />
      </div>
      {sub && <div className="mt-1.5 text-xs text-faint">{sub}</div>}
    </div>
  )
}

export function StatRow({ label, value, hint, tone, strong }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'positive' | 'negative' | 'muted'; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', strong && 'mt-1 border-t border-line pt-2.5')}>
      <div className="min-w-0">
        <span className={cn('text-sm', strong ? 'font-medium text-ink' : 'text-muted')}>{label}</span>
        {hint && <span className="ml-2 text-xs text-faint">{hint}</span>}
      </div>
      <span
        className={cn(
          'num shrink-0 text-sm',
          strong && 'font-semibold',
          tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : tone === 'muted' ? 'text-muted' : 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  )
}

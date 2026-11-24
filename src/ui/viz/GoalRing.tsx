import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'

export function GoalRing({ pct, size = 168, stroke = 12, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const id = useId()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const shown = Math.max(0, Math.min(1, pct))
  const over = pct > 1
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: over ? 'var(--positive)' : 'var(--accent)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id}-g)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - shown) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 0 10px color-mix(in oklab, var(--accent) 45%, transparent))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

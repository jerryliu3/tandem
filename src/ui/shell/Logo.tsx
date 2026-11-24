import { useId } from 'react'

export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="16" r="9" fill={`url(#${id}-a)`} opacity="0.9" />
      <circle cx="20" cy="16" r="9" fill={`url(#${id}-b)`} opacity="0.75" style={{ mixBlendMode: 'screen' }} />
    </svg>
  )
}

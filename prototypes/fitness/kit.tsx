import { animate, motion } from 'motion/react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export type Mode = 'light' | 'dark'

export type Swatch = { name: string; hex: string }

export type Direction = {
  id: string
  name: string
  round: 1 | 2
  /** Round 1 direction(s) this one is a permutation of. */
  lineage?: string
  tagline: string
  inspiredBy: string[]
  dna: { label: string; text: string }[]
  fromTandem: string
  palette: Record<Mode, Swatch[]>
  type: { display: string; displayFamily: string; text: string; textFamily: string; sample: string; displayStyle?: CSSProperties }
  screens: { title: string; caption: string; render: (mode: Mode) => ReactNode }[]
}

/** `?static` (or reduced motion) renders final values with no animation, for screenshots. */
export const STATIC =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).has('static') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches)

export const EASE = [0.22, 1, 0.36, 1] as const

export function CountUp({
  value,
  decimals = 0,
  delay = 0,
  duration = 1.2,
  format,
}: {
  value: number
  decimals?: number
  delay?: number
  duration?: number
  format?: (v: number) => string
}) {
  const [shown, setShown] = useState(STATIC ? value : 0)
  const from = useRef(STATIC ? value : 0)
  useEffect(() => {
    if (STATIC) {
      setShown(value)
      return
    }
    const controls = animate(from.current, value, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => {
        from.current = v
        setShown(v)
      },
    })
    return () => controls.stop()
  }, [value, delay, duration])
  return <span className="tnum">{format ? format(shown) : shown.toFixed(decimals)}</span>
}

export function Ring({
  size,
  stroke,
  value,
  color,
  track,
  delay = 0,
  glow,
  gradient,
  children,
}: {
  size: number
  stroke: number
  value: number
  color: string
  track: string
  delay?: number
  glow?: string
  gradient?: [string, string]
  children?: ReactNode
}) {
  const id = 'r' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.max(0, Math.min(1, value)))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        {gradient && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={gradient[0]} />
              <stop offset="100%" stopColor={gradient[1]} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={gradient ? `url(#${id})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={STATIC ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, delay, ease: EASE }}
          style={glow ? { filter: `drop-shadow(0 0 7px ${glow})` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function DrawPath({
  d,
  stroke,
  width = 2,
  delay = 0,
  duration = 1.4,
  style,
}: {
  d: string
  stroke: string
  width?: number
  delay?: number
  duration?: number
  style?: CSSProperties
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={STATIC ? false : { pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration, delay, ease: EASE }}
      style={style}
    />
  )
}

export type Pt = [number, number]

/** Catmull-Rom spline through the points, as cubic Béziers. */
export function smoothPath(pts: Pt[], start: 'M' | 'L' = 'M') {
  if (!pts.length) return ''
  const f = (n: number) => n.toFixed(1)
  let d = `${start}${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`
  }
  return d
}

/** Closed Catmull-Rom loop through the points. */
export function smoothClosed(pts: Pt[]) {
  const n = pts.length
  const f = (v: number) => v.toFixed(1)
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`
  }
  return d + ' Z'
}

export function toPoints(
  values: number[],
  w: number,
  h: number,
  { min, max, padY = 0, padX = 0 }: { min?: number; max?: number; padY?: number; padX?: number } = {},
): Pt[] {
  const lo = min ?? Math.min(...values)
  const hi = max ?? Math.max(...values)
  return values.map((v, i) => [
    padX + (i / (values.length - 1)) * (w - padX * 2),
    padY + (1 - (v - lo) / (hi - lo || 1)) * (h - padY * 2),
  ])
}

export function scalePoints(norm: Pt[], w: number, h: number): Pt[] {
  return norm.map(([x, y]) => [x * w, y * h])
}

/** Point at fraction `t` of the polyline's length. */
export function pointAt(pts: Pt[], t: number): Pt {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  let target = seg.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, t))
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const k = seg[i] ? target / seg[i] : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
    }
    target -= seg[i]
  }
  return pts[pts.length - 1]
}

function StatusBar({ ink }: { ink: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[54px] items-center justify-between px-[34px] pt-[4px]"
      style={{ color: ink }}
    >
      <span style={{ fontFamily: 'var(--f-inter)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>9:41</span>
      <span className="flex items-center gap-[6px]">
        <Signal size={16} strokeWidth={2.6} />
        <Wifi size={16} strokeWidth={2.6} />
        <BatteryFull size={22} strokeWidth={2} />
      </span>
    </div>
  )
}

export function Phone({
  mode,
  background,
  backdrop,
  overlay,
  topTint,
  children,
}: {
  mode: 'dark' | 'light'
  background: string
  backdrop?: ReactNode
  overlay?: ReactNode
  /** Tint behind the status bar once content scrolls under it. */
  topTint?: string
  children: ReactNode
}) {
  const ink = mode === 'dark' ? '#FFFFFF' : '#141210'
  return (
    <div
      className="shrink-0 rounded-[64px] p-[11px]"
      style={{
        width: 412,
        background: 'linear-gradient(145deg, #2b2b2e, #0c0c0d 40%, #1d1d20)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 0 2px #050505, 0 50px 90px -40px rgba(0,0,0,0.55), 0 30px 60px -30px rgba(0,0,0,0.4)',
      }}
    >
      <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[53px]" style={{ background, isolation: 'isolate' }}>
        {backdrop && <div className="pointer-events-none absolute inset-0">{backdrop}</div>}
        <div className="no-scrollbar absolute inset-0 overflow-y-auto overscroll-contain">{children}</div>
        {topTint && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[62px]"
            style={{
              background: `linear-gradient(${topTint}, transparent)`,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              maskImage: 'linear-gradient(black 55%, transparent)',
              WebkitMaskImage: 'linear-gradient(black 55%, transparent)',
            }}
          />
        )}
        {overlay}
        <StatusBar ink={ink} />
        <div className="absolute left-1/2 top-[11px] z-40 h-[36px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
        <div
          className="pointer-events-none absolute bottom-[8px] left-1/2 z-40 h-[5px] w-[136px] -translate-x-1/2 rounded-full"
          style={{ background: ink, opacity: 0.85 }}
        />
      </div>
    </div>
  )
}

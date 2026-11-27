import { motion } from 'motion/react'
import { Activity, Bell, BellRing, ChevronLeft, Moon, Share2, Sun, User, Users, type LucideIcon } from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { body, fmtPace, people, run, type PersonId } from '../data'
import { CountUp, DrawPath, EASE, Phone, STATIC, smoothPath, toPoints, type Direction, type Mode, type Pt } from '../kit'

const DARK = {
  bg: '#000000',
  ink: '#F5F5F7',
  muted: '#8E8E93',
  faint: '#4A4A4F',
  surface: 'rgba(255,255,255,0.055)',
  surface2: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.08)',
  track: 'rgba(255,255,255,0.075)',
  tick: 'rgba(255,255,255,0.3)',
  faceFrom: '#16161B',
  faceTo: '#000000',
  cardShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  tabBg: 'rgba(30,30,32,0.78)',
  tabShadow: '0 20px 40px -16px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)',
  topTint: 'rgba(0,0,0,0.82)',
  glowA: '99',
  night: '#8F8CFF',
  nightDeep: '#4D47E0',
  day: '#FFC861',
  effort: '#FF7448',
  low: '#FF5D7D',
}
type Palette = typeof DARK

const LIGHT: Palette = {
  bg: '#F5F4F0',
  ink: '#121214',
  muted: '#6E6E73',
  faint: '#B9B8B4',
  surface: '#FFFFFF',
  surface2: 'rgba(18,18,20,0.05)',
  line: 'rgba(18,18,20,0.07)',
  track: 'rgba(18,18,20,0.07)',
  tick: 'rgba(18,18,20,0.32)',
  faceFrom: '#FFFFFF',
  faceTo: '#EBE9E3',
  cardShadow: '0 1px 2px rgba(0,0,0,0.04), 0 14px 30px -20px rgba(40,30,10,0.28)',
  tabBg: 'rgba(255,255,255,0.8)',
  tabShadow: '0 18px 36px -16px rgba(40,30,10,0.35), 0 0 0 1px rgba(18,18,20,0.05)',
  topTint: 'rgba(245,244,240,0.85)',
  glowA: '55',
  night: '#5A55E6',
  nightDeep: '#3B33B8',
  day: '#E39A0E',
  effort: '#EE5A24',
  low: '#E2405F',
}

const NUM = 'var(--f-outfit)'
const TXT = 'var(--f-geist)'

const t = (h: number, m = 0) => h + m / 60
const NOW = t(9, 41)
const SLEEP: [number, number] = [t(22, 58), t(6, 21)]
const RUN: [number, number] = [t(7, 42), t(8, 33)]
const WALK: [number, number] = [t(16, 30), t(16, 50)]
const WIND: [number, number] = [t(21, 40), t(22, 40)]
const LIGHTS = t(22, 40)
const SUN: [number, number] = [t(6, 54), t(16, 31)]

/** Noon sits at the top of every dial, midnight at the bottom. */
const polar = (c: number, r: number, h: number): Pt => {
  const a = (((h - 12) / 24) * 360 * Math.PI) / 180
  return [c + r * Math.sin(a), c - r * Math.cos(a)]
}

const arc = (c: number, r: number, h0: number, h1: number) => {
  let end = h1
  while (end <= h0) end += 24
  const [x0, y0] = polar(c, r, h0)
  const [x1, y1] = polar(c, r, end)
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${end - h0 > 12 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`
}

const clock = (h: number) => {
  const hh = Math.floor(h) % 24
  const mm = Math.round((h - Math.floor(h)) * 60)
  return { time: `${hh % 12 || 12}:${String(mm).padStart(2, '0')}`, ap: hh >= 12 ? 'PM' : 'AM' }
}

const RHYTHM: { id: PersonId; sleep: [number, number]; move?: [number, number]; plan?: [number, number]; note: string }[] = [
  { id: 'jerry', sleep: SLEEP, move: RUN, note: 'Ran 10.2 km · new 10K PR' },
  { id: 'sophia', sleep: [t(22, 30), t(6, 5)], move: [t(7, 10), t(7, 42)], note: 'Ran 6.2 km at 7:10' },
  { id: 'alex', sleep: [t(0, 15), t(6, 40)], plan: [t(17, 30), t(18, 30)], note: 'Lifting at 5:30 PM' },
  { id: 'priya', sleep: [t(22, 10), t(6, 50)], move: [t(8, 40), t(9, 10)], note: 'Slow flow yoga · 30 min' },
  { id: 'sam', sleep: [t(23, 30), t(8, 45)], note: 'Resting · slept in' },
]

const ENERGY = [30, 52, 70, 82, 86, 80, 68, 54, 46, 44, 52, 64, 72, 70, 58, 42, 26, 14]

function theme(C: Palette, mode: Mode) {
  const stateColor = (rec: number, resting?: boolean) => (resting ? C.night : rec >= 67 ? C.day : rec >= 34 ? C.effort : C.low)
  const glow = (color: string): CSSProperties => ({ filter: `drop-shadow(0 0 6px ${color}${C.glowA})` })

  function Label({ children, color, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
    return <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: color ?? C.muted, ...style }}>{children}</div>
  }

  function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div className={`rounded-[24px] ${className}`} style={{ background: C.surface, boxShadow: C.cardShadow, ...style }}>
        {children}
      </div>
    )
  }

  function Avatar({ initial, ring, size = 34 }: { initial: string; ring?: string; size?: number }) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full"
        style={{ width: size, height: size, background: C.surface2, boxShadow: ring ? `0 0 0 2px ${C.bg}, 0 0 0 3.5px ${ring}` : undefined, fontSize: size * 0.4, fontWeight: 500 }}
      >
        {initial}
      </div>
    )
  }

  function Num({ children, size, weight = 300, color, style }: { children: ReactNode; size: number; weight?: number; color?: string; style?: CSSProperties }) {
    return <span className="tnum" style={{ fontFamily: NUM, fontSize: size, fontWeight: weight, lineHeight: 1, letterSpacing: '-0.02em', color, ...style }}>{children}</span>
  }

  function TabBar({ active }: { active: number }) {
    const items: LucideIcon[] = [Sun, Users, Activity, User]
    return (
      <div
        className="absolute bottom-[26px] left-1/2 z-20 flex h-[58px] -translate-x-1/2 items-center gap-1.5 rounded-full px-1.5"
        style={{ background: C.tabBg, backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: C.tabShadow }}
      >
        {items.map((Icon, i) => (
          <div key={i} className="grid h-[46px] w-[46px] place-items-center rounded-full" style={{ background: i === active ? C.ink : 'transparent', color: i === active ? C.bg : C.muted }}>
            <Icon size={20} strokeWidth={i === active ? 2.2 : 1.8} />
          </div>
        ))}
      </div>
    )
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-5 pb-[112px] pt-[58px]" style={{ fontFamily: TXT, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  /* ───────────────────────── Day ───────────────────────── */

  function DayDial() {
    const size = 318
    const c = size / 2
    const rMain = 124
    const rInner = 103
    const [nx, ny] = polar(c, rMain, NOW)
    const [s0x, s0y] = polar(c, rMain, SLEEP[0])
    const [s1x, s1y] = polar(c, rMain, SLEEP[1])
    const [lx, ly] = polar(c, rMain, LIGHTS)
    const labels: [number, string][] = [
      [12, '12P'],
      [18, '6P'],
      [0, '12A'],
      [6, '6A'],
    ]
    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <radialGradient id={`halo-face-${mode}`} cx="50%" cy="38%" r="62%">
              <stop offset="0" stopColor={C.faceFrom} />
              <stop offset="1" stopColor={C.faceTo} />
            </radialGradient>
            <linearGradient id={`halo-sleep-${mode}`} gradientUnits="userSpaceOnUse" x1={s0x} y1={s0y} x2={s1x} y2={s1y}>
              <stop offset="0" stopColor={C.nightDeep} />
              <stop offset="1" stopColor={C.night} />
            </linearGradient>
          </defs>
          <circle cx={c} cy={c} r={94} fill={`url(#halo-face-${mode})`} />
          <path d={arc(c, 156, SUN[0], SUN[1])} fill="none" stroke={C.day} strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
          <path d={arc(c, 156, SUN[1], SUN[0])} fill="none" stroke={C.night} strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
          {Array.from({ length: 96 }, (_, i) => {
            const major = i % 4 === 0
            const [x0, y0] = polar(c, major ? 141 : 145, i / 4)
            const [x1, y1] = polar(c, 150, i / 4)
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.tick} strokeOpacity={major ? 1 : 0.45} strokeWidth={major ? 1.4 : 1} />
          })}
          {labels.map(([h, l]) => {
            const [x, y] = polar(c, 80, h)
            return (
              <text key={l} x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fontFamily={NUM} fill={C.muted} letterSpacing="0.06em">
                {l}
              </text>
            )
          })}

          <circle cx={c} cy={c} r={rMain} fill="none" stroke={C.track} strokeWidth={18} />
          <circle cx={c} cy={c} r={rInner} fill="none" stroke={C.track} strokeWidth={6} />

          <DrawPath d={arc(c, rMain, SLEEP[0], SLEEP[1])} stroke={`url(#halo-sleep-${mode})`} width={18} duration={1.4} style={glow(C.night)} />
          <DrawPath d={arc(c, rMain, SLEEP[1], NOW)} stroke={C.day} width={18} delay={1.1} duration={0.7} style={glow(C.day)} />
          <path d={arc(c, rMain, NOW, LIGHTS)} fill="none" stroke={C.day} strokeOpacity={0.3} strokeWidth={18} strokeDasharray="2 5" />

          <DrawPath d={arc(c, rInner, RUN[0], RUN[1])} stroke={C.effort} width={6} delay={1.3} duration={0.5} style={glow(C.effort)} />
          <path d={arc(c, rInner, WALK[0], WALK[1])} fill="none" stroke={C.effort} strokeWidth={6} strokeLinecap="round" strokeDasharray="0.1 4.5" />
          <path d={arc(c, rInner, WIND[0], WIND[1])} fill="none" stroke={C.night} strokeWidth={6} strokeLinecap="round" strokeDasharray="0.1 4.5" />

          <circle cx={lx} cy={ly} r={11} fill={C.bg} stroke={C.night} strokeWidth={1.5} />
          <Moon x={lx - 6} y={ly - 6} size={12} color={C.night} strokeWidth={2.2} />

          <motion.circle
            cx={nx}
            cy={ny}
            r={14}
            fill={C.ink}
            opacity={0.15}
            animate={STATIC ? undefined : { r: [11, 17, 11], opacity: [0.22, 0.06, 0.22] }}
            transition={{ duration: 2.6, repeat: Infinity }}
          />
          <circle cx={nx} cy={ny} r={7} fill={C.ink} stroke={C.bg} strokeWidth={2.5} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <Label>Recovery</Label>
            <div className="mt-1.5">
              <Num size={80} weight={200}>
                <CountUp value={body.readiness} />
              </Num>
              <Num size={26} weight={300} color={C.day}>%</Num>
            </div>
            <div className="mt-2" style={{ fontSize: 12.5, fontWeight: 600, color: C.day }}>Well charged</div>
          </div>
        </div>
      </div>
    )
  }

  function EnergyCurve() {
    const W = 310
    const H = 96
    const x = (h: number) => ((h - 6) / 17) * W
    const pts = toPoints(ENERGY, W, H, { min: 0, max: 100, padY: 8 })
    const line = smoothPath(pts)
    const i = Math.floor(NOW - 6)
    const k = NOW - 6 - i
    const ny = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k
    const clip = `halo-past-${mode}`
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} className="mt-3 overflow-visible">
        <defs>
          <clipPath id={clip}>
            <rect x={0} y={-10} width={x(NOW)} height={H + 20} />
          </clipPath>
          <linearGradient id={`halo-energy-${mode}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.day} stopOpacity={0.4} />
            <stop offset="1" stopColor={C.day} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={x(14)} y={0} width={x(16) - x(14)} height={H} rx={8} fill={C.surface2} />
        <text x={(x(14) + x(16)) / 2} y={14} textAnchor="middle" fontSize={9.5} fontFamily={TXT} fill={C.muted}>Dip</text>
        <path d={line} fill="none" stroke={C.muted} strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 4" />
        <g clipPath={`url(#${clip})`}>
          <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#halo-energy-${mode})`} />
          <DrawPath d={line} stroke={C.day} width={2.2} duration={1} delay={0.2} />
        </g>
        <line x1={x(NOW)} x2={x(NOW)} y1={0} y2={H} stroke={C.ink} strokeOpacity={0.35} />
        <circle cx={x(NOW)} cy={ny} r={4.5} fill={C.ink} stroke={C.bg} strokeWidth={2} />
        {[
          [6, '6 AM'],
          [12, '12 PM'],
          [18, '6 PM'],
          [23, '11 PM'],
        ].map(([h, l]) => (
          <text key={l} x={x(h as number)} y={H + 16} textAnchor={h === 6 ? 'start' : h === 23 ? 'end' : 'middle'} fontSize={10} fontFamily={NUM} fill={C.muted}>
            {l}
          </text>
        ))}
      </svg>
    )
  }

  function UpNext() {
    const [remind, setRemind] = useState(false)
    const rows = [
      { h: t(14, 30), title: 'Afternoon dip', sub: 'The post-turkey slump. Keep any nap under 20 minutes.', color: C.muted },
      { h: WALK[0], title: 'Walk window', sub: '20 minutes takes strain from 11.4 to 12.4, into target.', color: C.effort, bell: true },
      { h: WIND[0], title: 'Wind down', sub: 'Dim the lights. Maybe skip the second slice.', color: C.night },
      { h: LIGHTS, title: 'Lights out', sub: "For 100% of tonight's 7h 50m sleep need.", color: C.night },
    ]
    return (
      <Card className="mt-3 px-4 py-2">
        {rows.map((r, i) => {
          const { time, ap } = clock(r.h)
          return (
            <div key={r.title} className="flex gap-3 py-3">
              <div className="w-[52px] shrink-0 text-right">
                <Num size={19}>{time}</Num>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{ap}</div>
              </div>
              <div className="relative flex w-3 shrink-0 justify-center">
                <span className="relative z-10 mt-[5px] h-[11px] w-[11px] rounded-full" style={{ border: `2px solid ${r.color}`, background: C.surface }} />
                {i < rows.length - 1 && <span className="absolute bottom-[-14px] top-[16px] w-px" style={{ background: C.line }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{r.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: '17px', color: C.muted }}>{r.sub}</div>
              </div>
              {r.bell && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRemind((v) => !v)}
                  className="grid h-8 w-8 shrink-0 place-items-center self-center rounded-full"
                  style={{ background: remind ? C.effort : C.surface2, color: remind ? '#fff' : C.muted, transition: 'background .25s' }}
                  aria-label="Remind me"
                >
                  {remind ? <BellRing size={15} /> : <Bell size={15} />}
                </motion.button>
              )}
            </div>
          )
        })}
      </Card>
    )
  }

  function Today() {
    return (
      <Screen active={0}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Thursday</div>
            <div style={{ fontSize: 13, color: C.muted }}>Nov 26 · Thanksgiving</div>
          </div>
          <Avatar initial="J" ring={C.day} />
        </div>

        <div className="mt-5">
          <DayDial />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ['Slept', '7h 12m', C.night],
            ['Awake', '3h 20m', C.day],
            ['Strain', '11.4', C.effort],
          ].map(([k, v, color]) => (
            <div key={k}>
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <Label>{k}</Label>
              </div>
              <div className="mt-1.5">
                <Num size={24}>{v}</Num>
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-6 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Energy</Label>
            <span style={{ fontSize: 12, color: C.muted }}>Peak 10 AM · dip 2–4 PM</span>
          </div>
          <EnergyCurve />
        </Card>

        <div className="mt-6 flex items-baseline justify-between">
          <Label>Rest of your day</Label>
          <span style={{ fontSize: 12, color: C.muted }}>Now {clock(NOW).time}</span>
        </div>
        <UpNext />

        <Card className="mt-3 grid grid-cols-4 px-2 py-4">
          {[
            ['HRV', '61', '▲ 6'],
            ['RHR', '52', '▼ 2'],
            ['Resp', '14.2', 'Normal'],
            ['Temp', '+0.1', 'Normal'],
          ].map(([k, v, d], i) => (
            <div key={k} className="text-center" style={{ borderLeft: i ? `1px solid ${C.line}` : undefined }}>
              <Label style={{ fontSize: 9.5 }}>{k}</Label>
              <div className="mt-1.5">
                <Num size={24}>{v}</Num>
              </div>
              <div className="mt-1" style={{ fontSize: 11, fontWeight: 600, color: d.startsWith('▲') || d.startsWith('▼') ? C.day : C.muted }}>{d}</div>
            </div>
          ))}
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Crew ───────────────────────── */

  function CrewClock({ sel }: { sel: PersonId | null }) {
    const size = 300
    const c = size / 2
    const radii = [136, 116, 96, 76, 56]
    const [hx, hy] = polar(c, 148, NOW)
    const [h0x, h0y] = polar(c, 46, NOW)
    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {Array.from({ length: 24 }, (_, i) => {
            const [x0, y0] = polar(c, i % 6 ? 146 : 143, i)
            const [x1, y1] = polar(c, 150, i)
            return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.tick} strokeOpacity={i % 6 ? 0.5 : 1} />
          })}
          {RHYTHM.map((r, k) => {
            const R = radii[k]
            const [ix, iy] = polar(c, R, 12)
            const dim = sel !== null && sel !== r.id
            return (
              <g key={r.id} style={{ opacity: dim ? 0.15 : 1, transition: 'opacity .35s' }}>
                <circle cx={c} cy={c} r={R} fill="none" stroke={C.track} strokeWidth={10} />
                <DrawPath d={arc(c, R, r.sleep[0], r.sleep[1])} stroke={C.night} width={10} delay={0.1 + k * 0.08} duration={1.1} />
                {r.move && <DrawPath d={arc(c, R, r.move[0], r.move[1])} stroke={C.effort} width={10} delay={0.9 + k * 0.08} duration={0.4} style={glow(C.effort)} />}
                {r.plan && <path d={arc(c, R, r.plan[0], r.plan[1])} fill="none" stroke={C.effort} strokeWidth={10} strokeLinecap="round" strokeDasharray="0.1 7" />}
                <circle cx={ix} cy={iy} r={8.5} fill={C.bg} stroke={sel === r.id ? C.ink : 'none'} />
                <text x={ix} y={iy + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={600} fontFamily={TXT} fill={C.ink}>
                  {people.find((p) => p.id === r.id)!.name[0]}
                </text>
              </g>
            )
          })}
          <line x1={h0x} y1={h0y} x2={hx} y2={hy} stroke={C.ink} strokeWidth={1.2} strokeOpacity={0.7} />
          <circle cx={hx} cy={hy} r={3.5} fill={C.ink} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <Num size={28}>11/16</Num>
            <Label style={{ fontSize: 9, marginTop: 4 }}>Sessions</Label>
          </div>
        </div>
      </div>
    )
  }

  function Crew() {
    const [sel, setSel] = useState<PersonId | null>(null)
    const [joined, setJoined] = useState(false)
    return (
      <Screen active={1}>
        <div className="flex items-end justify-between">
          <div>
            <Label>Crew · 5</Label>
            <div className="mt-1" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>Turkey Trotters</div>
          </div>
          <span style={{ fontSize: 12.5, color: C.muted }}>Today, 24h</span>
        </div>

        <div className="mt-5">
          <CrewClock sel={sel} />
        </div>

        <div className="mt-4 flex justify-center gap-4" style={{ fontSize: 11.5, color: C.muted }}>
          {[
            ['Sleep', C.night, false],
            ['Workout', C.effort, false],
            ['Planned', C.effort, true],
          ].map(([l, color, dashed]) => (
            <span key={l as string} className="flex items-center gap-1.5">
              <span className="h-[6px] w-4 rounded-full" style={dashed ? { backgroundImage: `radial-gradient(circle, ${color} 2.5px, transparent 3px)`, backgroundSize: '6px 6px' } : { background: color as string }} />
              {l as string}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-px" style={{ background: C.ink }} /> Now
          </span>
        </div>

        <Card className="mt-5 px-2 py-1.5">
          {RHYTHM.map((r) => {
            const p = people.find((x) => x.id === r.id)!
            const on = sel === r.id
            return (
              <button
                key={r.id}
                onClick={() => setSel(on ? null : r.id)}
                className="flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2.5 text-left"
                style={{ background: on ? C.surface2 : 'transparent', transition: 'background .25s' }}
              >
                <Avatar initial={p.name[0]} ring={stateColor(p.recovery, p.resting)} size={32} />
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {p.name}
                    {p.you && <span style={{ color: C.muted, fontWeight: 500 }}> · you</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted }}>{r.note}</div>
                </div>
                <div className="text-right">
                  <Num size={20} color={p.resting ? C.muted : C.ink}>{p.recovery}</Num>
                  <Num size={11} color={C.muted}>%</Num>
                </div>
              </button>
            )
          })}
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex gap-3">
            <Moon size={17} color={C.night} className="mt-0.5 shrink-0" />
            <div style={{ fontSize: 13.5, lineHeight: '19px' }}>
              <span style={{ fontWeight: 600 }}>Four of you were up before 7.</span>{' '}
              <span style={{ color: C.muted }}>Sam slept in, and nudges to him are paused while he rests.</span>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setJoined((j) => !j)}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full py-2.5"
            style={{ background: joined ? C.surface2 : C.night, color: joined ? C.ink : '#fff', fontSize: 13.5, fontWeight: 600, transition: 'background .25s' }}
          >
            {joined ? "You're in · 3 winding down at 10 PM" : 'Wind down together at 10 PM'}
          </motion.button>
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Activity ───────────────────────── */

  const ZONE_COLORS = [C.faint, C.night, C.day, C.effort, C.low]
  const zoneOf = (hr: number) => (hr < 120 ? 0 : hr < 140 ? 1 : hr < 156 ? 2 : hr < 171 ? 3 : 4)

  function RunHalo() {
    const size = 320
    const c = size / 2
    const r0 = 72
    const amp = 62
    const span = 0.94
    const at = (f: number, r: number): Pt => {
      const a = f * span * 2 * Math.PI
      return [c + r * Math.sin(a), c - r * Math.cos(a)]
    }
    const n = run.hr.length
    const pts = run.hr.map((hr, i) => at(i / (n - 1), r0 + ((hr - 100) / 90) * amp))
    const base = run.hr.map((_, i) => at(i / (n - 1), r0)).reverse()
    const area = `M${[...pts, ...base].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z`
    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          <circle cx={c} cy={c} r={r0} fill="none" stroke={C.line} strokeDasharray="2 4" />
          <circle cx={c} cy={c} r={r0 + amp} fill="none" stroke={C.line} />
          {[10, 20, 30, 40, 50].map((m) => {
            const f = m / 50.67
            const [x0, y0] = at(f, r0)
            const [x1, y1] = at(f, r0 + amp + 8)
            const [tx, ty] = at(f, r0 + amp + 20)
            return (
              <g key={m}>
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.line} />
                <text x={tx} y={ty + 3.5} textAnchor="middle" fontSize={10} fontFamily={NUM} fill={C.muted}>{m}′</text>
              </g>
            )
          })}
          <motion.path d={area} fill={C.effort} initial={STATIC ? false : { opacity: 0 }} animate={{ opacity: mode === 'dark' ? 0.1 : 0.08 }} transition={{ duration: 1, delay: 0.6 }} />
          {pts.slice(0, -1).map(([x, y], i) => (
            <motion.line
              key={i}
              x1={x}
              y1={y}
              x2={pts[i + 1][0]}
              y2={pts[i + 1][1]}
              stroke={ZONE_COLORS[zoneOf((run.hr[i] + run.hr[i + 1]) / 2)]}
              strokeWidth={3.2}
              strokeLinecap="round"
              initial={STATIC ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.025, duration: 0.2 }}
            />
          ))}
          <circle cx={pts[0][0]} cy={pts[0][1]} r={4} fill={C.bg} stroke={C.muted} strokeWidth={1.5} />
          <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r={5} fill={C.ink} stroke={C.bg} strokeWidth={2} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <Num size={50} weight={200}>{run.duration}</Num>
            <div className="mt-1.5" style={{ fontSize: 12.5, color: C.muted }}>
              {run.km} km · {run.pace} /km
            </div>
          </div>
        </div>
      </div>
    )
  }

  function Splits() {
    const W = 310
    const H = 92
    const lo = 280
    const hi = 314
    const x = (i: number) => 12 + (i / 9) * (W - 24)
    const y = (s: number) => 10 + ((s - lo) / (hi - lo)) * (H - 20)
    const pts: Pt[] = run.splits.map((s, i) => [x(i), y(s)])
    const fastest = Math.min(...run.splits)
    const avg = run.splits.reduce((a, b) => a + b, 0) / run.splits.length
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 overflow-visible">
        <line x1={0} x2={W} y1={y(avg)} y2={y(avg)} stroke={C.muted} strokeOpacity={0.5} strokeDasharray="3 4" />
        <text x={0} y={y(avg) - 5} fontSize={10} fontFamily={NUM} fill={C.muted}>avg {run.pace}</text>
        <DrawPath d={smoothPath(pts)} stroke={C.muted} width={1.4} />
        {pts.map(([px, py], i) => {
          const best = run.splits[i] === fastest
          return (
            <g key={i}>
              <circle cx={px} cy={py} r={best ? 6 : 4} fill={best ? C.day : C.bg} stroke={best ? C.bg : C.ink} strokeWidth={best ? 2 : 1.5} style={best ? glow(C.day) : undefined} />
              {best && (
                <text x={px} y={py - 11} textAnchor="end" fontSize={11} fontFamily={NUM} fontWeight={500} fill={C.day}>
                  {fmtPace(run.splits[i])}
                </text>
              )}
              <text x={px} y={H + 14} textAnchor="middle" fontSize={10} fontFamily={NUM} fill={C.muted}>{i + 1}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  function Recharge() {
    const W = 310
    const H = 84
    const x = (h: number) => (h / 48) * W
    const y = (v: number) => 6 + (1 - v / 100) * (H - 12)
    const nights: [number, number][] = [
      [12.98, 20.82],
      [36.98, 44.82],
    ]
    const key: Pt[] = (
      [
        [0, 78],
        [4, 66],
        [8, 52],
        [13, 42],
        [21, 61],
        [26, 55],
        [32, 47],
        [37, 45],
        [45, 85],
        [48, 87],
      ] as Pt[]
    ).map(([h, v]) => [x(h), y(v)])
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 overflow-visible">
        {nights.map(([a, b]) => (
          <g key={a}>
            <rect x={x(a)} y={0} width={x(b) - x(a)} height={H} rx={8} fill={C.night} fillOpacity={mode === 'dark' ? 0.14 : 0.09} />
            <Moon x={x(a) + 6} y={6} size={11} color={C.night} />
          </g>
        ))}
        <DrawPath d={smoothPath(key)} stroke={C.day} width={2.2} delay={0.2} style={glow(C.day)} />
        <circle cx={key[0][0]} cy={key[0][1]} r={4} fill={C.ink} stroke={C.bg} strokeWidth={2} />
        <circle cx={key[8][0]} cy={key[8][1]} r={4.5} fill={C.day} stroke={C.bg} strokeWidth={2} />
        <text x={key[8][0] - 8} y={key[8][1] + 4} textAnchor="end" fontSize={10.5} fontFamily={NUM} fill={C.day} fontWeight={500}>85%</text>
        <text x={key[4][0]} y={key[4][1] - 9} textAnchor="middle" fontSize={10.5} fontFamily={NUM} fill={C.muted}>~60%</text>
        {[
          [0, 'Now'],
          [14.32, 'Fri'],
          [38.32, 'Sat'],
        ].map(([h, l]) => (
          <text key={l} x={x(h as number)} y={H + 14} textAnchor={h === 0 ? 'start' : 'middle'} fontSize={10} fontFamily={NUM} fill={C.muted}>{l}</text>
        ))}
      </svg>
    )
  }

  function RunScreen() {
    return (
      <Screen active={2}>
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.surface2 }}>
            <ChevronLeft size={18} />
          </div>
          <Label>{run.time} · Prospect Park</Label>
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.surface2 }}>
            <Share2 size={16} />
          </div>
        </div>

        <div className="mt-4 text-center">
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{run.title}</div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: `${C.day}24`, color: C.day, fontSize: 12.5, fontWeight: 600 }}>
            New 10K PR · <span style={{ fontFamily: NUM }}>{run.pr.time}</span> ({run.pr.delta})
          </div>
        </div>

        <div className="mt-3">
          <RunHalo />
        </div>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Heart rate zones</Label>
            <span style={{ fontSize: 12, color: C.muted }}>
              Avg <Num size={14} color={C.ink}>{run.avgHr}</Num> · max <Num size={14} color={C.low}>{run.maxHr}</Num>
            </span>
          </div>
          <div className="mt-3.5 flex gap-[3px]">
            {run.zones.map((z, i) => (
              <motion.div
                key={z.z}
                className="h-3 rounded-full"
                style={{ background: ZONE_COLORS[i], flexBasis: `${z.pct}%`, flexGrow: 0, flexShrink: 0, minWidth: 6 }}
                initial={STATIC ? false : { opacity: 0, scaleX: 0.4 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.07, ease: EASE }}
              />
            ))}
          </div>
          <div className="mt-2.5 grid grid-cols-5 text-center">
            {run.zones.map((z, i) => (
              <div key={z.z}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: i === 0 ? C.muted : ZONE_COLORS[i] }}>{z.z}</div>
                <Num size={15}>{z.min}m</Num>
              </div>
            ))}
          </div>
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Splits · per km</Label>
            <span style={{ fontSize: 12, color: C.muted }}>Last km fastest</span>
          </div>
          <Splits />
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Recharge forecast</Label>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.day }}>Full by Sat 7 AM</span>
          </div>
          <Recharge />
          <div className="mt-2" style={{ fontSize: 12.5, lineHeight: '17px', color: C.muted }}>
            Expect around 60% tomorrow. Keep Friday easy and two good nights get you back.
          </div>
        </Card>
      </Screen>
    )
  }

  return { Today, Crew, RunScreen }
}

const T = { dark: theme(DARK, 'dark'), light: theme(LIGHT, 'light') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Ink', hex: C.ink },
  { name: 'Night', hex: C.night },
  { name: 'Day', hex: C.day },
  { name: 'Effort', hex: C.effort },
  { name: 'Low', hex: C.low },
]

export const halo: Direction = {
  id: 'halo',
  name: 'Halo',
  round: 2,
  lineage: 'Night Lab',
  tagline: 'Night Lab\'s precision, organized around the clock: your whole day on one 24-hour dial.',
  inspiredBy: ['Oura circadian timeline', 'Rise Science', 'Apple Watch Sleep', 'Eight Sleep', 'Withings'],
  dna: [
    { label: 'From Night Lab', text: 'Dark, data-first and glowing only where it matters, with the recovery number still at the center.' },
    { label: 'What changes', text: 'Instead of three rings for three scores, one dial for one day. Sleep, effort and what\'s left all sit on the same clock.' },
    { label: 'Atmosphere', text: 'True OLED black like a watch face; warm porcelain in light mode. No ambient glows, so the dial is the light source.' },
    { label: 'Color', text: 'A sky palette instead of traffic lights: indigo for night and sleep, gold for daylight and charge, coral for effort.' },
    { label: 'Type', text: 'Outfit at weight 200 for big numbers, like a watch complication. Geist for words.' },
    { label: 'Social', text: 'A crew clock: one ring per person showing when everyone slept and trained. Tap a name to isolate them.' },
  ],
  fromTandem: 'Tandem\'s projection chart becomes the energy curve and recharge forecast: solid line for what happened, dashed for what\'s predicted, with "now" marked.',
  palette: { dark: swatches(DARK), light: swatches(LIGHT) },
  type: { display: 'Outfit', displayFamily: NUM, text: 'Geist', textFamily: TXT, sample: '78%', displayStyle: { fontWeight: 200 } },
  screens: [
    { title: 'Day', caption: '24-hour dial, energy curve, the rest of today; tap the bell', render: (m) => createElement(T[m].Today) },
    { title: 'Crew clock', caption: "Everyone's sleep and workouts on one clock; tap a person", render: (m) => createElement(T[m].Crew) },
    { title: 'Run', caption: 'HR drawn around a halo, zones, splits, recharge forecast', render: (m) => createElement(T[m].RunScreen) },
  ],
}

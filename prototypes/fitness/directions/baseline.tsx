import { motion } from 'motion/react'
import { ChartSpline, ChevronLeft, FlaskConical, Gauge, Share2, Users, type LucideIcon } from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { body, people, run, type PersonId } from '../data'
import { CountUp, DrawPath, EASE, Phone, STATIC, smoothPath, toPoints, type Direction, type Mode, type Pt } from '../kit'

const LIGHT = {
  bg: '#F2F5F5',
  top: '#E0EFEA',
  ink: '#0E191B',
  ink2: '#33454A',
  muted: '#5F6F73',
  faint: '#A5B2B5',
  card: '#FFFFFF',
  line: 'rgba(14,25,27,0.08)',
  wash: 'rgba(14,25,27,0.055)',
  shadow: '0 1px 2px rgba(14,25,27,0.04), 0 16px 32px -24px rgba(14,25,27,0.32)',
  band: '#DCEFE5',
  bandEdge: '#94CBAE',
  normal: '#2C8C63',
  marker: '#E8590C',
  high: '#C27A00',
  low: '#D23F5B',
  tabBg: 'rgba(255,255,255,0.92)',
  topTint: 'rgba(236,243,241,0.85)',
  onInk: '#FFFFFF',
}
type Palette = typeof LIGHT

const DARK: Palette = {
  bg: '#0B0F10',
  top: '#0F201B',
  ink: '#E8EEEF',
  ink2: '#B9C6C9',
  muted: '#87959A',
  faint: '#465256',
  card: '#141A1C',
  line: 'rgba(255,255,255,0.07)',
  wash: 'rgba(255,255,255,0.06)',
  shadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  band: 'rgba(94,201,151,0.15)',
  bandEdge: 'rgba(94,201,151,0.45)',
  normal: '#5EC997',
  marker: '#FF7A3D',
  high: '#F2B33D',
  low: '#FF6B81',
  tabBg: 'rgba(18,24,26,0.92)',
  topTint: 'rgba(12,22,20,0.85)',
  onInk: '#0B0F10',
}

const TXT = 'var(--f-instrumentsans)'
const NUM = 'var(--f-splinemono)'

type Window = '30D' | '90D' | '1Y'
const DIST: Record<Window, { mean: number; sd: number; label: string }> = {
  '30D': { mean: 68, sd: 11, label: '30 days' },
  '90D': { mean: 66, sd: 13, label: '90 days' },
  '1Y': { mean: 63, sd: 15, label: 'year' },
}

const erf = (x: number) => {
  const s = Math.sign(x)
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return s * y
}
const percentile = (v: number, mean: number, sd: number) => Math.round(50 * (1 + erf((v - mean) / (sd * Math.SQRT2))))

type Metric = 'recovery' | 'hrv' | 'sleep'
const DEV: Record<Metric, Record<PersonId, number>> = {
  recovery: { jerry: 9, sophia: 12, alex: -8, priya: 2, sam: -25 },
  hrv: { jerry: 11, sophia: 6, alex: -14, priya: 3, sam: -22 },
  sleep: { jerry: -8, sophia: 2, alex: -12, priya: 9, sam: 18 },
}
const DAYS: Record<PersonId, number[]> = { jerry: [1, 0, 1, 1], sophia: [1, 1, 1, 1], alex: [1, 0, 0, 0], priya: [1, 1, 0, 1], sam: [1, 0, 0, 0] }

function theme(C: Palette, mode: Mode) {
  function Label({ children, color, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
    return <div style={{ fontFamily: NUM, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: color ?? C.muted, ...style }}>{children}</div>
  }

  function Num({ children, size, weight = 400, color, style }: { children: ReactNode; size: number; weight?: number; color?: string; style?: CSSProperties }) {
    return <span className="tnum" style={{ fontFamily: NUM, fontSize: size, fontWeight: weight, lineHeight: 1, letterSpacing: '-0.03em', color, ...style }}>{children}</span>
  }

  function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div className={`rounded-[18px] ${className}`} style={{ background: C.card, boxShadow: C.shadow, border: `1px solid ${C.line}`, ...style }}>
        {children}
      </div>
    )
  }

  function Chip({ children, color }: { children: ReactNode; color: string }) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-[3px]" style={{ background: `${color}1F`, color, fontSize: 11.5, fontWeight: 600 }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {children}
      </span>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: Gauge, label: 'Today' },
      { icon: ChartSpline, label: 'Trends' },
      { icon: Users, label: 'Crew' },
      { icon: FlaskConical, label: 'Reports' },
    ]
    return (
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex h-[84px] items-start justify-around px-4 pt-2.5"
        style={{ background: C.tabBg, borderTop: `1px solid ${C.line}`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', fontFamily: TXT }}
      >
        {items.map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex w-16 flex-col items-center gap-1" style={{ color: i === active ? C.ink : C.faint }}>
            <Icon size={21} strokeWidth={i === active ? 2.1 : 1.7} />
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    )
  }

  function Backdrop() {
    return <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${C.top} 0%, ${C.bg} 34%)` }} />
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} backdrop={<Backdrop />} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-5 pb-[104px] pt-[58px]" style={{ fontFamily: TXT, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  function RangeBar({ v, lo, hi, min, max, dots = [], delay = 0 }: { v: number; lo: number; hi: number; min: number; max: number; dots?: number[]; delay?: number }) {
    const p = (x: number) => `${((x - min) / (max - min)) * 100}%`
    return (
      <div className="relative h-[18px]">
        <div className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full" style={{ background: C.wash }} />
        <motion.div
          className="absolute top-1/2 h-[12px] -translate-y-1/2 rounded-full"
          style={{ left: p(lo), width: `calc(${p(hi)} - ${p(lo)})`, background: C.band, boxShadow: `inset 0 0 0 1px ${C.bandEdge}`, originX: 0 }}
          initial={STATIC ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay, ease: EASE }}
        />
        {dots.map((d, i) => (
          <span key={i} className="absolute top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: p(d), background: C.ink2, opacity: 0.35 }} />
        ))}
        <motion.span
          className="absolute top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: C.marker, boxShadow: `0 0 0 2.5px ${C.card}, 0 2px 8px ${C.marker}66` }}
          initial={STATIC ? false : { left: p(min), opacity: 0 }}
          animate={{ left: p(v), opacity: 1 }}
          transition={{ duration: 0.9, delay: delay + 0.2, ease: EASE }}
        />
      </div>
    )
  }

  /* ───────────────────────── Today ───────────────────────── */

  function Distribution({ win }: { win: Window }) {
    const W = 310
    const H = 112
    const { mean, sd } = DIST[win]
    const x = (v: number) => (v / 100) * W
    const pts: Pt[] = Array.from({ length: 51 }, (_, i) => {
      const v = i * 2
      const y = (11 / sd) * Math.exp(-((v - mean) ** 2) / (2 * sd * sd))
      return [x(v), H - 4 - y * (H - 24)]
    })
    const line = smoothPath(pts)
    const area = `${line} L${W},${H} L0,${H} Z`
    const today = body.readiness
    const ty = pts[Math.round(today / 2)][1]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 overflow-visible">
        <motion.rect
          y={0}
          height={H}
          rx={6}
          fill={C.band}
          initial={false}
          animate={{ x: x(mean - sd), width: x(2 * sd) }}
          transition={{ duration: 0.6, ease: EASE }}
        />
        <motion.path initial={false} animate={{ d: area }} transition={{ duration: 0.6, ease: EASE }} fill={C.ink2} fillOpacity={mode === 'dark' ? 0.12 : 0.08} />
        <motion.path initial={false} animate={{ d: line }} transition={{ duration: 0.6, ease: EASE }} fill="none" stroke={C.ink2} strokeWidth={1.6} />
        <line x1={x(today)} x2={x(today)} y1={ty - 2} y2={H} stroke={C.marker} strokeWidth={2} />
        <circle cx={x(today)} cy={ty} r={5} fill={C.marker} stroke={C.card} strokeWidth={2} />
        <text x={x(today) + 8} y={ty - 6} fontSize={10.5} fontFamily={NUM} fill={C.marker} fontWeight={600}>today</text>
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={x(v)} y={H + 14} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'} fontSize={9.5} fontFamily={NUM} fill={C.faint}>{v}</text>
        ))}
      </svg>
    )
  }

  function Today() {
    const [win, setWin] = useState<Window>('90D')
    const D = DIST[win]
    const vitals = [
      { k: 'Heart rate variability', v: '61', u: 'ms', n: 61, lo: 48, hi: 62, min: 36, max: 74, dots: body.hrvTrend.slice(0, 6), note: 'Upper end', normal: '48–62' },
      { k: 'Resting heart rate', v: '52', u: 'bpm', n: 52, lo: 51, hi: 57, min: 46, max: 62, dots: body.rhrTrend.slice(0, 6), note: 'Normal', normal: '51–57' },
      { k: 'Sleep', v: '7:12', u: 'h', n: 7.2, lo: 6.7, hi: 7.8, min: 5.8, max: 8.6, dots: [6.9, 7.4, 6.6, 7.5, 7.1, 7.6], note: 'Normal', normal: '6:40–7:50' },
      { k: 'Respiratory rate', v: '14.2', u: 'rpm', n: 14.2, lo: 13.8, hi: 14.9, min: 13, max: 15.6, dots: body.respTrend.slice(0, 6), note: 'Normal', normal: '13.8–14.9' },
      { k: 'Skin temperature', v: '+0.1', u: '°C', n: 0.1, lo: -0.4, hi: 0.4, min: -1, max: 1, dots: body.tempTrend.slice(0, 6), note: 'Normal', normal: '±0.4' },
    ]
    const levels: [number, number, string][] = [
      [30, 37, 'Low'],
      [37, 42, 'Below avg'],
      [42, 47, 'Above avg'],
      [47, 55, 'High'],
    ]
    const vo = (v: number) => `${((v - 30) / 25) * 100}%`
    return (
      <Screen active={0}>
        <div className="flex items-center justify-between">
          <div>
            <Label>Thu 26 Nov · 9:41</Label>
            <div className="mt-1" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1 }}>Today vs your normal</div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.card, border: `1px solid ${C.line}`, fontSize: 14, fontWeight: 600 }}>J</div>
        </div>

        <Card className="mt-5 p-4">
          <div className="flex items-center justify-between">
            <Label>Recovery</Label>
            <div className="flex rounded-full p-[3px]" style={{ background: C.wash }}>
              {(Object.keys(DIST) as Window[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWin(w)}
                  className="rounded-full px-2.5 py-[3px]"
                  style={{ fontFamily: NUM, fontSize: 10.5, fontWeight: 600, background: w === win ? C.card : 'transparent', color: w === win ? C.ink : C.muted, boxShadow: w === win ? C.shadow : 'none', transition: 'background .2s' }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <Num size={64} weight={500}>
                <CountUp value={body.readiness} />
              </Num>
              <Num size={22} color={C.muted}>%</Num>
            </div>
            <div className="pb-1.5 text-right">
              <Chip color={C.normal}>Upper end of normal</Chip>
              <div className="mt-1.5" style={{ fontSize: 12, color: C.muted }}>
                Normal {D.mean - D.sd}–{D.mean + D.sd}
              </div>
            </div>
          </div>
          <Distribution win={win} />
          <div className="mt-2" style={{ fontSize: 13, color: C.muted }}>
            Better than <span style={{ fontFamily: NUM, color: C.ink, fontWeight: 600 }}>{percentile(body.readiness, D.mean, D.sd)}%</span> of your days this {D.label === 'year' ? 'year' : `past ${D.label}`}.
          </div>
        </Card>

        <div className="mt-3 flex items-center gap-3 rounded-[14px] px-3.5 py-3" style={{ background: C.band, boxShadow: `inset 0 0 0 1px ${C.bandEdge}` }}>
          <Num size={20} weight={600} color={C.normal}>5/5</Num>
          <div style={{ fontSize: 13, lineHeight: '18px' }}>
            <span style={{ fontWeight: 600 }}>Vitals inside your normal.</span> <span style={{ color: C.muted }}>HRV is at the top of its range, so today can take load.</span>
          </div>
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <Label>Overnight vitals</Label>
          <span className="flex items-center gap-3" style={{ fontSize: 11, color: C.muted }}>
            <span className="flex items-center gap-1">
              <span className="h-2 w-3 rounded-full" style={{ background: C.band, boxShadow: `inset 0 0 0 1px ${C.bandEdge}` }} /> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: C.marker }} /> Today
            </span>
          </span>
        </div>
        <Card className="mt-2.5 px-4 py-1">
          {vitals.map((r, i) => (
            <div key={r.k} className="py-3" style={{ borderTop: i ? `1px solid ${C.line}` : undefined }}>
              <div className="flex items-baseline justify-between">
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.k}</span>
                <span>
                  <Num size={17} weight={500}>{r.v}</Num>
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: 3 }}>{r.u}</span>
                </span>
              </div>
              <div className="mt-2">
                <RangeBar v={r.n} lo={r.lo} hi={r.hi} min={r.min} max={r.max} dots={r.dots} delay={0.1 + i * 0.06} />
              </div>
              <div className="mt-1.5 flex justify-between" style={{ fontSize: 11 }}>
                <span style={{ fontFamily: NUM, color: C.faint }}>normal {r.normal}</span>
                <span style={{ fontWeight: 600, color: r.note === 'Normal' ? C.muted : C.normal }}>{r.note}</span>
              </div>
            </div>
          ))}
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Cardio fitness · VO₂ max</Label>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.normal }}>▲ 0.6 today</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <Num size={36} weight={500}>48.6</Num>
            <span style={{ fontSize: 12, color: C.muted }}>ml/kg/min · High for your age</span>
          </div>
          <div className="relative mt-4 flex gap-[3px]">
            {levels.map(([a, b, l], i) => (
              <div key={l} style={{ width: `${((b - a) / 25) * 100}%` }}>
                <div className="h-2 rounded-full" style={{ background: C.normal, opacity: 0.18 + i * 0.22 }} />
                <div className="mt-1.5" style={{ fontSize: 10.5, color: i === 3 ? C.ink : C.faint, fontWeight: i === 3 ? 600 : 500 }}>{l}</div>
              </div>
            ))}
            <span className="absolute top-[-3px] h-[14px] w-[3px] -translate-x-1/2 rounded-full" style={{ left: vo(48), background: C.faint }} />
            <motion.span
              className="absolute top-[-4px] h-4 w-4 -translate-x-1/2 rounded-full"
              style={{ background: C.marker, boxShadow: `0 0 0 2.5px ${C.card}` }}
              initial={STATIC ? false : { left: vo(48) }}
              animate={{ left: vo(48.6) }}
              transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
            />
          </div>
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Crew ───────────────────────── */

  function Crew() {
    const [metric, setMetric] = useState<Metric>('recovery')
    const [props, setProps] = useState(false)
    const rows = [...people].sort((a, b) => DEV[metric][b.id] - DEV[metric][a.id])
    const color = (v: number) => (v > 10 ? C.normal : v < -20 ? C.low : v < -10 ? C.high : C.ink2)
    const pct = (v: number) => (Math.min(Math.abs(v), 30) / 30) * 50
    return (
      <Screen active={2}>
        <Label>Crew · 5 people</Label>
        <div className="mt-1" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1 }}>Against their own normal</div>
        <p className="mt-1.5" style={{ fontSize: 13.5, color: C.muted, lineHeight: '19px' }}>Everyone is compared with themselves, so a 52 bpm runner and a 64 bpm lifter can share one chart.</p>

        <div className="mt-4 flex rounded-[12px] p-[3px]" style={{ background: C.wash }}>
          {(
            [
              ['recovery', 'Recovery'],
              ['hrv', 'HRV'],
              ['sleep', 'Sleep'],
            ] as [Metric, string][]
          ).map(([m, l]) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className="flex-1 rounded-[10px] py-1.5"
              style={{ fontSize: 13, fontWeight: 600, background: m === metric ? C.card : 'transparent', color: m === metric ? C.ink : C.muted, boxShadow: m === metric ? C.shadow : 'none', transition: 'background .2s' }}
            >
              {l}
            </button>
          ))}
        </div>

        <Card className="mt-3 px-4 pb-3 pt-4">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0" style={{ left: 'calc(72px + (100% - 72px) * 0.333)', width: 'calc((100% - 72px) * 0.333)', background: C.band, borderRadius: 8 }} />
            <div className="pointer-events-none absolute inset-y-0 w-px" style={{ left: 'calc(72px + (100% - 72px) * 0.5)', background: C.ink2, opacity: 0.4 }} />
            {rows.map((p) => {
              const v = DEV[metric][p.id]
              return (
                <motion.div layout key={p.id} transition={{ type: 'spring', stiffness: 380, damping: 36 }} className="relative flex h-[44px] items-center">
                  <div className="w-[72px] shrink-0">
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
                    {(p.you || p.resting) && <div style={{ fontSize: 10.5, color: C.muted }}>{p.you ? 'you' : 'resting'}</div>}
                  </div>
                  <div className="relative h-full flex-1">
                    <motion.div
                      className="absolute top-1/2 h-[14px] -translate-y-1/2"
                      style={{ background: color(v), borderRadius: v >= 0 ? '0 7px 7px 0' : '7px 0 0 7px', opacity: p.resting ? 0.6 : 1 }}
                      initial={false}
                      animate={{ left: v >= 0 ? '50%' : `${50 - pct(v)}%`, width: `${pct(v)}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                    />
                    <motion.span
                      className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap"
                      style={{ fontFamily: NUM, fontSize: 11.5, fontWeight: 600, color: color(v) }}
                      initial={false}
                      animate={{ left: v >= 0 ? `calc(${50 + pct(v)}% + 6px)` : `calc(${50 - pct(v)}% - 40px)` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                    >
                      {v > 0 ? '+' : v < 0 ? '−' : ''}
                      {Math.abs(v)}%
                    </motion.span>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <div className="mt-1 flex" style={{ fontFamily: NUM, fontSize: 9.5, color: C.faint }}>
            <span className="w-[72px]" />
            <div className="flex flex-1 justify-between">
              <span>−30%</span>
              <span style={{ color: C.normal }}>normal ±10%</span>
              <span>+30%</span>
            </div>
          </div>
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Days inside their normal</Label>
            <span style={{ fontSize: 11.5, color: C.muted }}>Week 48</span>
          </div>
          <div className="mt-3 space-y-2">
            {people.map((p) => {
              const d = DAYS[p.id]
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-[60px] shrink-0" style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <div className="flex flex-1 gap-[4px]">
                    {Array.from({ length: 7 }, (_, i) => (
                      <span
                        key={i}
                        className="h-[18px] flex-1 rounded-[5px]"
                        style={
                          i < d.length
                            ? { background: d[i] ? C.band : C.wash, boxShadow: d[i] ? `inset 0 0 0 1px ${C.bandEdge}` : undefined }
                            : { boxShadow: `inset 0 0 0 1px ${C.line}`, backgroundImage: `repeating-linear-gradient(135deg, ${C.wash} 0 2px, transparent 2px 5px)` }
                        }
                      />
                    ))}
                  </div>
                  <Num size={13} weight={600} color={d.filter(Boolean).length === d.length ? C.normal : C.ink2} style={{ width: 28, textAlign: 'right' }}>
                    {d.filter(Boolean).length}/{d.length}
                  </Num>
                </div>
              )
            })}
          </div>
          <div className="mt-3" style={{ fontSize: 12.5, color: C.muted, lineHeight: '17px' }}>The weekly crew score counts consistency, not intensity. Sophia leads with four for four.</div>
        </Card>

        <Card className="mt-3 p-4">
          <div style={{ fontSize: 14, lineHeight: '20px' }}>
            <span style={{ fontWeight: 600 }}>Sophia's HRV is 6% above her normal</span> <span style={{ color: C.muted }}>after an easy 6.2 km at 7:10.</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setProps((v) => !v)}
            className="mt-3 w-full rounded-[12px] py-2.5"
            style={{ background: props ? C.wash : C.ink, color: props ? C.ink : C.onInk, fontSize: 13.5, fontWeight: 600, transition: 'background .2s' }}
          >
            {props ? 'Props sent' : 'Send props'}
          </motion.button>
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Run report ───────────────────────── */

  function HrVsUsual() {
    const W = 310
    const H = 104
    const opts = { min: 100, max: 190, padY: 4 }
    const smooth = run.hr.map((_, i) => {
      const win = run.hr.slice(Math.max(0, i - 3), i + 4)
      return win.reduce((a, b) => a + b, 0) / win.length - 2
    })
    const upper = toPoints(smooth.map((v) => v + 5), W, H, opts)
    const lower = toPoints(smooth.map((v) => v - 5), W, H, opts)
    const band = `${smoothPath(upper)} ${smoothPath([...lower].reverse(), 'L')} Z`
    const today = smoothPath(toPoints(run.hr, W, H, opts))
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 overflow-visible">
        {[120, 150, 180].map((b) => {
          const y = opts.padY + (1 - (b - 100) / 90) * (H - 8)
          return (
            <g key={b}>
              <line x1={0} x2={W} y1={y} y2={y} stroke={C.line} />
              <text x={0} y={y - 3} fontSize={9.5} fontFamily={NUM} fill={C.faint}>{b}</text>
            </g>
          )
        })}
        <motion.path d={band} fill={C.band} stroke={C.bandEdge} strokeWidth={1} initial={STATIC ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <DrawPath d={today} stroke={C.ink} width={1.8} delay={0.3} />
        {[0, 10, 20, 30, 40, 50].map((m) => (
          <text key={m} x={(m / 50) * W} y={H + 14} textAnchor={m === 0 ? 'start' : m === 50 ? 'end' : 'middle'} fontSize={9.5} fontFamily={NUM} fill={C.faint}>{m}′</text>
        ))}
      </svg>
    )
  }

  function SplitDeviation() {
    const [pm, ps] = run.pace.split(':').map(Number)
    const avg = pm * 60 + ps
    const first = run.splits.slice(0, 5).reduce((a, b) => a + b, 0)
    const second = run.splits.slice(5).reduce((a, b) => a + b, 0)
    return (
      <>
        <div className="relative mt-3 flex h-[120px] items-stretch gap-[6px]">
          <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: C.ink2, opacity: 0.4 }} />
          {run.splits.map((s, i) => {
            const d = Math.round(s - avg)
            const h = Math.abs(d) * 3.4
            const faster = d < 0
            return (
              <div key={i} className="relative flex-1">
                <motion.div
                  className="absolute inset-x-0"
                  style={{ background: faster ? C.normal : C.high, borderRadius: 4, bottom: faster ? '50%' : undefined, top: faster ? undefined : '50%', opacity: 0.9 }}
                  initial={STATIC ? false : { height: 0 }}
                  animate={{ height: Math.max(h, 2) }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: EASE }}
                />
                <span
                  className="absolute inset-x-0 text-center"
                  style={{
                    fontFamily: NUM,
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: faster ? C.normal : C.high,
                    bottom: faster ? `calc(50% + ${Math.max(h, 2) + 3}px)` : undefined,
                    top: faster ? undefined : `calc(50% + ${Math.max(h, 2) + 3}px)`,
                  }}
                >
                  {d > 0 ? '+' : d < 0 ? '−' : ''}
                  {Math.abs(d)}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex gap-[6px]" style={{ fontFamily: NUM, fontSize: 9.5, color: C.faint }}>
          {run.splits.map((_, i) => (
            <span key={i} className="flex-1 text-center">{i + 1}</span>
          ))}
        </div>
        <div className="mt-2.5" style={{ fontSize: 12.5, color: C.muted }}>
          Seconds vs your {run.pace} average pace. <span style={{ color: C.ink, fontWeight: 600 }}>Negative split: the second half was {first - second}s faster.</span>
        </div>
      </>
    )
  }

  function RunReport() {
    const time = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    const past = [2998, 3040, 3085, 3122, 3160]
    const panel: [string, string, string, string, string][] = [
      ['Avg pace', '4:58 /km', '5:05–5:20', 'Faster', C.normal],
      ['Avg heart rate', '162 bpm', '155–165', 'Normal', C.muted],
      ['Max heart rate', '178 bpm', '172–182', 'Normal', C.muted],
      ['Cardiac drift', '4.1%', '< 5%', 'Normal', C.muted],
      ['Cadence', '176 spm', '170–178', 'Normal', C.muted],
      ['Est. VO₂ max', '48.6', '47.4–48.2', 'New high', C.normal],
    ]
    return (
      <Screen active={3}>
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <ChevronLeft size={18} />
          </div>
          <Label>Run report</Label>
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <Share2 size={16} />
          </div>
        </div>
        <div className="mt-4" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1 }}>{run.title}</div>
        <Label style={{ marginTop: 6 }}>Thu 26 Nov · 07:42 · Prospect Park</Label>

        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <Label>10K time</Label>
            <Chip color={C.normal}>Personal best {run.pr.delta}</Chip>
          </div>
          <div className="mt-2">
            <Num size={56} weight={500}>{run.pr.time}</Num>
          </div>
          <div className="mt-4">
            <RangeBar v={2985} lo={2998} hi={3160} min={2940} max={3240} dots={past} delay={0.2} />
          </div>
          <div className="mt-1.5 flex justify-between" style={{ fontFamily: NUM, fontSize: 10, color: C.faint }}>
            <span>← faster · 49:00</span>
            <span>your last five {time(2998)}–{time(3160)}</span>
            <span>54:00</span>
          </div>
        </Card>

        <Card className="mt-3 px-4 py-3">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3" style={{ fontFamily: NUM, fontSize: 9.5, color: C.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span>Result</span>
            <span className="w-[74px] text-right">Your normal</span>
            <span className="w-[64px] text-right">Flag</span>
          </div>
          {panel.map(([k, v, n, flag, color]) => (
            <div key={k} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 py-2.5" style={{ borderTop: `1px solid ${C.line}` }}>
              <div>
                <div style={{ fontSize: 12.5, color: C.muted }}>{k}</div>
                <Num size={16} weight={500}>{v}</Num>
              </div>
              <span className="w-[74px] text-right" style={{ fontFamily: NUM, fontSize: 11.5, color: C.muted }}>{n}</span>
              <span className="w-[64px] text-right" style={{ fontSize: 12, fontWeight: 600, color }}>{flag}</span>
            </div>
          ))}
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Heart rate vs usual</Label>
            <span className="flex items-center gap-3" style={{ fontSize: 11, color: C.muted }}>
              <span className="flex items-center gap-1">
                <span className="h-[2px] w-3" style={{ background: C.ink }} /> Today
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-sm" style={{ background: C.band, boxShadow: `inset 0 0 0 1px ${C.bandEdge}` }} /> Usual at this pace
              </span>
            </span>
          </div>
          <HrVsUsual />
        </Card>

        <Card className="mt-3 p-4">
          <Label>Splits vs average</Label>
          <SplitDeviation />
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Recovery tomorrow</Label>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.high }}>Below normal</span>
          </div>
          <div className="relative mt-4 h-[18px]">
            <div className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full" style={{ background: C.wash }} />
            <div className="absolute top-1/2 h-[12px] -translate-y-1/2 rounded-full" style={{ left: '57%', width: '22%', background: C.band, boxShadow: `inset 0 0 0 1px ${C.bandEdge}` }} />
            <motion.div
              className="absolute top-1/2 h-[16px] -translate-y-1/2 rounded-full"
              style={{ left: '55%', width: '10%', backgroundImage: `repeating-linear-gradient(135deg, ${C.high} 0 2px, transparent 2px 5px)`, boxShadow: `inset 0 0 0 1.5px ${C.high}` }}
              initial={STATIC ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            />
          </div>
          <div className="mt-1.5 flex justify-between" style={{ fontFamily: NUM, fontSize: 10, color: C.faint }}>
            <span>0</span>
            <span>
              <span style={{ color: C.high }}>expected 55–65</span> · normal 57–79
            </span>
            <span>100</span>
          </div>
          <div className="mt-2.5" style={{ fontSize: 12.5, color: C.muted, lineHeight: '17px' }}>36% of the race was in zone 4. Plan an easy Friday; you should be back in range by Saturday.</div>
        </Card>
      </Screen>
    )
  }

  return { Today, Crew, RunReport }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Ink', hex: C.ink },
  { name: 'Normal', hex: C.normal },
  { name: 'Today', hex: C.marker },
  { name: 'Watch', hex: C.high },
  { name: 'Low', hex: C.low },
]

export const baseline: Direction = {
  id: 'baseline',
  name: 'Baseline',
  round: 2,
  lineage: 'Night Lab + Soft Signal',
  tagline: 'Every number shown against your own normal: Night Lab\'s rigor with Soft Signal\'s "a range, not a target".',
  inspiredBy: ['Function Health', 'WHOOP Healthspan', 'Apple Health Cardio Fitness', 'Athlytic', 'Oura Vitals'],
  dna: [
    { label: 'From Night Lab', text: 'Data-dense and precise, with real numbers, trends and percentiles. Built for people who like to dig in.' },
    { label: 'From Soft Signal', text: 'Nothing is a bare score. Every metric sits on a band of your personal normal, so "fine" looks calm, not mediocre.' },
    { label: 'Atmosphere', text: 'Clinical but friendly: cool mint-white like a modern lab report by day, graphite by night. Hairline borders instead of glows.' },
    { label: 'Color', text: 'Sage band = your normal, one persimmon dot = today. Amber and rose only appear when something leaves the band.' },
    { label: 'Type', text: 'Spline Sans Mono for every number, like a lab printout; Instrument Sans (Soft Signal\'s serif\'s sibling) for words.' },
    { label: 'Social', text: 'The crew is compared with their own baselines, not each other, and the weekly score rewards days inside your normal.' },
  ],
  fromTandem: 'Tandem\'s budget-vs-actual pattern, applied to the body: a planned range, the actual value, and a calm flag only when you drift outside it.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Spline Sans Mono', displayFamily: NUM, text: 'Instrument Sans', textFamily: TXT, sample: '78', displayStyle: { fontWeight: 500, letterSpacing: '-0.04em' } },
  screens: [
    { title: 'Today', caption: 'Recovery as a distribution; switch 30D / 90D / 1Y', render: (m) => createElement(T[m].Today) },
    { title: 'Crew', caption: 'Each person vs their own normal; switch metric', render: (m) => createElement(T[m].Crew) },
    { title: 'Run report', caption: 'Lab-panel results, HR vs usual, split deviation', render: (m) => createElement(T[m].RunReport) },
  ],
}

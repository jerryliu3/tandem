import { motion } from 'motion/react'
import { ChartColumn, ChevronLeft, HandHeart, Heart, Moon, Play, Sun, User, type LucideIcon } from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { body, run, sophiaRun } from '../data'
import { CountUp, DrawPath, Phone, STATIC, smoothPath, type Direction, type Mode, type Pt } from '../kit'

const LIGHT = {
  bg: '#F5F1EA',
  ink: '#25211D',
  muted: '#7A7168',
  faint: '#B3A99D',
  line: 'rgba(70,50,30,0.08)',
  card: 'rgba(255,255,255,0.74)',
  raised: '#FFFFFF',
  wash: 'rgba(37,33,29,0.04)',
  shadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 18px 40px -28px rgba(90,60,30,0.38), 0 2px 6px -2px rgba(90,60,30,0.06)',
  mist1: '#CDEBD9',
  mist2: '#FBDDC2',
  mist3: 'rgba(226,220,251,0.8)',
  tabBg: 'rgba(255,255,255,0.82)',
  tabShadow: '0 20px 40px -20px rgba(90,60,30,0.35), 0 0 0 1px rgba(70,50,30,0.05)',
  topTint: 'rgba(245,241,234,0.8)',
  trend: 'rgba(37,33,29,0.45)',
  dot: '#FFFFFF',
  sage: '#5FA383',
  sageSoft: '#D3EBDD',
  sageInk: '#2F6B50',
  onSage: '#FFFFFF',
  honey: '#DDA04A',
  honeySoft: 'rgba(249,227,198,0.8)',
  honeyInk: '#9A6A2A',
  lav: '#9888DD',
  lavSoft: 'rgba(229,224,250,0.85)',
  lavInk: '#5D4FA8',
  orbHi: '#FFFFFF',
}
type Palette = typeof LIGHT

const DARK: Palette = {
  bg: '#17141B',
  ink: '#F2ECE4',
  muted: '#A69D95',
  faint: '#6C645E',
  line: 'rgba(255,240,225,0.08)',
  card: 'rgba(255,246,236,0.055)',
  raised: 'rgba(255,246,236,0.1)',
  wash: 'rgba(255,240,225,0.05)',
  shadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 22px 40px -28px rgba(0,0,0,0.7)',
  mist1: 'rgba(95,163,131,0.34)',
  mist2: 'rgba(221,160,74,0.2)',
  mist3: 'rgba(152,136,221,0.26)',
  tabBg: 'rgba(42,36,46,0.72)',
  tabShadow: '0 20px 40px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,240,225,0.06)',
  topTint: 'rgba(23,20,27,0.8)',
  trend: 'rgba(242,236,228,0.5)',
  dot: '#17141B',
  sage: '#7FC6A2',
  sageSoft: 'rgba(127,198,162,0.18)',
  sageInk: '#A9E4C5',
  onSage: '#0F2219',
  honey: '#E9B566',
  honeySoft: 'rgba(233,181,102,0.13)',
  honeyInk: '#F0C98C',
  lav: '#AFA2F0',
  lavSoft: 'rgba(175,162,240,0.15)',
  lavInk: '#CFC6FA',
  orbHi: '#F7FFF9',
}

const SERIF = 'var(--f-serif)'
const SANS = 'var(--f-figtree)'

type Mood = 'ready' | 'pace' | 'recover'

function theme(C: Palette, mode: Mode) {
  const MOOD: Record<Mood, { light: string; mid: string; deep: string; word: string }> = {
    ready: { light: '#E4F4EA', mid: '#9FD3B6', deep: C.sage, word: 'Ready' },
    pace: { light: '#FCEBD5', mid: '#F2C58B', deep: C.honey, word: 'Pace yourself' },
    recover: { light: '#EEEBFD', mid: '#C3B8F3', deep: C.lav, word: 'Recover' },
  }

  function Mist() {
    const drift = (x: number, y: number, d: number) =>
      STATIC ? {} : { animate: { x: [0, x, 0], y: [0, y, 0] }, transition: { duration: d, repeat: Infinity, ease: 'easeInOut' as const } }
    const blob = (style: CSSProperties) => ({ className: 'absolute rounded-full', style: { filter: 'blur(8px)', ...style } })
    return (
      <div className="absolute inset-0 overflow-hidden">
        <motion.div {...blob({ width: 420, height: 420, left: -110, top: -120, background: `radial-gradient(circle, ${C.mist1} 0%, transparent 66%)` })} {...drift(18, 12, 14)} />
        <motion.div {...blob({ width: 340, height: 340, right: -150, top: 60, background: `radial-gradient(circle, ${C.mist2} 0%, transparent 66%)` })} {...drift(-14, 16, 17)} />
        <motion.div {...blob({ width: 260, height: 260, left: 170, top: 330, background: `radial-gradient(circle, ${C.mist3} 0%, transparent 66%)` })} {...drift(10, -14, 19)} />
      </div>
    )
  }

  function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div className={`rounded-[28px] ${className}`} style={{ background: C.card, boxShadow: C.shadow, backdropFilter: 'blur(14px)', ...style }}>
        {children}
      </div>
    )
  }

  function Orb({ size, mood, breathe = true, children }: { size: number; mood: Mood; breathe?: boolean; children?: ReactNode }) {
    const m = MOOD[mood]
    return (
      <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
        <motion.div
          className="absolute rounded-full"
          style={{ inset: -size * 0.18, background: `radial-gradient(circle, ${m.mid}66 0%, transparent 68%)` }}
          animate={STATIC || !breathe ? undefined : { scale: [0.94, 1.06, 0.94], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 34% 28%, ${C.orbHi} 0%, ${m.light} 20%, ${m.mid} 58%, ${m.deep} 100%)`,
            boxShadow: `0 ${size * 0.16}px ${size * 0.34}px -${size * 0.12}px ${m.deep}88, inset -${size * 0.06}px -${size * 0.08}px ${size * 0.18}px rgba(40,60,40,0.18), inset ${size * 0.06}px ${size * 0.06}px ${size * 0.16}px rgba(255,255,255,0.7)`,
          }}
          animate={STATIC || !breathe ? undefined : { scale: [1, 1.035, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative">{children}</div>
      </div>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: Sun, label: 'Today' },
      { icon: ChartColumn, label: 'Trends' },
      { icon: HandHeart, label: 'Together' },
      { icon: User, label: 'You' },
    ]
    return (
      <div
        className="absolute inset-x-6 bottom-[26px] z-20 flex h-[62px] items-center justify-between rounded-full px-2"
        style={{ background: C.tabBg, backdropFilter: 'blur(20px) saturate(150%)', boxShadow: C.tabShadow, fontFamily: SANS }}
      >
        {items.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className="flex h-[46px] items-center justify-center gap-2 rounded-full"
            style={{ padding: i === active ? '0 18px' : '0 16px', background: i === active ? C.sageSoft : 'transparent', color: i === active ? C.sageInk : C.faint }}
          >
            <Icon size={20} strokeWidth={2} />
            {i === active && <span style={{ fontSize: 14, fontWeight: 650 }}>{label}</span>}
          </div>
        ))}
      </div>
    )
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} backdrop={<Mist />} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-5 pb-[120px] pt-[62px]" style={{ fontFamily: SANS, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  function Chip({ children }: { children: ReactNode }) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: C.sageSoft, color: C.sageInk, fontSize: 12.5, fontWeight: 650 }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.sage }} />
        {children}
      </span>
    )
  }

  /* ───────────────────────── Today ───────────────────────── */

  function RangeBand({ w = 306, h = 96 }: { w?: number; h?: number }) {
    const n = body.minutes14.length
    const x = (i: number) => 10 + (i * (w - 20)) / (n - 1)
    const y = (min: number) => h - 8 - (min / 70) * (h - 16)
    const upper: Pt[] = body.minutes14.map((_, i) => [x(i), y(45 + Math.sin(i / 2) * 2)])
    const lower: Pt[] = body.minutes14.map((_, i) => [x(i), y(25 + Math.cos(i / 2.4) * 2)])
    const actual: Pt[] = body.minutes14.map((m, i) => [x(i), y(m)])
    const band = `${smoothPath(upper)} ${smoothPath([...lower].reverse(), 'L')} Z`
    const [tx, ty] = actual[n - 1]
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <motion.path d={band} fill={C.sageSoft} initial={STATIC ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
        <DrawPath d={smoothPath(actual)} stroke={C.trend} width={1.8} delay={0.2} />
        {actual.slice(0, -1).map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={2.4} fill={C.dot} stroke={C.trend} strokeWidth={1.2} />
        ))}
        <motion.circle cx={tx} cy={ty} r={14} fill={C.sage} opacity={0.18} animate={STATIC ? undefined : { r: [10, 16, 10] }} transition={{ duration: 3, repeat: Infinity }} />
        <circle cx={tx} cy={ty} r={5.5} fill={C.sage} stroke={C.dot} strokeWidth={2} />
      </svg>
    )
  }

  function Pebble({ mood, today, empty }: { mood?: Mood; today?: boolean; empty?: boolean }) {
    return (
      <div
        className="h-[30px] w-[30px] rounded-full"
        style={
          empty || !mood
            ? { border: `1.5px dashed ${C.faint}`, opacity: 0.6 }
            : {
                background: `radial-gradient(circle at 35% 30%, ${C.orbHi} 0%, ${MOOD[mood].mid} 55%, ${MOOD[mood].deep} 100%)`,
                boxShadow: today ? `0 0 0 3px ${C.bg}, 0 0 0 4.5px ${MOOD[mood].deep}` : undefined,
              }
        }
      />
    )
  }

  function Today() {
    const why = [
      { mood: 'ready' as Mood, text: 'You slept 7h 12m, close to your need', value: '84' },
      { mood: 'ready' as Mood, text: 'Your heart is calmer than usual', value: '52 bpm' },
      { mood: 'pace' as Mood, text: "Tuesday's intervals are mostly behind you", value: '2 days' },
    ]
    return (
      <Screen active={0}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Thursday, November 26</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Good morning, Jerry</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: C.raised, boxShadow: C.shadow, fontWeight: 700 }}>J</div>
        </div>

        <div className="mt-7 flex justify-center">
          <Orb size={176} mood="ready" />
        </div>

        <h1 className="mx-auto mt-8 max-w-[320px] text-center" style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1.02, letterSpacing: '-0.01em' }}>
          You're <em style={{ color: C.sage }}>ready</em> for a steady day.
        </h1>
        <p className="mx-auto mt-3 max-w-[300px] text-center" style={{ fontSize: 15, lineHeight: '22px', color: C.muted }}>
          Your body recovered well overnight. A run like this morning's is plenty.
        </p>

        <Card className="mt-7 p-5">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 14, color: C.muted, fontWeight: 550 }}>Your range today</span>
            <Chip>In range</Chip>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span style={{ fontFamily: SERIF, fontSize: 46, lineHeight: 1 }}>
              <CountUp value={body.activeMin} duration={1.4} />
            </span>
            <span style={{ fontSize: 15, color: C.muted }}>of 25–45 active minutes</span>
          </div>
          <div className="mt-3">
            <RangeBand />
          </div>
          <div className="mt-1 flex justify-between" style={{ fontSize: 11.5, color: C.faint }}>
            <span>2 weeks ago</span>
            <span>Today</span>
          </div>
        </Card>

        <Card className="mt-3 px-5 py-2">
          {why.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-3" style={{ borderTop: i ? `1px solid ${C.line}` : undefined }}>
              <Orb size={14} mood={r.mood} breathe={false} />
              <span className="flex-1" style={{ fontSize: 15 }}>{r.text}</span>
              <span className="tnum" style={{ fontSize: 13.5, color: C.muted }}>{r.value}</span>
            </div>
          ))}
        </Card>

        <Card className="mt-3 flex items-center gap-4 p-5" style={{ background: C.honeySoft }}>
          <div className="flex-1">
            <div style={{ fontSize: 13, color: C.honeyInk, fontWeight: 650 }}>This evening</div>
            <div className="mt-1" style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.1 }}>
              A slow 15-minute stretch for tired legs
            </div>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: C.raised, boxShadow: C.shadow }}>
            <Play size={18} fill={C.ink} color={C.ink} />
          </div>
        </Card>

        <Card className="mt-3 p-5">
          <span style={{ fontFamily: SERIF, fontSize: 22 }}>Four calm days in a row</span>
          <div className="mt-4 flex justify-between">
            {(['ready', 'pace', 'ready', 'ready'] as Mood[]).map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Pebble mood={m} today={i === 3} />
                <span style={{ fontSize: 12, color: i === 3 ? C.ink : C.faint, fontWeight: i === 3 ? 700 : 500 }}>{['M', 'T', 'W', 'T'][i]}</span>
              </div>
            ))}
            {['F', 'S', 'S'].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Pebble empty />
                <span style={{ fontSize: 12, color: C.faint }}>{d}</span>
              </div>
            ))}
          </div>
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Together ───────────────────────── */

  function Together() {
    const [sent, setSent] = useState(false)
    const circle: { name: string; mood: Mood; status: string }[] = [
      { name: 'Alex', mood: 'pace', status: 'Pushing hard this week' },
      { name: 'Priya', mood: 'ready', status: 'Steady and well rested' },
      { name: 'Sam', mood: 'recover', status: 'Resting, under the weather' },
    ]
    return (
      <Screen active={2}>
        <h1 style={{ fontFamily: SERIF, fontSize: 46, lineHeight: 1 }}>Together</h1>
        <p className="mt-2" style={{ fontSize: 15, color: C.muted }}>How your people are doing today.</p>

        <Card className="mt-6 p-5">
          <div className="flex items-center gap-4">
            <Orb size={64} mood="ready">
              <span style={{ fontFamily: SERIF, fontSize: 28, color: '#fff' }}>S</span>
            </Orb>
            <div>
              <div style={{ fontSize: 13, color: C.muted, fontWeight: 550 }}>Sophia · your partner</div>
              <div style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1.1 }}>
                Having a <em style={{ color: C.sage }}>good</em> day
              </div>
            </div>
          </div>
          <p className="mt-4" style={{ fontSize: 15, lineHeight: '22px', color: C.muted }}>
            Easy run at {sophiaRun.time}, {sophiaRun.km} km. Back before the turkey went in.
          </p>
          <div className="mt-4 flex gap-2">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setSent((s) => !s)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-3"
              style={{ background: sent ? C.sageSoft : C.sage, color: sent ? C.sageInk : C.onSage, fontSize: 15, fontWeight: 650, transition: 'background .3s, color .3s' }}
            >
              <Heart size={16} fill={sent ? C.sageInk : C.onSage} />
              {sent ? 'Warmth sent' : 'Send warmth'}
            </motion.button>
            <button className="flex-1 rounded-full py-3" style={{ background: C.raised, boxShadow: `inset 0 0 0 1px ${C.line}`, fontSize: 15, fontWeight: 600 }}>
              Walk after dinner?
            </button>
          </div>
        </Card>

        <div className="mt-6 px-1" style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>Your circle</div>
        <Card className="mt-2.5 px-5 py-1.5">
          {circle.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3.5 py-3.5" style={{ borderTop: i ? `1px solid ${C.line}` : undefined }}>
              <Orb size={38} mood={p.mood} breathe={false}>
                <span style={{ fontFamily: SERIF, fontSize: 18, color: '#fff' }}>{p.name[0]}</span>
              </Orb>
              <div className="flex-1">
                <div style={{ fontSize: 15.5, fontWeight: 650 }}>{p.name}</div>
                <div style={{ fontSize: 13.5, color: C.muted }}>{p.status}</div>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 650, color: MOOD[p.mood].deep }}>{MOOD[p.mood].word}</span>
            </div>
          ))}
          <div className="mb-3 mt-1 flex items-center gap-2 rounded-[16px] px-3.5 py-2.5" style={{ background: C.lavSoft, fontSize: 13.5, color: C.lavInk }}>
            <Moon size={14} />
            Nudges to Sam are paused while he rests.
          </div>
        </Card>

        <Card className="mt-3 p-5">
          <div style={{ fontSize: 13, color: C.muted, fontWeight: 550 }}>Your ritual with Sophia</div>
          <div className="mt-1" style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1.05 }}>Sunday walks</div>
          <div className="mt-4 flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Pebble key={i} mood="ready" />
            ))}
            <Pebble empty />
            <span className="ml-2" style={{ fontSize: 13.5, color: C.muted }}>4 weeks in a row</span>
          </div>
          <div className="mt-4 rounded-[16px] px-3.5 py-3" style={{ background: C.wash, fontSize: 14 }}>
            Next: <span style={{ fontWeight: 650 }}>Sunday, Nov 29 · 10:00 AM</span>, Brooklyn Botanic Garden
          </div>
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Reflection ───────────────────────── */

  function EffortArc() {
    const cx = 150
    const cy = 140
    const r = 112
    const at = (f: number): Pt => [cx - r * Math.cos(Math.PI * f), cy - r * Math.sin(Math.PI * f)]
    const arc = (a: number, b: number) => {
      const [x0, y0] = at(a)
      const [x1, y1] = at(b)
      return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`
    }
    const effort = 0.8
    const [mx, my] = at(effort)
    return (
      <svg width="100%" viewBox="0 0 300 160" className="overflow-visible">
        <path d={arc(0, 1)} fill="none" stroke={C.wash} strokeWidth={18} strokeLinecap="round" />
        <path d={arc(0.36, 0.68)} fill="none" stroke={C.sageSoft} strokeWidth={18} strokeLinecap="round" />
        <defs>
          <linearGradient id={`soft-effort-${mode}`} x1="0" x2="1">
            <stop offset="0" stopColor="#F4D3A3" />
            <stop offset="1" stopColor={C.honey} />
          </linearGradient>
        </defs>
        <DrawPath d={arc(0, effort)} stroke={`url(#soft-effort-${mode})`} width={8} duration={1.6} delay={0.2} />
        <motion.circle cx={mx} cy={my} r={9} fill={C.dot} stroke={C.honey} strokeWidth={3} initial={STATIC ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} />
      </svg>
    )
  }

  function Reflection() {
    const [feel, setFeel] = useState('Hard')
    return (
      <Screen active={0}>
        <div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 14, fontWeight: 550 }}>
          <ChevronLeft size={18} /> This morning
        </div>
        <h1 className="mt-4" style={{ fontFamily: SERIF, fontSize: 50, lineHeight: 0.98 }}>
          Turkey <em>Trot</em>
        </h1>
        <p className="mt-3" style={{ fontSize: 15.5, lineHeight: '23px', color: C.muted }}>
          A strong effort, a little above your range. That's what race days are for.
        </p>

        <Card className="mt-6 px-5 pb-5 pt-6">
          <EffortArc />
          <div className="-mt-[72px] text-center">
            <div style={{ fontFamily: SERIF, fontSize: 44, lineHeight: 1 }}>Hard</div>
            <div style={{ fontSize: 13, color: C.muted }}>Effort, compared with your usual</div>
          </div>
          <div className="mt-5 flex justify-center gap-5" style={{ fontSize: 12.5, color: C.muted }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.sageSoft, boxShadow: `inset 0 0 0 1px ${C.sage}55` }} /> Your range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.honey }} /> This run
            </span>
          </div>
        </Card>

        <Card className="mt-3 grid grid-cols-2 p-2">
          {[
            ['Distance', run.km.toFixed(1), 'km'],
            ['Time', run.duration, ''],
            ['Pace', run.pace, '/km'],
            ['Heart rate', String(run.avgHr), 'avg'],
          ].map(([k, v, u], i) => (
            <div key={k} className="px-4 py-3.5" style={{ borderLeft: i % 2 ? `1px solid ${C.line}` : undefined, borderTop: i > 1 ? `1px solid ${C.line}` : undefined }}>
              <div style={{ fontSize: 13, color: C.muted }}>{k}</div>
              <div className="tnum" style={{ fontFamily: SERIF, fontSize: 34, lineHeight: 1.1 }}>
                {v}
                <span style={{ fontFamily: SANS, fontSize: 13, color: C.muted, marginLeft: 4 }}>{u}</span>
              </div>
            </div>
          ))}
        </Card>

        <div className="mt-6 px-1" style={{ fontFamily: SERIF, fontSize: 24 }}>How did it feel?</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['Easy', 'Good', 'Hard', 'All out'].map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.94 }}
              onClick={() => setFeel(f)}
              className="rounded-full px-5 py-2.5"
              style={{
                background: f === feel ? C.ink : C.raised,
                color: f === feel ? C.bg : C.ink,
                boxShadow: f === feel ? 'none' : `inset 0 0 0 1px ${C.line}, ${C.shadow}`,
                fontSize: 15,
                fontWeight: 600,
                transition: 'background .25s, color .25s',
              }}
            >
              {f}
            </motion.button>
          ))}
        </div>

        <Card className="mt-6 p-5" style={{ background: C.lavSoft }}>
          <div style={{ fontSize: 13, color: C.lavInk, fontWeight: 650 }}>Tomorrow</div>
          <div className="mt-1" style={{ fontFamily: SERIF, fontSize: 25, lineHeight: 1.1 }}>
            A lighter day: 15–30 minutes. A walk counts.
          </div>
        </Card>

        <div className="mt-4 flex items-start gap-3 px-1">
          <Orb size={34} mood="ready" breathe={false}>
            <span style={{ fontFamily: SERIF, fontSize: 16, color: '#fff' }}>S</span>
          </Orb>
          <div className="rounded-[20px] rounded-tl-[6px] px-4 py-3" style={{ background: C.raised, boxShadow: C.shadow }}>
            <div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.25 }}>
              <em>So proud of you. Pie is on me.</em>
            </div>
            <div className="mt-1" style={{ fontSize: 12, color: C.faint }}>Sophia · 8:51 AM</div>
          </div>
        </div>
      </Screen>
    )
  }

  return { Today, Together, Reflection }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Ink', hex: C.ink },
  { name: 'Sage', hex: C.sage },
  { name: 'Honey', hex: C.honey },
  { name: 'Lavender', hex: C.lav },
  { name: 'Muted', hex: C.muted },
]

export const softSignal: Direction = {
  id: 'soft-signal',
  name: 'Soft Signal',
  round: 1,
  tagline: 'Wellness that talks like a person: calm, warm, and never a red number.',
  inspiredBy: ['Oura', 'Gentler Streak', 'Apple Health', 'Headspace', 'Calm'],
  dna: [
    { label: 'Atmosphere', text: 'Warm paper by day, plum ink by night, with slow-drifting colored mist. Low contrast, lots of air.' },
    { label: 'Color', text: 'State colors, not scores: sage = ready, honey = pace yourself, lavender = recover. No red anywhere.' },
    { label: 'Type', text: 'Instrument Serif speaks in sentences ("You\'re ready for a steady day"); Figtree handles UI. Numbers set in the serif.' },
    { label: 'Hero', text: 'A breathing orb instead of a gauge. A range band, not a target, so "enough" is a zone.' },
    { label: 'Surfaces', text: 'Frosted cards, 28px corners, warm diffuse shadows; pill tab bar with a labelled active state.' },
    { label: 'Social', text: 'Check on people, not stats: "Sophia is having a good day," Send warmth, shared rituals, nudges pause when someone rests.' },
  ],
  fromTandem: 'Tandem\'s insight cards and explain popovers grow into the whole voice: every number arrives with a plain-language "why", like Tandem\'s Home insights.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Instrument Serif', displayFamily: SERIF, text: 'Figtree', textFamily: SANS, sample: 'Ready', displayStyle: { fontStyle: 'italic' } },
  screens: [
    { title: 'Today', caption: 'Breathing orb, a range not a target, plain-language "why"', render: (m) => createElement(T[m].Today) },
    { title: 'Together', caption: 'Partner and circle by how they feel; tap Send warmth', render: (m) => createElement(T[m].Together) },
    { title: 'Reflection', caption: 'Effort vs your range; tap how it felt', render: (m) => createElement(T[m].Reflection) },
  ],
}

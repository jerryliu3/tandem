import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, Flower2, Moon, NotebookPen, Sprout, Sun, User, type LucideIcon } from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { people, run, type PersonId } from '../data'
import { EASE, Phone, STATIC, CountUp, type Direction, type Mode } from '../kit'

const LIGHT = {
  bg: '#F6F2F5',
  top: '#FCE7E0',
  ink: '#2B2233',
  muted: '#7E7489',
  faint: '#BEB4C6',
  line: 'rgba(70,40,90,0.08)',
  card: 'rgba(255,255,255,0.72)',
  raised: '#FFFFFF',
  wash: 'rgba(43,34,51,0.045)',
  shadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 22px 44px -30px rgba(100,60,120,0.42), 0 2px 6px -3px rgba(100,60,120,0.08)',
  tabBg: 'rgba(255,255,255,0.86)',
  tabShadow: '0 20px 40px -22px rgba(100,60,120,0.45), 0 0 0 1px rgba(70,40,90,0.05)',
  topTint: 'rgba(250,238,236,0.85)',
  core: '#FFFFFF',
  pollen: '#FFFFFF',
  coreShadow: 'drop-shadow(0 6px 10px rgba(100,60,120,0.18))',
  petalBase: 0.22,
  petalDim: 0.45,
  petalGlow: 'none',
  accent: '#3A2A4D',
  onAccent: '#FFFFFF',
  hillBack: '#EEF3E6',
  hillFront: '#E1ECD7',
  stem: '#9CC79F',
  leaf: '#7DBF8E',
  seed: '#CDBFAE',
  blend: 'multiply' as CSSProperties['mixBlendMode'],
  sleep: '#A795F0',
  hrv: '#F28C99',
  rhr: '#F5AE73',
  move: '#E9C548',
  breath: '#6FC7A2',
  temp: '#7BB1EC',
}
type Palette = typeof LIGHT

const DARK: Palette = {
  bg: '#0D1514',
  top: '#18291F',
  ink: '#EDF3EF',
  muted: '#93A39C',
  faint: '#4F5F59',
  line: 'rgba(220,255,240,0.08)',
  card: 'rgba(225,255,242,0.05)',
  raised: 'rgba(225,255,242,0.09)',
  wash: 'rgba(225,255,242,0.05)',
  shadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 24px 44px -30px rgba(0,0,0,0.8)',
  tabBg: 'rgba(24,36,33,0.82)',
  tabShadow: '0 20px 40px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(220,255,240,0.06)',
  topTint: 'rgba(15,26,22,0.85)',
  core: '#13201C',
  pollen: '#EADFBF',
  coreShadow: 'drop-shadow(0 0 12px rgba(0,0,0,0.6))',
  petalBase: 0.4,
  petalDim: 0.6,
  petalGlow: 'drop-shadow(0 0 14px rgba(200,190,255,0.22))',
  accent: '#E8E0FF',
  onAccent: '#1C1530',
  hillBack: '#13231D',
  hillFront: '#183026',
  stem: '#3F7A5A',
  leaf: '#5DBB87',
  seed: '#4A5A50',
  blend: 'screen',
  sleep: '#B4A6FF',
  hrv: '#FF98A6',
  rhr: '#FFBA85',
  move: '#F3D468',
  breath: '#7FDCB6',
  temp: '#8EC2FF',
}

const DISPLAY = 'var(--f-fraunces)'
const SANS = 'var(--f-jakarta)'
const soft: CSSProperties = { fontFamily: DISPLAY, fontVariationSettings: '"SOFT" 100', fontWeight: 400, letterSpacing: '-0.01em' }

type Petal = { color: string; score: number }

function theme(C: Palette, mode: Mode) {
  const CONTRIB = [
    { label: 'Sleep', value: '84', unit: '', score: 0.84, color: C.sleep, title: 'Sleep', normal: 'Need 7h 48m', text: '7h 12m, a little under your need. Deep sleep came early, which is what you want after a hard week.' },
    { label: 'HRV', value: '61', unit: 'ms', score: 0.94, color: C.hrv, title: 'Heart rate variability', normal: 'Normal 48–62', text: 'Six above your usual. Your nervous system is relaxed, so this is your fullest petal today.' },
    { label: 'Resting HR', value: '52', unit: 'bpm', score: 0.86, color: C.rhr, title: 'Resting heart rate', normal: 'Normal 51–57', text: 'Two beats lower than usual. A quiet sign your body has caught up from Tuesday.' },
    { label: 'Movement', value: '38', unit: 'min', score: 0.72, color: C.move, title: 'Movement', normal: 'Range 25–45', text: "38 active minutes already, inside your range. The rest of today can be gentle." },
    { label: 'Breathing', value: '14.2', unit: '/min', score: 0.78, color: C.breath, title: 'Breathing rate', normal: 'Normal 13.8–14.9', text: 'Steady at 14.2 breaths a minute, right where it usually sits.' },
    { label: 'Temperature', value: '+0.1', unit: '°', score: 0.8, color: C.temp, title: 'Body temperature', normal: 'Normal ±0.4°', text: 'Within a tenth of a degree of normal. Nothing brewing.' },
  ]
  const todayPetals: Petal[] = CONTRIB.map((p) => ({ color: p.color, score: p.score }))
  const petalsFrom = (scores: number[]): Petal[] => scores.map((s, i) => ({ color: CONTRIB[i % 6].color, score: s }))

  function Bloom({
    id,
    size,
    petals,
    selected = null,
    onSelect,
    sway = true,
    delay = 0,
    core = 0.27,
    children,
  }: {
    id: string
    size: number
    petals: Petal[]
    selected?: number | null
    onSelect?: (i: number) => void
    sway?: boolean
    delay?: number
    core?: number
    children?: ReactNode
  }) {
    const c = size / 2
    const n = petals.length
    const shape = (L: number, w: number) =>
      `M0,0 C${w.toFixed(1)},${(-L * 0.18).toFixed(1)} ${(w * 1.08).toFixed(1)},${(-L * 0.8).toFixed(1)} 0,${(-L).toFixed(1)} C${(-w * 1.08).toFixed(1)},${(-L * 0.8).toFixed(1)} ${(-w).toFixed(1)},${(-L * 0.18).toFixed(1)} 0,0 Z`
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <motion.div className="absolute inset-0" animate={STATIC || !sway ? undefined : { rotate: [-2.5, 2.5, -2.5] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}>
          <svg width={size} height={size} viewBox={`${-c} ${-c} ${size} ${size}`} className="overflow-visible" style={{ filter: size > 60 ? C.petalGlow : undefined }}>
            <defs>
              {petals.map((p, i) => (
                <linearGradient key={i} id={`${id}-${mode}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={p.color} />
                  <stop offset="1" stopColor={p.color} stopOpacity={C.petalBase} />
                </linearGradient>
              ))}
            </defs>
            {petals.map((p, i) => {
              const L = c * (0.28 + 0.7 * p.score ** 2)
              const w = Math.min(L * 0.42, ((Math.PI * L) / n) * 0.78)
              const dim = selected !== null && selected !== i
              return (
                <g key={i} transform={`rotate(${(360 / n) * i})`}>
                  <motion.path
                    initial={STATIC ? false : { d: shape(L * 0.06, w * 0.06) }}
                    animate={{ d: shape(L, w) }}
                    transition={{ duration: 1.1, delay: delay + i * 0.07, ease: EASE }}
                    fill={`url(#${id}-${mode}-${i})`}
                    stroke={p.color}
                    strokeOpacity={0.55}
                    strokeWidth={1}
                    onClick={onSelect ? () => onSelect(i) : undefined}
                    style={{ mixBlendMode: C.blend, opacity: dim ? C.petalDim : 1, transition: 'opacity .35s', cursor: onSelect ? 'pointer' : undefined }}
                  />
                </g>
              )
            })}
            <circle r={c * core} fill={children ? C.core : C.pollen} style={{ filter: C.coreShadow }} />
          </svg>
        </motion.div>
        {children && <div className="pointer-events-none absolute inset-0 grid place-items-center">{children}</div>}
      </div>
    )
  }

  function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div className={`rounded-[26px] ${className}`} style={{ background: C.card, boxShadow: C.shadow, backdropFilter: 'blur(14px)', ...style }}>
        {children}
      </div>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: Flower2, label: 'Today' },
      { icon: Sprout, label: 'Garden' },
      { icon: NotebookPen, label: 'Journal' },
      { icon: User, label: 'You' },
    ]
    return (
      <div
        className="absolute inset-x-5 bottom-[24px] z-20 flex h-[66px] items-center justify-around rounded-[26px] px-2"
        style={{ background: C.tabBg, backdropFilter: 'blur(20px) saturate(150%)', WebkitBackdropFilter: 'blur(20px) saturate(150%)', boxShadow: C.tabShadow, fontFamily: SANS }}
      >
        {items.map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex w-16 flex-col items-center gap-1" style={{ color: i === active ? C.ink : C.faint }}>
            <div className="grid h-[28px] w-[44px] place-items-center rounded-full" style={{ background: i === active ? `${C.hrv}38` : 'transparent' }}>
              <Icon size={20} strokeWidth={i === active ? 2.2 : 1.8} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>
          </div>
        ))}
      </div>
    )
  }

  function Backdrop() {
    return <div className="absolute inset-0" style={{ background: `radial-gradient(130% 46% at 50% 0%, ${C.top} 0%, transparent 72%), ${C.bg}` }} />
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} backdrop={<Backdrop />} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-5 pb-[118px] pt-[60px]" style={{ fontFamily: SANS, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  function PetalMark({ color, filled, size = 22 }: { color: string; filled: boolean; size?: number }) {
    return (
      <svg width={size} height={size} viewBox="-11 -11 22 22" className="shrink-0">
        <path
          d="M0,10 C8,6 9,-4 0,-10 C-9,-4 -8,6 0,10 Z"
          transform="rotate(35)"
          fill={filled ? color : 'none'}
          stroke={color}
          strokeWidth={1.6}
          style={{ transition: 'fill .3s' }}
        />
        {filled && <Check x={-5.5} y={-5.5} size={11} strokeWidth={3} color={mode === 'dark' ? '#13201C' : '#fff'} />}
      </svg>
    )
  }

  /* ───────────────────────── Today ───────────────────────── */

  function Today() {
    const [sel, setSel] = useState(1)
    const [done, setDone] = useState([true, false, false, false])
    const P = CONTRIB[sel]
    const tasks = [
      { t: 'Turkey Trot 10K', s: 'Done at 8:33 AM', color: C.move },
      { t: 'A 20-minute walk after dinner', s: 'Keeps you inside your range', color: C.breath },
      { t: 'Two glasses of water before pie', s: 'Thanksgiving is salty', color: C.temp },
      { t: 'Lights out by 10:40', s: 'For your 7h 50m sleep need', color: C.sleep },
    ]
    const week: (number[] | null)[] = [
      [0.72, 0.62, 0.7, 0.8, 0.72, 0.76],
      [0.52, 0.42, 0.54, 0.92, 0.62, 0.6],
      [0.64, 0.6, 0.66, 0.4, 0.7, 0.72],
      CONTRIB.map((p) => p.score),
      null,
      null,
      null,
    ]
    const W = 350
    const H = 330
    const cx = W / 2
    const cy = H / 2
    const S = 264
    return (
      <Screen active={0}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Thursday · Thanksgiving</div>
            <div style={{ ...soft, fontSize: 32, lineHeight: 1.1 }}>Morning, Jerry</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full" style={{ background: C.raised, boxShadow: C.shadow, fontWeight: 700 }}>J</div>
        </div>

        <div className="relative mx-auto mt-4" style={{ width: W, height: H }}>
          <div className="absolute" style={{ left: cx - S / 2, top: cy - S / 2 }}>
            <Bloom id="bl-today" size={S} petals={todayPetals} selected={sel} onSelect={setSel}>
              <div className="text-center">
                <div style={{ ...soft, fontSize: 52, lineHeight: 0.95 }}>
                  <CountUp value={78} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginTop: 2 }}>in full bloom</div>
              </div>
            </Bloom>
          </div>
          {CONTRIB.map((p, i) => {
            const a = (i * 60 * Math.PI) / 180
            const on = i === sel
            return (
              <button
                key={p.label}
                onClick={() => setSel(i)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-center"
                style={{ left: cx + 146 * Math.sin(a), top: cy - 142 * Math.cos(a), background: on ? C.raised : 'transparent', boxShadow: on ? C.shadow : 'none', transition: 'background .25s' }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 700, color: on ? p.color : C.muted, whiteSpace: 'nowrap', filter: mode === 'light' && on ? 'brightness(0.8)' : undefined }}>{p.label}</div>
                <div style={{ ...soft, fontSize: 17, lineHeight: 1.05 }}>{p.value}</div>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE }}>
            <Card className="mt-1 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: P.color }} />
                  {P.title}
                </span>
                <span style={{ fontSize: 12, color: C.faint, fontWeight: 600 }}>{P.normal}</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span style={{ ...soft, fontSize: 40, lineHeight: 1 }}>{P.value}</span>
                <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>{P.unit}</span>
              </div>
              <p className="mt-2" style={{ fontSize: 15, lineHeight: '22px', color: C.muted }}>{P.text}</p>
            </Card>
          </motion.div>
        </AnimatePresence>

        <Card className="mt-3 px-5 pb-2 pt-4">
          <div className="flex items-baseline justify-between">
            <span style={{ ...soft, fontSize: 22 }}>Little things today</span>
            <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>
              {done.filter(Boolean).length} of {tasks.length}
            </span>
          </div>
          <div className="mt-1">
            {tasks.map((task, i) => (
              <button
                key={task.t}
                onClick={() => setDone((d) => d.map((v, k) => (k === i ? !v : v)))}
                className="flex w-full items-center gap-3 py-3 text-left"
                style={{ borderTop: i ? `1px solid ${C.line}` : undefined }}
              >
                <PetalMark color={task.color} filled={done[i]} />
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: done[i] ? C.muted : C.ink, transition: 'color .3s' }}>{task.t}</div>
                  <div style={{ fontSize: 12.5, color: C.faint, fontWeight: 500 }}>{task.s}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-3 p-5">
          <span style={{ ...soft, fontSize: 22 }}>This week's blooms</span>
          <div className="mt-3 flex justify-between">
            {week.map((scores, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="grid h-[40px] w-[40px] place-items-center rounded-full" style={{ boxShadow: i === 3 ? `0 0 0 1.5px ${C.hrv}` : undefined }}>
                  {scores ? (
                    <Bloom id={`bl-wk${i}`} size={34} petals={petalsFrom(scores)} sway={false} delay={0.3 + i * 0.1} core={0.22} />
                  ) : (
                    <span className="h-2 w-2 rounded-full" style={{ background: C.seed }} />
                  )}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: i === 3 ? 800 : 600, color: i === 3 ? C.ink : C.faint }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
              </div>
            ))}
          </div>
        </Card>
      </Screen>
    )
  }

  /* ───────────────────────── Garden ───────────────────────── */

  const GARDEN: { id: PersonId; x: number; y: number; size: number; scores?: number[]; status: string }[] = [
    { id: 'priya', x: 92, y: 112, size: 72, scores: [0.92, 0.7, 0.74, 0.5, 0.82, 0.78], status: 'Slow flow yoga at 8:40, and the best sleep in the crew.' },
    { id: 'sam', x: 252, y: 128, size: 0, status: 'Resting and under the weather. His bloom closes while he recovers.' },
    { id: 'jerry', x: 70, y: 196, size: 96, scores: CONTRIB.map((p) => p.score), status: 'A 10K PR this morning, and still in full bloom.' },
    { id: 'sophia', x: 182, y: 188, size: 110, scores: [0.88, 0.96, 0.9, 0.7, 0.84, 0.86], status: 'Easy 6.2 km at 7:10, back before the turkey went in.' },
    { id: 'alex', x: 292, y: 206, size: 80, scores: [0.6, 0.46, 0.58, 0.98, 0.68, 0.64], status: 'A big week of lifting. Recovery is a little low, so his petals are uneven.' },
  ]

  function Bud() {
    return (
      <svg width={40} height={52} viewBox="-20 -30 40 52" className="overflow-visible">
        <path d="M0,-26 C12,-16 12,4 0,10 C-12,4 -12,-16 0,-26 Z" fill={C.sleep} fillOpacity={0.55} stroke={C.sleep} strokeWidth={1.2} />
        <path d="M0,10 C-10,8 -14,0 -12,-8 C-6,-4 -2,2 0,10 Z" fill={C.leaf} />
        <path d="M0,10 C10,8 14,0 12,-8 C6,-4 2,2 0,10 Z" fill={C.leaf} />
        <Moon x={10} y={-30} size={12} color={C.sleep} />
      </svg>
    )
  }

  function Garden() {
    const [sel, setSel] = useState<PersonId>('sophia')
    const [sent, setSent] = useState<PersonId[]>([])
    const g = GARDEN.find((x) => x.id === sel)!
    const p = people.find((x) => x.id === sel)!
    const W = 350
    const H = 280
    return (
      <Screen active={1}>
        <div style={{ ...soft, fontSize: 44, lineHeight: 1 }}>Garden</div>
        <p className="mt-2" style={{ fontSize: 15, color: C.muted }}>Your crew, as of this morning.</p>

        <div className="relative mt-5 overflow-hidden rounded-[28px]" style={{ width: W, height: H, background: C.card, boxShadow: C.shadow }}>
          <svg width={W} height={H} className="absolute inset-0">
            <path d={`M0,160 C80,132 160,142 230,152 C290,160 330,142 ${W},136 L${W},${H} L0,${H} Z`} fill={C.hillBack} />
            {GARDEN.map((b) => {
              const ground = b.y < 150 ? 156 : 252
              return (
                <g key={b.id}>
                  <path d={`M${b.x},${b.y} C${b.x - 4},${(b.y + ground) / 2} ${b.x + 6},${ground - 12} ${b.x + 2},${ground}`} fill="none" stroke={C.stem} strokeWidth={2.4} strokeLinecap="round" />
                  <path
                    d={`M${b.x + 1},${ground - 14} c10,-10 20,-8 24,-4 c-8,8 -18,8 -24,4 Z`}
                    fill={C.leaf}
                    opacity={0.9}
                    transform={b.x > 200 ? `scale(-1,1) translate(${-2 * b.x - 2},0)` : undefined}
                  />
                </g>
              )
            })}
            <path d={`M0,236 C90,218 180,226 260,232 C310,236 340,228 ${W},224 L${W},${H} L0,${H} Z`} fill={C.hillFront} />
          </svg>
          {GARDEN.map((b, k) => {
            const person = people.find((x) => x.id === b.id)!
            const on = sel === b.id
            return (
              <button key={b.id} onClick={() => setSel(b.id)} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: b.x, top: b.y }} aria-label={person.name}>
                {on && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: (b.size || 44) + 36, height: (b.size || 44) + 36, background: `radial-gradient(circle, ${C.raised} 0%, transparent 70%)` }}
                  />
                )}
                {b.scores ? <Bloom id={`bl-g-${b.id}`} size={b.size} petals={petalsFrom(b.scores)} delay={0.1 + k * 0.12} /> : <Bud />}
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-[1px]"
                  style={{ top: b.size ? b.size * 0.84 : 46, background: on ? C.accent : C.raised, color: on ? C.onAccent : C.ink, fontSize: 10.5, fontWeight: 700, boxShadow: C.shadow, transition: 'background .25s, color .25s' }}
                >
                  {person.name}
                </span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: EASE }}>
            <Card className="mt-3 p-5">
              <div className="flex items-center gap-3.5">
                <div className="grid h-[52px] w-[52px] place-items-center">
                  {g.scores ? <Bloom id={`bl-sel-${g.id}`} size={50} petals={petalsFrom(g.scores)} sway={false} core={0.22} /> : <Bud />}
                </div>
                <div>
                  <div style={{ ...soft, fontSize: 24, lineHeight: 1.1 }}>{p.name}</div>
                  <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>
                    {p.you ? "That's you" : p.resting ? 'Resting' : `Recovery ${p.recovery} · sleep ${p.sleep}`}
                  </div>
                </div>
              </div>
              <p className="mt-3" style={{ fontSize: 15, lineHeight: '22px', color: C.muted }}>{g.status}</p>
              {!p.you && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => !p.resting && setSent((s) => (s.includes(sel) ? s.filter((x) => x !== sel) : [...s, sel]))}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3"
                  style={{
                    background: p.resting ? C.wash : sent.includes(sel) ? C.wash : C.accent,
                    color: p.resting ? C.muted : sent.includes(sel) ? C.ink : C.onAccent,
                    fontSize: 15,
                    fontWeight: 700,
                    transition: 'background .25s, color .25s',
                  }}
                >
                  {p.resting ? <Moon size={16} /> : <Sun size={16} />}
                  {p.resting ? 'Nudges paused while Sam rests' : sent.includes(sel) ? 'Sunshine sent' : `Send ${p.name} some sunshine`}
                </motion.button>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        <Card className="mt-3 p-5">
          <div className="flex items-baseline justify-between">
            <span style={{ ...soft, fontSize: 22 }}>16 sessions together</span>
            <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>by Sunday</span>
          </div>
          <div className="mt-4 flex justify-between">
            {Array.from({ length: 16 }, (_, i) =>
              i < 11 ? (
                <motion.svg key={i} width={16} height={22} viewBox="0 0 16 22" initial={STATIC ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <path d="M8,22 L8,9" stroke={C.stem} strokeWidth={1.8} strokeLinecap="round" />
                  <path d="M8,11 C3,11 1,7 1,4 C5,4 8,6 8,11 Z" fill={C.leaf} />
                  <path d="M8,9 C13,9 15,5 15,2 C11,2 8,4 8,9 Z" fill={C.leaf} />
                </motion.svg>
              ) : (
                <svg key={i} width={16} height={22} viewBox="0 0 16 22">
                  <ellipse cx={8} cy={19} rx={3} ry={2.2} fill={C.seed} />
                </svg>
              ),
            )}
          </div>
          <div className="mt-3" style={{ fontSize: 13.5, color: C.muted }}>
            <span style={{ color: C.ink, fontWeight: 700 }}>11 sprouted.</span> Five more seeds to plant by Sunday.
          </div>
        </Card>

        <div className="mt-3 flex items-center gap-2.5 rounded-full px-4 py-2.5" style={{ background: `${C.move}2E`, fontSize: 13.5 }}>
          <Sun size={15} color={C.move} style={{ filter: mode === 'light' ? 'brightness(0.75)' : undefined }} />
          <span>
            <span style={{ fontWeight: 700 }}>Sophia</span> sent you sunshine · 8:51 AM
          </span>
        </div>
      </Screen>
    )
  }

  /* ───────────────────────── Run ───────────────────────── */

  function RunScreen() {
    const [km, setKm] = useState<number | null>(null)
    const [feel, setFeel] = useState(2)
    const fastest = Math.min(...run.splits)
    const slowest = Math.max(...run.splits)
    const petals: Petal[] = run.splits.map((s, i) => ({ color: i < 3 ? C.move : i < 7 ? C.rhr : C.hrv, score: 0.66 + (0.34 * (slowest - s)) / (slowest - fastest) }))
    const pace = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    const feels = [
      { l: 'Easy', n: 4, s: 0.25 },
      { l: 'Good', n: 5, s: 0.55 },
      { l: 'Hard', n: 8, s: 0.8 },
      { l: 'All out', n: 12, s: 1 },
    ]
    const zoneColors = [C.temp, C.breath, C.move, C.rhr, C.hrv]
    const S = 290
    const box = 340
    return (
      <Screen active={2}>
        <div className="flex items-center gap-1.5" style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>
          <ChevronLeft size={18} /> This morning
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div style={{ ...soft, fontSize: 44, lineHeight: 1 }}>Turkey Trot</div>
        </div>
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: `${C.hrv}2E`, fontSize: 12.5, fontWeight: 700 }}>
          <Flower2 size={13} color={C.hrv} /> New 10K best · {run.pr.time}
        </div>
        <p className="mt-3" style={{ fontSize: 15, lineHeight: '22px', color: C.muted }}>
          Every petal is a kilometre; longer means faster. You finished in full bloom.
        </p>

        <div className="relative mx-auto mt-1" style={{ width: box, height: box }}>
          <div className="absolute" style={{ left: (box - S) / 2, top: (box - S) / 2 }}>
            <Bloom id="bl-run" size={S} petals={petals} selected={km} onSelect={(i) => setKm((k) => (k === i ? null : i))} core={0.3}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={km ?? 'all'} className="text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div style={{ ...soft, fontSize: km === null ? 36 : 34, lineHeight: 1 }}>{km === null ? run.duration : pace(run.splits[km])}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginTop: 3 }}>{km === null ? `${run.km} km` : `km ${km + 1}`}</div>
                </motion.div>
              </AnimatePresence>
            </Bloom>
          </div>
          {run.splits.map((_, i) => {
            const a = (i * 36 * Math.PI) / 180
            return (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: box / 2 + 156 * Math.sin(a), top: box / 2 - 156 * Math.cos(a), fontSize: 11, fontWeight: 700, color: km === i ? C.ink : C.faint }}
              >
                {i + 1}
              </span>
            )
          })}
        </div>

        <Card className="grid grid-cols-2 p-2">
          {[
            ['Distance', run.km.toFixed(1), 'km'],
            ['Pace', run.pace, '/km'],
            ['Heart', String(run.avgHr), 'avg'],
            ['Energy', String(run.kcal), 'kcal'],
          ].map(([k, v, u], i) => (
            <div key={k} className="px-4 py-3" style={{ borderLeft: i % 2 ? `1px solid ${C.line}` : undefined, borderTop: i > 1 ? `1px solid ${C.line}` : undefined }}>
              <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{k}</div>
              <div style={{ ...soft, fontSize: 30, lineHeight: 1.1 }}>
                {v}
                <span style={{ fontFamily: SANS, fontSize: 12.5, color: C.muted, marginLeft: 4, fontWeight: 600 }}>{u}</span>
              </div>
            </div>
          ))}
        </Card>

        <div className="mt-6 px-1" style={{ ...soft, fontSize: 24 }}>How did it feel?</div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {feels.map((f, i) => (
            <motion.button
              key={f.l}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFeel(i)}
              className="flex flex-col items-center gap-1.5 rounded-[20px] py-3"
              style={{ background: i === feel ? C.raised : 'transparent', boxShadow: i === feel ? C.shadow : `inset 0 0 0 1px ${C.line}`, transition: 'background .25s' }}
            >
              <Bloom id={`bl-feel${i}`} size={46} petals={Array.from({ length: f.n }, (_, k) => ({ color: [C.move, C.rhr, C.hrv][k % 3], score: f.s }))} sway={false} core={0.2} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: i === feel ? C.ink : C.muted }}>{f.l}</span>
            </motion.button>
          ))}
        </div>

        <Card className="mt-4 p-5">
          <span style={{ ...soft, fontSize: 20 }}>Where your heart spent the race</span>
          <div className="mt-3.5 flex h-3.5 gap-[3px] overflow-hidden rounded-full">
            {run.zones.map((z, i) => (
              <motion.div
                key={z.z}
                className="h-full rounded-full"
                style={{ background: zoneColors[i], width: `${z.pct}%` }}
                initial={STATIC ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.08 }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 text-center">
            {run.zones.map((z, i) => (
              <div key={z.z}>
                <div className="mx-auto mb-1 h-1.5 w-1.5 rounded-full" style={{ background: zoneColors[i] }} />
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{z.min} min</div>
                <div style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>{['Easy', 'Steady', 'Tempo', 'Hard', 'Max'][i]}</div>
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-4 flex items-start gap-3 px-1">
          <div className="grid h-9 w-9 shrink-0 place-items-center">
            <Bloom id="bl-sophia" size={34} petals={petalsFrom([0.88, 0.96, 0.9, 0.7, 0.84, 0.86])} sway={false} core={0.22} />
          </div>
          <div className="rounded-[20px] rounded-tl-[6px] px-4 py-3" style={{ background: C.raised, boxShadow: C.shadow }}>
            <div style={{ ...soft, fontSize: 18, lineHeight: 1.3, fontStyle: 'italic' }}>So proud of you. Pie is on me.</div>
            <div className="mt-1" style={{ fontSize: 12, color: C.faint, fontWeight: 600 }}>Sophia · 8:51 AM</div>
          </div>
        </div>
      </Screen>
    )
  }

  return { Today, Garden, RunScreen }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Sleep', hex: C.sleep },
  { name: 'HRV', hex: C.hrv },
  { name: 'Heart', hex: C.rhr },
  { name: 'Movement', hex: C.move },
  { name: 'Breath', hex: C.breath },
]

export const bloom: Direction = {
  id: 'bloom',
  name: 'Bloom',
  round: 2,
  lineage: 'Soft Signal',
  tagline: 'Soft Signal\'s warmth, but you can see what\'s behind it: every contributor is a petal.',
  inspiredBy: ['Apple Health State of Mind', 'Finch', 'How We Feel', 'Gentler Streak', 'Stoic'],
  dna: [
    { label: 'From Soft Signal', text: 'Calm, warm and plain-spoken, with no red numbers. The score still arrives with a sentence.' },
    { label: 'What changes', text: 'The orb opens up. Six petals (sleep, HRV, resting HR, movement, breathing, temperature) grow to their score, so the "why" is the hero.' },
    { label: 'Atmosphere', text: 'Peach-to-lilac dawn by day, a moss-dark night garden by night. Petals multiply where they overlap in light mode and glow in dark.' },
    { label: 'Color', text: 'One pastel per contributor, used everywhere that metric appears. Color means "which", never "good or bad".' },
    { label: 'Type', text: 'Fraunces with its SOFT axis at 100 for rounded, friendly numbers and headlines; Plus Jakarta Sans for UI.' },
    { label: 'Social', text: 'The crew is a garden. Each friend is a bloom shaped by their own data, Sam is a closed bud while he rests, and you send sunshine instead of kudos.' },
  ],
  fromTandem: 'Tandem\'s "what\'s behind this number" explainer becomes the main interaction: tap any petal and the card below explains that contributor in plain language.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Fraunces (soft)', displayFamily: DISPLAY, text: 'Plus Jakarta Sans', textFamily: SANS, sample: '78', displayStyle: { fontVariationSettings: '"SOFT" 100' } },
  screens: [
    { title: 'Today', caption: 'Contributor bloom; tap a petal, tick off little things', render: (m) => createElement(T[m].Today) },
    { title: 'Garden', caption: 'The crew as blooms; tap one and send sunshine', render: (m) => createElement(T[m].Garden) },
    { title: 'Run', caption: 'A petal per kilometre; tap one, pick how it felt', render: (m) => createElement(T[m].RunScreen) },
  ],
}

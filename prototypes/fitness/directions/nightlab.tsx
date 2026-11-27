import { AnimatePresence, motion } from 'motion/react'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Footprints,
  HeartPulse,
  House,
  Moon,
  Plus,
  Share2,
  Sparkles,
  Thermometer,
  Users,
  Watch,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { body, fmtPace, people, run, sophiaRun } from '../data'
import { CountUp, DrawPath, EASE, Phone, Ring, STATIC, smoothPath, toPoints, type Direction, type Mode } from '../kit'

const DARK = {
  bg: '#090D12',
  top: '#0F1820',
  ink: '#EAF1F6',
  muted: '#8696A3',
  faint: '#4F5D69',
  surface: 'rgba(255,255,255,0.045)',
  surface2: 'rgba(255,255,255,0.08)',
  line: 'rgba(255,255,255,0.075)',
  track: 'rgba(255,255,255,0.07)',
  cardShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  glow1: 'rgba(46,230,166,0.22)',
  glow2: 'rgba(47,155,255,0.10)',
  glow3: 'rgba(154,168,255,0.07)',
  avatar: 'linear-gradient(160deg, #26323D, #141B22)',
  tabBg: 'rgba(22,30,38,0.58)',
  tabBorder: 'rgba(255,255,255,0.1)',
  tabShadow: '0 24px 40px -18px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)',
  topTint: 'rgba(9,13,18,0.75)',
  onAccent: '#04140E',
  glowA: '99',
  rec: '#2EE6A6',
  recHi: '#7BF7CB',
  recBlue: '#67AEE6',
  teal: '#1FB9D6',
  strain: '#2F9BFF',
  strainHi: '#69C1FF',
  strainLo: '#1559B8',
  sleep: '#9AA8FF',
  amber: '#FFC24B',
  orange: '#FF8A3D',
  red: '#FF5470',
}
type Palette = typeof DARK

const LIGHT: Palette = {
  bg: '#EDF1F4',
  top: '#E2F1EB',
  ink: '#0D1820',
  muted: '#5B6C79',
  faint: '#9AA8B3',
  surface: 'rgba(255,255,255,0.72)',
  surface2: 'rgba(13,24,32,0.06)',
  line: 'rgba(13,24,32,0.08)',
  track: 'rgba(13,24,32,0.07)',
  cardShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 14px 30px -22px rgba(20,40,60,0.4)',
  glow1: 'rgba(15,179,127,0.22)',
  glow2: 'rgba(28,126,214,0.12)',
  glow3: 'rgba(108,123,235,0.10)',
  avatar: 'linear-gradient(160deg, #FFFFFF, #D9E2E8)',
  tabBg: 'rgba(255,255,255,0.62)',
  tabBorder: 'rgba(13,24,32,0.08)',
  tabShadow: '0 20px 40px -18px rgba(20,40,60,0.4), inset 0 1px 0 rgba(255,255,255,0.9)',
  topTint: 'rgba(237,241,244,0.8)',
  onAccent: '#FFFFFF',
  glowA: '55',
  rec: '#0FB37F',
  recHi: '#4FDDAA',
  recBlue: '#3B86C8',
  teal: '#14A3C2',
  strain: '#1C7ED6',
  strainHi: '#4DABF7',
  strainLo: '#1864AB',
  sleep: '#6573E6',
  amber: '#E39B0B',
  orange: '#EE6A1C',
  red: '#E5484D',
}

const NUM = 'var(--f-barlow)'
const TXT = 'var(--f-inter)'

function theme(C: Palette, mode: Mode) {
  const recColor = (v: number) => (v >= 67 ? C.rec : v >= 34 ? C.amber : C.red)

  function Backdrop() {
    return (
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(85% 38% at 50% 2%, ${C.glow1}, transparent 70%),
            radial-gradient(70% 40% at 105% 40%, ${C.glow2}, transparent 70%),
            radial-gradient(60% 30% at -10% 75%, ${C.glow3}, transparent 70%),
            linear-gradient(180deg, ${C.top} 0%, ${C.bg} 50%)`,
        }}
      />
    )
  }

  function Label({ children, color, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
    return (
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: color ?? C.muted, ...style }}>
        {children}
      </div>
    )
  }

  function Glass({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div
        className={`rounded-[20px] ${className}`}
        style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: C.cardShadow, backdropFilter: 'blur(18px)', ...style }}
      >
        {children}
      </div>
    )
  }

  function Avatar({ initial, ring, size = 34 }: { initial: string; ring?: string; size?: number }) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: C.avatar,
          boxShadow: ring ? `0 0 0 2px ${C.bg}, 0 0 0 3.5px ${ring}` : `0 0 0 2px ${C.bg}`,
          color: C.ink,
          fontSize: size * 0.4,
          fontWeight: 600,
        }}
      >
        {initial}
      </div>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: House, label: 'Home' },
      { icon: HeartPulse, label: 'Health' },
      { icon: Plus, label: '' },
      { icon: Users, label: 'Crew' },
      { icon: Sparkles, label: 'Coach' },
    ]
    return (
      <div
        className="absolute inset-x-4 bottom-[24px] z-20 flex h-[66px] items-center justify-around rounded-full px-2"
        style={{
          background: C.tabBg,
          border: `1px solid ${C.tabBorder}`,
          backdropFilter: 'blur(24px) saturate(170%)',
          WebkitBackdropFilter: 'blur(24px) saturate(170%)',
          boxShadow: C.tabShadow,
          fontFamily: TXT,
        }}
      >
        {items.map(({ icon: Icon, label }, i) =>
          label ? (
            <div key={i} className="flex w-14 flex-col items-center gap-1" style={{ color: i === active ? C.ink : C.faint }}>
              <Icon size={21} strokeWidth={i === active ? 2.2 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
            </div>
          ) : (
            <div
              key={i}
              className="grid h-11 w-11 place-items-center rounded-full"
              style={{ background: `linear-gradient(140deg, ${C.rec}, ${C.teal})`, boxShadow: `0 6px 18px -6px ${C.rec}` }}
            >
              <Icon size={22} strokeWidth={2.4} color={C.onAccent} />
            </div>
          ),
        )}
      </div>
    )
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} backdrop={<Backdrop />} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-5 pb-[118px] pt-[58px]" style={{ fontFamily: TXT, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  /* ───────────────────────── Today ───────────────────────── */

  function Dial({
    size,
    stroke,
    value,
    color,
    label,
    delay,
    gradient,
    children,
  }: {
    size: number
    stroke: number
    value: number
    color: string
    label: string
    delay?: number
    gradient?: [string, string]
    children: ReactNode
  }) {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <Ring size={size} stroke={stroke} value={value} color={color} gradient={gradient} track={C.track} glow={`${color}${C.glowA}`} delay={delay}>
          {children}
        </Ring>
        <Label>{label}</Label>
      </div>
    )
  }

  function WhyCard() {
    const [open, setOpen] = useState(false)
    const rows = [
      { k: 'Heart rate variability', v: '61 ms', d: '+6 vs 30-day', w: 0.82 },
      { k: 'Resting heart rate', v: '52 bpm', d: '−2 vs 30-day', w: 0.76 },
      { k: 'Sleep performance', v: '84%', d: '7h 12m of 7h 48m', w: 0.84 },
      { k: 'Respiratory rate', v: '14.2', d: 'Normal', w: 0.6 },
    ]
    return (
      <Glass className="mt-6 p-4">
        <div className="flex gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: `${C.rec}24` }}>
            <Sparkles size={15} color={C.rec} />
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 14, lineHeight: '20px', color: C.ink }}>
              <span style={{ color: C.rec, fontWeight: 600 }}>Green light.</span> You bounced back from Tuesday's intervals. Aim for a
              strain of 12–15; the Turkey Trot got you most of the way.
            </p>
            <button onClick={() => setOpen((o) => !o)} className="mt-2 flex items-center gap-1" style={{ fontSize: 12.5, fontWeight: 600, color: C.rec }}>
              What's behind 78%
              <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .25s' }} />
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="mt-3.5 space-y-3 border-t pt-3.5" style={{ borderColor: C.line }}>
                {rows.map((r, i) => (
                  <div key={r.k}>
                    <div className="flex items-baseline justify-between" style={{ fontSize: 12.5 }}>
                      <span style={{ color: C.muted }}>{r.k}</span>
                      <span>
                        <span style={{ fontFamily: NUM, fontSize: 15, fontWeight: 600 }}>{r.v}</span>
                        <span style={{ color: C.faint, marginLeft: 6 }}>{r.d}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full" style={{ background: C.surface2 }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: C.recBlue }}
                        initial={{ width: 0 }}
                        animate={{ width: `${r.w * 100}%` }}
                        transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease: EASE }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Glass>
    )
  }

  function StrainTarget() {
    const pct = (v: number) => `${(v / 21) * 100}%`
    return (
      <Glass className="mt-3 p-4">
        <div className="flex items-baseline justify-between">
          <Label>Strain target</Label>
          <span style={{ fontFamily: NUM, fontSize: 15, fontWeight: 600, color: C.strain }}>
            <span style={{ color: C.ink }}>11.4</span> / 12 – 15
          </span>
        </div>
        <div className="relative mt-3.5 h-2.5 rounded-full" style={{ background: C.surface2 }}>
          <div className="absolute -inset-y-[5px] rounded-[7px]" style={{ left: pct(12), width: pct(3), background: `${C.strain}1F`, border: `1px dashed ${C.strain}` }} />
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${C.strainLo}, ${C.strain})`, boxShadow: `0 0 14px ${C.strain}${C.glowA}` }}
            initial={STATIC ? false : { width: 0 }}
            animate={{ width: pct(11.4) }}
            transition={{ duration: 1.3, delay: 0.35, ease: EASE }}
          />
        </div>
        <div className="mt-2.5 flex justify-between" style={{ fontFamily: NUM, fontSize: 12, color: C.faint }}>
          {[0, 7, 14, 21].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </Glass>
    )
  }

  function Row({ icon: Icon, tint, title, sub, value }: { icon: LucideIcon; tint: string; title: string; sub: string; value: string }) {
    return (
      <div className="flex items-center gap-3 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: `${tint}1F` }}>
          <Icon size={18} color={tint} />
        </div>
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12.5, color: C.muted }}>{sub}</div>
        </div>
        <div className="rounded-full px-2.5 py-1" style={{ background: `${tint}1A`, color: tint, fontFamily: NUM, fontSize: 16, fontWeight: 600 }}>
          {value}
        </div>
      </div>
    )
  }

  function Tile({ icon: Icon, name, value, unit, delta, tone, data }: { icon: LucideIcon; name: string; value: string; unit: string; delta: string; tone: 'good' | 'neutral'; data: number[] }) {
    const pts = toPoints(data, 140, 30, { padY: 4 })
    const line = smoothPath(pts)
    const gid = `nl-${mode}-${name.replace(/\W/g, '')}`
    const [lx, ly] = pts[pts.length - 1]
    return (
      <Glass className="p-3.5">
        <div className="flex items-center gap-1.5" style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>
          <Icon size={13} />
          {name}
        </div>
        <div className="mt-2 flex items-baseline gap-1" style={{ fontFamily: NUM }}>
          <span style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{unit}</span>
        </div>
        <div className="mt-1" style={{ fontSize: 11.5, fontWeight: 600, color: tone === 'good' ? C.rec : C.muted }}>
          {delta}
        </div>
        <svg width="100%" viewBox="0 0 140 30" className="mt-2 overflow-visible">
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={C.recBlue} stopOpacity="0.35" />
              <stop offset="1" stopColor={C.recBlue} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L140,30 L0,30 Z`} fill={`url(#${gid})`} />
          <DrawPath d={line} stroke={C.recBlue} width={1.6} delay={0.4} />
          <circle cx={lx} cy={ly} r={2.8} fill={C.ink} stroke={C.recBlue} strokeWidth={1.5} />
        </svg>
      </Glass>
    )
  }

  function Today() {
    return (
      <Screen active={0}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar initial="J" ring={C.rec} />
            <div className="rounded-full px-2.5 py-1" style={{ background: C.surface2, fontSize: 12, fontWeight: 600 }}>
              <span style={{ fontFamily: NUM, fontSize: 14 }}>142</span> <span style={{ color: C.muted }}>days</span>
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ color: C.muted }}>
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: C.surface2, fontSize: 12, fontWeight: 600 }}>
              <Watch size={13} /> 86%
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full" style={{ background: C.surface2 }}>
              <Bell size={15} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <ChevronLeft size={18} color={C.faint} />
          <div className="text-center">
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.14em' }}>TODAY</div>
            <div style={{ fontSize: 12, color: C.muted }}>Thu, Nov 26 · Thanksgiving</div>
          </div>
          <ChevronRight size={18} color={C.faint} style={{ opacity: 0.35 }} />
        </div>

        <div className="mt-6 flex items-end justify-between px-1">
          <Dial size={94} stroke={7} value={0.84} color={C.sleep} label="Sleep" delay={0.15}>
            <div style={{ fontFamily: NUM, fontSize: 28, fontWeight: 600 }}>
              <CountUp value={84} delay={0.15} />
              <span style={{ fontSize: 14, color: C.sleep }}>%</span>
            </div>
          </Dial>
          <Dial size={146} stroke={10} value={0.78} color={C.rec} gradient={[C.recHi, C.rec]} label="Recovery">
            <div style={{ fontFamily: NUM, fontSize: 54, fontWeight: 600, lineHeight: 0.9 }}>
              <CountUp value={78} />
              <span style={{ fontSize: 22, color: C.rec }}>%</span>
            </div>
          </Dial>
          <Dial size={94} stroke={7} value={11.4 / 21} color={C.strain} label="Strain" delay={0.3}>
            <div style={{ fontFamily: NUM, fontSize: 28, fontWeight: 600 }}>
              <CountUp value={11.4} decimals={1} delay={0.3} />
            </div>
          </Dial>
        </div>

        <WhyCard />
        <StrainTarget />

        <div className="mt-6 flex items-baseline justify-between">
          <Label>My day</Label>
          <span style={{ fontSize: 12, color: C.muted }}>See all</span>
        </div>
        <Glass className="mt-2.5 px-4">
          <Row icon={Footprints} tint={C.strain} title={run.title} sub={`7:42 – 8:33 AM · ${run.km} km`} value={run.strain.toFixed(1)} />
          <div style={{ borderTop: `1px solid ${C.line}` }}>
            <Row icon={Moon} tint={C.sleep} title="Sleep" sub={`${body.bed} – ${body.wake} · ${body.sleep}`} value="84%" />
          </div>
        </Glass>

        <div className="mt-6 flex items-baseline justify-between">
          <Label>Health monitor</Label>
          <span style={{ fontSize: 12, color: C.muted }}>7 days</span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Tile icon={HeartPulse} name="HRV" value="61" unit="ms" delta="▲ 6 vs baseline" tone="good" data={body.hrvTrend} />
          <Tile icon={HeartPulse} name="Resting HR" value="52" unit="bpm" delta="▼ 2 vs baseline" tone="good" data={body.rhrTrend.map((v) => -v)} />
          <Tile icon={Wind} name="Respiratory" value="14.2" unit="rpm" delta="Within range" tone="neutral" data={body.respTrend} />
          <Tile icon={Thermometer} name="Skin temp" value="+0.1" unit="°C" delta="Within range" tone="neutral" data={body.tempTrend} />
        </div>

        <Glass className="mt-3 flex items-center gap-3 p-4">
          <Moon size={18} color={C.sleep} />
          <div className="flex-1" style={{ fontSize: 13.5 }}>
            <div style={{ fontWeight: 600 }}>Lights out by 10:40 PM</div>
            <div style={{ color: C.muted, fontSize: 12.5 }}>To hit 100% of tonight's 7h 50m sleep need</div>
          </div>
          <ChevronRight size={16} color={C.faint} />
        </Glass>
      </Screen>
    )
  }

  /* ───────────────────────── Crew ───────────────────────── */

  type Metric = 'strain' | 'recovery' | 'sleep'

  const METRICS: Record<Metric, { label: string; color: string; max: number; fmt: (v: number) => string; avg: number; caption: string }> = {
    strain: { label: 'Strain', color: C.strain, max: 50, fmt: (v) => v.toFixed(1), avg: 34.6, caption: 'Weekly strain, Mon – today' },
    recovery: { label: 'Recovery', color: C.rec, max: 100, fmt: (v) => `${Math.round(v)}%`, avg: 68, caption: "This morning's recovery" },
    sleep: { label: 'Sleep', color: C.sleep, max: 100, fmt: (v) => `${Math.round(v)}%`, avg: 80, caption: 'Last night, sleep performance' },
  }

  function Segmented({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
    return (
      <div className="flex rounded-full p-1" style={{ background: C.surface2 }}>
        {(Object.keys(METRICS) as Metric[]).map((m) => (
          <button key={m} onClick={() => onChange(m)} className="relative flex-1 rounded-full py-2" style={{ fontSize: 13, fontWeight: 600, color: m === value ? C.onAccent : C.muted }}>
            {m === value && (
              <motion.div layoutId={`nl-seg-${mode}`} className="absolute inset-0 rounded-full" style={{ background: METRICS[m].color }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative">{METRICS[m].label}</span>
          </button>
        ))}
      </div>
    )
  }

  function Crew() {
    const [metric, setMetric] = useState<Metric>('strain')
    const M = METRICS[metric]
    const ranked = [...people].sort((a, b) => b[metric] - a[metric])
    const youRank = ranked.findIndex((p) => p.you) + 1
    const sophiaHr = toPoints(run.hr.slice(0, 36).map((v) => v - 8), 300, 34, { padY: 3 })

    return (
      <Screen active={3}>
        <Label>Crew · 5 members</Label>
        <div className="mt-1 flex items-center justify-between">
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Turkey Trotters</h2>
          <div className="flex -space-x-2">
            {people.slice(0, 4).map((p) => (
              <Avatar key={p.id} initial={p.name[0]} size={28} />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Segmented value={metric} onChange={setMetric} />
        </div>

        <Glass className="mt-3 flex items-center gap-4 p-4">
          <Ring key={metric} size={92} stroke={8} value={M.avg / M.max} color={M.color} track={C.track} glow={`${M.color}${C.glowA}`}>
            <div style={{ fontFamily: NUM, fontSize: 26, fontWeight: 600 }}>
              <CountUp value={M.avg} decimals={metric === 'strain' ? 1 : 0} duration={0.8} />
            </div>
          </Ring>
          <div>
            <Label>Crew average</Label>
            <div className="mt-1" style={{ fontSize: 13.5, color: C.muted }}>{M.caption}</div>
            <div className="mt-2" style={{ fontSize: 14, fontWeight: 600 }}>
              You're <span style={{ color: M.color, fontFamily: NUM, fontSize: 17 }}>#{youRank}</span> of 5
            </div>
          </div>
        </Glass>

        <Glass className="mt-3 px-4 py-2">
          {ranked.map((p, i) => (
            <motion.div layout key={p.id} transition={{ type: 'spring', stiffness: 380, damping: 36 }} className="flex items-center gap-3 py-2.5">
              <span className="w-4 text-center" style={{ fontFamily: NUM, fontSize: 15, color: C.faint }}>{i + 1}</span>
              <Avatar initial={p.name[0]} ring={p.resting ? C.faint : recColor(p.recovery)} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5" style={{ fontSize: 13.5, fontWeight: 600 }}>
                  {p.name}
                  {p.you && <span className="rounded px-1.5" style={{ fontSize: 10, background: C.surface2, color: C.muted }}>YOU</span>}
                  {p.resting && <span className="rounded px-1.5" style={{ fontSize: 10, background: `${C.sleep}24`, color: C.sleep }}>RESTING</span>}
                </div>
                <div className="mt-1.5 h-1.5 rounded-full" style={{ background: C.surface2 }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: metric === 'recovery' ? recColor(p.recovery) : M.color, opacity: p.resting ? 0.4 : 1 }}
                    initial={STATIC ? false : { width: 0 }}
                    animate={{ width: `${(p[metric] / M.max) * 100}%` }}
                    transition={{ duration: 0.8, ease: EASE }}
                  />
                </div>
              </div>
              <span className="w-12 text-right" style={{ fontFamily: NUM, fontSize: 18, fontWeight: 600 }}>{M.fmt(p[metric])}</span>
            </motion.div>
          ))}
        </Glass>

        <div className="mt-6">
          <Label>Live from the crew</Label>
        </div>
        <Glass className="mt-2.5 p-4">
          <div className="flex items-center gap-3">
            <Avatar initial="S" ring={C.rec} />
            <div className="flex-1">
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sophia finished a run</div>
              <div style={{ fontSize: 12.5, color: C.muted }}>
                {sophiaRun.time} · {sophiaRun.km} km · {sophiaRun.duration}
              </div>
            </div>
            <div className="rounded-full px-2.5 py-1" style={{ background: `${C.strain}1F`, color: C.strain, fontFamily: NUM, fontSize: 16, fontWeight: 600 }}>
              10.2
            </div>
          </div>
          <svg width="100%" viewBox="0 0 300 34" className="mt-3">
            <DrawPath d={smoothPath(sophiaHr)} stroke={C.strain} width={1.6} delay={0.2} />
          </svg>
          <div className="mt-3 flex gap-2">
            <button className="flex-1 rounded-full py-2" style={{ background: C.surface2, fontSize: 13, fontWeight: 600 }}>Send props</button>
            <button className="flex-1 rounded-full py-2" style={{ background: C.surface2, fontSize: 13, fontWeight: 600, color: C.muted }}>Compare</button>
          </div>
        </Glass>

        <Glass className="mt-3 p-4">
          <div className="flex items-center justify-between">
            <Label color={C.sleep}>Team challenge</Label>
            <span style={{ fontSize: 12, color: C.muted }}>Day 4 of 14</span>
          </div>
          <div className="mt-1.5" style={{ fontSize: 17, fontWeight: 600 }}>Sleep consistency</div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: 14 }, (_, i) => (
              <div
                key={i}
                className="h-6 flex-1 rounded-[5px]"
                style={{ background: i < 4 ? C.sleep : C.surface2, opacity: i < 4 ? 0.55 + i * 0.15 : 1, boxShadow: i === 3 ? `0 0 10px ${C.sleep}${C.glowA}` : undefined }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex justify-between" style={{ fontSize: 12.5, color: C.muted }}>
            <span>
              Crew average <span style={{ color: C.ink, fontFamily: NUM, fontSize: 14 }}>86%</span>
            </span>
            <span>Goal 85%</span>
          </div>
        </Glass>
      </Screen>
    )
  }

  /* ───────────────────────── Activity ───────────────────────── */

  const ZONE_COLORS = [C.recBlue, C.rec, C.amber, C.orange, C.red]

  function HrChart() {
    const W = 318
    const H = 130
    const pts = toPoints(run.hr, W, H, { min: 100, max: 190 })
    const line = smoothPath(pts)
    const y = (bpm: number) => (1 - (bpm - 100) / 90) * H
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} className="mt-3 overflow-visible">
        <defs>
          <linearGradient id={`nl-hr-stroke-${mode}`} x1="0" x2="0" y1="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.red} />
            <stop offset="0.3" stopColor={C.orange} />
            <stop offset="0.55" stopColor={C.amber} />
            <stop offset="1" stopColor={C.strain} />
          </linearGradient>
          <linearGradient id={`nl-hr-fill-${mode}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.orange} stopOpacity="0.28" />
            <stop offset="1" stopColor={C.strain} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[171, 156, 140].map((b) => (
          <g key={b}>
            <line x1={0} x2={W} y1={y(b)} y2={y(b)} stroke={C.line} strokeDasharray="2 4" />
            <text x={W} y={y(b) - 4} textAnchor="end" fill={C.faint} fontSize={10} fontFamily="var(--f-barlow)">{b}</text>
          </g>
        ))}
        <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#nl-hr-fill-${mode})`} />
        <DrawPath d={line} stroke={`url(#nl-hr-stroke-${mode})`} width={2} duration={1.8} />
        {[0, 10, 20, 30, 40, 50].map((m) => (
          <text key={m} x={(m / 50) * W} y={H + 15} textAnchor={m === 0 ? 'start' : m === 50 ? 'end' : 'middle'} fill={C.faint} fontSize={10} fontFamily="var(--f-barlow)">
            {m}m
          </text>
        ))}
      </svg>
    )
  }

  function Activity() {
    const fastest = Math.min(...run.splits)
    const slowest = Math.max(...run.splits)
    return (
      <Screen active={1}>
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.surface2 }}>
            <ChevronLeft size={18} />
          </div>
          <Label>Activity</Label>
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.surface2 }}>
            <Share2 size={16} />
          </div>
        </div>

        <div className="mt-5">
          <Label>Run · {run.time} · Prospect Park</Label>
          <h2 className="mt-1" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{run.title}</h2>
        </div>

        <div className="mt-5 flex items-center gap-5">
          <Ring size={132} stroke={10} value={run.strain / 21} color={C.strain} gradient={[C.strainHi, C.strainLo]} track={C.track} glow={`${C.strain}${C.glowA}`}>
            <div className="text-center">
              <div style={{ fontFamily: NUM, fontSize: 42, fontWeight: 600, lineHeight: 0.95 }}>
                <CountUp value={run.strain} decimals={1} />
              </div>
              <Label style={{ fontSize: 10 }}>Strain</Label>
            </div>
          </Ring>
          <div className="grid flex-1 grid-cols-1 gap-2.5">
            {[
              ['Duration', run.duration, ''],
              ['Distance', run.km.toFixed(1), 'km'],
              ['Avg heart rate', String(run.avgHr), 'bpm'],
              ['Calories', String(run.kcal), 'kcal'],
            ].map(([k, v, u]) => (
              <div key={k} className="flex items-baseline justify-between border-b pb-1.5" style={{ borderColor: C.line }}>
                <span style={{ fontSize: 12.5, color: C.muted }}>{k}</span>
                <span style={{ fontFamily: NUM, fontSize: 19, fontWeight: 600 }}>
                  {v}
                  <span style={{ fontSize: 12, color: C.muted, marginLeft: 3 }}>{u}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <Glass className="mt-5 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Heart rate</Label>
            <span style={{ fontSize: 12, color: C.muted }}>
              Max <span style={{ fontFamily: NUM, fontSize: 14, color: C.red }}>{run.maxHr}</span>
            </span>
          </div>
          <HrChart />
        </Glass>

        <Glass className="mt-3 p-4">
          <Label>Time in zones</Label>
          <div className="mt-3 space-y-2.5">
            {[...run.zones].reverse().map((z, idx) => {
              const i = 4 - idx
              return (
                <div key={z.z} className="flex items-center gap-3">
                  <span className="w-6" style={{ fontFamily: NUM, fontSize: 13, fontWeight: 600, color: ZONE_COLORS[i] }}>{z.z}</span>
                  <div className="h-2 flex-1 rounded-full" style={{ background: C.surface2 }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: ZONE_COLORS[i], boxShadow: `0 0 8px ${ZONE_COLORS[i]}66` }}
                      initial={STATIC ? false : { width: 0 }}
                      animate={{ width: `${(z.pct / 40) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 + idx * 0.07, ease: EASE }}
                    />
                  </div>
                  <span className="w-16 text-right" style={{ fontFamily: NUM, fontSize: 14, color: C.muted }}>
                    <span style={{ color: C.ink }}>{z.min}m</span> · {z.pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </Glass>

        <Glass className="mt-3 p-4">
          <div className="flex items-baseline justify-between">
            <Label>Splits · per km</Label>
            <span style={{ fontSize: 12, color: C.muted }}>
              Avg <span style={{ fontFamily: NUM, fontSize: 14, color: C.ink }}>{run.pace}</span>
            </span>
          </div>
          <div className="mt-4 flex h-[92px] items-end gap-1.5">
            {run.splits.map((s, i) => {
              const h = 34 + ((slowest - s) / (slowest - fastest)) * 50
              const best = s === fastest
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  {best && <span style={{ fontFamily: NUM, fontSize: 12, fontWeight: 600, color: C.rec }}>{fmtPace(s)}</span>}
                  <motion.div
                    className="w-full rounded-[5px]"
                    style={{ background: best ? C.rec : `${C.strain}73`, boxShadow: best ? `0 0 12px ${C.rec}${C.glowA}` : undefined }}
                    initial={STATIC ? false : { height: 0 }}
                    animate={{ height: h }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.04, ease: EASE }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex gap-1.5" style={{ fontFamily: NUM, fontSize: 11, color: C.faint }}>
            {run.splits.map((_, i) => (
              <span key={i} className="flex-1 text-center">{i + 1}</span>
            ))}
          </div>
        </Glass>

        <Glass className="mt-3 flex gap-3 p-4" style={{ background: `${C.amber}12`, borderColor: `${C.amber}33` }}>
          <Sparkles size={17} color={C.amber} className="mt-0.5 shrink-0" />
          <div style={{ fontSize: 13.5, lineHeight: '19px' }}>
            <div style={{ fontWeight: 600 }}>Expect 55–65% recovery tomorrow</div>
            <div style={{ color: C.muted, fontSize: 12.5 }}>36% of this run was in Zone 4. Keep Friday easy and get 8h of sleep to bounce back.</div>
          </div>
        </Glass>
      </Screen>
    )
  }

  return { Today, Crew, Activity }
}

const T = { dark: theme(DARK, 'dark'), light: theme(LIGHT, 'light') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Recovery', hex: C.rec },
  { name: 'Strain', hex: C.strain },
  { name: 'Sleep', hex: C.sleep },
  { name: 'Caution', hex: C.amber },
  { name: 'Low', hex: C.red },
]

export const nightLab: Direction = {
  id: 'night-lab',
  name: 'Night Lab',
  round: 1,
  tagline: 'Your body as a precision instrument: quiet surfaces, glowing where it matters.',
  inspiredBy: ['WHOOP', 'Oura', 'Bevel', 'Garmin Connect', 'iOS 26 Liquid Glass'],
  dna: [
    { label: 'Atmosphere', text: 'Blue-slate canvas (or pale clinical grey in light mode) with one soft teal glow behind the hero.' },
    { label: 'Color', text: 'Color only means something: green/amber/red for recovery, blue for strain, periwinkle for sleep. Everything else is grey.' },
    { label: 'Type', text: 'Barlow Semi Condensed for every number (WHOOP uses DIN). Inter for words. Tracked, uppercase micro labels.' },
    { label: 'Hero', text: 'Three dials with the recovery score biggest. Rings sweep in while numbers count up.' },
    { label: 'Surfaces', text: 'Low-contrast glass cards for data; Liquid Glass only for the floating tab bar.' },
    { label: 'Social', text: 'Leaderboards compare the same three metrics, so the crew feels like a team dashboard.' },
  ],
  fromTandem: 'Same skeleton as Tandem midnight/daylight: tinted canvas with radial glows, glass cards, tabular numerals, count-up hero number, and a "what\'s behind this number" explainer.',
  palette: { dark: swatches(DARK), light: swatches(LIGHT) },
  type: { display: 'Barlow Semi Condensed', displayFamily: NUM, text: 'Inter', textFamily: TXT, sample: '78%', displayStyle: { fontWeight: 600 } },
  screens: [
    { title: 'Today', caption: 'Recovery-first dashboard with an explainable score', render: (m) => createElement(T[m].Today) },
    { title: 'Crew', caption: 'Team leaderboard; tap Strain / Recovery / Sleep', render: (m) => createElement(T[m].Crew) },
    { title: 'Activity', caption: 'Turkey Trot breakdown: HR, zones, splits', render: (m) => createElement(T[m].Activity) },
  ],
}

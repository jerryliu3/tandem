import { motion } from 'motion/react'
import { Activity, House, Moon, Plus, Settings, SlidersVertical, Users, Wind, type LucideIcon } from 'lucide-react'
import { createElement, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { body, fmtPace, people, run } from '../data'
import { CountUp, EASE, Phone, STATIC, smoothPath, toPoints, type Direction, type Mode } from '../kit'

const LIGHT = {
  body: '#D8D7D2',
  panel: '#EDECE8',
  edge: 'rgba(0,0,0,0.09)',
  ink: '#151515',
  muted: '#77756F',
  faint: '#A7A59E',
  key: '#F7F6F3',
  keyEdge: '#B4B2AA',
  screen: '#131313',
  screenInk: '#EDEDE8',
  dot: 'rgba(255,255,255,0.07)',
  orange: '#FF5A1F',
  yellow: '#F2BE1A',
  green: '#22B266',
  blue: '#3870FF',
  ledOff: 'rgba(0,0,0,0.13)',
  pad: 'rgba(0,0,0,0.08)',
  screw: '#C6C4BD',
  tape: '#FBFAF6',
  knobFrom: '#FFFFFF',
  knobTo: '#CBC9C2',
  shadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 10px 20px -14px rgba(0,0,0,0.4)',
  topTint: 'rgba(216,215,210,0.88)',
}
type Palette = typeof LIGHT

const DARK: Palette = {
  body: '#0C0C0D',
  panel: '#18181A',
  edge: 'rgba(255,255,255,0.07)',
  ink: '#ECECE8',
  muted: '#8B8A85',
  faint: '#55544F',
  key: '#262628',
  keyEdge: '#040404',
  screen: '#050505',
  screenInk: '#EDEDE8',
  dot: 'rgba(255,255,255,0.055)',
  orange: '#FF6A2B',
  yellow: '#FFD23F',
  green: '#38D98A',
  blue: '#5B8CFF',
  ledOff: 'rgba(255,255,255,0.09)',
  pad: 'rgba(255,255,255,0.07)',
  screw: '#2D2D2F',
  tape: '#E4E1D8',
  knobFrom: '#3D3D40',
  knobTo: '#131314',
  shadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 24px -14px rgba(0,0,0,0.85)',
  topTint: 'rgba(12,12,13,0.88)',
}

const DOT = 'var(--f-doto)'
const MONO = 'var(--f-geistmono)'

function theme(C: Palette, mode: Mode) {
  const lbl: CSSProperties = { fontFamily: MONO, fontSize: 9.5, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }
  const readout = (size: number, color = C.orange): CSSProperties => ({
    fontFamily: DOT,
    fontWeight: 800,
    fontSize: size,
    lineHeight: 0.9,
    color,
    textShadow: color === C.orange ? `0 0 14px ${C.orange}88` : undefined,
    fontVariantNumeric: 'tabular-nums',
  })

  function Screw({ className }: { className: string }) {
    return (
      <span className={`absolute h-[8px] w-[8px] rounded-full ${className}`} style={{ background: C.screw, boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.35)' }}>
        <span className="absolute left-[1px] right-[1px] top-[3.5px] h-[1px] rotate-45" style={{ background: 'rgba(0,0,0,0.4)' }} />
      </span>
    )
  }

  function Panel({ id, label, children, className = '', screws }: { id?: string; label?: string; children: ReactNode; className?: string; screws?: boolean }) {
    return (
      <div className={`relative rounded-[16px] p-3.5 ${className}`} style={{ background: C.panel, border: `1px solid ${C.edge}`, boxShadow: C.shadow }}>
        {screws && (
          <>
            <Screw className="left-2 top-2" />
            <Screw className="right-2 top-2" />
            <Screw className="bottom-2 left-2" />
            <Screw className="bottom-2 right-2" />
          </>
        )}
        {label && (
          <div className={`mb-2.5 flex justify-between ${screws ? 'px-3' : ''}`} style={lbl}>
            <span>
              {id} / {label}
            </span>
          </div>
        )}
        {children}
      </div>
    )
  }

  function Screen({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div
        className={`relative overflow-hidden rounded-[10px] ${className}`}
        style={{
          background: C.screen,
          backgroundImage: `radial-gradient(${C.dot} 0.9px, transparent 1.1px)`,
          backgroundSize: '5px 5px',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.25)',
          color: C.screenInk,
          ...style,
        }}
      >
        {children}
      </div>
    )
  }

  function Led({ on, color = C.green, blink }: { on: boolean; color?: string; blink?: boolean }) {
    return (
      <motion.span
        className="inline-block h-[8px] w-[8px] rounded-full"
        style={{ background: on ? color : C.ledOff, boxShadow: on ? `0 0 8px ${color}, inset 0 -1px 1px rgba(0,0,0,0.25)` : 'inset 0 1px 1px rgba(0,0,0,0.25)' }}
        animate={on && blink && !STATIC ? { opacity: [1, 0.35, 1] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    )
  }

  function Meter({ value, n = 14, height = 14 }: { value: number; n?: number; height?: number }) {
    return (
      <div className="flex gap-[3px]">
        {Array.from({ length: n }, (_, i) => {
          const lit = i < Math.round(value * n)
          const color = i / n < 0.6 ? C.green : i / n < 0.85 ? C.yellow : C.orange
          return (
            <motion.span
              key={i}
              className="flex-1 rounded-[2px]"
              style={{ height, background: lit ? color : C.ledOff, boxShadow: lit ? `0 0 6px ${color}88` : undefined }}
              initial={STATIC || !lit ? false : { opacity: 0.15 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.03 }}
            />
          )
        })}
      </div>
    )
  }

  function Knob({ size, value, target, onChange }: { size: number; value: number; target?: [number, number]; onChange?: (v: number) => void }) {
    const ref = useRef<SVGSVGElement>(null)
    const dragging = useRef(false)
    const c = size / 2
    const angle = (v: number) => -135 + v * 270
    const at = (deg: number, r: number) => [c + r * Math.sin((deg * Math.PI) / 180), c - r * Math.cos((deg * Math.PI) / 180)]
    const ticks = 27
    const set = (e: PointerEvent<SVGSVGElement>) => {
      if (!onChange || !ref.current) return
      const box = ref.current.getBoundingClientRect()
      const deg = (Math.atan2(e.clientX - box.left - c, -(e.clientY - box.top - c)) * 180) / Math.PI
      onChange(Math.max(0, Math.min(1, (Math.max(-135, Math.min(135, deg)) + 135) / 270)))
    }
    const arc = (a: number, b: number, r: number) => {
      const [x0, y0] = at(angle(a), r)
      const [x1, y1] = at(angle(b), r)
      return `M${x0},${y0} A${r},${r} 0 ${(b - a) * 270 > 180 ? 1 : 0} 1 ${x1},${y1}`
    }
    const [px, py] = at(angle(value), size * 0.27)
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        className="shrink-0 touch-none overflow-visible"
        style={{ cursor: onChange ? 'grab' : undefined }}
        onPointerDown={(e) => {
          if (!onChange) return
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          set(e)
        }}
        onPointerMove={(e) => dragging.current && set(e)}
        onPointerUp={() => (dragging.current = false)}
      >
        {target && <path d={arc(target[0], target[1], size * 0.47)} fill="none" stroke={C.yellow} strokeWidth={3} strokeLinecap="round" />}
        {Array.from({ length: ticks }, (_, i) => {
          const v = i / (ticks - 1)
          const [x0, y0] = at(angle(v), size * 0.4)
          const [x1, y1] = at(angle(v), size * (i % 5 ? 0.43 : 0.445))
          const lit = v <= value + 0.001
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={lit ? C.orange : C.faint} strokeWidth={i % 5 ? 1.4 : 2} strokeLinecap="round" />
        })}
        <defs>
          <radialGradient id={`in-knob-${mode}-${size}`} cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor={C.knobFrom} />
            <stop offset="1" stopColor={C.knobTo} />
          </radialGradient>
        </defs>
        <circle cx={c} cy={c + 2} r={size * 0.34} fill="rgba(0,0,0,0.25)" />
        <circle cx={c} cy={c} r={size * 0.34} fill={`url(#in-knob-${mode}-${size})`} stroke={C.edge} />
        <circle cx={c} cy={c} r={size * 0.26} fill="none" stroke={C.edge} />
        <motion.line
          x1={c}
          y1={c}
          x2={px}
          y2={py}
          stroke={C.orange}
          strokeWidth={3}
          strokeLinecap="round"
          initial={STATIC || onChange ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
      </svg>
    )
  }

  function Key({ label, icon: Icon, color, onClick, active, className = '' }: { label: string; icon?: LucideIcon; color?: string; onClick?: () => void; active?: boolean; className?: string }) {
    const bg = color ?? C.key
    const fg = color ? '#fff' : C.ink
    return (
      <motion.button
        onClick={onClick}
        whileTap={{ y: 2, boxShadow: `0 1px 0 ${C.keyEdge}` }}
        transition={{ type: 'spring', stiffness: 900, damping: 32 }}
        className={`flex flex-col items-center justify-center gap-1 rounded-[12px] ${className}`}
        style={{
          background: bg,
          color: fg,
          boxShadow: active ? `0 1px 0 ${C.keyEdge}, inset 0 2px 4px rgba(0,0,0,0.2)` : `0 3px 0 ${color ? 'rgba(0,0,0,0.3)' : C.keyEdge}, inset 0 1px 0 rgba(255,255,255,0.25)`,
          transform: active ? 'translateY(2px)' : undefined,
        }}
      >
        {Icon && <Icon size={17} strokeWidth={2} />}
        <span style={{ ...lbl, color: fg, fontSize: 9 }}>{label}</span>
      </motion.button>
    )
  }

  function Tape({ lines }: { lines: string[] }) {
    const teeth = (flip: boolean) => (
      <svg width="100%" height="6" viewBox="0 0 120 6" preserveAspectRatio="none" className="block" style={{ transform: flip ? 'scaleY(-1)' : undefined }}>
        <path d={`M0,6 ${Array.from({ length: 24 }, (_, i) => `L${i * 5 + 2.5},0 L${i * 5 + 5},6`).join(' ')} Z`} fill={C.tape} />
      </svg>
    )
    return (
      <div className="mx-3" style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.18))' }}>
        {teeth(false)}
        <div className="px-4 py-2" style={{ background: C.tape, color: '#1A1A1A', fontFamily: MONO, fontSize: 11, lineHeight: 1.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {lines.map((l, i) => (
            <div key={i} style={{ opacity: l.startsWith('—') ? 0.45 : 1 }}>{l}</div>
          ))}
        </div>
        {teeth(true)}
      </div>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: House, label: 'Unit' },
      { icon: SlidersVertical, label: 'Mixer' },
      { icon: Activity, label: 'Scope' },
      { icon: Settings, label: 'Sys' },
    ]
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[90px] items-start justify-center gap-3 px-4 pt-2.5" style={{ background: C.body, borderTop: `1px solid ${C.edge}` }}>
        {items.map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <span className="flex items-center gap-1.5" style={{ ...lbl, fontSize: 8.5, color: i === active ? C.ink : C.muted }}>
              <Led on={i === active} color={C.orange} />
              {label}
            </span>
            <div
              className="grid h-[38px] w-[70px] place-items-center rounded-[10px]"
              style={{
                background: C.key,
                color: i === active ? C.orange : C.muted,
                boxShadow: i === active ? `0 1px 0 ${C.keyEdge}, inset 0 2px 4px rgba(0,0,0,0.18)` : `0 3px 0 ${C.keyEdge}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                transform: i === active ? 'translateY(2px)' : undefined,
              }}
            >
              <Icon size={18} strokeWidth={2} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  function Device({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.body} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-3.5 pb-[108px] pt-[56px]" style={{ fontFamily: MONO, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  function Header({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) {
    return (
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>{title}</span>
          <span style={{ ...lbl, fontSize: 9, color: C.faint }}>{sub}</span>
        </div>
        {right ?? (
          <div className="flex items-center gap-1.5" style={lbl}>
            <Led on blink /> Link · 86%
          </div>
        )}
      </div>
    )
  }

  /* ───────────────────────── Unit ───────────────────────── */

  function Unit() {
    const [walk, setWalk] = useState(20 / 60)
    const minutes = Math.round(walk * 60)
    const projected = body.strain + minutes * 0.05
    const inTarget = projected >= 12 && projected <= 15
    const week = [64, 52, 81, 78, 70, 66, 74]
    return (
      <Device active={0}>
        <Header title="PULSE·1" sub="SN 0330-JL" />

        <Panel id="01" label="Recovery" screws>
          <Screen className="px-4 pb-4 pt-3">
            <div className="flex justify-between" style={{ ...lbl, color: `${C.screenInk}88` }}>
              <span>Recovery</span>
              <span>Thu 26.11</span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="flex items-baseline">
                <span style={readout(104)}>
                  <CountUp value={body.readiness} />
                </span>
                <span style={readout(34)}>%</span>
              </div>
              <div className="flex gap-[5px] pb-2">
                {week.map((v, i) => (
                  <div key={i} className="flex flex-col-reverse gap-[3px]">
                    {Array.from({ length: 8 }, (_, r) => {
                      const lit = r < Math.round((v / 100) * 8)
                      const today = i === 3
                      return (
                        <span
                          key={r}
                          className="block h-[5px] w-[5px] rounded-full"
                          style={{ background: lit ? (today ? C.orange : `${C.screenInk}aa`) : `${C.screenInk}14`, boxShadow: lit && today ? `0 0 5px ${C.orange}` : undefined, opacity: i > 3 ? 0.35 : 1 }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span style={readout(20)}>READY</span>
              <span style={{ ...lbl, color: `${C.screenInk}aa` }}>HRV ▲6 · RHR ▼2</span>
            </div>
          </Screen>
        </Panel>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <Panel id="02" label="Sleep">
            <div className="flex items-baseline gap-1.5">
              <span style={readout(40, C.ink)}>84</span>
              <span style={lbl}>7H12M</span>
            </div>
            <div className="mt-2.5">
              <Meter value={0.84} n={12} />
            </div>
          </Panel>
          <Panel id="03" label="HRV">
            <div className="flex items-baseline gap-1.5">
              <span style={readout(40, C.ink)}>61</span>
              <span style={lbl}>MS +6</span>
            </div>
            <div className="mt-2.5">
              <Meter value={0.72} n={12} />
            </div>
          </Panel>
        </div>

        <Panel id="04" label="Strain" className="mt-2.5">
          <div className="flex items-center gap-4">
            <Knob size={112} value={body.strain / 21} target={[12 / 21, 15 / 21]} />
            <div className="flex-1">
              <span style={readout(46, C.ink)}>
                <CountUp value={body.strain} decimals={1} />
              </span>
              <div className="mt-1.5" style={lbl}>
                Target <span style={{ color: C.ink }}>12–15</span> of 21
              </div>
              <div className="mt-3 flex gap-3" style={{ ...lbl, fontSize: 8.5 }}>
                {[
                  ['Low', true, C.yellow],
                  ['In', false, C.green],
                  ['Over', false, C.orange],
                ].map(([l, on, c]) => (
                  <span key={l as string} className="flex items-center gap-1.5">
                    <Led on={on as boolean} color={c as string} /> {l as string}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel id="05" label="Plan · evening walk" className="mt-2.5">
          <div className="flex items-center gap-4">
            <Knob size={92} value={walk} onChange={setWalk} />
            <Screen className="flex-1 px-3 py-2.5">
              <div className="flex items-baseline gap-1.5">
                <span style={readout(30)}>{String(minutes).padStart(2, '0')}</span>
                <span style={{ ...lbl, color: `${C.screenInk}99` }}>min walk</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between" style={{ ...lbl, color: `${C.screenInk}cc` }}>
                <span>→ strain {projected.toFixed(1)}</span>
                <span className="flex items-center gap-1.5">
                  <Led on color={inTarget ? C.green : C.yellow} /> {inTarget ? 'In' : 'Low'}
                </span>
              </div>
            </Screen>
          </div>
          <div className="mt-2 text-center" style={{ ...lbl, fontSize: 8.5, color: C.faint }}>Turn the knob</div>
        </Panel>

        <div className="mt-3">
          <Tape
            lines={['Print 07:58 · coach', '— — — — — — — — — — — —', 'Recovered well.', 'Green light: moderate load.', "Race covered most of today's strain.", 'Lights out 22:40 · need 7h50m']}
          />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Key label="Log" icon={Plus} color={C.orange} className="h-[58px]" />
          <Key label="Breathe" icon={Wind} className="h-[58px]" />
          <Key label="Sleep" icon={Moon} className="h-[58px]" />
          <Key label="Crew" icon={Users} className="h-[58px]" />
        </div>
      </Device>
    )
  }

  /* ───────────────────────── Mixer ───────────────────────── */

  type Bus = 'strain' | 'recovery' | 'sleep'

  function Mixer() {
    const [bus, setBus] = useState<Bus>('strain')
    const [pinged, setPinged] = useState<string[]>([])
    const max = bus === 'strain' ? 50 : 100
    const avg = people.reduce((a, p) => a + p[bus], 0) / people.length
    const fmt = (v: number) => (bus === 'strain' ? v.toFixed(1) : String(Math.round(v)))
    const strips = [...people.map((p) => ({ id: p.id, name: p.name, v: p[bus], you: p.you, today: p.week[3] === 1, rest: p.resting })), { id: 'mst', name: 'MST', v: avg, you: false, today: false, rest: false }]
    return (
      <Device active={1}>
        <Header title="CREW MIXER" sub="5 CH · WK 48" />

        <Panel id="01" label="Sessions" screws>
          <Screen className="px-4 pb-3.5 pt-3">
            <div className="flex items-end justify-between">
              <span style={readout(64)}>11/16</span>
              <span className="pb-1.5" style={{ ...lbl, color: `${C.screenInk}99` }}>5 to go · Sun</span>
            </div>
            <div className="mt-3 flex gap-[4px]">
              {Array.from({ length: 16 }, (_, i) => (
                <motion.span
                  key={i}
                  className="h-[10px] flex-1 rounded-[2px]"
                  style={{ background: i < 11 ? C.orange : `${C.screenInk}14`, boxShadow: i < 11 ? `0 0 6px ${C.orange}aa` : undefined }}
                  initial={STATIC || i >= 11 ? false : { opacity: 0.1 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                />
              ))}
            </div>
          </Screen>
        </Panel>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {(
            [
              ['strain', 'Str'],
              ['recovery', 'Rec'],
              ['sleep', 'Slp'],
            ] as [Bus, string][]
          ).map(([b, l]) => (
            <div key={b} className="flex flex-col items-center gap-1.5">
              <Led on={bus === b} color={C.orange} />
              <Key label={l} active={bus === b} onClick={() => setBus(b)} className="h-[40px] w-full" />
            </div>
          ))}
        </div>

        <Panel id="02" label={`Mix · ${bus}`} className="mt-2.5">
          <div className="flex justify-between gap-[6px]">
            {strips.map((s) => {
              const isMaster = s.id === 'mst'
              const sent = pinged.includes(s.id)
              return (
                <div key={s.id} className="flex flex-1 flex-col items-center gap-2 rounded-[10px] py-2" style={{ background: isMaster ? C.pad : 'transparent' }}>
                  <Led on={s.today || !!s.rest || sent} color={sent ? C.orange : s.rest ? C.blue : C.green} />
                  {isMaster ? (
                    <div className="h-[22px]" style={{ ...lbl, fontSize: 8, lineHeight: '22px' }}>Avg</div>
                  ) : (
                    <motion.button
                      whileTap={{ y: 1 }}
                      onClick={() => !s.rest && !s.you && setPinged((p) => (p.includes(s.id) ? p : [...p, s.id]))}
                      className="h-[22px] w-full rounded-[6px]"
                      style={{ background: C.key, boxShadow: `0 2px 0 ${C.keyEdge}`, ...lbl, fontSize: 7.5, color: s.rest || s.you ? C.faint : sent ? C.orange : C.ink }}
                    >
                      {s.rest ? 'Mute' : s.you ? 'You' : sent ? 'Sent' : 'Ping'}
                    </motion.button>
                  )}
                  <div className="relative h-[150px] w-[36px]">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="absolute left-0 h-[1px]" style={{ top: `${i * 10}%`, width: i % 5 ? 5 : 8, background: C.faint }} />
                    ))}
                    <div className="absolute inset-y-0 left-1/2 w-[5px] -translate-x-1/2 rounded-full" style={{ background: C.screen, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }} />
                    <motion.div
                      className="absolute left-1/2 h-[22px] w-[34px] -translate-x-1/2 rounded-[5px]"
                      style={{
                        background: s.you ? C.orange : isMaster ? C.ink : `linear-gradient(${C.knobFrom}, ${C.knobTo})`,
                        boxShadow: `0 3px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)`,
                        opacity: s.rest ? 0.55 : 1,
                      }}
                      initial={STATIC ? false : { bottom: 'calc(0% - 11px)' }}
                      animate={{ bottom: `calc(${(Math.min(s.v, max) / max) * 100}% - 11px)` }}
                      transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                    >
                      <span className="absolute inset-x-[5px] top-1/2 h-[2px] -translate-y-1/2" style={{ background: s.you ? '#fff' : isMaster ? C.panel : C.ink, opacity: 0.8 }} />
                    </motion.div>
                  </div>
                  <span style={readout(15, s.you ? C.orange : C.ink)}>{fmt(s.v)}</span>
                  <span style={{ ...lbl, fontSize: 7.5, color: s.you ? C.ink : C.muted }}>{s.name}</span>
                </div>
              )
            })}
          </div>
        </Panel>

        <div className="mt-3">
          <Tape lines={['Feed · thu 26.11', '07:10 sophia  run 6.2km 32:04', '07:42 jerry   run 10.2km pr', '08:40 priya   yoga 30min', 'wed   alex    bench pr 95kg', 'sam   resting · pings muted']} />
        </div>
      </Device>
    )
  }

  /* ───────────────────────── Scope ───────────────────────── */

  function Scope() {
    const fastest = Math.min(...run.splits)
    const slowest = Math.max(...run.splits)
    const [km, setKm] = useState(run.splits.indexOf(fastest))
    const W = 316
    const H = 170
    const pts = toPoints(run.hr, W, H, { min: 100, max: 190 })
    const line = smoothPath(pts)
    const maxI = run.hr.indexOf(run.maxHr)
    return (
      <Device active={2}>
        <Header
          title="SESSION 0330-01"
          sub="RUN · 07:42"
          right={
            <span
              className="inline-block rounded-[3px] px-2.5 py-1"
              style={{
                background: mode === 'dark' ? '#C8321F' : '#161616',
                color: '#fff',
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.18em',
                transform: 'rotate(-2deg)',
                textShadow: '0 1px 0 rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.3)',
              }}
            >
              NEW 10K PR {run.pr.time}
            </span>
          }
        />

        <Panel id="01" label="Heart rate · CH1" screws>
          <Screen className="p-2.5">
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
              <defs>
                <filter id={`in-phosphor-${mode}`} x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              {Array.from({ length: 21 }, (_, i) => (
                <line key={`v${i}`} x1={(i * W) / 20} x2={(i * W) / 20} y1={0} y2={H} stroke={C.screenInk} strokeOpacity={i % 4 ? 0.04 : 0.12} />
              ))}
              {Array.from({ length: 11 }, (_, i) => (
                <line key={`h${i}`} x1={0} x2={W} y1={(i * H) / 10} y2={(i * H) / 10} stroke={C.screenInk} strokeOpacity={i % 5 ? 0.04 : 0.12} />
              ))}
              <path d={line} fill="none" stroke={C.orange} strokeWidth={4} opacity={0.6} filter={`url(#in-phosphor-${mode})`} />
              <motion.path
                d={line}
                fill="none"
                stroke={C.orange}
                strokeWidth={1.8}
                strokeLinecap="round"
                initial={STATIC ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.2, ease: 'linear' }}
              />
              <line x1={pts[maxI][0]} x2={pts[maxI][0]} y1={0} y2={H} stroke={C.screenInk} strokeOpacity={0.35} strokeDasharray="2 3" />
              <text x={pts[maxI][0] - 4} y={12} fontSize={8} fontFamily={MONO} fill={C.screenInk} textAnchor="end" opacity={0.8}>MAX 178</text>
              <text x={4} y={12} fontSize={8} fontFamily={MONO} fill={C.orange}>CH1 HR</text>
              <text x={4} y={H - 4} fontSize={7.5} fontFamily={MONO} fill={C.screenInk} opacity={0.55}>18 BPM/DIV</text>
              <text x={W - 4} y={H - 4} fontSize={7.5} fontFamily={MONO} fill={C.screenInk} opacity={0.55} textAnchor="end">10 MIN/DIV</text>
            </svg>
          </Screen>
        </Panel>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[
            ['Dist km', run.km.toFixed(2)],
            ['Time', run.duration],
            ['Pace /km', run.pace],
          ].map(([k, v]) => (
            <Panel key={k} className="!p-2">
              <Screen className="px-2.5 py-2">
                <div style={{ ...lbl, fontSize: 8, color: `${C.screenInk}88` }}>{k}</div>
                <div className="mt-1" style={readout(25)}>{v}</div>
              </Screen>
            </Panel>
          ))}
        </div>

        <Panel id="02" label="Splits · step sequencer" className="mt-2.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span style={lbl}>
              Km <span style={{ color: C.ink }}>{String(km + 1).padStart(2, '0')}</span>
            </span>
            <span style={readout(22, run.splits[km] === fastest ? C.orange : C.ink)}>{fmtPace(run.splits[km])}</span>
          </div>
          <div className="flex gap-[5px]">
            {run.splits.map((s, i) => {
              const lit = 3 + Math.round(((slowest - s) / (slowest - fastest)) * 5)
              const best = s === fastest
              const sel = i === km
              return (
                <button key={i} onClick={() => setKm(i)} className="flex flex-1 flex-col-reverse gap-[4px] rounded-[4px] p-[2px]" style={{ outline: sel ? `1.5px solid ${C.orange}` : 'none', outlineOffset: 1 }}>
                  {Array.from({ length: 8 }, (_, r) => {
                    const on = r < lit
                    return (
                      <motion.span
                        key={r}
                        className="block h-[9px] rounded-[2px]"
                        style={{ background: on ? (best ? C.orange : C.ink) : C.pad, boxShadow: on && best ? `0 0 6px ${C.orange}` : undefined }}
                        initial={STATIC || !on ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + i * 0.05 + r * 0.02 }}
                      />
                    )
                  })}
                </button>
              )
            })}
          </div>
          <div className="mt-1.5 flex gap-[5px]">
            {run.splits.map((_, i) => (
              <span key={i} className="flex-1 text-center" style={{ ...lbl, fontSize: 8, color: i === km ? C.orange : C.faint }}>
                {i + 1}
              </span>
            ))}
          </div>
        </Panel>

        <Panel id="03" label="Zones" className="mt-2.5">
          <div className="space-y-2">
            {[...run.zones].reverse().map((z) => (
              <div key={z.z} className="flex items-center gap-2.5">
                <span className="w-6" style={{ ...lbl, color: C.ink }}>{z.z}</span>
                <div className="flex-1">
                  <Meter value={z.pct / 40} n={20} height={10} />
                </div>
                <span className="w-9 text-right" style={readout(14, C.ink)}>{z.min}M</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Key label="Save" className="h-[48px]" />
          <Key label="Share" color={C.orange} className="h-[48px]" />
        </div>
      </Device>
    )
  }

  return { Unit, Mixer, Scope }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Body', hex: C.body },
  { name: 'Panel', hex: C.panel },
  { name: 'Screen', hex: C.screen },
  { name: 'Signal', hex: C.orange },
  { name: 'Caution', hex: C.yellow },
  { name: 'LED', hex: C.green },
]

export const instrument: Direction = {
  id: 'instrument',
  name: 'Instrument',
  round: 2,
  tagline: 'The app as a piece of hardware: dot-matrix readouts, knobs you can turn, and a mixing desk for your crew.',
  inspiredBy: ['Teenage Engineering OP-1', 'Braun ET66 (Dieter Rams)', 'Nothing Phone', 'Casio G-Shock', 'Dymo label makers'],
  dna: [
    { label: 'Atmosphere', text: 'Bead-blasted aluminium by day, black anodized by night. Modules with screws, recessed screens, and keys that physically press in.' },
    { label: 'Color', text: 'Greys plus signal orange for the live value. Green/yellow/orange LEDs only for state. Screens are always black.' },
    { label: 'Type', text: 'Doto, a dot-matrix face, for every readout; Geist Mono for tiny silkscreened labels like "04 / STRAIN".' },
    { label: 'Hero', text: 'A glowing 78% on a recessed dot screen with a 7-day dot chart, like a synth\'s display.' },
    { label: 'Data', text: 'Strain is a knob with the target painted on the dial. A second knob plans tonight\'s walk and projects strain live. HR is an oscilloscope trace; splits are a step sequencer.' },
    { label: 'Social', text: 'The crew is a mixing console: one fader per person on the selected bus, a master fader for the average, Ping keys, and Sam muted while resting.' },
  ],
  fromTandem: 'Tandem\'s Setup controls (sliders that change the plan and update numbers instantly) become physical: the evening-walk knob recalculates projected strain as you turn it.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Doto', displayFamily: DOT, text: 'Geist Mono', textFamily: MONO, sample: '78%', displayStyle: { fontWeight: 800 } },
  screens: [
    { title: 'Unit', caption: 'Dot-matrix recovery; turn the evening-walk knob', render: (m) => createElement(T[m].Unit) },
    { title: 'Crew mixer', caption: 'A fader per person; tap Str / Rec / Slp and Ping', render: (m) => createElement(T[m].Mixer) },
    { title: 'Scope', caption: 'HR as an oscilloscope; tap a split column', render: (m) => createElement(T[m].Scope) },
  ],
}

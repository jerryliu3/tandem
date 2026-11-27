import { AnimatePresence, motion } from 'motion/react'
import { Compass, Map as MapIcon, NotebookPen, Plus, Radio, Users, type LucideIcon } from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { body, fmtPace, people, run } from '../data'
import { CountUp, DrawPath, EASE, Phone, STATIC, pointAt, scalePoints, smoothClosed, smoothPath, toPoints, type Direction, type Mode, type Pt } from '../kit'

const LIGHT = {
  paper: '#ECE8D7',
  panel: '#E4DFCA',
  ink: '#1F2A22',
  muted: '#5E6A5E',
  line: 'rgba(31,42,34,0.3)',
  grid: 'rgba(31,42,34,0.09)',
  contour: '#B4895A',
  contourIdx: '#7E5A32',
  water: '#4A82A8',
  waterSoft: 'rgba(74,130,168,0.16)',
  veg: 'rgba(118,148,78,0.22)',
  trail: '#D2512A',
  topTint: 'rgba(236,232,215,0.88)',
  hyps: ['#B9CDA1', '#D8DBA5', '#E6C78F', '#D49C67', '#A9643C'],
}
type Palette = typeof LIGHT

const DARK: Palette = {
  paper: '#0D1310',
  panel: '#121A15',
  ink: '#D5E1D4',
  muted: '#7C8E80',
  line: 'rgba(213,225,212,0.22)',
  grid: 'rgba(213,225,212,0.06)',
  contour: '#2C5841',
  contourIdx: '#4F8D69',
  water: '#3F82AC',
  waterSoft: 'rgba(63,130,172,0.16)',
  veg: 'rgba(79,141,105,0.1)',
  trail: '#FF9142',
  topTint: 'rgba(13,19,16,0.88)',
  hyps: ['#22412F', '#3E5631', '#6B602F', '#88512B', '#A9462B'],
}

const ARCH = 'var(--f-archivo)'
const MONO = 'var(--f-plexmono)'

const title = (size: number): CSSProperties => ({ fontFamily: ARCH, fontStretch: '125%', fontWeight: 800, fontSize: size, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '0.01em' })

type Peak = { cx: number; cy: number; n: number; base: number; step: number; seed: number; sx?: number; sy?: number }

function ringPts({ cx, cy, base, step, seed, sx = 1.18, sy = 0.82 }: Peak, k: number): Pt[] {
  const r = base + k * step
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2
    const w = 1 + 0.13 * Math.sin(3 * a + seed + k * 0.22) + 0.07 * Math.sin(5 * a + seed * 1.7 - k * 0.15) + 0.035 * Math.sin(8 * a + k * 0.5)
    return [cx + Math.cos(a) * r * w * sx, cy + Math.sin(a) * r * w * sy]
  })
}

function blob(cx: number, cy: number, rx: number, ry: number, seed: number) {
  return smoothClosed(
    Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2
      const w = 1 + 0.16 * Math.sin(3 * a + seed) + 0.08 * Math.sin(5 * a + seed * 2)
      return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w] as Pt
    }),
  )
}

const ELEV = [12, 18, 26, 34, 44, 52, 40, 30, 43, 22, 14]

function theme(C: Palette, mode: Mode) {
  const label: CSSProperties = { fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }
  const halo = { stroke: C.paper, strokeWidth: 3.5, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const }

  function Frame({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div className={className} style={{ border: `1.5px solid ${C.ink}`, padding: 3, ...style }}>
        <div style={{ border: `0.5px solid ${C.line}` }}>{children}</div>
      </div>
    )
  }

  function Grid({ w, h }: { w: number; h: number }) {
    return (
      <g>
        {Array.from({ length: Math.ceil(w / 44) + 1 }, (_, i) => (
          <g key={`x${i}`}>
            <line x1={i * 44} x2={i * 44} y1={0} y2={h} stroke={C.grid} />
            <text x={i * 44 + 2} y={8} fontSize={6.5} fontFamily={MONO} fill={C.muted} opacity={0.7}>{18 + i}</text>
          </g>
        ))}
        {Array.from({ length: Math.ceil(h / 44) + 1 }, (_, i) => (
          <line key={`y${i}`} x1={0} x2={w} y1={i * 44} y2={i * 44} stroke={C.grid} />
        ))}
      </g>
    )
  }

  function Contours({ peak, labels = true, delay = 0 }: { peak: Peak; labels?: boolean; delay?: number }) {
    return (
      <g>
        {Array.from({ length: peak.n }, (_, k) => {
          const pts = ringPts(peak, k)
          const idx = k % 4 === 3
          return (
            <g key={k}>
              <DrawPath d={smoothClosed(pts)} stroke={idx ? C.contourIdx : C.contour} width={idx ? 1.3 : 0.75} duration={1.6} delay={delay + k * 0.05} />
              {labels && idx && (
                <text x={pts[30][0]} y={pts[30][1] + 3} fontSize={7.5} fontFamily={MONO} fill={C.contourIdx} textAnchor="middle" style={halo}>
                  {75 - k * 5}
                </text>
              )}
            </g>
          )
        })}
      </g>
    )
  }

  function North({ x, y }: { x: number; y: number }) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d="M0,-12 L5,6 L0,2 L-5,6 Z" fill={C.ink} />
        <text y={17} fontSize={8} fontFamily={MONO} fontWeight={600} textAnchor="middle" fill={C.ink}>N</text>
      </g>
    )
  }

  function ScaleBar({ x, y }: { x: number; y: number }) {
    return (
      <g transform={`translate(${x} ${y})`}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 16} y={0} width={16} height={4} fill={i % 2 ? C.paper : C.ink} stroke={C.ink} strokeWidth={0.6} />
        ))}
        {['0', '50', '100'].map((t, i) => (
          <text key={t} x={i * 32} y={12} fontSize={6.5} fontFamily={MONO} fill={C.muted} textAnchor="middle">{t}</text>
        ))}
      </g>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: MapIcon, label: 'Map' },
      { icon: NotebookPen, label: 'Log' },
      { icon: Plus, label: '' },
      { icon: Users, label: 'Party' },
      { icon: Compass, label: 'Gear' },
    ]
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[86px] items-start justify-around px-3 pt-2.5" style={{ background: C.paper, borderTop: `1.5px solid ${C.ink}` }}>
        {items.map(({ icon: Icon, label: l }, i) =>
          l ? (
            <div key={i} className="flex w-14 flex-col items-center gap-1" style={{ color: i === active ? C.trail : C.muted }}>
              <Icon size={21} strokeWidth={1.8} />
              <span style={{ ...label, fontSize: 9, color: 'inherit' }}>{l}</span>
            </div>
          ) : (
            <div key={i} className="grid h-[44px] w-[44px] place-items-center" style={{ background: C.ink, color: C.paper, transform: 'rotate(45deg) scale(0.86)' }}>
              <Icon size={22} strokeWidth={2.4} style={{ transform: 'rotate(-45deg)' }} />
            </div>
          ),
        )}
      </div>
    )
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.paper} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-[18px] pb-[104px] pt-[58px]" style={{ fontFamily: MONO, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  /* ───────────────────────── Conditions ───────────────────────── */

  function SummitMap() {
    const W = 346
    const H = 292
    const A: Peak = { cx: 222, cy: 128, n: 12, base: 7, step: 11.5, seed: 1.3 }
    const B: Peak = { cx: 74, cy: 118, n: 6, base: 6, step: 10, seed: 2.4 }
    const trail: Pt[] = [[22, 286], [58, 262], [118, 252], [160, 216], [150, 184], [188, 162], [206, 142], [222, 128]]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ background: C.paper }}>
        <Grid w={W} h={H} />
        <path d={blob(70, 250, 58, 30, 1)} fill={C.veg} />
        <path d={blob(318, 70, 44, 52, 2)} fill={C.veg} />
        <path d={blob(296, 252, 44, 22, 0.6)} fill={C.waterSoft} stroke={C.water} strokeWidth={1} />
        <path d="M252,252 C 226,240 214,266 186,262 S 140,282 110,292" fill="none" stroke={C.water} strokeWidth={1.2} />
        <Contours peak={B} labels={false} delay={0.3} />
        <Contours peak={A} />
        <motion.path
          d={smoothPath(trail)}
          fill="none"
          stroke={C.trail}
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
          initial={STATIC ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        />
        {[
          { p: trail[1], t: '06:21 WAKE' },
          { p: trail[3], t: '07:42 RUN' },
        ].map(({ p, t }) => (
          <g key={t}>
            <circle cx={p[0]} cy={p[1]} r={3.5} fill={C.paper} stroke={C.trail} strokeWidth={1.6} />
            <text x={p[0] + 7} y={p[1] + 3} fontSize={8} fontFamily={MONO} fontWeight={600} fill={C.ink} style={halo}>{t}</text>
          </g>
        ))}
        <path d="M222,119 l7,12 h-14 Z" fill={C.ink} />
        <text x={240} y={110} fontSize={46} fontFamily={ARCH} fontWeight={800} fill={C.ink} style={{ ...halo, strokeWidth: 5, fontStretch: '125%' }}>78</text>
        <text x={242} y={123} fontSize={7.5} fontFamily={MONO} fontWeight={600} letterSpacing={1} fill={C.trail} style={halo}>READINESS</text>
        <text x={74} y={121} fontSize={7.5} fontFamily={MONO} fill={C.muted} textAnchor="middle" style={halo}>▲ SLEEP 84</text>
        <North x={326} y={28} />
        <ScaleBar x={14} y={18} />
      </svg>
    )
  }

  function Profile() {
    const W = 346
    const H = 120
    const x = (h: number) => ((h - 6) / 16) * W
    const y = (s: number) => H - 12 - (s / 16) * (H - 22)
    const done: Pt[] = [[6, 0], [7, 0.6], [7.7, 1.2], [8, 4.5], [8.3, 8], [8.6, 10.6], [9, 11], [9.7, 11.4]].map(([h, s]) => [x(h), y(s)])
    const plan: Pt[] = [[9.7, 11.4], [13, 11.9], [17, 12.4], [19.5, 13.1], [22, 13.3]].map(([h, s]) => [x(h), y(s)])
    const line = smoothPath(done)
    const [nx, ny] = done[done.length - 1]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
        <defs>
          <pattern id={`tr-hatch-${mode}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={C.contour} strokeWidth="1" />
          </pattern>
          <pattern id={`tr-ridge-${mode}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2" x2="4" y2="2" stroke={C.trail} strokeWidth="0.8" opacity="0.5" />
          </pattern>
        </defs>
        <rect x={0} y={y(15)} width={W} height={y(12) - y(15)} fill={`url(#tr-ridge-${mode})`} />
        <text x={W - 2} y={y(15) - 3} fontSize={7.5} fontFamily={MONO} fill={C.trail} textAnchor="end">TARGET RIDGE 12–15</text>
        <path d={`${line} L${nx},${H - 12} L0,${H - 12} Z`} fill={`url(#tr-hatch-${mode})`} opacity={0.8} />
        <DrawPath d={line} stroke={C.ink} width={1.4} />
        <path d={smoothPath(plan)} fill="none" stroke={C.ink} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.6} />
        <line x1={x(7.7)} x2={x(7.7)} y1={y(14)} y2={H - 12} stroke={C.ink} strokeWidth={0.7} strokeDasharray="2 2" />
        <text x={x(7.7) + 3} y={y(14) + 4} fontSize={7.5} fontFamily={MONO} fill={C.ink}>RUN</text>
        <circle cx={nx} cy={ny} r={3.5} fill={C.trail} />
        <text x={nx + 6} y={ny - 4} fontSize={8} fontFamily={MONO} fontWeight={600} fill={C.trail}>NOW 11.4</text>
        <line x1={0} x2={W} y1={H - 12} y2={H - 12} stroke={C.ink} strokeWidth={0.8} />
        {[6, 10, 14, 18, 22].map((h) => (
          <text key={h} x={x(h)} y={H} fontSize={7.5} fontFamily={MONO} fill={C.muted} textAnchor={h === 6 ? 'start' : h === 22 ? 'end' : 'middle'}>
            {String(h).padStart(2, '0')}:00
          </text>
        ))}
      </svg>
    )
  }

  function Symbol({ kind }: { kind: string }) {
    const s = { fill: 'none', stroke: C.ink, strokeWidth: 1.4 }
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
        {kind === 'hrv' && <path d="M9,3 L15,14 H3 Z" {...s} />}
        {kind === 'rhr' && <circle cx="9" cy="9" r="5" fill={C.ink} />}
        {kind === 'resp' && <path d="M2,7 q3.5,-3 7,0 t7,0 M2,12 q3.5,-3 7,0 t7,0" {...s} stroke={C.water} />}
        {kind === 'temp' && <path d="M9,2 V16 M3,5 L15,13 M15,5 L3,13" {...s} />}
        {kind === 'sleep' && <path d="M2,15 L9,3 L16,15 Z M9,15 L9,10" {...s} />}
        {kind === 'steps' && <path d="M2,14 C6,4 12,14 16,4" {...s} stroke={C.trail} strokeDasharray="2.5 2" />}
      </svg>
    )
  }

  function Conditions() {
    const legend = [
      { kind: 'hrv', k: 'HRV', v: '61', u: 'MS · +6' },
      { kind: 'rhr', k: 'Resting HR', v: '52', u: 'BPM · −2' },
      { kind: 'sleep', k: 'Camp · sleep', v: '84', u: '7H 12M' },
      { kind: 'resp', k: 'Respiration', v: '14.2', u: 'RPM' },
      { kind: 'temp', k: 'Skin temp', v: '+0.1', u: '°C' },
      { kind: 'steps', k: 'Steps', v: '8,240', u: 'TODAY' },
    ]
    return (
      <Screen active={0}>
        <div className="flex justify-between" style={label}>
          <span>Sheet 330 · Thu 26 Nov</span>
          <span>40.66°N 73.97°W</span>
        </div>
        <h1 className="mt-3" style={title(27)}>Summit conditions</h1>
        <div className="mt-1.5" style={{ ...label, color: C.ink }}>
          Readiness <span style={{ color: C.trail }}>78</span> · clear, good visibility
        </div>

        <Frame className="mt-4">
          <SummitMap />
        </Frame>

        <div className="mt-5 flex items-end justify-between">
          <div>
            <div style={label}>Today's route · strain</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span style={title(34)}>
                <CountUp value={body.strain} decimals={1} />
              </span>
              <span style={label}>of 21</span>
            </div>
          </div>
          <div className="text-right" style={{ ...label, fontSize: 9 }}>
            Planned
            <br />
            <span style={{ color: C.ink }}>13.3 by 22:00</span>
          </div>
        </div>
        <div className="mt-2">
          <Profile />
        </div>

        <div className="mt-5" style={label}>Legend</div>
        <div className="mt-2 grid grid-cols-2" style={{ borderTop: `1px solid ${C.line}`, borderLeft: `1px solid ${C.line}` }}>
          {legend.map((l) => (
            <div key={l.k} className="flex items-center gap-2.5 px-2.5 py-2.5" style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
              <Symbol kind={l.kind} />
              <div className="min-w-0">
                <div style={{ ...label, fontSize: 8.5 }}>{l.k}</div>
                <div className="flex items-baseline gap-1">
                  <span style={title(18)}>{l.v}</span>
                  <span style={{ ...label, fontSize: 8 }}>{l.u}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 py-3 pl-3 pr-2" style={{ background: C.panel, borderLeft: `3px solid ${C.trail}` }}>
          <div style={{ ...label, color: C.trail }}>Field note · 07:58</div>
          <p className="mt-1.5" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
            Recovered well overnight. Good conditions for a moderate effort; the race covered most of today's climb. Make camp early: lights out 22:40.
          </p>
        </div>
      </Screen>
    )
  }

  /* ───────────────────────── Party ───────────────────────── */

  function ExpeditionMap() {
    const W = 346
    const H = 276
    const M: Peak = { cx: 173, cy: 116, n: 11, base: 8, step: 12, seed: 0.7, sx: 1.25, sy: 0.8 }
    const trail: Pt[] = [[173, 266], [70, 248], [268, 222], [94, 198], [250, 174], [124, 152], [214, 132], [173, 116]]
    const stage = (k: number) => pointAt(trail, k / 15)
    const flags = [
      { k: 7, id: 'AR' },
      { k: 8, id: 'SC' },
      { k: 9, id: 'JL', you: true },
      { k: 10, id: 'PS' },
    ]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ background: C.paper }}>
        <Grid w={W} h={H} />
        <path d={blob(300, 240, 50, 26, 3)} fill={C.veg} />
        <Contours peak={M} labels={false} />
        <motion.polyline
          points={trail.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={C.ink}
          strokeWidth={1.2}
          strokeDasharray="3 3"
          initial={STATIC ? false : { opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.6 }}
        />
        {Array.from({ length: 16 }, (_, k) => {
          const [x, y] = stage(k)
          const done = k < 11
          return (
            <motion.rect
              key={k}
              x={x - 3.5}
              y={y - 3.5}
              width={7}
              height={7}
              fill={k === 10 ? C.trail : done ? C.ink : C.paper}
              stroke={k === 10 ? C.trail : C.ink}
              strokeWidth={1}
              initial={STATIC ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 + k * 0.04 }}
            />
          )
        })}
        {flags.map(({ k, id, you }) => {
          const [x, y] = stage(k)
          return (
            <g key={id} transform={`translate(${x} ${y})`}>
              <line x1={0} x2={0} y1={-3} y2={-22} stroke={C.ink} strokeWidth={1} />
              <rect x={0} y={-22} width={18} height={10} fill={you ? C.trail : C.ink} />
              <text x={9} y={-14.5} fontSize={6.5} fontFamily={MONO} fontWeight={700} textAnchor="middle" fill={C.paper}>{id}</text>
            </g>
          )
        })}
        <g transform="translate(118 266)">
          <path d="M-9,0 L0,-14 L9,0 Z M0,0 L0,-6" fill="none" stroke={C.ink} strokeWidth={1.3} />
          <text x={-14} y={-3} fontSize={7.5} fontFamily={MONO} fill={C.muted} textAnchor="end" style={halo}>SO · BASECAMP</text>
        </g>
        <text x={173} y={102} fontSize={8} fontFamily={MONO} fontWeight={600} fill={C.ink} textAnchor="middle" style={halo}>SUMMIT · SUN 29</text>
        <North x={326} y={28} />
      </svg>
    )
  }

  function Party() {
    const roster = [
      { id: 'JL', p: people[0], last: 'RUN 10.2 KM', status: 'On route' },
      { id: 'SC', p: people[1], last: 'RUN 6.2 KM', status: 'On route' },
      { id: 'AR', p: people[2], last: 'LIFT · WED', status: 'Rest day' },
      { id: 'PS', p: people[3], last: 'YOGA 30 MIN', status: 'On route' },
      { id: 'SO', p: people[4], last: '—', status: 'Basecamp' },
    ]
    const [log, setLog] = useState([
      { t: '08:51', from: 'SC', to: 'JL', msg: 'So proud of you. Pie is on me.' },
      { t: '08:40', from: 'PS', to: 'ALL', msg: 'Slow flow done. Stage 11 is ours.' },
      { t: '07:10', from: 'SC', to: 'ALL', msg: 'Easy miles before the turkey.' },
    ])
    const sent = log[0].from === 'JL'
    return (
      <Screen active={3}>
        <div className="flex justify-between" style={label}>
          <span>Expedition · Wk 48</span>
          <span>5 members</span>
        </div>
        <h1 className="mt-3" style={title(27)}>The party</h1>
        <div className="mt-1.5" style={{ ...label, color: C.ink }}>
          Stage <span style={{ color: C.trail }}>11</span> of 16 · summit Sunday
        </div>

        <Frame className="mt-4">
          <ExpeditionMap />
        </Frame>

        <div className="mt-5" style={label}>Roster</div>
        <table className="mt-2 w-full" style={{ fontSize: 11, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderTop: `1.5px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}` }}>
              {['ID', 'Member', 'Stg', 'Last', 'Status'].map((h, i) => (
                <th key={h} className="py-1.5 font-medium" style={{ ...label, fontSize: 8.5, textAlign: i === 2 ? 'right' : 'left', paddingLeft: i === 3 ? 10 : 0 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="py-2" style={{ fontWeight: 700, color: r.p.you ? C.trail : C.ink }}>{r.id}</td>
                <td className="py-2">{r.p.name}</td>
                <td className="py-2 text-right tnum">{r.p.resting ? '—' : `${r.p.week.reduce((a, b) => a + b, 0)}/${r.p.target}`}</td>
                <td className="py-2 pl-2.5" style={{ color: C.muted }}>{r.last}</td>
                <td className="py-2" style={{ color: r.status === 'Basecamp' ? C.water : r.status === 'Rest day' ? C.muted : C.ink }}>{r.status.toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex items-center justify-between">
          <div style={label}>Radio log</div>
          <div className="flex items-center gap-1.5" style={{ ...label, fontSize: 9, color: C.trail }}>
            <Radio size={12} /> CH 4
          </div>
        </div>
        <div className="mt-2" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
          <AnimatePresence initial={false}>
            {log.map((e) => (
              <motion.div
                key={e.t + e.from}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="flex gap-2.5 px-3 py-2" style={{ borderBottom: `1px solid ${C.line}`, fontSize: 11.5, lineHeight: 1.45 }}>
                  <span style={{ color: C.muted }}>{e.t}</span>
                  <span style={{ fontWeight: 700, color: e.from === 'JL' ? C.trail : C.ink, whiteSpace: 'nowrap' }}>
                    {e.from}▸{e.to}
                  </span>
                  <span>{e.msg}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={() => !sent && setLog((l) => [{ t: '09:41', from: 'JL', to: 'ALL', msg: 'Flare up. Strong week, team.' }, ...l])}
            className="flex w-full items-center justify-center gap-2 py-2.5"
            style={{ ...label, fontSize: 10, fontWeight: 700, color: sent ? C.muted : C.paper, background: sent ? 'transparent' : C.ink }}
          >
            {sent ? 'Flare sent' : 'Send a flare to the party'}
          </button>
        </div>
      </Screen>
    )
  }

  /* ───────────────────────── Route log ───────────────────────── */

  function RouteMap() {
    const W = 346
    const H = 250
    const pts = scalePoints(run.route, W, H)
    const route = smoothPath(pts)
    const hill1: Peak = { cx: 112, cy: 92, n: 6, base: 5, step: 9, seed: 3.1 }
    const hill2: Peak = { cx: 270, cy: 92, n: 5, base: 5, step: 9, seed: 0.4 }
    const [sx, sy] = pts[0]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block" style={{ background: C.paper }}>
        <Grid w={W} h={H} />
        <path d={blob(W * 0.5, H * 0.52, W * 0.42, H * 0.4, 1.7)} fill={C.veg} />
        <path d={blob(W * 0.56, H * 0.6, W * 0.11, H * 0.07, 0.3)} fill={C.waterSoft} stroke={C.water} strokeWidth={1} />
        <Contours peak={hill1} labels={false} />
        <Contours peak={hill2} labels={false} delay={0.2} />
        <path d={route} fill="none" stroke={C.paper} strokeWidth={6} />
        <DrawPath d={route} stroke={C.trail} width={2.6} duration={2} delay={0.4} />
        {Array.from({ length: 10 }, (_, k) => {
          const [x, y] = pointAt(pts, (k + 1) / 10.2)
          return (
            <g key={k}>
              <rect x={x - 5.5} y={y - 5.5} width={11} height={11} fill={C.paper} stroke={C.ink} strokeWidth={0.8} />
              <text x={x} y={y + 2.6} fontSize={7} fontFamily={MONO} fontWeight={700} textAnchor="middle" fill={C.ink}>{k + 1}</text>
            </g>
          )
        })}
        <circle cx={sx} cy={sy} r={4.5} fill={C.trail} stroke={C.paper} strokeWidth={1.5} />
        <text x={112} y={95} fontSize={7.5} fontFamily={MONO} fill={C.ink} textAnchor="middle" style={halo}>▲ 61 LOOKOUT HILL</text>
        <text x={W * 0.56} y={H * 0.6 + 3} fontSize={7} fontFamily={MONO} fill={C.water} textAnchor="middle" style={halo}>THE LAKE</text>
        <North x={326} y={28} />
        <ScaleBar x={14} y={H - 22} />
      </svg>
    )
  }

  function ElevationHr() {
    const W = 346
    const H = 110
    const e = toPoints(ELEV, W, H - 14, { min: 0, max: 64, padY: 4 })
    const hr = toPoints(run.hr, W, H - 14, { min: 100, max: 190, padY: 4 })
    const line = smoothPath(e)
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="block overflow-visible">
        <defs>
          <pattern id={`tr-elev-${mode}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke={C.contour} strokeWidth="1" />
          </pattern>
        </defs>
        <path d={`${line} L${W},${H - 14} L0,${H - 14} Z`} fill={`url(#tr-elev-${mode})`} />
        <path d={line} fill="none" stroke={C.ink} strokeWidth={1.3} />
        <DrawPath d={smoothPath(hr)} stroke={C.trail} width={1.3} duration={1.8} />
        <line x1={0} x2={W} y1={H - 14} y2={H - 14} stroke={C.ink} strokeWidth={0.8} />
        {Array.from({ length: 11 }, (_, k) => (
          <text key={k} x={(k / 10) * W} y={H - 2} fontSize={7.5} fontFamily={MONO} fill={C.muted} textAnchor={k === 0 ? 'start' : k === 10 ? 'end' : 'middle'}>
            {k}
          </text>
        ))}
      </svg>
    )
  }

  function RouteLog() {
    const avg = run.splits.reduce((a, b) => a + b, 0) / run.splits.length
    const fastest = Math.min(...run.splits)
    const slowest = Math.max(...run.splits)
    return (
      <Screen active={1}>
        <div className="flex justify-between" style={label}>
          <span>Route log · 07:42–08:33</span>
          <span>Prospect Park</span>
        </div>
        <h1 className="mt-3" style={title(27)}>Turkey Trot 10K</h1>
        <div className="mt-1.5" style={{ ...label, color: C.ink }}>
          New 10K best <span style={{ color: C.trail }}>{run.pr.time}</span> · {run.pr.delta}
        </div>

        <Frame className="mt-4">
          <RouteMap />
        </Frame>

        <div className="mt-4 grid grid-cols-3" style={{ borderTop: `1px solid ${C.line}`, borderLeft: `1px solid ${C.line}` }}>
          {[
            ['Dist', run.km.toFixed(2), 'KM'],
            ['Time', run.duration, ''],
            ['Pace', run.pace, '/KM'],
            ['Gain', String(run.elev), 'M'],
            ['Avg HR', String(run.avgHr), 'BPM'],
            ['Energy', String(run.kcal), 'KCAL'],
          ].map(([k, v, u]) => (
            <div key={k} className="px-2.5 py-2" style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
              <div style={{ ...label, fontSize: 8.5 }}>{k}</div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span style={title(19)}>{v}</span>
                <span style={{ ...label, fontSize: 7.5 }}>{u}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <div style={label}>Elevation · heart rate</div>
          <div className="flex gap-3" style={{ ...label, fontSize: 8.5 }}>
            <span>▨ Elev</span>
            <span style={{ color: C.trail }}>— HR</span>
          </div>
        </div>
        <div className="mt-2">
          <ElevationHr />
        </div>

        <div className="mt-5" style={label}>Splits</div>
        <div className="mt-2" style={{ borderTop: `1.5px solid ${C.ink}` }}>
          {run.splits.map((s, i) => {
            const best = s === fastest
            const d = Math.round(s - avg)
            return (
              <div key={i} className="flex items-center gap-3 py-[5px]" style={{ borderBottom: `1px solid ${C.line}`, fontSize: 11.5, color: best ? C.trail : C.ink, fontWeight: best ? 700 : 400 }}>
                <span className="w-6 tnum">{String(i + 1).padStart(2, '0')}</span>
                <span className="w-10 tnum">{fmtPace(s)}</span>
                <span className="w-9 tnum text-right" style={{ color: best ? C.trail : C.muted }}>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '0'}</span>
                <div className="h-[5px] flex-1" style={{ background: C.grid }}>
                  <motion.div
                    className="h-full"
                    style={{ background: best ? C.trail : C.ink }}
                    initial={STATIC ? false : { width: 0 }}
                    animate={{ width: `${30 + ((slowest - s) / (slowest - fastest)) * 70}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.04, ease: EASE }}
                  />
                </div>
                {best && <span style={{ fontSize: 9 }}>▲</span>}
              </div>
            )
          })}
        </div>

        <div className="mt-5" style={label}>Effort bands · heart rate zones</div>
        <div className="mt-2 space-y-1">
          {[...run.zones].reverse().map((z, idx) => {
            const i = 4 - idx
            return (
              <div key={z.z} className="flex items-center gap-2.5" style={{ fontSize: 11 }}>
                <span className="block h-[16px] w-[26px] shrink-0" style={{ background: C.hyps[i], border: `0.5px solid ${C.line}` }} />
                <span className="w-7" style={{ fontWeight: 700 }}>{z.z}</span>
                <div className="h-[16px] flex-1" style={{ background: C.grid }}>
                  <motion.div
                    className="h-full"
                    style={{ background: C.hyps[i] }}
                    initial={STATIC ? false : { width: 0 }}
                    animate={{ width: `${(z.pct / 40) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.2 + idx * 0.06, ease: EASE }}
                  />
                </div>
                <span className="w-14 text-right tnum" style={{ color: C.muted }}>{z.min} MIN</span>
              </div>
            )
          })}
        </div>
      </Screen>
    )
  }

  return { Conditions, Party, RouteLog }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Paper', hex: C.paper },
  { name: 'Ink', hex: C.ink },
  { name: 'Contour', hex: C.contour },
  { name: 'Water', hex: C.water },
  { name: 'Trail', hex: C.trail },
  { name: 'Band Z4', hex: C.hyps[3] },
]

export const terrain: Direction = {
  id: 'terrain',
  name: 'Terrain',
  round: 2,
  tagline: 'A field guide to your own body: readiness as elevation, your day as a route, the crew as an expedition.',
  inspiredBy: ['USGS topographic maps', 'Swisstopo', 'Gaia GPS', 'Patagonia field guides', 'Ordnance Survey legends'],
  dna: [
    { label: 'Atmosphere', text: 'Survey paper by day, a night-navigation green-black by night. Square corners and double-line map frames instead of cards.' },
    { label: 'Color', text: 'Cartographic: contour brown, water blue, vegetation green, and trail orange for "you" and "now". Heart-rate zones become hypsometric tints.' },
    { label: 'Type', text: 'Archivo at 125% width for map titles, IBM Plex Mono for every label, coordinate and log entry.' },
    { label: 'Hero', text: 'A generated contour map where the summit is your readiness score, with today\'s route and waypoints dashed across it.' },
    { label: 'Data', text: 'Strain as an elevation profile with a "target ridge"; vitals as a map legend with survey symbols; splits as a route log.' },
    { label: 'Social', text: 'The weekly crew goal is an expedition: 16 stages up a switchback, flags for who logged what, a radio log, and Sam resting at basecamp.' },
  ],
  fromTandem: 'Tandem\'s goal ring and projection chart become the summit and the route: the same "where you are versus where you\'re going" view, drawn as a landscape instead of a ring.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Archivo Expanded', displayFamily: ARCH, text: 'IBM Plex Mono', textFamily: MONO, sample: '78', displayStyle: { fontWeight: 800, fontStretch: '125%' } },
  screens: [
    { title: 'Conditions', caption: 'Readiness as a summit on a contour map', render: (m) => createElement(T[m].Conditions) },
    { title: 'The party', caption: 'Weekly goal as an expedition; tap Send a flare', render: (m) => createElement(T[m].Party) },
    { title: 'Route log', caption: 'The run on a topo map, splits as a log', render: (m) => createElement(T[m].RouteLog) },
  ],
}

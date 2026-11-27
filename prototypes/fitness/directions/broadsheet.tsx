import { motion } from 'motion/react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { alexLift, body, fmtPace, people, priyaYoga, run, sophiaRun, TODAY } from '../data'
import { CountUp, DrawPath, EASE, Phone, STATIC, pointAt, scalePoints, smoothClosed, smoothPath, toPoints, type Direction, type Mode, type Pt } from '../kit'

const LIGHT = {
  paper: '#F3EFE4',
  ink: '#151311',
  ink2: '#3A352F',
  muted: '#6E675D',
  hair: 'rgba(21,19,17,0.22)',
  tint: 'rgba(21,19,17,0.07)',
  grain: 'rgba(21,19,17,0.045)',
  spot: '#D7381E',
  topTint: 'rgba(243,239,228,0.88)',
}
type Palette = typeof LIGHT

const DARK: Palette = {
  paper: '#131210',
  ink: '#EDE7DA',
  ink2: '#CEC7B7',
  muted: '#8F887B',
  hair: 'rgba(237,231,218,0.2)',
  tint: 'rgba(237,231,218,0.08)',
  grain: 'rgba(237,231,218,0.03)',
  spot: '#FF5D3F',
  topTint: 'rgba(19,18,16,0.88)',
}

const MAST = 'var(--f-blackletter)'
const SERIF = 'var(--f-news)'
const SANS = 'var(--f-intertight)'
const NUMS: CSSProperties = { fontFamily: SERIF, fontVariantNumeric: 'lining-nums tabular-nums' }

/** [stage, minutes]; stage 0 awake, 1 REM, 2 light, 3 deep. Sums to 7h 12m. */
const SLEEP_STAGES: [number, number][] = [
  [2, 12], [3, 40], [3, 35], [2, 25], [1, 15], [2, 30], [3, 30], [2, 25], [1, 20], [2, 35], [2, 30], [1, 25], [0, 5], [2, 35], [1, 25], [2, 30], [1, 15],
]

function theme(C: Palette, mode: Mode) {
  const micro: CSSProperties = { fontFamily: SANS, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }
  const headline = (size: number): CSSProperties => ({ fontFamily: SERIF, fontSize: size, fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.012em' })
  const deck: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, lineHeight: 1.3, color: C.ink2 }
  const prose: CSSProperties = { fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.42, color: C.ink }
  const caption: CSSProperties = { fontFamily: SERIF, fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.3, color: C.muted }

  function Kicker({ children, color, className = '' }: { children: ReactNode; color?: string; className?: string }) {
    return (
      <div className={className} style={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: color ?? C.spot }}>
        {children}
      </div>
    )
  }

  const Rule = ({ className = '', heavy }: { className?: string; heavy?: boolean }) => <div className={className} style={{ height: heavy ? 2 : 1, background: C.ink }} />
  const Hair = ({ className = '' }: { className?: string }) => <div className={className} style={{ height: 1, background: C.hair }} />
  const DoubleRule = ({ className = '' }: { className?: string }) => (
    <div className={className} style={{ borderTop: `3px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}`, height: 6 }} />
  )

  function TabBar({ active }: { active: number }) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 h-[82px] px-[18px] pt-3" style={{ background: C.paper, borderTop: `1px solid ${C.ink}` }}>
        <div className="flex justify-between">
          {['Front page', 'Sections', 'The Crew', 'Archive'].map((t, i) => (
            <span
              key={t}
              style={{
                fontFamily: SANS,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: i === active ? C.ink : C.muted,
                borderBottom: `2px solid ${i === active ? C.spot : 'transparent'}`,
                paddingBottom: 4,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    )
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone
        mode={mode}
        background={C.paper}
        backdrop={<div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${C.grain} 0.7px, transparent 0.9px)`, backgroundSize: '3px 3px' }} />}
        overlay={<TabBar active={active} />}
        topTint={C.topTint}
      >
        <div className="px-[18px] pb-[100px] pt-[56px]" style={{ color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  /* ───────────────────────── Front page ───────────────────────── */

  function Scale({ value }: { value: number }) {
    const x = (v: number) => 2 + (v / 100) * 96
    return (
      <svg width="100" height="16" className="mt-2 overflow-visible">
        <line x1={2} x2={98} y1={10} y2={10} stroke={C.ink} strokeWidth={0.8} />
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={x(i * 10)} x2={x(i * 10)} y1={i % 5 ? 8 : 6} y2={10} stroke={C.ink} strokeWidth={0.8} />
        ))}
        <motion.path
          d={`M${x(value)},10 l-4,-7 h8 Z`}
          fill={C.spot}
          initial={STATIC ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        />
        <text x={2} y={19} fontSize={7.5} fill={C.muted} fontFamily={SANS}>0</text>
        <text x={98} y={19} fontSize={7.5} fill={C.muted} fontFamily={SANS} textAnchor="end">100</text>
      </svg>
    )
  }

  function Hypnogram() {
    const W = 150
    const total = SLEEP_STAGES.reduce((a, [, m]) => a + m, 0)
    let t = 0
    return (
      <svg width="100%" viewBox={`0 0 ${W} 34`} className="mt-2">
        {['Awake', 'REM', 'Light', 'Deep'].map((s, i) => (
          <line key={s} x1={0} x2={W} y1={i * 9 + 3} y2={i * 9 + 3} stroke={C.hair} strokeWidth={0.5} />
        ))}
        {SLEEP_STAGES.map(([stage, m], i) => {
          const x = (t / total) * W
          t += m
          return <rect key={i} x={x} y={stage * 9} width={(m / total) * W - 0.6} height={6} fill={stage === 1 ? C.spot : C.ink} opacity={stage === 0 ? 0.35 : 1} />
        })}
      </svg>
    )
  }

  function Ruler() {
    const x = (v: number) => 3 + (v / 21) * 144
    return (
      <svg width="100%" viewBox="0 0 150 38" className="mt-2 overflow-visible">
        <path d={`M${x(12)},9 v-4 H${x(15)} v4`} fill="none" stroke={C.spot} strokeWidth={1.4} />
        <motion.rect x={x(0)} y={13} height={6} fill={C.ink} initial={STATIC ? false : { width: 0 }} animate={{ width: x(11.4) - x(0) }} transition={{ duration: 1, delay: 0.3, ease: EASE }} />
        <line x1={x(0)} x2={x(21)} y1={24} y2={24} stroke={C.ink} strokeWidth={0.8} />
        {Array.from({ length: 22 }, (_, i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={24} y2={i % 7 ? 27 : 30} stroke={C.ink} strokeWidth={0.8} />
        ))}
        {[0, 7, 14, 21].map((v) => (
          <text key={v} x={x(v)} y={38} fontSize={7.5} fill={C.muted} fontFamily={SANS} textAnchor="middle">{v}</text>
        ))}
      </svg>
    )
  }

  function Spark({ data }: { data: number[] }) {
    const pts = toPoints(data, 54, 14, { padY: 2 })
    const [lx, ly] = pts[pts.length - 1]
    return (
      <svg width="54" height="14" className="overflow-visible">
        <path d={smoothPath(pts)} fill="none" stroke={C.ink} strokeWidth={1} />
        <circle cx={lx} cy={ly} r={1.8} fill={C.spot} />
      </svg>
    )
  }

  function FrontPage() {
    const vitals = [
      { k: 'HRV, ms', last: '61', chg: '▲ 6', pct: '+10.9', trend: body.hrvTrend },
      { k: 'Resting HR', last: '52', chg: '▼ 2', pct: '−3.7', trend: body.rhrTrend },
      { k: 'Resp. rate', last: '14.2', chg: '▬ 0.0', pct: '0.0', trend: body.respTrend },
      { k: 'Skin temp', last: '+0.1°', chg: '▬ 0.0', pct: '—', trend: body.tempTrend },
      { k: 'Steps', last: '8,240', chg: '▲ 1,120', pct: '+15.7', trend: [6400, 7100, 5200, 9800, 7300, 7120, 8240] },
    ]
    return (
      <Screen active={0}>
        <div className="flex justify-between" style={micro}>
          <span>Vol. III · No. 330</span>
          <span>Thanksgiving Edition</span>
        </div>
        <div className="mt-1 text-center" style={{ fontFamily: MAST, fontSize: 45, lineHeight: 1.08 }}>
          The Daily Body
        </div>
        <DoubleRule className="mt-1" />
        <div className="flex justify-between py-1.5" style={{ ...micro, color: C.ink }}>
          <span>Brooklyn, N.Y.</span>
          <span>Thursday, November 26, 2026</span>
          <span>Final</span>
        </div>
        <Rule />

        <Kicker className="mt-4">Recovery</Kicker>
        <h1 className="mt-1.5" style={headline(31)}>
          Body Rebounds From Tuesday's Intervals, Cleared for a Steady Day
        </h1>
        <p className="mt-2" style={deck}>
          Recovery climbs to 78 percent as heart rate variability reaches a monthly high.
        </p>

        <div className="mt-4 grid grid-cols-[112px_1fr]">
          <div className="pr-3" style={{ borderRight: `1px solid ${C.hair}` }}>
            <div style={{ ...NUMS, fontSize: 88, lineHeight: 0.82, fontWeight: 500, letterSpacing: '-0.04em' }}>
              <CountUp value={body.readiness} />
            </div>
            <div className="mt-2" style={micro}>Percent recovered</div>
            <Scale value={body.readiness} />
          </div>
          <p className="pl-3" style={prose}>
            <span style={{ float: 'left', fontFamily: SERIF, fontSize: 50, lineHeight: 0.8, fontWeight: 600, marginRight: 5, marginTop: 4 }}>J</span>
            erry's heart rate variability rose to 61 milliseconds overnight, six above his 30-day norm, while his resting pulse eased to 52. He
            slept 7 hours 12 minutes. <span style={{ color: C.spot }}>∎</span>
          </p>
        </div>

        <Rule className="mt-4" />
        <div className="grid grid-cols-2">
          <div className="py-3 pr-3" style={{ borderRight: `1px solid ${C.hair}` }}>
            <Kicker color={C.ink}>Sleep</Kicker>
            <div className="mt-1">
              <span style={{ ...NUMS, fontSize: 38, fontWeight: 500, lineHeight: 1 }}>84</span>
              <span style={{ ...caption, fontStyle: 'normal' }}> /100</span>
            </div>
            <Hypnogram />
            <div className="mt-1.5" style={caption}>7 h 12 min; <span style={{ color: C.spot }}>REM</span> in red.</div>
          </div>
          <div className="py-3 pl-3">
            <Kicker color={C.ink}>Strain</Kicker>
            <div className="mt-1">
              <span style={{ ...NUMS, fontSize: 38, fontWeight: 500, lineHeight: 1 }}>11.4</span>
              <span style={{ ...caption, fontStyle: 'normal' }}> /21</span>
            </div>
            <Ruler />
            <div className="mt-0.5" style={caption}>Target <span style={{ color: C.spot }}>12–15</span>. A walk would do it.</div>
          </div>
        </div>
        <Rule />

        <div className="mt-3 flex items-baseline justify-between">
          <Kicker>Vitals</Kicker>
          <span style={micro}>Seven-day</span>
        </div>
        <table className="mt-1.5 w-full" style={{ fontFamily: SANS, fontSize: 12.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.ink}` }}>
              {['', 'Last', 'Chg', '%', ''].map((h, i) => (
                <th key={i} className="pb-1 font-semibold" style={{ ...micro, fontSize: 8.5, textAlign: i === 0 ? 'left' : 'right' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vitals.map((v) => (
              <tr key={v.k} style={{ borderBottom: `1px dotted ${C.hair}` }}>
                <td className="py-[7px]" style={{ fontWeight: 600 }}>{v.k}</td>
                <td className="tnum text-right">{v.last}</td>
                <td className="tnum text-right" style={{ color: C.ink2 }}>{v.chg}</td>
                <td className="tnum text-right" style={{ color: C.muted }}>{v.pct}</td>
                <td className="pl-3 text-right">
                  <Spark data={v.trend} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 p-3" style={{ border: `1px solid ${C.ink}` }}>
          <Kicker color={C.ink}>Tonight</Kicker>
          <div className="mt-1" style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600 }}>Lights out by 10:40 p.m.</div>
          <div style={caption}>To meet a sleep need of 7 h 50 min after this morning's race.</div>
        </div>
      </Screen>
    )
  }

  /* ───────────────────────── The Crew ───────────────────────── */

  type Col = 'strain' | 'recovery' | 'sleep'

  function Sports() {
    const [sort, setSort] = useState<Col>('strain')
    const rows = people.filter((p) => !p.resting).sort((a, b) => b[sort] - a[sort])
    const short = (full: string) => {
      const [first, last] = full.split(' ')
      return `${last}, ${first[0]}.`
    }
    const cols: { key: Col; label: string; fmt: (v: number) => string }[] = [
      { key: 'strain', label: 'Str', fmt: (v) => v.toFixed(1) },
      { key: 'recovery', label: 'Rec', fmt: (v) => String(v) },
      { key: 'sleep', label: 'Slp', fmt: (v) => String(v) },
    ]
    const dispatches = [
      { by: 'Sophia Chen', where: 'Prospect Park', time: sophiaRun.time.replace('AM', 'a.m.'), text: `An easy ${sophiaRun.km} km at ${sophiaRun.pace} per kilometre, "back before the turkey went in."` },
      { by: 'Priya Shah', where: 'Home', time: priyaYoga.time.replace('AM', 'a.m.'), text: 'Thirty minutes of slow-flow yoga. Her sleep score of 90 leads the crew.' },
      { by: 'Alex Rivera', where: 'Gym', time: 'Wednesday', text: `Bench press record of ${alexLift.pr} kilograms across ${alexLift.sets} sets.` },
    ]
    return (
      <Screen active={2}>
        <div className="flex items-end justify-between">
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 42, lineHeight: 0.9, fontWeight: 500 }}>The Crew</div>
          <div className="text-right" style={micro}>
            Section B
            <br />
            Thursday, Nov. 26
          </div>
        </div>
        <DoubleRule className="mt-2" />

        <Kicker className="mt-4">Weekly standings</Kicker>
        <h2 className="mt-1.5" style={headline(27)}>
          Alex Tops Strain Table; Priya Sleeps Best as Sam Sits Out
        </h2>

        <table className="mt-4 w-full" style={{ fontFamily: SANS, fontSize: 12.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderTop: `2px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}` }}>
              <th className="py-1.5 text-left" style={{ ...micro, fontSize: 8.5 }}>Pos</th>
              <th className="py-1.5 text-left" style={{ ...micro, fontSize: 8.5 }}>Member</th>
              {cols.map((c) => (
                <th key={c.key} className="py-1.5 text-right">
                  <button onClick={() => setSort(c.key)} style={{ ...micro, fontSize: 8.5, color: sort === c.key ? C.spot : C.muted }}>
                    {c.label}
                    {sort === c.key ? ' ▾' : ''}
                  </button>
                </th>
              ))}
              <th className="py-1.5 pl-3 text-left" style={{ ...micro, fontSize: 8.5 }}>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <motion.tr layout key={p.id} transition={{ type: 'spring', stiffness: 400, damping: 38 }} style={{ borderBottom: `1px dotted ${C.hair}` }}>
                <td className="py-2 tnum" style={{ color: C.muted }}>{i + 1}</td>
                <td className="py-2" style={{ fontWeight: p.you ? 800 : 600 }}>
                  {short(p.full)}
                  {p.you && <span style={{ color: C.spot }}>*</span>}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="tnum py-2 text-right" style={{ fontWeight: sort === c.key ? 700 : 400, color: sort === c.key ? C.ink : C.ink2 }}>
                    {c.fmt(p[c.key])}
                  </td>
                ))}
                <td className="py-2 pl-3">
                  <div className="flex gap-[2px]">
                    {p.week.map((d, k) => (
                      <span
                        key={k}
                        className="block h-[7px] w-[7px]"
                        style={{ background: d ? (k === TODAY ? C.spot : C.ink) : 'transparent', border: `1px solid ${d ? (k === TODAY ? C.spot : C.ink) : k > TODAY ? C.hair : C.muted}` }}
                      />
                    ))}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2" style={{ ...caption, fontSize: 11.5 }}>
          *Reader. Strain is the weekly total; recovery and sleep are from this morning. Tap a column to re-rank. Today's sessions in red.
        </p>

        <Rule className="mt-4" />
        <Kicker className="mt-3">Dispatches</Kicker>
        {dispatches.map((d, i) => (
          <div key={d.by} className="py-3" style={{ borderTop: i ? `1px solid ${C.hair}` : undefined }}>
            <div style={micro}>
              <span style={{ color: C.ink, fontWeight: 800 }}>{d.by}</span> · {d.where} · {d.time}
            </div>
            <p className="mt-1" style={{ ...prose, fontSize: 15 }}>{d.text}</p>
          </div>
        ))}

        <div className="mt-1 p-3" style={{ border: `3px double ${C.ink}` }}>
          <Kicker>Injury report</Kicker>
          <p className="mt-1" style={{ ...prose, fontSize: 14 }}>
            <strong>Sam Okafor</strong> (illness). Day-to-day. Nudges suspended until further notice.
          </p>
        </div>

        <button className="mt-4 w-full py-2.5" style={{ border: `1px solid ${C.ink}`, fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink }}>
          File a dispatch
        </button>
      </Screen>
    )
  }

  /* ───────────────────────── Race report ───────────────────────── */

  function EngravedMap() {
    const W = 354
    const H = 206
    const pts = scalePoints(run.route, W, H)
    const cx = pts.reduce((a, [x]) => a + x, 0) / pts.length
    const cy = pts.reduce((a, [, y]) => a + y, 0) / pts.length
    const park = smoothClosed(pts.filter((_, i) => i % 2 === 0).map(([x, y]): Pt => [cx + (x - cx) * 1.3, cy + (y - cy) * 1.32]))
    const route = smoothPath(pts)
    const [sx, sy] = pts[0]
    const [fx, fy] = pts[pts.length - 1]
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
        <defs>
          <pattern id={`bs-hatch-${mode}`} width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4.5" stroke={C.ink} strokeWidth="0.6" opacity="0.4" />
          </pattern>
          <pattern id={`bs-water-${mode}`} width="6" height="3" patternUnits="userSpaceOnUse">
            <line x1="0" y1="1.5" x2="6" y2="1.5" stroke={C.ink} strokeWidth="0.5" opacity="0.55" />
          </pattern>
        </defs>
        {Array.from({ length: 9 }, (_, k) => (
          <line key={`h${k}`} x1={-10} x2={W + 10} y1={k * 26 - 10} y2={k * 26 + 14} stroke={C.hair} strokeWidth={0.7} />
        ))}
        {Array.from({ length: 10 }, (_, k) => (
          <line key={`v${k}`} x1={k * 40 - 6} x2={k * 40 + 10} y1={-10} y2={H + 10} stroke={C.hair} strokeWidth={0.7} />
        ))}
        <path d={park} fill={C.paper} />
        <path d={park} fill={`url(#bs-hatch-${mode})`} stroke={C.ink} strokeWidth={0.8} />
        <ellipse cx={W * 0.56} cy={H * 0.6} rx={W * 0.12} ry={H * 0.08} fill={C.paper} stroke={C.ink} strokeWidth={0.6} transform={`rotate(-12 ${W * 0.56} ${H * 0.6})`} />
        <ellipse cx={W * 0.56} cy={H * 0.6} rx={W * 0.12} ry={H * 0.08} fill={`url(#bs-water-${mode})`} transform={`rotate(-12 ${W * 0.56} ${H * 0.6})`} />
        <path d={route} fill="none" stroke={C.paper} strokeWidth={6} />
        <DrawPath d={route} stroke={C.ink} width={2} duration={2} />
        {Array.from({ length: 10 }, (_, k) => {
          const [x, y] = pointAt(pts, (k + 1) / 10.2)
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={6.5} fill={C.paper} stroke={C.ink} strokeWidth={0.8} />
              <text x={x} y={y + 2.6} fontSize={7.5} fontWeight={700} fontFamily={SANS} textAnchor="middle" fill={k === 9 ? C.spot : C.ink}>
                {k + 1}
              </text>
            </g>
          )
        })}
        <circle cx={sx} cy={sy} r={4} fill={C.paper} stroke={C.ink} strokeWidth={1.5} />
        <path d={`M${fx},${fy - 6} l6,6 l-6,6 l-6,-6 Z`} fill={C.spot} />
        <text x={W * 0.5} y={H * 0.38} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={13} letterSpacing={3} fill={C.ink}>
          PROSPECT PARK
        </text>
        <text x={W * 0.56} y={H * 0.6 + 4} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={10} fill={C.ink}>
          The Lake
        </text>
      </svg>
    )
  }

  function HrFigure() {
    const W = 354
    const H = 110
    const lo = 100
    const hi = 190
    const y = (b: number) => (1 - (b - lo) / (hi - lo)) * H
    const pts = toPoints(run.hr, W - 28, H, { min: lo, max: hi })
    const maxI = run.hr.indexOf(run.maxHr)
    const [mx, my] = pts[maxI]
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} className="mt-2 overflow-visible">
        {[
          { z: 'Z5', a: 171, b: 190 },
          { z: 'Z4', a: 156, b: 171 },
          { z: 'Z3', a: 140, b: 156 },
        ].map((band, i) => (
          <g key={band.z}>
            <rect x={0} y={y(band.b)} width={W - 28} height={y(band.a) - y(band.b)} fill={i % 2 ? 'transparent' : C.tint} />
            <text x={W - 22} y={(y(band.a) + y(band.b)) / 2 + 3} fontSize={8.5} fontFamily={SANS} fontWeight={700} fill={C.muted}>{band.z}</text>
          </g>
        ))}
        <DrawPath d={smoothPath(pts)} stroke={C.ink} width={1.25} duration={1.8} />
        <circle cx={pts[0][0]} cy={pts[0][1]} r={2.2} fill={C.ink} />
        <text x={pts[0][0] + 5} y={pts[0][1] + 3} fontFamily={SERIF} fontStyle="italic" fontSize={11} fill={C.ink2}>112 at the gun</text>
        <circle cx={mx} cy={my} r={3} fill={C.spot} />
        <text x={mx - 6} y={my - 6} textAnchor="end" fontFamily={SERIF} fontStyle="italic" fontSize={11} fill={C.spot}>178, final kilometre</text>
        <line x1={0} x2={W - 28} y1={H} y2={H} stroke={C.ink} strokeWidth={0.8} />
        {['0 min', '25', '50'].map((t, i) => (
          <text key={t} x={(i / 2) * (W - 28)} y={H + 13} fontSize={8.5} fontFamily={SANS} fill={C.muted} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>
            {t}
          </text>
        ))}
      </svg>
    )
  }

  function RaceReport() {
    const fastest = Math.min(...run.splits)
    return (
      <Screen active={1}>
        <div className="flex justify-between" style={micro}>
          <span>Section C · Running</span>
          <span>Thursday, Nov. 26</span>
        </div>
        <Rule heavy className="mt-1.5" />

        <Kicker className="mt-4">Race report · Prospect Park</Kicker>
        <h1 className="mt-1.5" style={headline(32)}>
          Liu Runs 49:45, a Personal Best, in Turkey Trot 10K
        </h1>
        <p className="mt-2" style={deck}>
          A cold Thanksgiving start gave way to negative splits; the final kilometre was the fastest of the morning.
        </p>
        <div className="mt-2.5" style={micro}>
          By <span style={{ color: C.ink, fontWeight: 800 }}>The Daily Body staff</span> · Filed 8:51 a.m.
        </div>
        <Hair className="mt-3" />

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div style={micro}>Finish, 10K</div>
            <div style={{ ...NUMS, fontSize: 76, lineHeight: 0.9, fontWeight: 500, letterSpacing: '-0.03em' }}>{run.pr.time}</div>
          </div>
          <div className="pb-1 text-right">
            <div style={{ ...NUMS, fontSize: 28, fontWeight: 600, color: C.spot, lineHeight: 1 }}>{run.pr.delta}</div>
            <div style={caption}>vs. best of Oct. 4</div>
          </div>
        </div>
        <div className="mt-1.5" style={caption}>
          {run.km} km in {run.duration} · {run.pace} per km · avg. {run.avgHr} bpm
        </div>

        <div className="mt-3" style={{ borderTop: `1px solid ${C.ink}`, borderBottom: `1px solid ${C.ink}` }}>
          <EngravedMap />
        </div>
        <div className="mt-1.5" style={caption}>
          <span style={{ fontStyle: 'normal', fontFamily: SANS, fontWeight: 700, fontSize: 9.5, letterSpacing: '0.12em' }}>FIG. 1 </span>
          The course: one loop of Prospect Park, 53 m of climbing. Kilometre 10 in red.
        </div>

        <div className="mt-4 grid grid-cols-2" style={{ borderTop: `1px solid ${C.ink}` }}>
          <div className="pr-3 pt-3" style={{ borderRight: `1px solid ${C.hair}` }}>
            <Kicker color={C.ink}>Splits</Kicker>
            <div className="mt-1.5">
              {run.splits.map((s, i) => {
                const best = s === fastest
                return (
                  <div key={i} className="flex items-baseline gap-1 py-[2.5px]" style={{ fontFamily: SANS, fontSize: 12.5, color: best ? C.spot : C.ink, fontWeight: best ? 700 : 500 }}>
                    <span>Km {i + 1}</span>
                    <span className="flex-1" style={{ borderBottom: `1px dotted ${best ? C.spot : C.hair}`, transform: 'translateY(-3px)' }} />
                    <span className="tnum">{fmtPace(s)}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="pl-3 pt-3">
            <div style={{ fontFamily: SERIF, fontSize: 54, lineHeight: 0.5, color: C.spot, height: 22 }}>“</div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.15 }}>The last kilometre was the fastest of the morning.</p>
            <div className="mt-4 space-y-1.5">
              {[
                ['Avg. HR', '162'],
                ['Max. HR', '178'],
                ['Elevation', '53 m'],
                ['Energy', '712 kcal'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between" style={{ borderBottom: `1px dotted ${C.hair}`, paddingBottom: 3 }}>
                  <span style={{ ...micro, fontSize: 8.5 }}>{k}</span>
                  <span style={{ ...NUMS, fontSize: 15, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Rule className="mt-4" />
        <Kicker className="mt-3" color={C.ink}>Heart rate, beats per minute</Kicker>
        <HrFigure />
      </Screen>
    )
  }

  return { FrontPage, Sports, RaceReport }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Paper', hex: C.paper },
  { name: 'Ink', hex: C.ink },
  { name: 'Ink 2', hex: C.ink2 },
  { name: 'Muted', hex: C.muted },
  { name: 'Spot', hex: C.spot },
  { name: 'Rule', hex: C.ink },
]

export const broadsheet: Direction = {
  id: 'broadsheet',
  name: 'Broadsheet',
  round: 2,
  tagline: 'Your body, reported. A daily newspaper about you: headlines, standings, and a race report.',
  inspiredBy: ['The New York Times print', 'Financial Times data desk', 'Edward Tufte', 'Monocle', 'Sports-page box scores'],
  dna: [
    { label: 'Atmosphere', text: 'Newsprint by day, "night edition" ink-black by night, with a faint paper grain. No cards, no rounded corners: just columns and rules.' },
    { label: 'Color', text: 'Ink plus one spot red, used the way a newspaper uses it: today\'s sessions, REM sleep, the target bracket, the fastest kilometre.' },
    { label: 'Type', text: 'A blackletter masthead, Newsreader for headlines and big lining numerals, Inter Tight for tracked kickers and tables.' },
    { label: 'Hero', text: 'A headline that tells you what the number means ("Body Rebounds… Cleared for a Steady Day"), with the 78 set like a front-page figure.' },
    { label: 'Data', text: 'Tufte-style: vitals as a stock table with sparklines, a hypnogram, a ruler for strain, an engraved course map with km markers.' },
    { label: 'Social', text: 'The crew as the sports section: a sortable league table with form guides, short dispatches with bylines, and an injury report.' },
  ],
  fromTandem: 'Tandem\'s habit of explaining numbers in sentences becomes the whole format: every metric arrives as a headline plus a deck, and the hero number is still the first thing you see.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Newsreader + UnifrakturMaguntia', displayFamily: SERIF, text: 'Inter Tight', textFamily: SANS, sample: '49:45', displayStyle: { fontWeight: 500 } },
  screens: [
    { title: 'Front page', caption: 'Recovery as the lead story; vitals as a market table', render: (m) => createElement(T[m].FrontPage) },
    { title: 'The Crew', caption: 'Sports-page standings; tap Str / Rec / Slp to re-rank', render: (m) => createElement(T[m].Sports) },
    { title: 'Race report', caption: 'The Turkey Trot as an article with an engraved map', render: (m) => createElement(T[m].RaceReport) },
  ],
}

import { motion } from 'motion/react'
import {
  ArrowUpRight,
  Bell,
  ChartColumn,
  ChevronLeft,
  Ellipsis,
  House,
  MessageCircle,
  Play,
  Search,
  Share2,
  ThumbsUp,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { createElement, useState, type CSSProperties, type ReactNode } from 'react'
import { alexLift, fmtPace, run, sophiaRun } from '../data'
import { CountUp, DrawPath, EASE, Phone, STATIC, scalePoints, smoothPath, type Direction, type Mode, type Pt } from '../kit'

const DARK = {
  bg: '#000000',
  s1: '#0F0F10',
  s2: '#1B1B1D',
  line: '#262628',
  ink: '#FFFFFF',
  muted: '#A1A1A1',
  faint: '#5E5E60',
  volt: '#D6FF38',
  /** Volt is unreadable as text on white, so highlights switch to ink-on-volt in light mode. */
  hiText: '#D6FF38',
  hiBg: 'transparent',
  heat: '#FF5B1F',
  tabBg: 'rgba(0,0,0,0.92)',
  topTint: 'rgba(0,0,0,0.85)',
  avatar: 'linear-gradient(150deg, #3A3A3D, #1A1A1C)',
  mapBg: '#0C0C0D',
  mapMinor: '#141415',
  mapPark: '#0D1710',
  mapLake: '#0A1520',
  mapMajor: '#1A1A1C',
  mapCross: '#18181A',
  route: '#D6FF38',
  routeGlow: '#D6FF38',
  chip: 'rgba(0,0,0,0.55)',
}
type Palette = typeof DARK

const LIGHT: Palette = {
  bg: '#FFFFFF',
  s1: '#F4F4F1',
  s2: '#E8E8E4',
  line: '#E1E1DC',
  ink: '#0A0A0A',
  muted: '#6B6B68',
  faint: '#A8A8A3',
  volt: '#D6FF38',
  hiText: '#0A0A0A',
  hiBg: '#D6FF38',
  heat: '#FF4F12',
  tabBg: 'rgba(255,255,255,0.94)',
  topTint: 'rgba(255,255,255,0.85)',
  avatar: 'linear-gradient(150deg, #EDEDEA, #CFCFCA)',
  mapBg: '#ECECE8',
  mapMinor: '#E2E2DD',
  mapPark: '#DCE7D3',
  mapLake: '#CCDDEA',
  mapMajor: '#FFFFFF',
  mapCross: '#F7F7F4',
  route: '#0A0A0A',
  routeGlow: '#C8F500',
  chip: 'rgba(255,255,255,0.75)',
}

const ZONES = ['#3D87F4', '#48C77E', '#FFD600', '#FA7A00', '#E50916']
const DISP = 'var(--f-shoulders)'
const TXT = 'var(--f-inter)'

const disp = (size: number, weight = 800): CSSProperties => ({
  fontFamily: DISP,
  fontSize: size,
  fontWeight: weight,
  lineHeight: 0.88,
  textTransform: 'uppercase',
  letterSpacing: '0.005em',
})

function theme(C: Palette, mode: Mode) {
  function Lbl({ children, color, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
    return (
      <div style={{ fontFamily: TXT, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: color ?? C.muted, ...style }}>
        {children}
      </div>
    )
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: House, label: 'Home' },
      { icon: ChartColumn, label: 'Activity' },
      { icon: Play, label: 'Record' },
      { icon: Users, label: 'Clubs' },
      { icon: User, label: 'You' },
    ]
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[88px] items-start justify-around px-3 pt-2.5" style={{ background: C.tabBg, borderTop: `1px solid ${C.line}`, backdropFilter: 'blur(16px)' }}>
        {items.map(({ icon: Icon, label }, i) =>
          i === 2 ? (
            <div key={label} className="-mt-1 grid h-[52px] w-[52px] place-items-center rounded-full" style={{ background: C.volt, boxShadow: `0 0 24px ${C.volt}59` }}>
              <div className="h-4 w-4 rounded-full bg-black" />
            </div>
          ) : (
            <div key={label} className="flex w-14 flex-col items-center gap-1" style={{ color: i === active ? C.ink : C.faint }}>
              <Icon size={22} strokeWidth={i === active ? 2.4 : 2} />
              <span style={{ fontFamily: TXT, fontSize: 10, fontWeight: 600 }}>{label}</span>
            </div>
          ),
        )}
      </div>
    )
  }

  function Screen({ active, bare, children }: { active: number; bare?: boolean; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} overlay={<TabBar active={active} />} topTint={bare ? undefined : C.topTint}>
        <div className={bare ? 'pb-[110px]' : 'px-5 pb-[110px] pt-[60px]'} style={{ fontFamily: TXT, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  function MapArt({ w, h, route, markers, id }: { w: number; h: number; route: Pt[]; markers?: boolean; id: string }) {
    const pts = scalePoints(route, w, h)
    const d = smoothPath(pts)
    const majors = Array.from({ length: 7 }, (_, k) => {
      const y = h * (k * 0.19 - 0.06)
      return `M-20,${y} L${w + 20},${y - h * 0.14}`
    })
    const cross = Array.from({ length: 8 }, (_, k) => {
      const x = w * (k * 0.16 - 0.04)
      return `M${x},-20 L${x + w * 0.07},${h + 20}`
    })
    const minors = Array.from({ length: 14 }, (_, k) => {
      const y = h * (k * 0.09)
      return `M-20,${y} L${w + 20},${y - h * 0.14}`
    })
    const [sx, sy] = pts[0]
    const [fx, fy] = pts[pts.length - 1]
    const gid = `${id}-${mode}-glow`
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
        <defs>
          <filter id={gid} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <rect width={w} height={h} fill={C.mapBg} />
        {minors.map((p, i) => (
          <path key={`m${i}`} d={p} stroke={C.mapMinor} strokeWidth={1.5} />
        ))}
        <ellipse cx={w * 0.49} cy={h * 0.52} rx={w * 0.4} ry={h * 0.37} fill={C.mapPark} />
        <ellipse cx={w * 0.55} cy={h * 0.6} rx={w * 0.13} ry={h * 0.075} fill={C.mapLake} transform={`rotate(-12 ${w * 0.55} ${h * 0.6})`} />
        {majors.map((p, i) => (
          <path key={`a${i}`} d={p} stroke={C.mapMajor} strokeWidth={5} />
        ))}
        {cross.map((p, i) => (
          <path key={`c${i}`} d={p} stroke={C.mapCross} strokeWidth={3} />
        ))}
        <path d={d} fill="none" stroke={C.routeGlow} strokeWidth={mode === 'light' ? 9 : 10} opacity={mode === 'light' ? 0.9 : 0.35} filter={mode === 'light' ? undefined : `url(#${gid})`} strokeLinecap="round" />
        <DrawPath d={d} stroke={C.route} width={mode === 'light' ? 2.6 : 3.5} duration={2} />
        {markers &&
          [3, 6, 9, 12].map((idx, i) => (
            <g key={idx}>
              <circle cx={pts[idx][0]} cy={pts[idx][1]} r={9} fill={C.ink} stroke={C.bg} strokeWidth={1.5} />
              <text x={pts[idx][0]} y={pts[idx][1] + 3.5} textAnchor="middle" fill={C.bg} fontSize={10} fontWeight={800} fontFamily={DISP}>
                {(i + 1) * 2}
              </text>
            </g>
          ))}
        <circle cx={sx} cy={sy} r={6} fill={C.bg} stroke={C.ink} strokeWidth={2.5} />
        <circle cx={fx} cy={fy} r={6} fill={C.volt} stroke="#000" strokeWidth={2.5} />
      </svg>
    )
  }

  function Avatar({ initial, size = 40, ring }: { initial: string; size?: number; ring?: string }) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: C.avatar,
          color: C.ink,
          boxShadow: ring ? `0 0 0 2.5px ${C.bg}, 0 0 0 5px ${ring}` : undefined,
          ...disp(size * 0.45, 800),
          lineHeight: 1,
        }}
      >
        {initial}
      </div>
    )
  }

  /* ───────────────────────── Today ───────────────────────── */

  function Today() {
    const week = [8.4, 0, 13.8, 10.2, 0, 0, 0]
    return (
      <Screen active={0}>
        <div className="flex items-center justify-between">
          <Lbl>Thu · Nov 26 · Thanksgiving</Lbl>
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.ink, color: C.bg, ...disp(18, 900) }}>J</div>
        </div>
        <h1 className="mt-3" style={disp(88, 900)}>
          Race
          <br />
          day<span style={{ color: mode === 'dark' ? C.volt : C.heat }}>.</span>
        </h1>

        <motion.div
          className="relative mt-6 overflow-hidden rounded-[10px] p-5"
          style={{ background: C.volt, color: '#000' }}
          initial={STATIC ? false : { y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        >
          <div className="pointer-events-none absolute -bottom-10 -right-3 select-none" style={{ ...disp(210, 900), color: 'rgba(0,0,0,0.07)' }}>
            10K
          </div>
          <div className="relative flex items-center justify-between">
            <Lbl color="#000">New personal record</Lbl>
            <Trophy size={18} strokeWidth={2.4} />
          </div>
          <div className="relative mt-3 tnum" style={disp(108, 900)}>{run.pr.time}</div>
          <div className="relative mt-2" style={disp(22, 800)}>
            10K · {run.pr.delta} vs {run.pr.prev}
          </div>
          <div className="relative mt-5 flex items-center justify-between pt-3" style={{ borderTop: '1.5px solid rgba(0,0,0,0.15)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em' }}>TURKEY TROT 10K · PROSPECT PARK</span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-black">
              <ArrowUpRight size={17} color={C.volt} strokeWidth={2.6} />
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex items-baseline justify-between">
          <Lbl>This week</Lbl>
          <Lbl>Goal 40 km</Lbl>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span style={disp(76, 900)}>
              <CountUp value={32.4} decimals={1} />
            </span>
            <span style={{ ...disp(26, 800), color: C.muted }}>km</span>
          </div>
          <div className="flex h-[64px] items-end gap-[6px] pb-1">
            {week.map((km, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <motion.div
                  className="w-[14px] rounded-[3px]"
                  style={{
                    background: i === 3 ? C.volt : km ? C.ink : 'transparent',
                    border: km ? 'none' : `1.5px solid ${i < 3 ? C.s2 : C.line}`,
                    boxShadow: i === 3 && mode === 'light' ? 'inset 0 0 0 1.5px #000' : undefined,
                  }}
                  initial={STATIC ? false : { height: 4 }}
                  animate={{ height: km ? 8 + (km / 14) * 36 : 6 }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: EASE }}
                />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: i === 3 ? C.ink : C.faint }}>{'MTWTFSS'[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 h-[6px] overflow-hidden rounded-full" style={{ background: C.s2 }}>
          <motion.div className="h-full rounded-full" style={{ background: mode === 'dark' ? C.volt : C.ink }} initial={STATIC ? false : { width: 0 }} animate={{ width: '81%' }} transition={{ duration: 1.2, delay: 0.2, ease: EASE }} />
        </div>
        <div className="mt-2" style={{ fontSize: 12.5, color: C.muted }}>
          7.6 km to go. One more easy run gets you there.
        </div>

        <div className="mt-7 rounded-[10px] p-5" style={{ background: C.s1, border: `1px solid ${C.line}` }}>
          <div className="flex justify-between">
            <Lbl color={mode === 'dark' ? C.volt : C.ink}>Up next · Saturday</Lbl>
            <Lbl>Week 6 of 12</Lbl>
          </div>
          <div className="mt-3" style={disp(38, 900)}>Recovery 5K</div>
          <div className="mt-1.5" style={{ fontSize: 13, color: C.muted }}>Easy · 6:00–6:20 /km · about 31 min</div>
          <div className="mt-4 flex h-[30px] items-end gap-[3px]">
            {Array.from({ length: 26 }, (_, i) => {
              const easy = i >= 4 && i <= 21
              return <div key={i} className="flex-1 rounded-[2px]" style={{ height: easy ? 22 : 12, background: easy ? ZONES[1] : C.s2 }} />
            })}
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5" style={{ background: C.ink, color: C.bg, ...disp(21, 900) }}>
            <Play size={15} fill={C.bg} /> Start
          </button>
        </div>

        <div className="mt-7 flex items-baseline justify-between">
          <Lbl>Personal records</Lbl>
          <Lbl>All</Lbl>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { k: '5K', v: '23:41', d: 'Sep 12' },
            { k: '10K', v: '49:45', d: 'Today', fresh: true },
            { k: 'Half', v: '1:52:10', d: 'Apr 27' },
          ].map((r) => (
            <div key={r.k} className="relative rounded-[10px] p-3" style={{ background: r.fresh ? C.hiBg : C.s1, border: `1.5px solid ${r.fresh ? (mode === 'dark' ? C.volt : '#000') : C.line}` }}>
              {r.fresh && (
                <span className="absolute -top-2 right-2 rounded-[4px] px-1.5 py-0.5" style={{ background: C.heat, color: '#fff', ...disp(11, 900), lineHeight: 1 }}>
                  New
                </span>
              )}
              <Lbl color={r.fresh && mode === 'light' ? '#000' : undefined}>{r.k}</Lbl>
              <div className="mt-2 tnum" style={{ ...disp(28, 900), color: r.fresh ? C.hiText : C.ink }}>{r.v}</div>
              <div className="mt-1" style={{ fontSize: 11, color: r.fresh && mode === 'light' ? '#000' : C.faint }}>{r.d}</div>
            </div>
          ))}
        </div>
      </Screen>
    )
  }

  /* ───────────────────────── Feed ───────────────────────── */

  function Stat({ k, v, u }: { k: string; v: string; u?: string }) {
    return (
      <div>
        <Lbl style={{ fontSize: 9.5 }}>{k}</Lbl>
        <div className="mt-1 tnum" style={disp(28, 800)}>
          {v}
          {u && <span style={{ ...disp(14, 700), color: C.muted, marginLeft: 3 }}>{u}</span>}
        </div>
      </div>
    )
  }

  function Kudos({ base, comments, by }: { base: number; comments: number; by: string }) {
    const [on, setOn] = useState(false)
    return (
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ fontSize: 12.5, color: C.muted }}>
          <div className="flex -space-x-1.5">
            {['J', 'A', 'M'].map((c) => (
              <Avatar key={c} initial={c} size={20} />
            ))}
          </div>
          <span>
            {on ? 'You, ' : ''}
            {by} and <span className="tnum">{base + (on ? 1 : 0) - 2}</span> others
          </span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setOn((v) => !v)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: on ? C.volt : C.s2, color: on ? '#000' : C.ink, fontSize: 13, fontWeight: 700, transition: 'background .2s, color .2s' }}
          >
            <ThumbsUp size={15} fill={on ? '#000' : 'none'} strokeWidth={2.2} />
            <span className="tnum">{base + (on ? 1 : 0)}</span>
          </motion.button>
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: C.s2, fontSize: 13, fontWeight: 700 }}>
            <MessageCircle size={15} /> {comments}
          </div>
        </div>
      </div>
    )
  }

  function Feed() {
    const stories = [
      { n: 'Sophia', i: 'S', on: true },
      { n: 'Priya', i: 'P', on: true },
      { n: 'Maya', i: 'M', on: true },
      { n: 'Alex', i: 'A', on: false },
      { n: 'Dev', i: 'D', on: false },
    ]
    return (
      <Screen active={1}>
        <div className="flex items-center justify-between">
          <h1 style={disp(46, 900)}>Activity</h1>
          <div className="flex gap-2">
            {[Search, Bell].map((I, k) => (
              <div key={k} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: C.s2 }}>
                <I size={17} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {['Following', 'Clubs', 'You'].map((t, i) => (
            <span key={t} className="rounded-full px-3.5 py-1.5" style={{ background: i === 0 ? C.ink : C.s2, color: i === 0 ? C.bg : C.ink, fontSize: 13, fontWeight: 700 }}>
              {t}
            </span>
          ))}
        </div>

        <div className="no-scrollbar -mx-5 mt-5 flex gap-4 overflow-x-auto px-5 pt-1">
          {stories.map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-2">
              <Avatar initial={s.i} size={56} ring={s.on ? (mode === 'dark' ? C.volt : C.heat) : C.line} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: s.on ? C.ink : C.faint }}>{s.n}</span>
            </div>
          ))}
        </div>

        <div className="-mx-5 mt-6 border-t px-5 pt-5" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-3">
            <Avatar initial="S" />
            <div className="flex-1">
              <div style={{ fontSize: 15, fontWeight: 700 }}>Sophia Chen</div>
              <div style={{ fontSize: 12, color: C.muted }}>Today at {sophiaRun.time} · Prospect Park</div>
            </div>
            <Ellipsis size={18} color={C.muted} />
          </div>
          <div className="mt-3" style={disp(28, 900)}>{sophiaRun.title}</div>
          <div className="mt-3 grid grid-cols-3">
            <Stat k="Distance" v={sophiaRun.km.toFixed(1)} u="km" />
            <Stat k="Pace" v={sophiaRun.pace} u="/km" />
            <Stat k="Time" v={sophiaRun.duration} />
          </div>
          <div className="mt-4 overflow-hidden rounded-[8px]">
            <MapArt w={350} h={176} route={sophiaRun.route} id="st-feed" />
          </div>
          <Kudos base={sophiaRun.kudos} comments={sophiaRun.comments} by="Alex" />
        </div>

        <div className="-mx-5 mt-6 border-t px-5 pt-5" style={{ borderColor: C.line }}>
          <div className="flex items-center gap-3">
            <Avatar initial="A" />
            <div className="flex-1">
              <div style={{ fontSize: 15, fontWeight: 700 }}>Alex Rivera</div>
              <div style={{ fontSize: 12, color: C.muted }}>{alexLift.when} · Strength</div>
            </div>
            <Ellipsis size={18} color={C.muted} />
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span style={disp(28, 900)}>{alexLift.title}</span>
            <span className="rounded-[4px] px-2 py-1" style={{ background: C.heat, color: '#fff', ...disp(13, 900), lineHeight: 1 }}>
              PR · Bench {alexLift.pr} kg
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3">
            <Stat k="Volume" v={alexLift.volume} u="kg" />
            <Stat k="Sets" v={String(alexLift.sets)} />
            <Stat k="Time" v={alexLift.duration} />
          </div>
          <div className="mt-4 flex h-[64px] items-end gap-1 rounded-[8px] px-3 pb-3 pt-2" style={{ background: C.s1 }}>
            {[60, 70, 80, 85, 90, 95, 80, 80, 70, 70].map((kg, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                {kg === 95 && <span style={{ ...disp(11, 900), color: C.heat, lineHeight: 1 }}>95</span>}
                <div className="w-full rounded-[2px]" style={{ height: ((kg - 50) / 45) * 34 + 4, background: kg === 95 ? C.heat : C.s2 }} />
              </div>
            ))}
          </div>
          <Kudos base={22} comments={6} by="Sophia" />
        </div>

        <div className="mt-7 rounded-[10px] p-4" style={{ background: C.s1, border: `1px solid ${C.line}` }}>
          <div className="flex items-baseline justify-between">
            <span style={disp(22, 900)}>Brooklyn Trotters</span>
            <Lbl>This week · km</Lbl>
          </div>
          <div className="mt-3">
            {[
              { r: 5, n: 'Dana K.', km: 36.1 },
              { r: 6, n: 'You', km: 32.4, you: true },
              { r: 7, n: 'Marco P.', km: 30.9 },
              { r: 8, n: 'Lee W.', km: 28.7 },
            ].map((p) => (
              <div
                key={p.r}
                className="-mx-2 flex items-center gap-3 rounded-[6px] px-2 py-2"
                style={{ borderTop: p.r > 5 && !p.you ? `1px solid ${C.line}` : undefined, background: p.you ? C.hiBg : undefined }}
              >
                <span className="w-5" style={{ ...disp(18, 900), color: p.you ? C.hiText : C.faint }}>{p.r}</span>
                <span className="flex-1" style={{ fontSize: 14, fontWeight: p.you ? 800 : 500, color: p.you ? C.hiText : C.ink }}>
                  {p.n}
                  {p.you && <span style={{ fontSize: 11, color: mode === 'dark' ? C.muted : '#000', fontWeight: 600, marginLeft: 8 }}>▲ 3 since Monday</span>}
                </span>
                <span className="tnum" style={{ ...disp(20, 800), color: p.you ? C.hiText : C.ink }}>{p.km.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </Screen>
    )
  }

  /* ───────────────────────── Activity poster ───────────────────────── */

  function Poster() {
    const fastest = Math.min(...run.splits)
    const slowest = Math.max(...run.splits)
    return (
      <Screen active={1} bare>
        <div className="relative">
          <MapArt w={390} h={380} route={run.route} markers id="st-poster" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[180px]" style={{ background: `linear-gradient(transparent, ${C.bg} 85%)` }} />
          <div className="absolute inset-x-5 top-[58px] flex justify-between">
            {[ChevronLeft, Share2].map((I, k) => (
              <div key={k} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: C.chip, backdropFilter: 'blur(10px)', border: `1px solid ${C.line}`, color: C.ink }}>
                <I size={18} />
              </div>
            ))}
          </div>
        </div>

        <div className="relative -mt-[96px] px-5">
          <div className="flex items-center gap-2.5">
            <span style={disp(22, 900)}>{run.title}</span>
            <span className="rounded-[4px] px-1.5 py-1" style={{ background: C.heat, color: '#fff', ...disp(12, 900), lineHeight: 1 }}>
              New PR
            </span>
          </div>
          <div className="mt-1" style={{ fontSize: 12.5, color: C.muted }}>Thursday, Nov 26 · {run.time} · Prospect Park</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span style={{ ...disp(132, 900), lineHeight: 0.82 }}>
              <CountUp value={run.km} decimals={2} duration={1.6} />
            </span>
            <span style={{ ...disp(34, 800), color: C.muted }}>km</span>
          </div>

          <div className="mt-6 grid grid-cols-2" style={{ borderTop: `1px solid ${C.line}` }}>
            {[
              ['Time', run.duration, ''],
              ['Avg pace', run.pace, '/km'],
              ['Avg heart rate', String(run.avgHr), 'bpm'],
              ['Elevation', String(run.elev), 'm'],
            ].map(([k, v, u], i) => (
              <div key={k} className="py-4" style={{ borderBottom: `1px solid ${C.line}`, borderLeft: i % 2 ? `1px solid ${C.line}` : undefined, paddingLeft: i % 2 ? 16 : 0 }}>
                <Lbl>{k}</Lbl>
                <div className="mt-1.5 tnum" style={disp(40, 900)}>
                  {v}
                  <span style={{ ...disp(16, 700), color: C.muted, marginLeft: 4 }}>{u}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <Lbl>Splits</Lbl>
            <Lbl>Fastest {fmtPace(fastest)}</Lbl>
          </div>
          <div className="mt-3 space-y-[5px]">
            {run.splits.map((s, i) => {
              const best = s === fastest
              const w = 42 + ((slowest - s) / (slowest - fastest)) * 58
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-4 text-right" style={{ ...disp(15, 800), color: C.faint }}>{i + 1}</span>
                  <div className="h-[18px] flex-1">
                    <motion.div
                      className="h-full rounded-[3px]"
                      style={{ background: best ? C.volt : C.s2, boxShadow: best && mode === 'light' ? 'inset 0 0 0 1.5px #000' : undefined }}
                      initial={STATIC ? false : { width: 0 }}
                      animate={{ width: `${w}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.04, ease: EASE }}
                    />
                  </div>
                  <span className="w-10 text-right tnum" style={{ ...disp(18, 800), color: best && mode === 'dark' ? C.volt : C.ink }}>{fmtPace(s)}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-6">
            <Lbl>Heart rate zones</Lbl>
            <div className="mt-3 flex h-3 gap-[3px] overflow-hidden rounded-full">
              {run.zones.map((z, i) => (
                <div key={z.z} style={{ width: `${z.pct}%`, background: ZONES[i] }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between" style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>
              {run.zones.map((z, i) => (
                <span key={z.z} style={{ color: i >= 2 && i <= 3 ? C.ink : C.muted }}>
                  {z.z} {z.pct}%
                </span>
              ))}
            </div>
          </div>

          <button className="mt-7 flex w-full items-center justify-center gap-2 rounded-full py-4" style={{ background: C.ink, color: C.bg, ...disp(21, 900) }}>
            <Share2 size={17} strokeWidth={2.6} /> Share poster
          </button>
        </div>
      </Screen>
    )
  }

  return { Today, Feed, Poster }
}

const T = { dark: theme(DARK, 'dark'), light: theme(LIGHT, 'light') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Tile', hex: C.s2 },
  { name: 'Volt', hex: C.volt },
  { name: 'Heat', hex: C.heat },
  { name: 'Zone 2', hex: ZONES[1] },
  { name: 'Zone 4', hex: ZONES[3] },
]

export const stadium: Direction = {
  id: 'stadium',
  name: 'Stadium',
  round: 1,
  tagline: 'Every run is a headline: high contrast, volt highlights, and numbers you can read from across the room.',
  inspiredBy: ['Nike Run Club', 'Strava', 'Runna', 'adidas Running', 'Ladder'],
  dna: [
    { label: 'Atmosphere', text: 'Pure black or pure white, no gradients or glass. Contrast does the work, like a scoreboard or a race bib.' },
    { label: 'Color', text: 'One loud accent: volt for you and progress (ink-on-volt in light mode), heat orange only for PRs. Five zone colors for heart rate.' },
    { label: 'Type', text: 'Big Shoulders Display, heavy, uppercase and condensed (a stand-in for Nike\'s Trade Gothic). Hero numbers at 100+ px.' },
    { label: 'Hero', text: 'The result itself: "49:45", "10.20 KM". The map is the image, with a highlighted route over a street grid.' },
    { label: 'Surfaces', text: 'Flat tiles with hairline borders and tight 8–10px corners. Feels athletic, not soft.' },
    { label: 'Social', text: 'Strava-style feed: map, 3-up stats, kudos. Club leaderboards show the people just above and below you.' },
  ],
  fromTandem: 'Tandem\'s rule that the hero number leads and labels stay quiet, pushed to the extreme: muted 10px labels under 100px numerals, with tabular figures so splits line up.',
  palette: { dark: swatches(DARK), light: swatches(LIGHT) },
  type: { display: 'Big Shoulders Display', displayFamily: DISP, text: 'Inter', textFamily: TXT, sample: '49:45', displayStyle: { fontWeight: 900 } },
  screens: [
    { title: 'Today', caption: 'PR moment, weekly volume, next workout', render: (m) => createElement(T[m].Today) },
    { title: 'Feed', caption: 'Map-first posts; tap kudos', render: (m) => createElement(T[m].Feed) },
    { title: 'Activity poster', caption: 'Shareable run summary with route and splits', render: (m) => createElement(T[m].Poster) },
  ],
}

import { animate, motion } from 'motion/react'
import {
  Camera,
  Check,
  ChevronDown,
  Flame,
  Footprints,
  Hand,
  Heart,
  House,
  Moon,
  PartyPopper,
  Plus,
  Snowflake,
  Trophy,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { createElement, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { challenge, crewWeek, people, person, sophiaRun, TODAY, weekDays, type PersonId } from '../data'
import { EASE, Phone, STATIC, pointAt, smoothPath, type Direction, type Mode, type Pt } from '../kit'

const LIGHT = {
  bg: '#FFF6EA',
  ink: '#2A2017',
  muted: '#8A7967',
  card: '#FFFFFF',
  line: '#F1E2CC',
  edge: '#E9D4B5',
  empty: '#F5E9D8',
  future: '#FBF3E8',
  tabOff: '#C2B29E',
  topTint: 'rgba(255,246,234,0.85)',
  field: '#FFF0DA',
  road: '#FFFDF8',
  decor1: '#FFE0B2',
  decor2: '#BFEDE2',
  ring: '#FFFFFF',
  softA: '',
}
type Palette = typeof LIGHT

const DARK: Palette = {
  bg: '#1A1411',
  ink: '#FFF3E4',
  muted: '#B29E8A',
  card: '#251D17',
  line: '#3A2E24',
  edge: '#0E0A08',
  empty: '#33281F',
  future: '#2A211A',
  tabOff: '#6F5F50',
  topTint: 'rgba(26,20,17,0.85)',
  field: '#2C2219',
  road: '#463729',
  decor1: '#4A3520',
  decor2: '#1F4740',
  ring: '#251D17',
  softA: '2E',
}

const COLORS: Record<PersonId, { c: string; e: string; soft: string }> = {
  jerry: { c: '#FF6B4A', e: '#D9472A', soft: '#FFE3DA' },
  sophia: { c: '#17BFA0', e: '#0E9479', soft: '#D3F4EC' },
  alex: { c: '#8C6CFF', e: '#6A4AE0', soft: '#E7E0FF' },
  priya: { c: '#FFB82E', e: '#E0951A', soft: '#FFF0CC' },
  sam: { c: '#3FA9FF', e: '#1F86DB', soft: '#DDF0FF' },
}
const DISP = 'var(--f-bricolage)'
const TXT = 'var(--f-nunito)'

const disp = (size: number, weight = 800): CSSProperties => ({ fontFamily: DISP, fontSize: size, fontWeight: weight, letterSpacing: '-0.02em', lineHeight: 1 })

const TRACK: Pt[] = Array.from({ length: 61 }, (_, i) => {
  const t = i / 60
  return [34 + t * 286, 214 - t * 150 + Math.sin(t * Math.PI * 2) * 38]
})

function theme(C: Palette, mode: Mode) {
  /** Person colors stay fixed; only their soft tint adapts to the mode. */
  const P = Object.fromEntries(
    Object.entries(COLORS).map(([id, v]) => [id, { ...v, soft: C.softA ? `${v.c}${C.softA}` : v.soft }]),
  ) as Record<PersonId, { c: string; e: string; soft: string }>

  function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
      <div className={`rounded-[26px] ${className}`} style={{ background: C.card, border: `2px solid ${C.line}`, boxShadow: `0 4px 0 ${mode === 'dark' ? C.edge : C.line}`, ...style }}>
        {children}
      </div>
    )
  }

  function Chunky({ color, edge, children, className = '', style, onClick }: { color: string; edge: string; children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void }) {
    return (
      <motion.button
        onClick={onClick}
        whileTap={{ y: 3, boxShadow: `0 1px 0 ${edge}` }}
        transition={{ type: 'spring', stiffness: 800, damping: 30 }}
        className={`flex items-center justify-center gap-2 rounded-[18px] ${className}`}
        style={{ background: color, boxShadow: `0 4px 0 ${edge}`, color: '#fff', ...disp(17), ...style }}
      >
        {children}
      </motion.button>
    )
  }

  function Face({ id, size = 34, border = 3 }: { id: PersonId; size?: number; border?: number }) {
    const p = P[id]
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full"
        style={{ width: size, height: size, background: p.c, border: `${border}px solid ${C.ring}`, boxShadow: `0 2px 0 ${p.e}`, color: '#fff', ...disp(size * 0.42) }}
      >
        {person(id).name[0]}
      </div>
    )
  }

  function Lbl({ children }: { children: ReactNode }) {
    return <div style={{ fontFamily: TXT, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>{children}</div>
  }

  function TabBar({ active }: { active: number }) {
    const items: { icon: LucideIcon; label: string }[] = [
      { icon: House, label: 'Crew' },
      { icon: Camera, label: 'Moments' },
      { icon: Plus, label: '' },
      { icon: Trophy, label: 'Challenges' },
      { icon: User, label: 'Me' },
    ]
    return (
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-[90px] items-start justify-around px-2 pt-2.5" style={{ background: C.card, borderTop: `2px solid ${C.line}` }}>
        {items.map(({ icon: Icon, label }, i) =>
          label ? (
            <div key={i} className="flex w-[68px] flex-col items-center gap-1" style={{ color: i === active ? P.jerry.c : C.tabOff }}>
              <Icon size={23} strokeWidth={2.4} />
              <span style={{ fontFamily: TXT, fontSize: 11, fontWeight: 800 }}>{label}</span>
            </div>
          ) : (
            <div key={i} className="-mt-5 grid h-[56px] w-[56px] place-items-center rounded-[20px]" style={{ background: P.jerry.c, boxShadow: `0 5px 0 ${P.jerry.e}` }}>
              <Icon size={28} strokeWidth={3} color="#fff" />
            </div>
          ),
        )}
      </div>
    )
  }

  function Screen({ active, children }: { active: number; children: ReactNode }) {
    return (
      <Phone mode={mode} background={C.bg} overlay={<TabBar active={active} />} topTint={C.topTint}>
        <div className="px-[18px] pb-[116px] pt-[60px]" style={{ fontFamily: TXT, color: C.ink }}>
          {children}
        </div>
      </Phone>
    )
  }

  /* ───────────────────────── Crew home ───────────────────────── */

  function Home() {
    const order: PersonId[] = ['jerry', 'sophia', 'alex', 'priya']
    const segments: (PersonId | null)[] = order.flatMap((id) => Array<PersonId>(person(id).week.reduce((a, b) => a + b, 0)).fill(id))
    while (segments.length < crewWeek.goal) segments.push(null)

    return (
      <Screen active={0}>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={disp(32)}>Hey Jerry!</h1>
            <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>Happy Thanksgiving. Any move counts today.</p>
          </div>
          <Face id="jerry" size={42} />
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5" style={{ background: C.card, border: `2px solid ${C.line}`, boxShadow: `0 3px 0 ${mode === 'dark' ? C.edge : C.line}` }}>
          <div className="flex -space-x-2">
            {(['sophia', 'alex', 'priya', 'sam'] as PersonId[]).map((id) => (
              <Face key={id} id={id} size={26} border={2} />
            ))}
          </div>
          <span style={disp(15)}>Turkey Trotters</span>
          <ChevronDown size={16} strokeWidth={3} color={C.muted} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { icon: Flame, color: P.jerry, n: crewWeek.streakWeeks, label: 'week streak', fill: true },
            { icon: Snowflake, color: P.sam, n: crewWeek.freezes, label: 'freezes left', fill: false },
          ].map(({ icon: Icon, color, n, label, fill }) => (
            <Card key={label} className="flex items-center gap-3 p-3.5">
              <div className="grid h-11 w-11 place-items-center rounded-[14px]" style={{ background: color.soft }}>
                <Icon size={22} strokeWidth={2.6} color={color.c} fill={fill ? color.c : 'none'} />
              </div>
              <div>
                <div style={disp(26)}>{n}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>{label}</div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-3 p-5">
          <Lbl>This week, together</Lbl>
          <div className="mt-2 flex items-baseline gap-2">
            <span style={disp(64)}>{crewWeek.done}</span>
            <span style={{ ...disp(20, 700), color: C.muted }}>of {crewWeek.goal} workouts</span>
          </div>
          <div className="mt-4 flex gap-[4px]">
            {segments.map((id, i) => (
              <motion.div
                key={i}
                className="h-[24px] flex-1 rounded-[7px]"
                style={{ background: id ? P[id].c : C.empty, boxShadow: id ? `inset 0 -4px 0 ${P[id].e}` : 'none' }}
                initial={STATIC ? false : { scale: 0.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.15 + i * 0.045 }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>
            <Flame size={15} color={P.jerry.c} fill={P.jerry.c} />5 more by Sunday keeps the streak alive
          </div>
        </Card>

        <Card className="mt-3 px-3.5 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="w-[30px]" />
            <div className="flex flex-1 justify-between">
              {weekDays.map((d, i) => (
                <span
                  key={i}
                  className="grid h-[22px] w-[28px] place-items-center rounded-full"
                  style={{ fontSize: 12, fontWeight: 900, color: i === TODAY ? C.bg : C.tabOff, background: i === TODAY ? C.ink : 'transparent' }}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="w-[34px]" />
          </div>
          {people.map((p) => (
            <div key={p.id} className="mt-2.5 flex items-center gap-2.5">
              <Face id={p.id} size={30} border={2} />
              <div className="flex flex-1 justify-between">
                {p.week.map((done, i) => {
                  const future = i > TODAY
                  const restDay = p.resting && i > 0 && i <= TODAY
                  return (
                    <motion.div
                      key={i}
                      className="grid h-[28px] w-[28px] place-items-center rounded-[9px]"
                      style={{
                        background: done ? P[p.id].c : restDay ? P.sam.soft : future ? C.future : C.empty,
                        boxShadow: done ? `inset 0 -3px 0 ${P[p.id].e}` : 'none',
                        border: i === TODAY && !done && !restDay ? `2px dashed ${C.edge}` : undefined,
                      }}
                      initial={STATIC || !done ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.3 + i * 0.05 }}
                    >
                      {done ? <Check size={16} strokeWidth={4} color="#fff" /> : restDay ? <Moon size={13} strokeWidth={2.6} color={P.sam.c} /> : null}
                    </motion.div>
                  )
                })}
              </div>
              <span className="w-[34px] text-right" style={{ ...disp(15), color: p.resting ? P.sam.c : C.ink }}>
                {p.resting ? 'rest' : `${p.week.reduce((a, b) => a + b, 0)}/${p.target}`}
              </span>
            </div>
          ))}
        </Card>

        <Chunky color={P.jerry.c} edge={P.jerry.e} className="mt-5 h-[56px] w-full">
          <Plus size={20} strokeWidth={3.4} /> Log a workout
        </Chunky>
      </Screen>
    )
  }

  /* ───────────────────────── Moments ───────────────────────── */

  function Reaction({ icon: Icon, color, base }: { icon: LucideIcon; color: { c: string; e: string; soft: string }; base: number }) {
    const [count, setCount] = useState(base)
    const on = count > base
    const rest = mode === 'dark' ? C.edge : C.line
    return (
      <motion.button
        whileTap={{ y: 2, boxShadow: `0 1px 0 ${on ? color.e : rest}` }}
        onClick={() => setCount((c) => c + 1)}
        className="flex items-center gap-1.5 rounded-[14px] px-3 py-2"
        style={{ background: on ? color.soft : C.card, border: `2px solid ${on ? color.c : C.line}`, boxShadow: `0 3px 0 ${on ? color.e : rest}` }}
      >
        <Icon size={18} strokeWidth={2.6} color={color.c} />
        <motion.span key={count} initial={STATIC ? false : { scale: 1.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }} style={{ ...disp(15), color: C.ink }}>
          {count}
        </motion.span>
      </motion.button>
    )
  }

  function ParkScene() {
    return (
      <svg viewBox="0 0 334 290" width="100%" className="block">
        <defs>
          <linearGradient id={`cc-sky-${mode}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FFCFA0" />
            <stop offset="1" stopColor="#FFF2DF" />
          </linearGradient>
        </defs>
        <rect width="334" height="290" fill={`url(#cc-sky-${mode})`} />
        <circle cx="252" cy="86" r="54" fill="#FFB82E" opacity="0.2" />
        <circle cx="252" cy="86" r="36" fill="#FFB82E" />
        <g fill="#fff" opacity="0.92">
          <ellipse cx="150" cy="58" rx="30" ry="11" />
          <ellipse cx="166" cy="50" rx="18" ry="12" />
        </g>
        <path d="M0 176 C 60 140, 120 150, 170 168 S 270 140, 334 160 L334 290 L0 290 Z" fill="#8FE0CB" />
        <path d="M0 214 C 70 190, 140 202, 200 210 S 300 190, 334 200 L334 290 L0 290 Z" fill="#17BFA0" />
        <path d="M166 290 C 176 262, 228 250, 214 228 S 172 206, 186 190" stroke="#FFF2DF" strokeWidth="16" fill="none" strokeLinecap="round" />
        {[
          [36, 188, 18],
          [74, 200, 13],
          [286, 182, 16],
          [314, 194, 11],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <rect x={x - 2.5} y={y} width="5" height={r + 8} rx="2" fill="#0E7A64" />
            <circle cx={x} cy={y} r={r} fill="#0E9479" />
          </g>
        ))}
      </svg>
    )
  }

  function GymScene() {
    const star = (x: number, y: number, s: number) => `M${x},${y - s} Q${x},${y} ${x + s},${y} Q${x},${y} ${x},${y + s} Q${x},${y} ${x - s},${y} Q${x},${y} ${x},${y - s} Z`
    return (
      <svg viewBox="0 0 334 260" width="100%" className="block">
        <defs>
          <pattern id={`cc-stripes-${mode}`} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="22" height="22" fill="#8C6CFF" />
            <rect width="11" height="22" fill="#9779FF" />
          </pattern>
        </defs>
        <rect width="334" height="260" fill={`url(#cc-stripes-${mode})`} />
        <rect x="30" y="160" width="274" height="10" rx="5" fill="#2A2017" />
        {[62, 250].map((x) => (
          <g key={x}>
            <rect x={x} y="110" width="24" height="110" rx="7" fill="#2A2017" />
            <rect x={x === 62 ? 88 : 230} y="126" width="16" height="78" rx="5" fill="#FFB82E" />
          </g>
        ))}
        <g transform="rotate(-8 167 70)">
          <rect x="92" y="38" width="150" height="72" rx="18" fill="#E0951A" />
          <rect x="92" y="32" width="150" height="72" rx="18" fill="#FFB82E" />
          <text x="167" y="56" textAnchor="middle" fontFamily={DISP} fontWeight="800" fontSize="13" letterSpacing="1.5" fill="#2A2017">
            NEW PR
          </text>
          <text x="167" y="92" textAnchor="middle" fontFamily={DISP} fontWeight="800" fontSize="34" fill="#2A2017">
            95 KG
          </text>
        </g>
        <path d={star(50, 50, 10)} fill="#fff" />
        <path d={star(290, 40, 13)} fill="#fff" />
        <path d={star(280, 104, 7)} fill="#FFE3DA" />
      </svg>
    )
  }

  function Moment({ who, time, caption, scene, sticker, selfie, reactions }: { who: PersonId; time: string; caption: string; scene: ReactNode; sticker?: ReactNode; selfie?: boolean; reactions: [number, number, number] }) {
    return (
      <Card className="mt-4 p-2.5">
        <div className="flex items-center gap-2.5 px-1.5 pb-2.5 pt-1">
          <Face id={who} size={34} />
          <span style={disp(16)}>{person(who).name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{time}</span>
        </div>
        <div className="relative overflow-hidden rounded-[20px]">
          {scene}
          {selfie && (
            <div className="absolute left-3 top-3 grid h-[100px] w-[80px] place-items-center overflow-hidden rounded-[16px]" style={{ background: P[who].c, border: '3px solid #fff', boxShadow: '0 6px 14px -6px rgba(0,0,0,0.3)' }}>
              <svg width="54" height="54" viewBox="0 0 54 54">
                <path d="M8 22 C 10 6, 44 6, 46 22 Z" fill={P.jerry.c} />
                <rect x="6" y="20" width="42" height="7" rx="3.5" fill="#fff" />
                <circle cx="19" cy="34" r="3.2" fill="#fff" />
                <circle cx="35" cy="34" r="3.2" fill="#fff" />
                <path d="M18 42 Q 27 50 36 42" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          )}
          {sticker}
        </div>
        <div className="px-1.5 pt-3" style={{ fontSize: 15.5, fontWeight: 700 }}>{caption}</div>
        <div className="flex gap-2 px-1.5 pb-1.5 pt-3">
          <Reaction icon={PartyPopper} color={P.priya} base={reactions[0]} />
          <Reaction icon={Flame} color={P.jerry} base={reactions[1]} />
          <Reaction icon={Heart} color={P.alex} base={reactions[2]} />
        </div>
      </Card>
    )
  }

  function Moments() {
    return (
      <Screen active={1}>
        <div className="flex items-center justify-between">
          <h1 style={disp(34)}>Moments</h1>
          <span className="rounded-full px-3 py-1.5" style={{ background: P.priya.soft, color: mode === 'dark' ? P.priya.c : '#9A6408', ...disp(14) }}>
            3 new today
          </span>
        </div>

        <Moment
          who="sophia"
          time={sophiaRun.time}
          caption="pre-turkey miles, legs feel amazing"
          selfie
          scene={<ParkScene />}
          sticker={
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5" style={{ ...disp(14), color: '#2A2017' }}>
              <Footprints size={15} strokeWidth={2.6} color={P.sophia.c} /> {sophiaRun.km} km · 32 min
            </div>
          }
          reactions={[12, 8, 5]}
        />

        <Card className="mt-4 flex items-center gap-3 p-3.5" style={{ background: P.priya.soft, borderColor: `${P.priya.c}55`, boxShadow: `0 4px 0 ${P.priya.c}55` }}>
          <Face id="priya" size={42} />
          <div className="flex-1">
            <div style={disp(16)}>Priya did yoga at 8:40</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: mode === 'dark' ? C.muted : '#9A7A3C' }}>30-minute slow flow</div>
          </div>
          <Chunky color={P.priya.c} edge={P.priya.e} className="h-[42px] px-3.5" style={{ fontSize: 15 }}>
            <Hand size={17} strokeWidth={2.8} /> High five
          </Chunky>
        </Card>

        <Moment who="alex" time="Yesterday" caption="FINALLY. 95 on the bar" scene={<GymScene />} reactions={[19, 14, 6]} />
      </Screen>
    )
  }

  /* ───────────────────────── Challenge ───────────────────────── */

  function Racer({ id, frac, delay }: { id: PersonId; frac: number; delay: number }) {
    const [t, setT] = useState(STATIC ? frac : 0)
    useEffect(() => {
      if (STATIC) return
      const c = animate(0, frac, { duration: 1.8, delay, ease: EASE, onUpdate: setT })
      return () => c.stop()
    }, [frac, delay])
    const [x, y] = pointAt(TRACK, t)
    return (
      <div className="absolute" style={{ left: x - 19, top: y - 44, zIndex: Math.round(frac * 100) }}>
        <Face id={id} size={38} />
        <div className="mx-auto h-2 w-[3px] rounded-full" style={{ background: P[id].e }} />
      </div>
    )
  }

  function Challenge() {
    const ranked = people.filter((p) => !p.resting).sort((a, b) => b.km - a.km)
    const road = smoothPath(TRACK)
    const [ex, ey] = TRACK[TRACK.length - 1]
    const [sx, sy] = TRACK[0]
    const medal = [P.priya, { c: '#B9AFA3', e: '#968B7E' }, P.jerry, { c: mode === 'dark' ? '#5A4A3C' : '#E3D3BE', e: mode === 'dark' ? '#3E3228' : '#CDB99E' }]
    const sophia = person('sophia')
    const me = person('jerry')
    return (
      <Screen active={3}>
        <span className="inline-block rounded-full px-3 py-1" style={{ background: P.alex.soft, color: mode === 'dark' ? P.alex.c : P.alex.e, ...disp(13) }}>
          CREW CHALLENGE
        </span>
        <h1 className="mt-2.5" style={disp(36)}>{challenge.name}</h1>
        <p className="mt-1.5" style={{ fontSize: 15, fontWeight: 700, color: C.muted }}>
          First to {challenge.goalKm} km · {challenge.daysLeft} days left
        </p>

        <Card className="relative mt-4 overflow-hidden" style={{ background: C.field }}>
          <svg width="350" height="250" viewBox="0 0 350 250" className="block">
            {[
              [40, 120, 16],
              [100, 70, 11],
              [270, 200, 15],
              [210, 236, 10],
              [320, 130, 9],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? C.decor2 : C.decor1} />
            ))}
            <path d={road} transform="translate(0 4)" fill="none" stroke={C.edge} strokeWidth={30} strokeLinecap="round" />
            <path d={road} fill="none" stroke={C.road} strokeWidth={30} strokeLinecap="round" />
            <path d={road} fill="none" stroke={C.line} strokeWidth={2.5} strokeDasharray="7 9" strokeLinecap="round" />
            <g transform={`translate(${sx - 6} ${sy + 10})`}>
              <rect width="40" height="16" rx="5" fill={C.ink} />
              <text x="20" y="11.5" textAnchor="middle" fill={C.bg} fontFamily={TXT} fontWeight={900} fontSize="9">START</text>
            </g>
            <g transform={`translate(${ex - 2} ${ey - 46})`}>
              <rect x="0" y="0" width="3" height="40" rx="1.5" fill={C.ink} />
              {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={3 + c * 7} y={r * 7} width="7" height="7" fill={(c + r) % 2 ? '#fff' : '#2A2017'} />))}
            </g>
          </svg>
          {ranked.map((p, i) => (
            <Racer key={p.id} id={p.id} frac={p.km / challenge.goalKm} delay={0.15 + i * 0.12} />
          ))}
        </Card>

        <Card className="mt-3 px-4 py-2">
          {ranked.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `2px solid ${C.empty}` : undefined }}>
              <div className="grid h-7 w-7 place-items-center rounded-full" style={{ background: medal[i].c, boxShadow: `0 2px 0 ${medal[i].e}`, color: '#fff', ...disp(14) }}>
                {i + 1}
              </div>
              <Face id={p.id} size={32} border={2} />
              <div className="flex-1">
                <div style={disp(16)}>
                  {p.name}
                  {p.you && <span style={{ fontFamily: TXT, fontSize: 12, fontWeight: 800, color: C.muted, marginLeft: 6 }}>you</span>}
                </div>
                <div className="mt-1.5 h-2 rounded-full" style={{ background: C.empty }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: P[p.id].c }}
                    initial={STATIC ? false : { width: 0 }}
                    animate={{ width: `${(p.km / challenge.goalKm) * 100}%` }}
                    transition={{ duration: 1, delay: 0.3 + i * 0.08, ease: EASE }}
                  />
                </div>
              </div>
              <span className="w-[62px] text-right" style={disp(18)}>
                {p.km.toFixed(1)}
                <span style={{ fontSize: 12, color: C.muted }}> km</span>
              </span>
            </div>
          ))}
        </Card>

        <Card className="mt-3 flex items-center gap-3.5 p-4" style={{ background: P.jerry.soft, borderColor: `${P.jerry.c}44`, boxShadow: `0 4px 0 ${P.jerry.c}44` }}>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px]" style={{ background: P.jerry.c, boxShadow: `0 3px 0 ${P.jerry.e}` }}>
            <UtensilsCrossed size={22} strokeWidth={2.6} color="#fff" />
          </div>
          <div>
            <div style={disp(17)}>{challenge.stakes}</div>
            <div className="mt-1" style={{ fontSize: 13.5, fontWeight: 700, color: mode === 'dark' ? P.jerry.c : '#A2533F' }}>Priya needs 17.8 km to pass Alex</div>
          </div>
        </Card>

        <Card className="mt-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Face id="jerry" size={38} />
              <span style={{ ...disp(15), color: C.muted }}>vs</span>
              <Face id="sophia" size={38} />
            </div>
            <div className="text-right">
              <div style={disp(22)}>{(sophia.km - me.km).toFixed(1)} km</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muted }}>behind Sophia</div>
            </div>
          </div>
          <Chunky color={P.sophia.c} edge={P.sophia.e} className="mt-4 h-[50px] w-full">
            Plan a catch-up run together
          </Chunky>
        </Card>
      </Screen>
    )
  }

  return { Home, Moments, Challenge }
}

const T = { light: theme(LIGHT, 'light'), dark: theme(DARK, 'dark') }

const swatches = (C: Palette) => [
  { name: 'Canvas', hex: C.bg },
  { name: 'Jerry', hex: COLORS.jerry.c },
  { name: 'Sophia', hex: COLORS.sophia.c },
  { name: 'Alex', hex: COLORS.alex.c },
  { name: 'Priya', hex: COLORS.priya.c },
  { name: 'Sam', hex: COLORS.sam.c },
]

export const crewClub: Direction = {
  id: 'crew-club',
  name: 'Crew Club',
  round: 1,
  tagline: 'Fitness as a group chat with a scoreboard: warm, loud, and a little bit silly.',
  inspiredBy: ['Duolingo', 'Partiful', 'Locket', 'BeReal', 'Apple Activity sharing'],
  dna: [
    { label: 'Atmosphere', text: 'Warm cream (or cocoa at night), chunky cards with a 2px border and a solid bottom edge. Feels tactile, like stickers.' },
    { label: 'Color', text: 'Color is identity: every friend owns a hue (Jerry tomato, Sophia teal, Alex grape, Priya sun, Sam sky) everywhere they appear.' },
    { label: 'Type', text: 'Bricolage Grotesque for headlines and numbers (quirky, Partiful-ish); Nunito for rounded, friendly body copy.' },
    { label: 'Hero', text: 'The group, not you: "11 of 16 workouts" as a bar built from everyone\'s colored blocks. Streaks and freezes up top.' },
    { label: 'Surfaces', text: 'Duolingo-style 3D buttons that press down, springy pop-ins, reactions that bounce when tapped.' },
    { label: 'Social', text: 'Photo moments, high fives, a race-track challenge with real stakes: last place cooks Sunday dinner.' },
  ],
  fromTandem: 'Tandem\'s categorical chart palette (--chart-1..8) becomes the identity system: one consistent color per person, so every chart reads as a crew at a glance.',
  palette: { light: swatches(LIGHT), dark: swatches(DARK) },
  type: { display: 'Bricolage Grotesque', displayFamily: DISP, text: 'Nunito', textFamily: TXT, sample: '11/16', displayStyle: { fontWeight: 800, letterSpacing: '-0.03em' } },
  screens: [
    { title: 'Crew home', caption: 'Shared weekly goal, streak, everyone\'s week', render: (m) => createElement(T[m].Home) },
    { title: 'Moments', caption: 'Photo check-ins; tap the reactions', render: (m) => createElement(T[m].Moments) },
    { title: 'Challenge', caption: 'November Miles race track with stakes', render: (m) => createElement(T[m].Challenge) },
  ],
}

import { motion } from 'motion/react'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { baseline } from './directions/baseline'
import { bloom } from './directions/bloom'
import { crewClub } from './directions/crew'
import { halo } from './directions/halo'
import { nightLab } from './directions/nightlab'
import { softSignal } from './directions/soft'
import { stadium } from './directions/stadium'
import { EASE, STATIC, type Direction, type Mode } from './kit'

const DIRECTIONS: Direction[] = [nightLab, softSignal, stadium, crewClub, halo, bloom, baseline]

const ROUNDS: { round: Direction['round']; label: string }[] = [
  { round: 1, label: 'Round 1 · first directions' },
  { round: 2, label: 'Round 2 · Night Lab & Soft Signal permutations' },
]

const params = () => new URLSearchParams(window.location.search)

function initialId() {
  const d = params().get('d')
  return DIRECTIONS.some((x) => x.id === d) ? d! : DIRECTIONS[0].id
}

function initialMode(): Mode {
  return params().get('m') === 'light' ? 'light' : 'dark'
}

export function App() {
  const [id, setId] = useState(initialId)
  const [mode, setMode] = useState<Mode>(initialMode)
  const d = DIRECTIONS.find((x) => x.id === id)!
  const dark = mode === 'dark'
  const bg = dark ? '#0D0D0F' : '#EEE9E1'
  const ink = dark ? '#F3F3F1' : '#1C1814'
  const muted = dark ? 'rgba(243,243,241,0.58)' : 'rgba(28,24,20,0.58)'
  const line = dark ? 'rgba(255,255,255,0.09)' : 'rgba(28,24,20,0.1)'
  const card = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.5)'
  const eyebrow = { fontSize: 11.5, fontWeight: 650, letterSpacing: '0.12em', textTransform: 'uppercase', color: muted } as const

  useEffect(() => {
    const p = params()
    p.set('d', id)
    p.set('m', mode)
    window.history.replaceState(null, '', `?${p.toString()}`)
  }, [id, mode])

  return (
    <div className="min-h-screen" style={{ background: bg, color: ink, transition: 'background .5s, color .5s' }}>
      <header className="mx-auto max-w-[1380px] px-10 pt-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: muted }}>Tandem studio · Health &amp; social fitness</div>
            <h1 className="mt-2" style={{ fontSize: 34, fontWeight: 650, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Seven visual directions for a modern fitness app
            </h1>
          </div>
          <div className="flex shrink-0 rounded-full p-1" style={{ border: `1px solid ${line}` }}>
            {(
              [
                ['light', Sun, 'Light'],
                ['dark', Moon, 'Dark'],
              ] as const
            ).map(([m, Icon, label]) => {
              const on = mode === m
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5"
                  style={{ fontSize: 13.5, fontWeight: 600, color: on ? bg : ink, transition: 'color .25s' }}
                >
                  {on && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-full" style={{ background: ink }} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <Icon size={15} strokeWidth={2.2} className="relative" />
                  <span className="relative">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <p className="mt-2.5 max-w-[860px]" style={{ fontSize: 15, lineHeight: '23px', color: muted }}>
          Same method as Tandem: pull the visual DNA (canvas, color logic, type, hero element, motion) out of best-in-class references, then design every screen around
          one hero number. Round 2 takes the two favourites further, each with a fresh set of references: Halo puts Night Lab's precision on a 24-hour clock, Bloom
          opens Soft Signal's orb into petals you can tap, and Baseline sits between them, showing every number against your own normal. Every direction shows the
          same day, Thanksgiving with Jerry's Turkey Trot 10K PR, in light and dark.
        </p>

        <nav className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
          {ROUNDS.map(({ round, label }) => (
            <div key={round}>
              <div className="mb-2" style={{ ...eyebrow, fontSize: 10.5 }}>{label}</div>
              <div className="flex flex-wrap gap-2">
                {DIRECTIONS.filter((x) => x.round === round).map((x) => {
                  const on = x.id === id
                  return (
                    <button
                      key={x.id}
                      onClick={() => setId(x.id)}
                      className="flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4"
                      style={{
                        background: on ? ink : 'transparent',
                        color: on ? bg : ink,
                        border: `1px solid ${on ? ink : line}`,
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'background .25s, color .25s',
                      }}
                    >
                      <span className="flex -space-x-1">
                        {x.palette[mode].slice(1, 4).map((p) => (
                          <span key={p.name} className="h-4 w-4 rounded-full" style={{ background: p.hex, boxShadow: `0 0 0 1.5px ${on ? ink : bg}` }} />
                        ))}
                      </span>
                      {x.name}
                      {round === 2 && (
                        <span
                          className="rounded-full px-1.5 py-[1px]"
                          style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: on ? bg : ink, color: on ? ink : bg }}
                        >
                          New
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </header>

      <motion.section
        key={d.id}
        initial={STATIC ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mx-auto mt-9 grid max-w-[1380px] grid-cols-1 gap-10 px-10 lg:grid-cols-[1.25fr_1fr]"
      >
        <div>
          {d.lineage && <div style={{ ...eyebrow, marginBottom: 8 }}>Permutation of {d.lineage}</div>}
          <h2 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{d.name}</h2>
          <p className="mt-3 max-w-[620px]" style={{ fontSize: 18, lineHeight: '27px' }}>{d.tagline}</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span style={{ fontSize: 12.5, color: muted, marginRight: 4 }}>Inspired by</span>
            {d.inspiredBy.map((s) => (
              <span key={s} className="rounded-full px-2.5 py-1" style={{ border: `1px solid ${line}`, fontSize: 12.5, fontWeight: 550 }}>
                {s}
              </span>
            ))}
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {d.dna.map((row) => (
              <div key={row.label} className="py-3" style={{ borderTop: `1px solid ${line}` }}>
                <dt style={eyebrow}>{row.label}</dt>
                <dd className="mt-1" style={{ fontSize: 14, lineHeight: '21px' }}>{row.text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[22px] p-5" style={{ border: `1px solid ${line}`, background: card }}>
            <div style={eyebrow}>Palette · {mode}</div>
            <div className="mt-3 grid grid-cols-6 gap-2">
              {d.palette[mode].map((p) => (
                <div key={p.name}>
                  <div className="h-14 rounded-[12px]" style={{ background: p.hex, boxShadow: `inset 0 0 0 1px ${line}`, transition: 'background .4s' }} />
                  <div className="mt-1.5" style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: muted, fontFamily: 'ui-monospace, monospace' }}>{p.hex}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 rounded-[22px] p-5" style={{ border: `1px solid ${line}`, background: card }}>
            <div style={{ fontFamily: d.type.displayFamily, fontSize: 72, lineHeight: 1, ...d.type.displayStyle }}>{d.type.sample}</div>
            <div className="min-w-0" style={{ fontSize: 13.5, lineHeight: '20px' }}>
              <div>
                <span style={{ color: muted }}>Display </span>
                <span style={{ fontFamily: d.type.displayFamily, fontSize: 17, ...d.type.displayStyle }}>{d.type.display}</span>
              </div>
              <div className="mt-1">
                <span style={{ color: muted }}>Text </span>
                <span style={{ fontFamily: d.type.textFamily, fontSize: 15, fontWeight: 600 }}>{d.type.text}</span>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] p-5" style={{ border: `1px dashed ${line}` }}>
            <div style={eyebrow}>Carried over from Tandem</div>
            <p className="mt-1.5" style={{ fontSize: 14, lineHeight: '21px' }}>{d.fromTandem}</p>
          </div>
        </div>
      </motion.section>

      <section key={`phones-${d.id}-${mode}`} className="mx-auto flex max-w-[1380px] flex-wrap justify-center gap-x-10 gap-y-14 px-10 pb-24 pt-14">
        {d.screens.map((s, i) => (
          <motion.figure
            key={s.title}
            initial={STATIC ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 * i, ease: EASE }}
            className="m-0 flex flex-col items-center"
          >
            {s.render(mode)}
            <figcaption className="mt-5 text-center">
              <div style={{ fontSize: 15, fontWeight: 650 }}>{s.title}</div>
              <div className="mt-0.5" style={{ fontSize: 13, color: muted }}>{s.caption}</div>
            </figcaption>
          </motion.figure>
        ))}
      </section>
    </div>
  )
}

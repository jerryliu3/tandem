import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { GoalResult, MonteCarloResult } from '../../engine/goal'
import type { PersonId, Plan, Scope } from '../../model/types'
import { usePlanStore } from '../../store/planStore'
import { commitWhatIf, goalPeople, useBaseGoal, useGoal, useMonteCarlo, usePlan } from '../../store/selectors'
import { isWhatIfActive, useUiStore } from '../../store/uiStore'
import { Card } from '../components/Card'
import { AXIS_PROPS, ChartTooltip, GRID_PROPS } from '../components/charts'
import { Badge, ProgressBar } from '../components/feedback'
import { Button, EditableNumber, Field, MoneyField, NumberField, Segmented, SelectMenu, SliderField, Switch } from '../components/inputs'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { cn } from '../cn'
import { formatPct, useMoney } from '../format'
import { GoalRing } from '../viz/GoalRing'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'household', label: 'Together' },
  { value: 'jerry', label: 'Jerry' },
  { value: 'sophia', label: 'Sophia' },
]

function useDeflate(plan: Plan, real: boolean) {
  const infl = plan.assumptions.inflationPct / 100
  return (value: number, year: number) => (real ? value / (1 + infl) ** (year - plan.settings.planYear) : value)
}

function DollarsToggle({ real, onChange }: { real: boolean; onChange: (v: boolean) => void }) {
  return (
    <Segmented
      size="sm"
      value={real ? 'real' : 'nominal'}
      onChange={(v) => onChange(v === 'real')}
      options={[
        { value: 'real', label: 'Today’s $' },
        { value: 'nominal', label: 'Future $' },
      ]}
    />
  )
}

function HeroStat({ label, children, sub }: { label: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-1 text-xl font-semibold">{children}</div>
      {sub && <div className="mt-0.5 truncate text-[11px] text-faint">{sub}</div>}
    </div>
  )
}

function GoalHero({ plan, goal, base, mc, whatIf }: { plan: Plan; goal: GoalResult; base: GoalResult; mc: MonteCarloResult; whatIf: boolean }) {
  const { money, compact } = useMoney()
  const t = goal.target
  const pct = goal.onTrackPct * 100
  const by = `${MONTHS[t.month - 1]} ${t.year}`
  const who = plan.goal.scope === 'household' ? 'Together' : plan.people.find((p) => p.id === plan.goal.scope)!.name
  const early = goal.hitYear !== null ? t.year - goal.hitYear : null
  const spending = plan.goal.target.mode === 'spending' ? plan.goal.target : null

  return (
    <Card className="col-span-12 xl:col-span-8" bodyClassName="p-6">
      <div className="flex h-full flex-col gap-6 md:flex-row md:items-center">
        <GoalRing pct={goal.onTrackPct} size={184} stroke={13}>
          <div className={cn('text-[34px] leading-none font-semibold', pct >= 100 ? 'text-positive' : 'text-ink')}>
            <AnimatedNumber value={pct} format={(v) => formatPct(v, 0)} />
          </div>
          <div className="mt-1 text-xs text-muted">of goal</div>
          {whatIf && <div className="mt-1 text-[10px] text-faint">plan: {formatPct(base.onTrackPct * 100, 0)}</div>}
        </GoalRing>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={pct >= 100 ? 'positive' : pct >= 80 ? 'warning' : 'negative'}>{pct >= 100 ? 'On track' : pct >= 80 ? 'Close' : 'Behind'}</Badge>
            <Badge>{who}</Badge>
            {whatIf && (
              <Badge tone="accent">
                <Sparkles size={11} /> What-if
              </Badge>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-[28px]">
            <span className="text-gradient">{money(t.today, { compact: true })}</span> by {by}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {spending ? `${money(spending.annualSpendingToday)}/yr of spending at a ${formatPct(spending.withdrawalRatePct, 1)} withdrawal rate · ` : 'In today’s dollars · '}
            {money(t.nominal, { compact: true })} in {t.year} dollars · {t.yearsAway.toFixed(t.yearsAway % 1 ? 1 : 0)} years away
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
            <HeroStat label="Projected then" sub={`${compact(goal.projectedAtTarget)} in future $`}>
              <AnimatedNumber value={goal.projectedAtTargetToday} format={compact} />
            </HeroStat>
            <HeroStat label="Odds of making it" sub="1,000 simulated markets">
              <AnimatedNumber value={mc.probability * 100} format={(v) => formatPct(v, 0)} />
            </HeroStat>
            <HeroStat label="Reach it in" sub={early === null ? 'Not within the projection' : early > 0 ? `${early} yr${early === 1 ? '' : 's'} early` : early === 0 ? 'Right on time' : `${-early} yrs late`}>
              {goal.hitYear ?? '—'}
            </HeroStat>
            <HeroStat label="Saving now" sub="into accounts, per month">
              <AnimatedNumber value={goal.currentMonthlyContribution} format={(v) => money(v)} />
            </HeroStat>
          </div>
        </div>
      </div>
    </Card>
  )
}

function SetupCard({ plan }: { plan: Plan }) {
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const g = plan.goal
  const edit = (fn: (goal: Plan['goal']) => void) => update((d) => fn(d.goal))
  const sample = plan.placeholders.includes('goal')
  return (
    <Card className="col-span-12 xl:col-span-4" title="Your goal" action={sample ? <Badge tone="warning">Sample — make it yours</Badge> : undefined}>
      <Field label="For">
        <Segmented size="sm" value={g.scope} onChange={(v) => edit((x) => void (x.scope = v))} options={SCOPE_OPTIONS} />
      </Field>
      <Field label="Target">
        <Segmented
          size="sm"
          value={g.target.mode}
          onChange={(v) =>
            edit((x) => {
              if (v === x.target.mode) return
              x.target = v === 'amount' ? { mode: 'amount', amount: Math.round(goalAmountToday(x) / 50000) * 50000 || 2000000, dollars: 'today' } : { mode: 'spending', annualSpendingToday: 100000, withdrawalRatePct: 4 }
            })
          }
          options={[
            { value: 'amount', label: 'Amount' },
            { value: 'spending', label: 'Yearly spending' },
          ]}
        />
      </Field>
      {g.target.mode === 'amount' ? (
        <>
          <MoneyField label="Nest egg" value={g.target.amount} onChange={(v) => edit((x) => x.target.mode === 'amount' && void (x.target.amount = v))} step={50000} />
          <Field label="In">
            <Segmented
              size="sm"
              value={g.target.dollars}
              onChange={(v) => edit((x) => x.target.mode === 'amount' && void (x.target.dollars = v))}
              options={[
                { value: 'today', label: 'Today’s $' },
                { value: 'future', label: 'Future $' },
              ]}
            />
          </Field>
        </>
      ) : (
        <>
          <MoneyField label="Yearly spending" hint="in today’s dollars" value={g.target.annualSpendingToday} onChange={(v) => edit((x) => x.target.mode === 'spending' && void (x.target.annualSpendingToday = v))} step={5000} />
          <NumberField label="Withdrawal rate" hint={`Nest egg ≈ ${money(g.target.annualSpendingToday / (Math.max(0.5, g.target.withdrawalRatePct) / 100), { compact: true })}`} value={g.target.withdrawalRatePct} onChange={(v) => edit((x) => x.target.mode === 'spending' && void (x.target.withdrawalRatePct = v))} suffix="%" decimals={1} min={0.5} max={10} step={0.1} />
        </>
      )}
      <Field label="By">
        <Segmented
          size="sm"
          value={g.by.mode}
          onChange={(v) =>
            edit((x) => {
              if (v === x.by.mode) return
              const year = x.by.mode === 'date' ? x.by.year : 0
              const person = plan.people[0]
              x.by = v === 'date' ? { mode: 'date', year: plan.settings.planYear + 25, month: 1 } : { mode: 'age', personId: person.id, age: year ? year - person.birthYear : 60 }
            })
          }
          options={[
            { value: 'date', label: 'Date' },
            { value: 'age', label: 'Age' },
          ]}
        />
      </Field>
      {g.by.mode === 'date' ? (
        <Field label="Date">
          <div className="flex items-center gap-1">
            <SelectMenu value={String(g.by.month)} onChange={(v) => edit((x) => x.by.mode === 'date' && void (x.by.month = Number(v)))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m.slice(0, 3) }))} ariaLabel="Month" />
            <EditableNumber value={g.by.year} onChange={(v) => edit((x) => x.by.mode === 'date' && void (x.by.year = Math.round(v)))} min={plan.settings.planYear + 1} max={plan.settings.planYear + 70} grouping={false} ariaLabel="Year" />
          </div>
        </Field>
      ) : (
        <Field label="When">
          <div className="flex items-center gap-2">
            <SelectMenu<PersonId> value={g.by.personId} onChange={(v) => edit((x) => x.by.mode === 'age' && void (x.by.personId = v))} options={plan.people.map((p) => ({ value: p.id, label: p.name }))} ariaLabel="Person" />
            <span className="text-sm text-muted">turns</span>
            <EditableNumber value={g.by.age} onChange={(v) => edit((x) => x.by.mode === 'age' && void (x.by.age = Math.round(v)))} min={20} max={100} ariaLabel="Age" />
          </div>
        </Field>
      )}
      <Field label="Count condo equity" hint="Home equity isn’t easy to spend">
        <Switch checked={g.includeRealEstateEquity} onChange={(v) => edit((x) => void (x.includeRealEstateEquity = v))} />
      </Field>
    </Card>
  )
}

function goalAmountToday(g: Plan['goal']): number {
  return g.target.mode === 'amount' ? g.target.amount : g.target.annualSpendingToday / (Math.max(0.5, g.target.withdrawalRatePct) / 100)
}

function GlideChart({ plan, goal }: { plan: Plan; goal: GoalResult }) {
  const [real, setReal] = useState(true)
  const { money, compact } = useMoney()
  const deflate = useDeflate(plan, real)
  const t = goal.target
  const targetX = plan.settings.planYear + t.yearsAway
  const rows = new Map<number, { year: number; band?: [number, number]; projected?: number; required?: number }>()
  for (const b of goal.bands) rows.set(b.year, { year: b.year, band: [deflate(b.low, b.year), deflate(b.high, b.year)], projected: deflate(b.mid, b.year) })
  for (const g of goal.glidePath) {
    const row = rows.get(g.year) ?? { year: g.year, projected: deflate(g.projected, g.year) }
    row.required = Math.max(0, deflate(g.required, g.year))
    rows.set(g.year, row)
  }
  const data = [...rows.values()].sort((a, b) => a.year - b.year)
  const targetY = deflate(t.nominal, targetX)

  return (
    <Card
      className="col-span-12 xl:col-span-8"
      title="Path to your goal"
      subtitle="Projected savings vs. what you need each year to stay on track · shaded band = ±2% returns"
      action={<DollarsToggle real={real} onChange={setReal} />}
    >
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent" /> Projected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-warning" /> Needed to stay on track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-accent/20" /> Range
        </span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="glide-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickCount={8} {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={60} tickFormatter={(v: number) => compact(v)} />
          <Tooltip content={(p) => <ChartTooltip {...p} labelFormat={(l) => `${Math.floor(Number(l))}`} format={(v) => money(v)} />} />
          <Area dataKey="band" name="Range" stroke="none" fill="url(#glide-band)" isAnimationActive={false} tooltipType="none" />
          <Line dataKey="required" name="Needed" stroke="var(--warning)" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls isAnimationActive={false} />
          <Line dataKey="projected" name="Projected" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <ReferenceLine x={targetX} stroke="var(--faint)" strokeDasharray="3 4" label={{ value: `Goal · ${t.year}`, position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 11 }} />
          <ReferenceDot x={targetX} y={targetY} r={6} fill="var(--warning)" stroke="var(--bg)" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  )
}

function WhatIfCard({ plan, goal }: { plan: Plan; goal: GoalResult }) {
  const whatIf = useUiStore((s) => s.whatIf)
  const setWhatIf = useUiStore((s) => s.setWhatIf)
  const resetWhatIf = useUiStore((s) => s.resetWhatIf)
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const active = isWhatIfActive(whatIf)
  const people = goalPeople(plan)
  const rates = people.map((id) => plan.people.find((p) => p.id === id)!.savingsRatePct)
  const baseRate = rates.reduce((s, r) => s + r, 0) / rates.length
  const stock = plan.assumptions.stockReturnPct
  const amountMode = plan.goal.target.mode === 'amount'
  const baseAmount = plan.goal.target.mode === 'amount' ? plan.goal.target.amount : plan.goal.target.annualSpendingToday
  const amount = whatIf.targetAmount ?? baseAmount

  return (
    <Card
      className="col-span-12 xl:col-span-4"
      title="What if…"
      subtitle="Explore without changing your plan"
      action={
        active ? (
          <Button size="sm" onClick={resetWhatIf}>
            <RotateCcw size={13} /> Reset
          </Button>
        ) : undefined
      }
    >
      <SliderField
        label="Savings rate"
        hint={people.length > 1 ? 'of take-home, for both of you' : 'of take-home'}
        value={whatIf.savingsRatePct ?? baseRate}
        onChange={(v) => setWhatIf({ savingsRatePct: v })}
        min={0}
        max={100}
        suffix="%"
      />
      <SliderField
        label="Stock returns"
        hint={`per year · plan assumes ${formatPct(stock, 1)}`}
        value={stock + whatIf.returnShiftPct}
        onChange={(v) => setWhatIf({ returnShiftPct: Math.round((v - stock) * 100) / 100 })}
        min={Math.max(0, stock - 6)}
        max={stock + 6}
        step={0.25}
        decimals={2}
        suffix="%"
      />
      <SliderField
        label="Retire in"
        value={whatIf.targetYear ?? goal.target.year}
        onChange={(v) => setWhatIf({ targetYear: v })}
        min={plan.settings.planYear + 1}
        max={plan.settings.planYear + 50}
        display={<span className="num text-sm font-medium">{whatIf.targetYear ?? goal.target.year}</span>}
      />
      <SliderField
        label={amountMode ? 'Nest egg' : 'Yearly spending'}
        hint={amountMode ? undefined : 'in today’s dollars'}
        value={amount}
        onChange={(v) => setWhatIf({ targetAmount: v })}
        min={amountMode ? 250000 : 20000}
        max={amountMode ? 10000000 : 400000}
        step={amountMode ? 50000 : 5000}
        display={<span className="num text-sm font-medium">{money(amount, { compact: amountMode })}</span>}
      />
      <div className="mt-3 flex gap-2">
        <Button
          variant="primary"
          className="flex-1 justify-center"
          disabled={!active}
          onClick={() => {
            update((d) => commitWhatIf(d, whatIf))
            resetWhatIf()
          }}
        >
          Apply to plan
        </Button>
      </div>
    </Card>
  )
}

function Lever({ title, detail, onTry }: { title: ReactNode; detail?: ReactNode; onTry?: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-ink">{title}</div>
        {detail && <div className="text-xs text-faint">{detail}</div>}
      </div>
      {onTry && (
        <Button size="sm" variant="outline" onClick={onTry}>
          Try <ArrowRight size={13} />
        </Button>
      )}
    </div>
  )
}

function ToGetThereCard({ plan, goal }: { plan: Plan; goal: GoalResult }) {
  const setWhatIf = useUiStore((s) => s.setWhatIf)
  const { money } = useMoney()
  const behind = goal.gapMonthly > 0.5
  const stock = plan.assumptions.stockReturnPct
  const rate = goal.impliedSavingsRatePct
  const coastPct = goal.coastAmountToday > 0 ? goal.currentAssets / goal.coastAmountToday : 1

  return (
    <Card className="col-span-12 xl:col-span-4" title={behind ? 'To get there' : 'Your margin'}>
      <div className={cn('num text-[32px] leading-none font-semibold', behind ? 'text-warning' : 'text-positive')}>
        <AnimatedNumber value={Math.abs(goal.gapMonthly)} format={(v) => `${behind ? '+' : ''}${money(v)}`} />
        <span className="ml-1 text-base font-normal text-muted">/mo</span>
      </div>
      <p className="mt-1.5 text-sm text-muted">
        {behind ? `more savings each month (${money(goal.requiredMonthlyContribution)} total) reaches the goal.` : 'You could save this much less each month and still make it.'}
      </p>
      <div className="mt-3">
        {rate !== null ? (
          <Lever
            title={
              <>
                {behind ? 'Raise' : 'Lowest'} savings rate {behind ? 'to' : 'that works:'} <span className="num font-medium">{formatPct(rate, 0)}</span>
              </>
            }
            detail="of take-home pay"
            onTry={() => setWhatIf({ savingsRatePct: Math.round(rate) })}
          />
        ) : (
          <Lever title={behind ? 'Savings rate alone can’t close the gap' : 'You get there even saving 0% of take-home'} detail={behind ? 'Try a later date or a smaller goal' : 'Employer money, RSUs and existing balances are enough'} />
        )}
        {goal.requiredReturnPct !== null && (
          <Lever
            title={
              <>
                Returns needed: <span className="num font-medium">{formatPct(goal.requiredReturnPct, 1)}</span>/yr
              </>
            }
            detail={`Plan assumes ${formatPct(stock, 1)}`}
            onTry={behind ? () => setWhatIf({ returnShiftPct: Math.round((goal.requiredReturnPct! - stock) * 4) / 4 }) : undefined}
          />
        )}
        {goal.hitYear !== null && goal.hitYear !== goal.target.year && (
          <Lever
            title={
              <>
                {goal.hitYear < goal.target.year ? 'Could retire as early as' : 'Or retire in'} <span className="num font-medium">{goal.hitYear}</span>
              </>
            }
            onTry={() => setWhatIf({ targetYear: goal.hitYear! })}
          />
        )}
      </div>
      <div className="mt-4 rounded-xl bg-surface/60 p-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted">Coast number</span>
          <span className="num font-medium">{money(goal.coastAmountToday, { compact: true })}</span>
        </div>
        <ProgressBar value={coastPct} max={1} tone={coastPct >= 1 ? 'positive' : 'accent'} className="mt-2" />
        <p className="mt-2 text-[11px] leading-relaxed text-faint">
          Invested today, this grows to the goal on its own with no further saving. You have {money(goal.currentAssets, { compact: true })}
          {coastPct >= 1 ? ' — you could stop saving.' : '.'}
        </p>
      </div>
    </Card>
  )
}

function MonteCarloCard({ plan, goal, mc }: { plan: Plan; goal: GoalResult; mc: MonteCarloResult }) {
  const [real, setReal] = useState(true)
  const { money, compact } = useMoney()
  const deflate = useDeflate(plan, real)
  const data = mc.fan.map((f) => ({
    year: f.year,
    outer: [deflate(f.p10, f.year), deflate(f.p90, f.year)] as [number, number],
    inner: [deflate(f.p25, f.year), deflate(f.p75, f.year)] as [number, number],
    p50: deflate(f.p50, f.year),
    p10: deflate(f.p10, f.year),
    p90: deflate(f.p90, f.year),
  }))
  const targetX = plan.settings.planYear + goal.target.yearsAway
  const targetY = deflate(goal.target.nominal, targetX)
  const odds = mc.probability * 100
  return (
    <Card
      className="col-span-12 xl:col-span-8"
      title="Odds across 1,000 markets"
      subtitle={`Random yearly returns averaging ${formatPct(plan.assumptions.stockReturnPct, 1)} with ${formatPct(plan.assumptions.returnVolatilityPct, 0)} volatility`}
      action={<DollarsToggle real={real} onChange={setReal} />}
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <div>
          <span className={cn('num text-3xl font-semibold', odds >= 80 ? 'text-positive' : odds >= 60 ? 'text-warning' : 'text-negative')}>
            <AnimatedNumber value={odds} format={(v) => formatPct(v, 0)} />
          </span>
          <span className="ml-2 text-sm text-muted">chance of reaching the goal</span>
        </div>
        <span className="text-sm text-muted">
          Median outcome <span className="num text-ink">{money(deflate(mc.medianAtTarget, targetX), { compact: true })}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} tickCount={8} {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} width={60} tickFormatter={(v: number) => compact(v)} />
          <Tooltip content={(p) => <ChartTooltip {...p} format={(v) => money(v)} />} />
          <Area dataKey="outer" stroke="none" fill="var(--accent)" fillOpacity={0.12} isAnimationActive={false} tooltipType="none" />
          <Area dataKey="inner" stroke="none" fill="var(--accent)" fillOpacity={0.22} isAnimationActive={false} tooltipType="none" />
          <Line dataKey="p90" name="Great markets (90th)" stroke="var(--accent-2)" strokeOpacity={0.5} strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line dataKey="p50" name="Median" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line dataKey="p10" name="Poor markets (10th)" stroke="var(--negative)" strokeOpacity={0.6} strokeWidth={1} dot={false} isAnimationActive={false} />
          <ReferenceDot x={targetX} y={targetY} r={6} fill="var(--warning)" stroke="var(--bg)" strokeWidth={2} />
          <ReferenceLine y={targetY} stroke="var(--warning)" strokeOpacity={0.5} strokeDasharray="3 4" />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-faint">Shaded bands cover the middle 50% and 80% of outcomes. Contributions follow your plan; only market returns vary.</p>
    </Card>
  )
}

export function GoalPage() {
  const committed = usePlan()
  const view = useGoal()
  const base = useBaseGoal()
  const mc = useMonteCarlo()
  const { plan, goal, whatIfActive } = view
  return (
    <div className="grid grid-cols-12 gap-5">
      <GoalHero plan={plan} goal={goal} base={base} mc={mc} whatIf={whatIfActive} />
      <SetupCard plan={committed} />
      <GlideChart plan={plan} goal={goal} />
      <WhatIfCard plan={committed} goal={goal} />
      <ToGetThereCard plan={plan} goal={goal} />
      <MonteCarloCard plan={plan} goal={goal} mc={mc} />
    </div>
  )
}

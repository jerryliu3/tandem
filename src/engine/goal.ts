import type { PersonId, Plan, Scope } from '../model/types'
import { goalDate, projectPlan, type Projection, type ProjectionOptions } from './projection'
import { createNormal, createRng } from './rng'

export interface GoalTargetInfo {
  /** Target in dollars of the goal date. */
  nominal: number
  /** Target in today's dollars. */
  today: number
  year: number
  month: number
  monthsAway: number
  yearsAway: number
  inflationFactor: number
}

export function goalTarget(plan: Plan): GoalTargetInfo {
  const { year, month, monthsAway } = goalDate(plan)
  const yearsAway = monthsAway / 12
  const inflationFactor = (1 + plan.assumptions.inflationPct / 100) ** yearsAway
  const t = plan.goal.target
  let today: number
  let nominal: number
  if (t.mode === 'amount') {
    if (t.dollars === 'today') {
      today = t.amount
      nominal = t.amount * inflationFactor
    } else {
      nominal = t.amount
      today = t.amount / inflationFactor
    }
  } else {
    today = t.annualSpendingToday / (Math.max(0.5, t.withdrawalRatePct) / 100)
    nominal = today * inflationFactor
  }
  return { nominal, today, year, month, monthsAway, yearsAway, inflationFactor }
}

function targetAtYears(plan: Plan, g: GoalTargetInfo, t: number): number {
  const target = plan.goal.target
  if (target.mode === 'amount' && target.dollars === 'future') return g.nominal
  return g.today * (1 + plan.assumptions.inflationPct / 100) ** t
}

export function assetsAtMonth(plan: Plan, proj: Projection, month: number, scope: Scope = plan.goal.scope): number {
  const pt = proj.monthly[Math.min(Math.max(0, Math.round(month)), proj.monthly.length - 1)]
  return pt.investable[scope] + (plan.goal.includeRealEstateEquity ? pt.equity[scope] : 0)
}

/** Illinois-variant regula falsi on a monotonic increasing f. Returns null if [lo, hi] doesn't bracket a root. */
function solveIncreasing(f: (x: number) => number, lo: number, hi: number, tol: number, maxIter = 14): number | null {
  let a = lo
  let b = hi
  let fa = f(a)
  let fb = f(b)
  if (fa >= 0) return a
  if (fb < 0) return null
  let side = 0
  for (let i = 0; i < maxIter; i++) {
    const c = (a * fb - b * fa) / (fb - fa)
    const fc = f(c)
    if (Math.abs(fc) < tol || Math.abs(b - a) < 1e-6) return c
    if (fc < 0) {
      a = c
      fa = fc
      if (side === -1) fb /= 2
      side = -1
    } else {
      b = c
      fb = fc
      if (side === 1) fa /= 2
      side = 1
    }
  }
  return (a * fb - b * fa) / (fb - fa)
}

export interface GlidePoint {
  year: number
  t: number
  required: number
  projected: number
}

export interface BandPoint {
  year: number
  low: number
  mid: number
  high: number
}

export interface GoalResult {
  target: GoalTargetInfo
  scope: Scope
  projectedAtTarget: number
  projectedAtTargetToday: number
  onTrackPct: number
  currentAssets: number
  /** Planned contributions in the first year, per month. */
  currentMonthlyContribution: number
  requiredMonthlyContribution: number
  /** Extra fixed monthly savings needed (negative = surplus). */
  gapMonthly: number
  /** Savings rate (of take-home) that reaches the goal, applied to everyone in scope. */
  impliedSavingsRatePct: number | null
  /** Stock return that reaches the goal with today's plan. */
  requiredReturnPct: number | null
  /** Lump sum invested today at the expected return that grows to the target alone. */
  coastAmountToday: number
  /** First year the plan meets the target (in the target's terms), or null. */
  hitYear: number | null
  glidePath: GlidePoint[]
  /** Projection with ±2 points of return across the whole horizon. */
  bands: BandPoint[]
}

function extraOwner(scope: Scope): PersonId | 'joint' {
  return scope === 'household' ? 'joint' : scope
}

export function solveGoal(plan: Plan, proj: Projection, whatIf: ProjectionOptions = {}): GoalResult {
  const target = goalTarget(plan)
  const scope = plan.goal.scope
  const horizon = Math.ceil(target.monthsAway / 12)
  const at = (p: Projection) => assetsAtMonth(plan, p, target.monthsAway)
  const run = (o: Partial<ProjectionOptions>) => projectPlan(plan, { ...whatIf, years: horizon, ...o })

  const projected = at(proj)
  const currentMonthlyContribution = (proj.years[1]?.contributions[scope] ?? 0) / 12

  const baseExtra = whatIf.extra?.monthly ?? 0
  const bumped = run({ extra: { monthly: baseExtra + 1000, ownerId: extraOwner(scope) } })
  const perDollar = (at(bumped) - projected) / 1000
  const gapMonthly = perDollar > 0 ? (target.nominal - projected) / perDollar : 0

  const people: PersonId[] = scope === 'household' ? ['jerry', 'sophia'] : [scope]
  const tolerance = Math.max(50, target.nominal * 1e-5)
  const impliedSavingsRatePct = solveIncreasing(
    (rate) => {
      const override = { ...whatIf.savingsRateOverridePct }
      for (const id of people) override[id] = rate
      return at(run({ savingsRateOverridePct: override })) - target.nominal
    },
    0,
    100,
    tolerance,
  )

  const stock = plan.assumptions.stockReturnPct
  const shift = solveIncreasing((s) => at(run({ returnShiftPct: s })) - target.nominal, -stock - 5, 20, tolerance)
  const requiredReturnPct = shift === null ? null : stock + shift

  const growth = 1 + (stock + (whatIf.returnShiftPct ?? 0)) / 100
  const coastAmountToday = target.nominal / growth ** target.yearsAway

  const assetsYear = (p: Projection, t: number) =>
    p.years[t].investable[scope] + (plan.goal.includeRealEstateEquity ? p.years[t].equity[scope] : 0)

  let hitYear: number | null = null
  for (let t = 0; t < proj.years.length; t++) {
    if (assetsYear(proj, t) >= targetAtYears(plan, target, t)) {
      hitYear = proj.years[t].year
      break
    }
  }

  const tf = target.yearsAway
  const tInt = Math.floor(tf + 1e-9)
  const frac = tf - tInt
  const flow = (t: number) => {
    const next = proj.years[Math.min(t + 1, proj.years.length - 1)]
    const cur = proj.years[Math.min(t, proj.years.length - 1)]
    const equityChange = plan.goal.includeRealEstateEquity ? next.equity[scope] - cur.equity[scope] : 0
    return next.contributions[scope] + equityChange
  }
  const required: number[] = []
  let r = target.nominal
  if (frac > 1e-9) r = (r - flow(tInt) * frac * growth ** (frac / 2)) / growth ** frac
  required[tInt] = r
  for (let t = tInt - 1; t >= 0; t--) {
    r = (r - flow(t) * growth ** 0.5) / growth
    required[t] = r
  }
  const glidePath: GlidePoint[] = []
  for (let t = 0; t <= tInt; t++) {
    glidePath.push({ year: plan.settings.planYear + t, t, required: required[t], projected: assetsAtMonth(plan, proj, t * 12) })
  }
  if (frac > 1e-9) {
    glidePath.push({ year: plan.settings.planYear + tf, t: tf, required: target.nominal, projected })
  }

  const full = proj.years.length - 1
  const low = projectPlan(plan, { ...whatIf, years: full, returnShiftPct: (whatIf.returnShiftPct ?? 0) - 2 })
  const high = projectPlan(plan, { ...whatIf, years: full, returnShiftPct: (whatIf.returnShiftPct ?? 0) + 2 })
  const bands: BandPoint[] = proj.years.map((y, t) => ({
    year: y.year,
    low: assetsYear(low, t),
    mid: assetsYear(proj, t),
    high: assetsYear(high, t),
  }))

  return {
    target,
    scope,
    projectedAtTarget: projected,
    projectedAtTargetToday: projected / target.inflationFactor,
    onTrackPct: target.nominal > 0 ? projected / target.nominal : 1,
    currentAssets: assetsYear(proj, 0),
    currentMonthlyContribution,
    requiredMonthlyContribution: currentMonthlyContribution + gapMonthly,
    gapMonthly,
    impliedSavingsRatePct,
    requiredReturnPct,
    coastAmountToday,
    hitYear,
    glidePath,
    bands,
  }
}

export interface FanPoint {
  year: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface MonteCarloResult {
  probability: number
  medianAtTarget: number
  fan: FanPoint[]
  paths: number
}

export function monteCarlo(
  plan: Plan,
  proj: Projection,
  opts: { paths?: number; seed?: number; returnShiftPct?: number } = {},
): MonteCarloResult {
  const paths = opts.paths ?? 1000
  const target = goalTarget(plan)
  const scope = plan.goal.scope
  const includeRE = plan.goal.includeRealEstateEquity
  const mu = (plan.assumptions.stockReturnPct + (opts.returnShiftPct ?? 0)) / 100
  const sigma = Math.max(0, plan.assumptions.returnVolatilityPct) / 100
  const s2 = Math.log(1 + (sigma * sigma) / ((1 + mu) * (1 + mu)))
  const m = Math.log(1 + mu) - s2 / 2
  const s = Math.sqrt(s2)

  const tf = target.yearsAway
  const tInt = Math.floor(tf + 1e-9)
  const frac = tf - tInt
  const H = Math.min(proj.years.length - 1, Math.ceil(tf - 1e-9))
  const contrib = (t: number) => proj.years[t + 1].contributions[scope]
  const equityAt = (t: number) => (includeRE ? proj.years[Math.min(t, proj.years.length - 1)].equity[scope] : 0)
  const equityAtTarget = includeRE ? assetsAtMonth(plan, proj, target.monthsAway) - proj.monthly[Math.min(target.monthsAway, proj.monthly.length - 1)].investable[scope] : 0

  const normal = createNormal(createRng(opts.seed ?? 42))
  const byYear: Float64Array[] = Array.from({ length: H + 1 }, () => new Float64Array(paths))
  const atTarget = new Float64Array(paths)
  const b0 = proj.years[0].investable[scope]

  for (let p = 0; p < paths; p++) {
    let b = b0
    byYear[0][p] = b + equityAt(0)
    let hitTarget = false
    for (let t = 0; t < H; t++) {
      const R = Math.exp(m + s * normal())
      if (t === tInt && frac > 1e-9) {
        const Rf = R ** frac
        atTarget[p] = b * Rf + contrib(t) * frac * Math.sqrt(Rf)
        hitTarget = true
      }
      b = b * R + contrib(t) * Math.sqrt(R)
      byYear[t + 1][p] = b + equityAt(t + 1)
    }
    if (!hitTarget) atTarget[p] = byYear[Math.min(tInt, H)][p] - equityAt(Math.min(tInt, H))
  }

  const pick = (sorted: Float64Array, q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]
  const fan: FanPoint[] = byYear.map((vals, t) => {
    const sorted = Float64Array.from(vals).sort()
    return {
      year: plan.settings.planYear + t,
      p10: pick(sorted, 0.1),
      p25: pick(sorted, 0.25),
      p50: pick(sorted, 0.5),
      p75: pick(sorted, 0.75),
      p90: pick(sorted, 0.9),
    }
  })

  let hits = 0
  for (let p = 0; p < paths; p++) if (atTarget[p] + equityAtTarget >= target.nominal) hits++
  const sortedTarget = Float64Array.from(atTarget).sort()

  return { probability: hits / paths, medianAtTarget: pick(sortedTarget, 0.5) + equityAtTarget, fan, paths }
}

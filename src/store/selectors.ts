import { produce } from 'immer'
import type { PersonId, Plan } from '../model/types'
import { monteCarlo, solveGoal, type GoalResult, type MonteCarloResult } from '../engine/goal'
import { computePlan, type PlanResult } from '../engine/plan'
import { projectPlan, type Projection, type ProjectionOptions } from '../engine/projection'
import { usePlanStore } from './planStore'
import { isWhatIfActive, useUiStore, type GoalWhatIf } from './uiStore'

function memo<A extends readonly unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | null = null
  let last: R
  return (...args: A) => {
    if (lastArgs && lastArgs.length === args.length && lastArgs.every((a, i) => Object.is(a, args[i]))) return last
    last = fn(...args)
    lastArgs = args
    return last
  }
}

export const selectPlanResult = memo((plan: Plan): PlanResult => computePlan(plan))
export const selectProjection = memo((plan: Plan): Projection => projectPlan(plan))

export function goalPeople(plan: Plan): PersonId[] {
  return plan.goal.scope === 'household' ? ['jerry', 'sophia'] : [plan.goal.scope]
}

/** The plan and projection options the Goal page evaluates under the current what-ifs. */
export function applyWhatIf(plan: Plan, w: GoalWhatIf): { plan: Plan; opts: ProjectionOptions } {
  const eff =
    w.targetYear === null && w.targetAmount === null
      ? plan
      : produce(plan, (d) => {
          if (w.targetYear !== null) d.goal.by = { mode: 'date', year: w.targetYear, month: d.goal.by.mode === 'date' ? d.goal.by.month : 1 }
          if (w.targetAmount !== null) {
            if (d.goal.target.mode === 'amount') d.goal.target.amount = w.targetAmount
            else d.goal.target.annualSpendingToday = w.targetAmount
          }
        })
  const opts: ProjectionOptions = {}
  if (w.returnShiftPct !== 0) opts.returnShiftPct = w.returnShiftPct
  if (w.savingsRatePct !== null) {
    const override: Partial<Record<PersonId, number>> = {}
    for (const id of goalPeople(plan)) override[id] = w.savingsRatePct
    opts.savingsRateOverridePct = override
  }
  return { plan: eff, opts }
}

/** Commit what-ifs into the plan (Goal page "Apply"). */
export function commitWhatIf(draft: Plan, w: GoalWhatIf): void {
  if (w.savingsRatePct !== null) for (const p of draft.people) if (goalPeople(draft).includes(p.id)) p.savingsRatePct = w.savingsRatePct
  if (w.returnShiftPct !== 0) draft.assumptions.stockReturnPct = Math.round((draft.assumptions.stockReturnPct + w.returnShiftPct) * 100) / 100
  if (w.targetYear !== null) draft.goal.by = { mode: 'date', year: w.targetYear, month: draft.goal.by.mode === 'date' ? draft.goal.by.month : 1 }
  if (w.targetAmount !== null) {
    if (draft.goal.target.mode === 'amount') draft.goal.target.amount = w.targetAmount
    else draft.goal.target.annualSpendingToday = w.targetAmount
  }
}

export interface GoalView {
  plan: Plan
  opts: ProjectionOptions
  projection: Projection
  goal: GoalResult
  whatIfActive: boolean
}

export const selectGoal = memo((plan: Plan, w: GoalWhatIf): GoalView => {
  const active = isWhatIfActive(w)
  const { plan: eff, opts } = applyWhatIf(plan, w)
  const projection = active ? projectPlan(eff, opts) : selectProjection(plan)
  return { plan: eff, opts, projection, goal: solveGoal(eff, projection, opts), whatIfActive: active }
})

export const selectMonteCarlo = memo((plan: Plan, w: GoalWhatIf): MonteCarloResult => {
  const view = selectGoal(plan, w)
  return monteCarlo(view.plan, view.projection, { paths: 1000, seed: 42, returnShiftPct: view.opts.returnShiftPct })
})

export function usePlan(): Plan {
  return usePlanStore((s) => s.plan)
}

export function usePlanResult(): PlanResult {
  return selectPlanResult(usePlan())
}

export function useProjection(): Projection {
  return selectProjection(usePlan())
}

export function useGoal(): GoalView {
  const plan = usePlan()
  const whatIf = useUiStore((s) => s.whatIf)
  return selectGoal(plan, whatIf)
}

export function useMonteCarlo(): MonteCarloResult {
  const plan = usePlan()
  const whatIf = useUiStore((s) => s.whatIf)
  return selectMonteCarlo(plan, whatIf)
}

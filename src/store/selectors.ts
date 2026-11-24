import type { Actuals, Plan } from '../model/types'
import { goalEffect, monthKey, monthPlan, progress, type GoalEffect, type MonthPlan, type Progress } from '../engine/actuals'
import { monteCarlo, solveGoal, type GoalResult, type MonteCarloResult } from '../engine/goal'
import { computePlan, type PlanResult } from '../engine/plan'
import { projectPlan, type Projection } from '../engine/projection'
import { usePlanStore } from './planStore'

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

let lastModel: Plan | null = null
/** Ignores `actuals`, so entering a month doesn't recompute taxes and projections. */
function stableModel(plan: Plan): Plan {
  const prev = lastModel
  const same = prev !== null && (Object.keys(plan) as (keyof Plan)[]).every((k) => k === 'actuals' || Object.is(plan[k], prev[k]))
  if (!same) lastModel = plan
  return lastModel!
}

const planResult = memo((plan: Plan): PlanResult => computePlan(plan))
const projection = memo((plan: Plan): Projection => projectPlan(plan))
const goal = memo((plan: Plan): GoalResult => solveGoal(plan, projection(plan)))
const mc = memo((plan: Plan): MonteCarloResult => monteCarlo(plan, projection(plan), { paths: 1000, seed: 42 }))
const mPlan = memo((plan: Plan): MonthPlan => monthPlan(planResult(plan), plan))
const prog = memo((plan: Plan, actuals: Actuals, today: string): Progress => progress(mPlan(plan), actuals, today))
const effect = memo((plan: Plan, p: Progress): GoalEffect => goalEffect(plan, projection(plan), p))

export const selectPlanResult = (plan: Plan) => planResult(stableModel(plan))
export const selectProjection = (plan: Plan) => projection(stableModel(plan))
export const selectGoal = (plan: Plan) => goal(stableModel(plan))
export const selectMonthPlan = (plan: Plan) => mPlan(stableModel(plan))
export const currentMonth = () => monthKey(new Date())
export const selectProgress = (plan: Plan) => prog(stableModel(plan), plan.actuals, currentMonth())
export const selectGoalEffect = (plan: Plan) => effect(stableModel(plan), selectProgress(plan))

export function usePlan(): Plan {
  return usePlanStore((s) => s.plan)
}

export function usePlanResult(): PlanResult {
  return selectPlanResult(usePlan())
}

export function useProjection(): Projection {
  return selectProjection(usePlan())
}

export function useGoal(): GoalResult {
  return selectGoal(usePlan())
}

export function useMonteCarlo(): MonteCarloResult {
  return mc(stableModel(usePlan()))
}

export function useMonthPlan(): MonthPlan {
  return selectMonthPlan(usePlan())
}

export function useProgress(): Progress {
  return selectProgress(usePlan())
}

export function useGoalEffect(): GoalEffect {
  return selectGoalEffect(usePlan())
}

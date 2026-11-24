import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultPlan } from '../model/defaults'
import { flushSave, redo, resetHistory, undo, usePlanStore } from './planStore'
import { LocalStorageRepository, MemoryStorage, STORAGE_KEY } from './repository'
import { applyWhatIf, commitWhatIf, selectGoal, selectPlanResult } from './selectors'
import { EMPTY_WHAT_IF, pageFromHash } from './uiStore'

describe('LocalStorageRepository', () => {
  it('round-trips a plan', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageRepository(storage)
    const plan = createDefaultPlan()
    plan.people[0].income.baseSalary = 123456
    await repo.save(plan)
    expect(storage.getItem(STORAGE_KEY)).toContain('123456')
    expect((await repo.load())?.people[0].income.baseSalary).toBe(123456)
  })

  it('returns null for missing or corrupt data', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageRepository(storage)
    expect(await repo.load()).toBeNull()
    storage.setItem(STORAGE_KEY, '{not json')
    expect(await repo.load()).toBeNull()
  })
})

describe('usePlanStore', () => {
  beforeEach(() => {
    usePlanStore.getState().reset()
    resetHistory()
  })

  it('updates immutably and undoes', () => {
    const before = usePlanStore.getState().plan
    usePlanStore.getState().update((d) => {
      d.people[0].income.baseSalary = 150000
    })
    const after = usePlanStore.getState().plan
    expect(after).not.toBe(before)
    expect(before.people[0].income.baseSalary).toBe(100000)
    expect(after.people[0].income.baseSalary).toBe(150000)
    expect(after.people[1]).toBe(before.people[1])

    undo()
    expect(usePlanStore.getState().plan.people[0].income.baseSalary).toBe(100000)
    redo()
    expect(usePlanStore.getState().plan.people[0].income.baseSalary).toBe(150000)
  })

  it('collapses rapid edits into one undo step', () => {
    for (const salary of [101000, 102000, 103000]) {
      usePlanStore.getState().update((d) => {
        d.people[0].income.baseSalary = salary
      })
    }
    undo()
    expect(usePlanStore.getState().plan.people[0].income.baseSalary).toBe(100000)
  })

  it('hydrates from the repository and saves changes', async () => {
    const storage = new MemoryStorage()
    const repo = new LocalStorageRepository(storage)
    const stored = createDefaultPlan()
    stored.people[1].income.baseSalary = 222000
    await repo.save(stored)

    await usePlanStore.getState().hydrate(repo)
    expect(usePlanStore.getState().hydrated).toBe(true)
    expect(usePlanStore.getState().plan.people[1].income.baseSalary).toBe(222000)
    expect(usePlanStore.temporal.getState().pastStates.length).toBe(0)

    usePlanStore.getState().update((d) => {
      d.people[1].income.baseSalary = 230000
    })
    await flushSave()
    expect((await repo.load())?.people[1].income.baseSalary).toBe(230000)
  })

  it('replace() migrates imported plans', () => {
    usePlanStore.getState().replace({ nonsense: true })
    expect(usePlanStore.getState().plan.people).toHaveLength(2)
  })
})

describe('selectors', () => {
  it('memoizes on plan identity', () => {
    const plan = createDefaultPlan()
    expect(selectPlanResult(plan)).toBe(selectPlanResult(plan))
    expect(selectGoal(plan, EMPTY_WHAT_IF)).toBe(selectGoal(plan, EMPTY_WHAT_IF))
  })

  it('applies and commits what-ifs', () => {
    const plan = createDefaultPlan()
    const w = { savingsRatePct: 30, returnShiftPct: -1, targetYear: 2050, targetAmount: 3_000_000 }
    const { plan: eff, opts } = applyWhatIf(plan, w)
    expect(eff.goal.by).toEqual({ mode: 'date', year: 2050, month: 1 })
    expect(plan.goal.by).toEqual({ mode: 'date', year: 2055, month: 1 })
    expect(opts).toEqual({ returnShiftPct: -1, savingsRateOverridePct: { jerry: 30, sophia: 30 } })

    const draft = structuredClone(plan)
    commitWhatIf(draft, w)
    expect(draft.people.map((p) => p.savingsRatePct)).toEqual([30, 30])
    expect(draft.assumptions.stockReturnPct).toBe(7)
    expect(draft.goal.target).toMatchObject({ amount: 3_000_000 })
  })

  it('what-if savings rate lowers the projection', () => {
    const plan = createDefaultPlan()
    const base = selectGoal(plan, EMPTY_WHAT_IF)
    const lower = selectGoal(plan, { ...EMPTY_WHAT_IF, savingsRatePct: 20 })
    expect(lower.whatIfActive).toBe(true)
    expect(lower.goal.projectedAtTarget).toBeLessThan(base.goal.projectedAtTarget)
  })
})

describe('pageFromHash', () => {
  it('parses known pages and falls back to overview', () => {
    expect(pageFromHash('#/budget')).toBe('budget')
    expect(pageFromHash('#goal')).toBe('goal')
    expect(pageFromHash('#/nope')).toBe('overview')
    expect(pageFromHash('')).toBe('overview')
  })
})

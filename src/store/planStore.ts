import { temporal } from 'zundo'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { createDefaultPlan } from '../model/defaults'
import { migratePlan } from '../model/schema'
import type { Plan } from '../model/types'
import type { PlanRepository } from './repository'

export interface PlanState {
  plan: Plan
  hydrated: boolean
  update: (fn: (draft: Plan) => void) => void
  replace: (plan: unknown) => void
  reset: () => void
  hydrate: (repo: PlanRepository) => Promise<void>
}

/** Changes closer together than this collapse into one undo step (e.g. a slider drag). */
export const HISTORY_COALESCE_MS = 600

let lastHistoryAt = Number.NEGATIVE_INFINITY

function coalesce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastHistoryAt > ms) fn(...args)
    lastHistoryAt = now
  }) as T
}

export function resetHistory(): void {
  usePlanStore.temporal.getState().clear()
  lastHistoryAt = Number.NEGATIVE_INFINITY
}

let repository: PlanRepository | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

export const usePlanStore = create<PlanState>()(
  temporal(
    immer((set) => ({
      plan: createDefaultPlan(),
      hydrated: false,
      update: (fn) =>
        set((s) => {
          fn(s.plan)
        }),
      replace: (raw) => set({ plan: migratePlan(raw) }),
      reset: () => set({ plan: createDefaultPlan() }),
      hydrate: async (repo) => {
        repository = repo
        const loaded = await repo.load()
        set({ plan: loaded ?? createDefaultPlan(), hydrated: true })
        resetHistory()
      },
    })),
    {
      limit: 100,
      partialize: (s) => ({ plan: s.plan }),
      equality: (a, b) => a.plan === b.plan,
      handleSet: (handleSet) => coalesce(handleSet, HISTORY_COALESCE_MS),
    },
  ),
)

usePlanStore.subscribe((s, prev) => {
  if (!s.hydrated || !repository || s.plan === prev.plan) return
  if (saveTimer) clearTimeout(saveTimer)
  const repo = repository
  saveTimer = setTimeout(() => {
    saveTimer = null
    void repo.save(usePlanStore.getState().plan)
  }, 300)
})

/** Flush a pending save immediately (tests, page unload). */
export async function flushSave(): Promise<void> {
  if (!saveTimer || !repository) return
  clearTimeout(saveTimer)
  saveTimer = null
  await repository.save(usePlanStore.getState().plan)
}

export const undo = () => usePlanStore.temporal.getState().undo()
export const redo = () => usePlanStore.temporal.getState().redo()

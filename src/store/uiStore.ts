import { create } from 'zustand'
import type { PageId, Scope } from '../model/types'

export const PAGES: PageId[] = ['overview', 'income', 'budget', 'accounts', 'property', 'goal', 'settings']

/** Temporary Goal-page overrides; never saved until applied. */
export interface GoalWhatIf {
  savingsRatePct: number | null
  returnShiftPct: number
  targetYear: number | null
  targetAmount: number | null
}

export const EMPTY_WHAT_IF: GoalWhatIf = { savingsRatePct: null, returnShiftPct: 0, targetYear: null, targetAmount: null }

export interface UiState {
  scope: Scope
  page: PageId
  whatIf: GoalWhatIf
  setScope: (scope: Scope) => void
  setPage: (page: PageId) => void
  setWhatIf: (patch: Partial<GoalWhatIf>) => void
  resetWhatIf: () => void
}

export function pageFromHash(hash: string): PageId {
  const id = hash.replace(/^#\/?/, '') as PageId
  return PAGES.includes(id) ? id : 'overview'
}

export const useUiStore = create<UiState>()((set) => ({
  scope: 'household',
  page: typeof location === 'undefined' ? 'overview' : pageFromHash(location.hash),
  whatIf: EMPTY_WHAT_IF,
  setScope: (scope) => set({ scope }),
  setPage: (page) => {
    set({ page })
    if (typeof location !== 'undefined' && pageFromHash(location.hash) !== page) location.hash = `/${page}`
  },
  setWhatIf: (patch) => set((s) => ({ whatIf: { ...s.whatIf, ...patch } })),
  resetWhatIf: () => set({ whatIf: EMPTY_WHAT_IF }),
}))

export function isWhatIfActive(w: GoalWhatIf): boolean {
  return w.savingsRatePct !== null || w.returnShiftPct !== 0 || w.targetYear !== null || w.targetAmount !== null
}

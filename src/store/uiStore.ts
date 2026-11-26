import { create } from 'zustand'
import type { PageId, Scope, SetupSection } from '../model/types'

export const PAGES: PageId[] = ['home', 'months', 'setup']
export const SECTIONS: SetupSection[] = ['pay', 'budget', 'accounts', 'condo', 'goal', 'assumptions']

export interface Route {
  page: PageId
  section: SetupSection | null
}

export interface UiState extends Route {
  scope: Scope
  balancesOpen: boolean
  setBalancesOpen: (open: boolean) => void
  setScope: (scope: Scope) => void
  setPage: (page: PageId, section?: SetupSection | null) => void
}

export function routeFromHash(hash: string): Route {
  const [id, sub] = hash.replace(/^#\/?/, '').split('/') as [PageId, SetupSection | undefined]
  const page = PAGES.includes(id) ? id : 'home'
  return { page, section: page === 'setup' && sub && SECTIONS.includes(sub) ? sub : null }
}

const initial = typeof location === 'undefined' ? { page: 'home' as const, section: null } : routeFromHash(location.hash)

export const useUiStore = create<UiState>()((set) => ({
  scope: 'household',
  balancesOpen: false,
  ...initial,
  setBalancesOpen: (balancesOpen) => set({ balancesOpen }),
  setScope: (scope) => set({ scope }),
  setPage: (page, section = null) => {
    set({ page, section })
    const hash = `#/${page}${section ? `/${section}` : ''}`
    if (typeof location !== 'undefined' && location.hash !== hash) location.hash = hash
  },
}))

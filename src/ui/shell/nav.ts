import { Building2, Goal, LayoutDashboard, Landmark, PiggyBank, Settings2, Wallet, type LucideIcon } from 'lucide-react'
import type { PageId } from '../../model/types'

export interface NavItem {
  id: PageId
  label: string
  title: string
  subtitle: string
  icon: LucideIcon
  /** Pages that don't change with the Jerry/Sophia/Together scope. */
  scopeless?: boolean
}

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', title: 'Overview', subtitle: 'Your plan at a glance', icon: LayoutDashboard },
  { id: 'income', label: 'Income & Taxes', title: 'Income & Taxes', subtitle: 'Paychecks, contributions and Brooklyn taxes', icon: Landmark },
  { id: 'budget', label: 'Budget', title: 'Budget', subtitle: 'The monthly spending plan', icon: Wallet },
  { id: 'accounts', label: 'Accounts & Savings', title: 'Accounts & Savings', subtitle: 'Where every saved dollar goes', icon: PiggyBank },
  { id: 'property', label: 'Property', title: 'Property', subtitle: 'The condo, on both sides of the border', icon: Building2, scopeless: true },
  { id: 'goal', label: 'Retirement Goal', title: 'Retirement Goal', subtitle: 'Work backwards from the finish line', icon: Goal },
  { id: 'settings', label: 'Settings', title: 'Settings', subtitle: 'Assumptions, appearance and data', icon: Settings2, scopeless: true },
]

export const navItem = (id: PageId) => NAV.find((n) => n.id === id) ?? NAV[0]

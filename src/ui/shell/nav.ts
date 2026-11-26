import { CalendarDays, House, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import type { PageId } from '../../model/types'

export interface NavItem {
  id: PageId
  label: string
  title: string
  subtitle: string
  icon: LucideIcon
}

export const NAV: NavItem[] = [
  { id: 'home', label: 'Home', title: 'Home', subtitle: 'This month and whether you’re on track', icon: House },
  { id: 'months', label: 'Months', title: 'Months', subtitle: 'Spending by month and balance updates', icon: CalendarDays },
  { id: 'setup', label: 'Setup', title: 'Setup', subtitle: 'Pay, budget, accounts, condo and goal', icon: SlidersHorizontal },
]

export const navItem = (id: PageId) => NAV.find((n) => n.id === id) ?? NAV[0]

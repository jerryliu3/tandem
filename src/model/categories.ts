import type { CategoryId } from './types'

export interface Category {
  id: CategoryId
  label: string
  color: string
  /** lucide-react icon name */
  icon: string
}

export const CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', color: '#8b5cf6', icon: 'Home' },
  { id: 'utilities', label: 'Utilities', color: '#38bdf8', icon: 'Zap' },
  { id: 'groceries', label: 'Groceries', color: '#34d399', icon: 'ShoppingBasket' },
  { id: 'dining', label: 'Dining', color: '#fb923c', icon: 'UtensilsCrossed' },
  { id: 'transport', label: 'Transport', color: '#facc15', icon: 'TrainFront' },
  { id: 'health', label: 'Health', color: '#f472b6', icon: 'HeartPulse' },
  { id: 'fitness', label: 'Fitness', color: '#22d3ee', icon: 'Dumbbell' },
  { id: 'phone', label: 'Phone & Internet', color: '#60a5fa', icon: 'Smartphone' },
  { id: 'entertainment', label: 'Entertainment', color: '#c084fc', icon: 'Clapperboard' },
  { id: 'travel', label: 'Travel', color: '#2dd4bf', icon: 'Plane' },
  { id: 'gifts', label: 'Gifts', color: '#fb7185', icon: 'Gift' },
  { id: 'debt', label: 'Debt', color: '#f87171', icon: 'Landmark' },
  { id: 'shopping', label: 'Shopping', color: '#a3e635', icon: 'ShoppingBag' },
  { id: 'personal', label: 'Personal', color: '#e879f9', icon: 'Sparkles' },
  { id: 'insurance', label: 'Insurance', color: '#94a3b8', icon: 'ShieldCheck' },
  { id: 'other', label: 'Other', color: '#a8a29e', icon: 'CircleEllipsis' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function categoryOf(id: CategoryId): Category {
  return BY_ID.get(id) ?? BY_ID.get('other')!
}

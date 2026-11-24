import {
  CircleEllipsis,
  Clapperboard,
  Dumbbell,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  TrainFront,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from '../../model/types'
import { categoryOf } from '../../model/categories'

const ICONS: Record<string, LucideIcon> = {
  Home,
  Zap,
  ShoppingBasket,
  UtensilsCrossed,
  TrainFront,
  HeartPulse,
  Dumbbell,
  Smartphone,
  Clapperboard,
  Plane,
  Gift,
  Landmark,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CircleEllipsis,
}

export function CategoryIcon({ id, size = 15 }: { id: CategoryId; size?: number }) {
  const c = categoryOf(id)
  const Icon = ICONS[c.icon] ?? CircleEllipsis
  return <Icon size={size} style={{ color: c.color }} />
}

export function CategoryBadge({ id }: { id: CategoryId }) {
  const c = categoryOf(id)
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in oklab, ${c.color} 16%, transparent)` }}>
      <CategoryIcon id={id} />
    </span>
  )
}

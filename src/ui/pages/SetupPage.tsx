import { Building2, ChevronDown, Goal, Landmark, PiggyBank, Settings2, Wallet, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toUSD } from '../../engine/money'
import { PLACEHOLDERS } from '../../model/placeholders'
import type { SetupSection } from '../../model/types'
import { useGoal, useMonthPlan, usePlan, usePlanResult } from '../../store/selectors'
import { SECTIONS, useUiStore } from '../../store/uiStore'
import { cn } from '../cn'
import { Badge } from '../components/feedback'
import { formatCurrency, formatPct, useMoney } from '../format'
import { AccountsSection } from './setup/AccountsSection'
import { AssumptionsSection } from './setup/AssumptionsSection'
import { BudgetSection } from './setup/BudgetSection'
import { CondoSection } from './setup/CondoSection'
import { GoalSection } from './setup/GoalSection'
import { PaySection } from './setup/PaySection'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const META: Record<SetupSection, { title: string; icon: LucideIcon; body: () => ReactNode }> = {
  pay: { title: 'Pay & benefits', icon: Landmark, body: PaySection },
  budget: { title: 'Budget', icon: Wallet, body: BudgetSection },
  accounts: { title: 'Accounts', icon: PiggyBank, body: AccountsSection },
  condo: { title: 'Condo', icon: Building2, body: CondoSection },
  goal: { title: 'Goal', icon: Goal, body: GoalSection },
  assumptions: { title: 'Assumptions & data', icon: Settings2, body: AssumptionsSection },
}

function useSummaries(): Record<SetupSection, string> {
  const plan = usePlan()
  const r = usePlanResult()
  const mp = useMonthPlan()
  const goal = useGoal()
  const { money, compact } = useMoney()
  const fx = plan.settings.fxCadPerUsd
  const gross = r.people.jerry.grossIncome + r.people.sophia.grossIncome
  const tax = (['jerry', 'sophia'] as const).reduce((s, id) => s + r.people[id].taxes.wageTotal + r.people[id].taxes.rsuTax + r.people[id].taxes.rentalTax, 0)
  const invested = plan.accounts.reduce((s, a) => s + toUSD(a.balance, a.currency, fx), 0)
  const rentals = Object.values(r.rentals)
  const cash = rentals.reduce((s, x) => s + x.cashFlowMonthlyUsd, 0) * fx
  const nr6 = rentals.reduce((s, x) => s + x.canadaTaxIfNoNr6 - x.canadaTaxWithNr6, 0)
  const a = plan.assumptions
  return {
    pay: `Take-home ${money(mp.takeHome.jerry + mp.takeHome.sophia)}/mo · tax ${formatPct(gross > 0 ? (tax / gross) * 100 : 0, 0)}`,
    budget: `Planned spending ${money(mp.total)}/mo · saving ${money(mp.savingTotal)}/mo`,
    accounts: `Invested ${money(invested)}`,
    condo: rentals.length
      ? `Cash flow ${formatCurrency(cash, 'CAD')}/mo${nr6 > 0.5 ? ` · NR6 saves ${formatCurrency(nr6, 'CAD')}/yr` : ''}`
      : 'No property',
    goal: `${compact(goal.target.today)} by ${MONTHS[goal.target.month - 1]} ${goal.target.year}`,
    assumptions: `${formatPct(a.stockReturnPct, 1)} returns · ${formatPct(a.inflationPct, 1)} inflation`,
  }
}

function Section({ id, open, onToggle, summary, placeholders }: { id: SetupSection; open: boolean; onToggle: () => void; summary: string; placeholders: number }) {
  const ref = useRef<HTMLElement>(null)
  const target = useUiStore((s) => s.section)
  const m = META[id]
  const Icon = m.icon
  const Body = m.body

  useEffect(() => {
    if (target === id) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [target, id])

  return (
    <section ref={ref} className="glass scroll-mt-24 rounded-2xl">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">{m.title}</span>
          <span className="num block truncate text-xs text-muted">{summary}</span>
        </span>
        {placeholders > 0 && <Badge tone="warning">{placeholders === 1 ? 'Placeholder' : `${placeholders} placeholders`}</Badge>}
        <ChevronDown size={16} className={cn('shrink-0 text-faint transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line p-5">
              <Body />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function SetupPage() {
  const plan = usePlan()
  const target = useUiStore((s) => s.section)
  const [open, setOpen] = useState<Set<SetupSection>>(() => new Set(target ? [target] : []))
  const [synced, setSynced] = useState(target)
  if (target !== synced) {
    setSynced(target)
    if (target && !open.has(target)) setOpen(new Set(open).add(target))
  }
  const summaries = useSummaries()
  const counts = {} as Record<SetupSection, number>
  for (const s of SECTIONS) counts[s] = plan.placeholders.filter((k) => PLACEHOLDERS[k]?.section === s).length

  return (
    <div className="space-y-3">
      {SECTIONS.map((id) => (
        <Section
          key={id}
          id={id}
          open={open.has(id)}
          summary={summaries[id]}
          placeholders={counts[id]}
          onToggle={() => {
            const next = new Set(open)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            setOpen(next)
          }}
        />
      ))}
    </div>
  )
}

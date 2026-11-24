import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import type { PageId } from './model/types'
import { flushSave, redo, undo, usePlanStore } from './store/planStore'
import { LocalStorageRepository } from './store/repository'
import { pageFromHash, useUiStore } from './store/uiStore'
import { AccountsPage } from './ui/pages/AccountsPage'
import { BudgetPage } from './ui/pages/BudgetPage'
import { GoalPage } from './ui/pages/GoalPage'
import { IncomePage } from './ui/pages/IncomePage'
import { OverviewPage } from './ui/pages/OverviewPage'
import { PropertyPage } from './ui/pages/PropertyPage'
import { SettingsPage } from './ui/pages/SettingsPage'
import { Sidebar } from './ui/shell/Sidebar'
import { TopBar } from './ui/shell/TopBar'

const repository = new LocalStorageRepository()

const PAGES: Record<PageId, () => ReactNode> = {
  overview: OverviewPage,
  income: IncomePage,
  budget: BudgetPage,
  accounts: AccountsPage,
  property: PropertyPage,
  goal: GoalPage,
  settings: SettingsPage,
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

export default function App() {
  const hydrated = usePlanStore((s) => s.hydrated)
  const theme = usePlanStore((s) => s.plan.settings.theme)
  const page = useUiStore((s) => s.page)

  useEffect(() => {
    void usePlanStore.getState().hydrate(repository)
    const onHash = () => useUiStore.setState({ page: pageFromHash(location.hash) })
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || isTyping(e.target)) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    const onUnload = () => void flushSave()
    addEventListener('hashchange', onHash)
    addEventListener('keydown', onKey)
    addEventListener('beforeunload', onUnload)
    return () => {
      removeEventListener('hashchange', onHash)
      removeEventListener('keydown', onKey)
      removeEventListener('beforeunload', onUnload)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])

  if (!hydrated) return null
  const Page = PAGES[page]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 pt-6 pb-20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Page />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

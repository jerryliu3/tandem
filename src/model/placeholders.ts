import type { Plan, SetupSection } from './types'

interface PlaceholderMeta {
  label: string
  section: SetupSection
  /** Picks the value(s) the key stands for; any change to it means the user has set it. */
  pick: (p: Plan) => unknown
}

export const PLACEHOLDERS: Record<string, PlaceholderMeta> = {
  'people.0.birthYear': { label: "Jerry's birth year", section: 'pay', pick: (p) => p.people[0]?.birthYear },
  'people.1.birthYear': { label: "Sophia's birth year", section: 'pay', pick: (p) => p.people[1]?.birthYear },
  'properties.0.us': { label: 'condo purchase price, year and land share (US depreciation)', section: 'condo', pick: (p) => p.properties[0]?.us },
  'properties.0.mortgage.annualRatePct': { label: 'condo mortgage interest rate', section: 'condo', pick: (p) => p.properties[0]?.mortgage.annualRatePct },
  goal: { label: 'retirement goal amount and date', section: 'goal', pick: (p) => p.goal },
  'accounts.balances': { label: 'current account balances', section: 'accounts', pick: (p) => p.accounts.map((a) => a.balance).join(',') },
}

export function clearTouchedPlaceholders(prev: Plan, next: Plan): string[] {
  return next.placeholders.filter((key) => {
    const meta = PLACEHOLDERS[key]
    return !meta || Object.is(meta.pick(prev), meta.pick(next))
  })
}

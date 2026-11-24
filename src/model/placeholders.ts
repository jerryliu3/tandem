import type { Plan } from './types'

/** Picks the value(s) a placeholder key stands for; any change to it means the user has set it. */
const SELECTORS: Record<string, (p: Plan) => unknown> = {
  'people.0.birthYear': (p) => p.people[0]?.birthYear,
  'people.1.birthYear': (p) => p.people[1]?.birthYear,
  'properties.0.us': (p) => p.properties[0]?.us,
  'properties.0.mortgage.annualRatePct': (p) => p.properties[0]?.mortgage.annualRatePct,
  goal: (p) => p.goal,
  'accounts.balances': (p) => p.accounts.map((a) => a.balance).join(','),
}

export function clearTouchedPlaceholders(prev: Plan, next: Plan): string[] {
  return next.placeholders.filter((key) => {
    const pick = SELECTORS[key]
    return !pick || Object.is(pick(prev), pick(next))
  })
}

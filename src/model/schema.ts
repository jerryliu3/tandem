import { createDefaultPlan } from './defaults'
import type { Plan } from './types'

export const SCHEMA_VERSION = 1 as const

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

/** Fill keys missing from `value` using `fallback`, recursing into plain objects. Arrays are kept as-is. */
function fillMissing<T>(value: unknown, fallback: T): T {
  if (Array.isArray(fallback)) return (Array.isArray(value) ? value : fallback) as T
  if (isRecord(fallback)) {
    if (!isRecord(value)) return fallback
    const out: Record<string, unknown> = { ...value }
    for (const [key, fb] of Object.entries(fallback)) {
      out[key] = key in value ? fillMissing(value[key], fb) : fb
    }
    return out as T
  }
  if (fallback === null) return (value === undefined ? fallback : value) as T
  return (typeof value === typeof fallback ? value : fallback) as T
}

/** Validate and upgrade an unknown blob (localStorage, imported JSON) into a Plan. */
export function migratePlan(raw: unknown): Plan {
  const defaults = createDefaultPlan()
  if (!isRecord(raw) || !isRecord(raw.settings) || !Array.isArray(raw.people)) return defaults

  const plan = fillMissing(raw, defaults)
  const rawPeople = raw.people as unknown[]
  plan.people = [
    fillMissing(rawPeople[0], defaults.people[0]),
    fillMissing(rawPeople[1], defaults.people[1]),
  ]
  plan.properties = plan.properties.map((p, i) => fillMissing(p, defaults.properties[Math.min(i, 0)]))
  plan.debts = plan.debts.map((d) => ({ ...d, balance: typeof d.balance === 'number' ? d.balance : null }))
  plan.schemaVersion = SCHEMA_VERSION
  return plan
}

import type { Plan } from '../model/types'
import { migratePlan } from '../model/schema'

/** Storage boundary: LocalStorage today, Supabase later. */
export interface PlanRepository {
  load(): Promise<Plan | null>
  save(plan: Plan): Promise<void>
}

export const STORAGE_KEY = 'tandem.plan.v1'

export class LocalStorageRepository implements PlanRepository {
  private readonly storage: Storage | undefined
  private readonly key: string

  constructor(storage?: Storage, key = STORAGE_KEY) {
    this.storage = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    this.key = key
  }

  async load(): Promise<Plan | null> {
    const raw = this.storage?.getItem(this.key)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return null
      return migratePlan(parsed)
    } catch {
      return null
    }
  }

  async save(plan: Plan): Promise<void> {
    this.storage?.setItem(this.key, JSON.stringify(plan))
  }
}

export class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
}

import type { Plan } from '../model/types'
import { migratePlan } from '../model/schema'

/** Storage boundary: LocalStorage today, Supabase later. */
export interface PlanRepository {
  load(): Promise<Plan | null>
  save(plan: Plan): Promise<void>
  /** Set when the last load found data it couldn't read (and so returned null). */
  readonly lastLoadError?: string | null
}

export const STORAGE_KEY = 'tandem.plan.v1'

export class LocalStorageRepository implements PlanRepository {
  private readonly storage: Storage | undefined
  private readonly key: string

  constructor(storage?: Storage, key = STORAGE_KEY) {
    this.storage = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
    this.key = key
  }

  lastLoadError: string | null = null

  async load(): Promise<Plan | null> {
    this.lastLoadError = null
    const raw = this.storage?.getItem(this.key)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
      return migratePlan(parsed)
    } catch {
      // Keep the unreadable copy: the next autosave will overwrite the main key.
      const backupKey = `${this.key}.unreadable`
      this.storage?.setItem(backupKey, raw)
      this.lastLoadError = `Your saved plan couldn’t be read, so Tandem started from the sheet defaults. The original data is kept in this browser’s localStorage under “${backupKey}”.`
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

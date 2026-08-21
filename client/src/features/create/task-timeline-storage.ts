import type { TaskTimelineEntry } from './task-timeline'

const DB_NAME = 'seedance-create-history'
const STORE_NAME = 'timelines'
const DB_VERSION = 1

export const timelineStorageKey = (userId: string): string | null => {
  const normalized = userId.trim()
  return normalized ? `seedance:create-timeline:${normalized}` : null
}

type TimelineRecord = { userId: string; entries: TaskTimelineEntry[] }

const readLocal = (userId: string): TaskTimelineEntry[] => {
  const key = timelineStorageKey(userId)
  if (!key || typeof localStorage === 'undefined') return []
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as TaskTimelineEntry[] : []
  } catch {
    return []
  }
}

const writeLocal = (userId: string, entries: TaskTimelineEntry[]): void => {
  const key = timelineStorageKey(userId)
  if (!key || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(entries))
  } catch {
    // Data URLs can exceed localStorage limits; IndexedDB remains the primary store.
  }
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'userId' })
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export const loadTimelineEntries = async (userId: string): Promise<TaskTimelineEntry[]> => {
  if (!timelineStorageKey(userId)) return []
  if (typeof indexedDB === 'undefined') return readLocal(userId)
  try {
    const db = await openDatabase()
    const result = await new Promise<TimelineRecord | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(userId)
      request.onsuccess = () => resolve(request.result as TimelineRecord | undefined)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return result?.entries ?? []
  } catch {
    return readLocal(userId)
  }
}

export const saveTimelineEntries = async (userId: string, entries: TaskTimelineEntry[]): Promise<void> => {
  if (!timelineStorageKey(userId)) return
  if (typeof indexedDB === 'undefined') {
    writeLocal(userId, entries)
    return
  }
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ userId, entries } satisfies TimelineRecord)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    db.close()
  } catch {
    writeLocal(userId, entries)
  }
}

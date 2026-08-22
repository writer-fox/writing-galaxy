/**
 * 本地持久化封装（MVP 用 localStorage）。
 * 后续若章节正文超限或需多端同步，可替换为 IndexedDB 或后端接口，调用方无需改动。
 */

const PREFIX = 'wx-data.'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (!isBrowser()) return
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 超限或隐私模式：静默失败，保持内存态
  }
}

export function clearStorage(key: string) {
  if (!isBrowser()) return
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

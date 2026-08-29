/**
 * 数据出口。
 * - Electron 桌面环境下: 通过 window.wxAPI(IPC) 访问本地 SQLite，无需后端进程。
 * - 浏览器预览环境下: 回退到旧 REST 后端(便于纯 Web 调试)。
 * store/组件只依赖下方 api 对象的方法签名，不感知来源。
 */

/** Electron IPC 客户端经 contextBridge 暴露的对象形态 */
declare global {
  interface Window {
    wxAPI?: {
      works: { list: () => Promise<any[]>; create: (t: string, g?: string, s?: string) => Promise<any>; get: (id: number) => Promise<any> }
      chapters: { listByWork: (wid: number) => Promise<any[]>; get: (id: number) => Promise<any>; create: (wid: number, t?: string, a?: number) => Promise<any>; update: (id: number, p: any) => Promise<any>; remove: (wid: number, id: number) => Promise<any> }
      characters: { list: (wid: number) => Promise<any[]>; create: (wid: number, d: any) => Promise<any>; update: (id: number, d: any) => Promise<any>; remove: (id: number) => Promise<any> }
      factions: { list: (wid: number) => Promise<any[]>; create: (wid: number, d: any) => Promise<any>; update: (id: number, d: any) => Promise<any>; remove: (id: number) => Promise<any> }
      relationships: { list: (wid: number) => Promise<any[]>; create: (wid: number, d: any) => Promise<any>; confirm: (id: number) => Promise<any>; remove: (id: number) => Promise<any> }
      outline: { list: (wid: number) => Promise<any[]>; get: (id: number) => Promise<any>; create: (wid: number, d: any) => Promise<any>; update: (id: number, d: any) => Promise<any>; remove: (id: number) => Promise<any> }
      graph: { get: (wid: number, mode: any, sort?: number) => Promise<any> }
      ai: { status: () => Promise<any>; outline: (wid: number) => Promise<any>; analyzeChapter: (cid: number) => Promise<any> }
      meta: { platform: string }
    }
  }
}

const BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8080'

/* ================= 本地 IPC 实现 ================= */
const ipc = (): NonNullable<Window['wxAPI']> | null =>
  typeof window !== 'undefined' && window.wxAPI ? window.wxAPI : null

/* ================= 远端 REST 实现(浏览器回退) ================= */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (!res.ok) {
    let msg = `API ${path} → ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) msg = body.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ---------- 类型 ---------- */
export interface Work { id: number; title: string; genre: string | null; summary: string | null; createdAt?: string; updatedAt?: string }
export interface ChapterBackend { id: number; workId: number; sortOrder: number; title: string; content: string; wordCount: number; status: number; analyzedAt: string | null }
export interface Character { id: number; workId: number; name: string; aliases: string; factionId: number | null; role: string | null; description: string | null; avatarColor: string | null; importance: number; firstSortOrder: number; lastActiveSortOrder: number | null; status: string | null; confirmed: boolean }
export interface Faction { id: number; workId: number; name: string; parentFactionId: number | null; type: string | null; description: string | null; color: string | null; importance: number; firstSortOrder: number; lastActiveSortOrder: number | null }
export type EntityType = 'character' | 'faction'
export interface Relationship { id: number; workId: number; fromId: number; fromType: EntityType; toId: number; toType: EntityType; relType: string; strength: number; startSortOrder: number; endSortOrder: number | null; note: string | null; confirmed: boolean }
export interface OutlineNode { id: number; workId: number; parentId: number | null; level: number; refSortOrder: number | null; title: string | null; content: string | null; sortOrder: number }

export const api = {
  works: {
    list: async (): Promise<Work[]> => {
      const c = ipc(); if (c) return c.works.list(); return req('/api/works')
    },
    create: async (title: string, genre?: string, summary?: string): Promise<Work> => {
      const c = ipc(); if (c) return c.works.create(title, genre, summary)
      return req('/api/works', { method: 'POST', body: JSON.stringify({ title, genre, summary }) })
    },
    get: async (id: number): Promise<Work> => {
      const c = ipc(); if (c) return c.works.get(id); return req(`/api/works/${id}`)
    },
  },
  chapters: {
    listByWork: async (workId: number): Promise<ChapterBackend[]> => {
      const c = ipc(); if (c) return c.chapters.listByWork(workId); return req(`/api/works/${workId}/tree`)
    },
    get: async (id: number): Promise<ChapterBackend> => {
      const c = ipc(); if (c) return c.chapters.get(id); return req(`/api/chapters/${id}`)
    },
    create: async (workId: number, title?: string, afterSortOrder?: number): Promise<ChapterBackend> => {
      const c = ipc(); if (c) return c.chapters.create(workId, title, afterSortOrder)
      return req(`/api/chapters?workId=${workId}`, { method: 'POST', body: JSON.stringify({ title, afterSortOrder }) })
    },
    update: async (id: number, patch: { title?: string; content?: string; status?: number }): Promise<ChapterBackend> => {
      const c = ipc(); if (c) return c.chapters.update(id, patch)
      return req(`/api/chapters/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
    },
    remove: async (id: number, workId: number): Promise<{ deleted: boolean }> => {
      const c = ipc(); if (c) return c.chapters.remove(workId, id)
      return req(`/api/chapters/${id}?workId=${workId}`, { method: 'DELETE' })
    },
  },
  characters: {
    list: async (workId: number): Promise<Character[]> => {
      const c = ipc(); if (c) return c.characters.list(workId); return req(`/api/works/${workId}/characters`)
    },
    create: async (workId: number, data: any): Promise<Character> => {
      const c = ipc(); if (c) return c.characters.create(workId, data)
      return req(`/api/works/${workId}/characters`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any): Promise<Character> => {
      const c = ipc(); if (c) return c.characters.update(id, data)
      return req(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    remove: async (id: number): Promise<{ deleted: boolean }> => {
      const c = ipc(); if (c) return c.characters.remove(id)
      return req(`/api/characters/${id}`, { method: 'DELETE' })
    },
  },
  factions: {
    list: async (workId: number): Promise<Faction[]> => {
      const c = ipc(); if (c) return c.factions.list(workId); return req(`/api/works/${workId}/factions`)
    },
    create: async (workId: number, data: any): Promise<Faction> => {
      const c = ipc(); if (c) return c.factions.create(workId, data)
      return req(`/api/works/${workId}/factions`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any): Promise<Faction> => {
      const c = ipc(); if (c) return c.factions.update(id, data)
      return req(`/api/factions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    remove: async (id: number): Promise<{ deleted: boolean }> => {
      const c = ipc(); if (c) return c.factions.remove(id)
      return req(`/api/factions/${id}`, { method: 'DELETE' })
    },
  },
  relationships: {
    list: async (workId: number): Promise<Relationship[]> => {
      const c = ipc(); if (c) return c.relationships.list(workId); return req(`/api/works/${workId}/relationships`)
    },
    create: async (workId: number, data: any): Promise<Relationship> => {
      const c = ipc(); if (c) return c.relationships.create(workId, data)
      return req(`/api/works/${workId}/relationships`, { method: 'POST', body: JSON.stringify(data) })
    },
    confirm: async (id: number): Promise<Relationship> => {
      const c = ipc(); if (c) return c.relationships.confirm(id)
      return req(`/api/relationships/${id}/confirm`, { method: 'PUT' })
    },
    remove: async (id: number): Promise<{ deleted: boolean }> => {
      const c = ipc(); if (c) return c.relationships.remove(id)
      return req(`/api/relationships/${id}`, { method: 'DELETE' })
    },
  },
  outline: {
    list: async (workId: number): Promise<OutlineNode[]> => {
      const c = ipc(); if (c) return c.outline.list(workId); return req(`/api/works/${workId}/outline`)
    },
    get: async (id: number): Promise<OutlineNode> => {
      const c = ipc(); if (c) return c.outline.get(id); return req(`/api/outline/${id}`)
    },
    create: async (workId: number, data: any): Promise<OutlineNode> => {
      const c = ipc(); if (c) return c.outline.create(workId, data)
      return req(`/api/works/${workId}/outline`, { method: 'POST', body: JSON.stringify(data) })
    },
    update: async (id: number, data: any): Promise<OutlineNode> => {
      const c = ipc(); if (c) return c.outline.update(id, data)
      return req(`/api/outline/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    remove: async (id: number): Promise<{ deleted: boolean }> => {
      const c = ipc(); if (c) return c.outline.remove(id)
      return req(`/api/outline/${id}`, { method: 'DELETE' })
    },
  },
  graph: {
    get: async (workId: number, mode: 'god' | 'timeline', sort?: number): Promise<any> => {
      const c = ipc(); if (c) return c.graph.get(workId, mode, sort ?? undefined)
      return req(`/api/works/${workId}/graph?mode=${mode}${sort != null ? `&sort=${sort}` : ''}`)
    },
  },
  ai: {
    status: async (): Promise<{ configured: boolean; summary: string }> => {
      const c = ipc(); if (c) return c.ai.status(); return req('/api/ai/status')
    },
    outline: async (workId: number): Promise<{ result: string }> => {
      const c = ipc(); if (c) return c.ai.outline(workId)
      return req('/api/ai/outline', { method: 'POST', body: JSON.stringify({ workId }) })
    },
    analyzeChapter: async (chapterId: number): Promise<{ result: string }> => {
      const c = ipc(); if (c) return c.ai.analyzeChapter(chapterId)
      return req('/api/ai/analyze-chapter', { method: 'POST', body: JSON.stringify({ chapterId }) })
    },
  },
}

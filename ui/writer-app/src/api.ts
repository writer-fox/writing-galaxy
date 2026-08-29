/**
 * 后端 REST 客户端（唯一数据出口）。字段命名与后端 record 序列化结果(camelCase)对齐。
 * 生产可通过 VITE_API_BASE 指向部署地址。
 */
const BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8080'

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
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ---------- 基础类型（对齐后端 record / 方案 4.2） ---------- */
export interface Work {
  id: number
  title: string
  genre: string | null
  summary: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ChapterBackend {
  id: number
  workId: number
  sortOrder: number
  title: string
  content: string
  wordCount: number
  status: number
  analyzedAt: string | null
}

export interface Character {
  id: number
  workId: number
  name: string
  aliases: string
  factionId: number | null
  role: string | null
  description: string | null
  avatarColor: string | null
  importance: number
  firstSortOrder: number
  lastActiveSortOrder: number | null
  status: string | null
  confirmed: boolean
}

export interface Faction {
  id: number
  workId: number
  name: string
  parentFactionId: number | null
  type: string | null
  description: string | null
  color: string | null
  importance: number
  firstSortOrder: number
  lastActiveSortOrder: number | null
}

export type EntityType = 'character' | 'faction'

export interface Relationship {
  id: number
  workId: number
  fromId: number
  fromType: EntityType
  toId: number
  toType: EntityType
  relType: string
  strength: number
  startSortOrder: number
  endSortOrder: number | null
  note: string | null
  confirmed: boolean
}

export interface OutlineNode {
  id: number
  workId: number
  parentId: number | null
  level: number
  refSortOrder: number | null
  title: string | null
  content: string | null
  sortOrder: number
}

export const api = {
  works: {
    list: () => req<Work[]>('/api/works'),
    create: (title: string, genre?: string, summary?: string) =>
      req<Work>('/api/works', { method: 'POST', body: JSON.stringify({ title, genre, summary }) }),
    get: (id: number) => req<Work>(`/api/works/${id}`),
  },
  chapters: {
    listByWork: (workId: number) => req<ChapterBackend[]>(`/api/works/${workId}/tree`),
    create: (workId: number, title?: string, afterSortOrder?: number) =>
      req<ChapterBackend>(`/api/chapters?workId=${workId}`, {
        method: 'POST',
        body: JSON.stringify({ title, afterSortOrder }),
      }),
    update: (id: number, patch: { title?: string; content?: string; status?: number }) =>
      req<ChapterBackend>(`/api/chapters/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    remove: (id: number, workId: number) =>
      req<{ deleted: boolean }>(`/api/chapters/${id}?workId=${workId}`, { method: 'DELETE' }),
  },
  characters: {
    list: (workId: number) => req<Character[]>(`/api/works/${workId}/characters`),
    create: (
      workId: number,
      data: Partial<Pick<Character, 'name' | 'aliases' | 'factionId' | 'role' | 'description' | 'avatarColor' | 'importance' | 'firstSortOrder' | 'status'>>
    ) => req<Character>(`/api/works/${workId}/characters`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Omit<Character, 'id' | 'workId'>>) =>
      req<Character>(`/api/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => req<{ deleted: boolean }>(`/api/characters/${id}`, { method: 'DELETE' }),
  },
  factions: {
    list: (workId: number) => req<Faction[]>(`/api/works/${workId}/factions`),
    create: (workId: number, data: Partial<Pick<Faction, 'name' | 'parentFactionId' | 'type' | 'description' | 'color' | 'importance' | 'firstSortOrder'>>) =>
      req<Faction>(`/api/works/${workId}/factions`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Omit<Faction, 'id' | 'workId'>>) =>
      req<Faction>(`/api/factions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => req<{ deleted: boolean }>(`/api/factions/${id}`, { method: 'DELETE' }),
  },
  relationships: {
    list: (workId: number) => req<Relationship[]>(`/api/works/${workId}/relationships`),
    create: (workId: number, data: Partial<Omit<Relationship, 'id' | 'workId' | 'confirmed'>>) =>
      req<Relationship>(`/api/works/${workId}/relationships`, { method: 'POST', body: JSON.stringify(data) }),
    confirm: (id: number) => req<Relationship>(`/api/relationships/${id}/confirm`, { method: 'PUT' }),
    remove: (id: number) => req<{ deleted: boolean }>(`/api/relationships/${id}`, { method: 'DELETE' }),
  },
  outline: {
    list: (workId: number) => req<OutlineNode[]>(`/api/works/${workId}/outline`),
    create: (workId: number, data: Partial<Omit<OutlineNode, 'id' | 'workId'>>) =>
      req<OutlineNode>(`/api/works/${workId}/outline`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Omit<OutlineNode, 'id' | 'workId'>>) =>
      req<OutlineNode>(`/api/outline/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => req<{ deleted: boolean }>(`/api/outline/${id}`, { method: 'DELETE' }),
  },
  graph: {
    get: (workId: number, mode: 'god' | 'timeline', sort?: number) =>
      req<any>(`/api/works/${workId}/graph?mode=${mode}${sort != null ? `&sort=${sort}` : ''}`),
  },
  ai: {
    status: () => req<{ configured: boolean; summary: string }>('/api/ai/status'),
    outline: (workId: number) =>
      req<{ result: string }>('/api/ai/outline', { method: 'POST', body: JSON.stringify({ workId }) }),
    analyzeChapter: (chapterId: number) =>
      req<{ result: string }>('/api/ai/analyze-chapter', { method: 'POST', body: JSON.stringify({ chapterId }) }),
  },
}

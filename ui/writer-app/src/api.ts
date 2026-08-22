/**
 * 后端 REST 客户端（开发期指向本机 Spring Boot）。
 * 生产可将 VITE_API_BASE 指向部署地址。
 */
const BASE = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:8080'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return (await res.json()) as T
}

export const api = {
  works: {
    list: () => req<any[]>(`/api/works`),
  },
  graph: {
    get: (workId: number, mode: 'god' | 'timeline', sort?: number) =>
      req<any>(`/api/works/${workId}/graph?mode=${mode}${sort != null ? `&sort=${sort}` : ''}`),
  },
}

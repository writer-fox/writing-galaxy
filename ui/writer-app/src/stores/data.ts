import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { api, type ChapterBackend } from '../api'
import { loadFromStorage, saveToStorage } from './persistence'

/* ---------- 类型（对齐技术方案 4.2） ---------- */
export type ChapterStatus = '草稿' | '完成' | '已分析'

export interface Chapter {
  id: string // 展示用 key（back: c{id}）；真实 id 在 rawId
  rawId?: number // 后端章节 id
  workId?: number
  sortOrder: number // 后端 sort_order
  title: string
  content: string
  status: ChapterStatus
}

export interface OutlineItem {
  id: string
  level: 0 | 1 | 2
  title: string
  desc?: string
  refSortOrder?: number
  pending?: boolean
}

export interface Note {
  id: string
  type: string
  title: string
}

/* ---------- 数据来源 ---------- */
const SEED_NOTES: Note[] = [{ id: 'n1', type: '元门 · 待确认', title: '元门 · 待确认' }]

/** 大纲初始值：优先取本地缓存，否则空（由后端在加载时填充）。 */
function backendOutline(): OutlineItem[] {
  return loadFromStorage<OutlineItem[]>('outline', [])
}

/** 展示标题：由 sortOrder 直接拼出「第 N 章 · 名」。 */
export function chapterLabel(ch: Pick<Chapter, 'sortOrder' | 'title'>): string {
  return `第 ${ch.sortOrder} 章 · ${ch.title}`
}

const STATUS_KEYS: Record<number, ChapterStatus> = { 0: '草稿', 1: '完成', 2: '已分析' }

export const useDataStore = defineStore('data', () => {
  const chapters = ref<Chapter[]>([])
  const outline = ref<OutlineItem[]>(backendOutline())
  const notes = ref<Note[]>(loadFromStorage('notes', SEED_NOTES))
  const loadingChapters = ref(false)
  const lastWorkId = ref<number | null>(null)

  // 章节持久化到后端（若尚未接后端则不持久化，避免误清）
  watch(chapters, (v) => saveToStorage('chapters', v), { deep: true })
  watch(outline, (v) => saveToStorage('outline', v), { deep: true })
  watch(notes, (v) => saveToStorage('notes', v), { deep: true })

  /** 从后端章节数组导入到本地状态（保持 1..N 排序与展示 key）。 */
  function importFromBackend(list: ChapterBackend[]) {
    chapters.value = list
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        id: 'c' + c.id,
        rawId: c.id,
        workId: c.workId,
        sortOrder: c.sortOrder,
        title: c.title,
        content: c.content,
        status: STATUS_KEYS[c.status] || '草稿',
      }))
    if (list.length) lastWorkId.value = list[0].workId
  }

  /** 当前按 sortOrder 升序排序后的章节。 */
  const sortedChapters = computed(() =>
    [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )

  function chapterById(id: string): Chapter | undefined {
    return chapters.value.find((c) => c.id === id)
  }

  /** 新建章节：插入到 sortOrder 为 afterSortOrder 之后；后端负责 compact 重排。 */
  async function addChapter(afterSortOrder?: number): Promise<Chapter> {
    const wid = lastWorkId.value
    if (wid == null) {
      const ch: Chapter = { id: 'tmp-' + Date.now(), sortOrder: chapters.value.length + 1, title: '新章节', content: '', status: '草稿' }
      chapters.value = [...chapters.value, ch]
      return ch
    }
    try {
      const created = await api.chapters.create(wid, '新章节', afterSortOrder)
      await importFromBackend(await api.chapters.listByWork(wid))
      const c = chapterById('c' + created.id)
      return c || { id: 'c' + created.id, sortOrder: created.sortOrder, title: created.title, content: '', status: '草稿' }
    } catch (e: any) {
      console.error('addChapter 失败', e)
      const ch: Chapter = { id: 'tmp-' + Date.now(), sortOrder: chapters.value.length + 1, title: '新章节', content: '', status: '草稿' }
      chapters.value = [...chapters.value, ch]
      return ch
    }
  }

  /** 删除章节（后端删除并重排）。返回是否成功。 */
  async function removeChapter(id: string): Promise<boolean> {
    const c = chapterById(id)
    if (!c) return false
    if (c.rawId != null && c.workId != null) {
      try {
        await api.chapters.remove(c.rawId, c.workId)
        await importFromBackend(await api.chapters.listByWork(c.workId))
        return true
      } catch (e: any) {
        console.error('removeChapter 失败', e)
        return false
      }
    }
    chapters.value = chapters.value.filter((x) => x.id !== id)
    return true
  }

  /** 把全部章节坐标压实为 1..N（后端已自动压实，这里同步本地展示）。 */
  async function renumber() {
    if (!chapters.value.length) return
    const wid = chapters.value[0].workId
    if (wid != null) {
      try {
        await importFromBackend(await api.chapters.listByWork(wid))
      } catch (e) { console.error('renumber 失败', e) }
    } else {
      const sorted = [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
      sorted.forEach((c, i) => (c.sortOrder = i + 1))
    }
  }

  function setTitle(id: string, title: string) {
    const c = chapterById(id)
    if (!c) return
    c.title = title || '未命名'
    if (c.rawId != null) {
      api.chapters.update(c.rawId, { title: title || '未命名' }).catch((e) => console.error('存标题失败', e))
    }
  }

  function setContent(id: string, content: string) {
    const c = chapterById(id)
    if (!c) return
    c.content = content
    c.status = '草稿'
    if (c.rawId != null) {
      api.chapters.update(c.rawId, { content, status: 0 }).catch((e) => console.error('存正文失败', e))
    }
  }

  return {
    chapters,
    sortedChapters,
    outline,
    notes,
    loadingChapters,
    lastWorkId,
    importFromBackend,
    chapterById,
    addChapter,
    removeChapter,
    renumber,
    setTitle,
    setContent,
  }
})

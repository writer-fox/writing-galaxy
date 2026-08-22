import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { loadFromStorage, saveToStorage } from './persistence'

/* ---------- 类型（对齐技术方案 4.2） ---------- */
export type ChapterStatus = '草稿' | '完成' | '已分析'

export interface Chapter {
  id: string // 稳定唯一 id，供 tab / 引用（不随排序漂移）
  sortOrder: number // 唯一排序坐标，作为时间轴基准；重排时紧凑化（1,2,3…）
  title: string // 章节名（不含"第 N 章"前缀，前缀由 sortOrder 展示层拼出）
  content: string
  status: ChapterStatus
}

export interface OutlineItem {
  id: string
  level: 0 | 1 | 2
  title: string
  desc?: string
  refSortOrder?: number // 章纲关联章节坐标
  pending?: boolean
}

export interface Note {
  id: string
  type: string
  title: string
}

/* ---------- 初始示例数据 ---------- */
function seedChapters(): Chapter[] {
  return [
    { id: 'c1', sortOrder: 1, title: '风起', status: '完成', content: '风从未知的北方来，带着铁器与尘土的气息。\n\n客栈楼板的旧酒味里，应无涯压低声音："元门的人已经过了青岭。你还有一夜。"\n\n林动没有答话，只是把桌上的油灯压得更低了些。趁夜，是他早就盘算好的退路。' },
    { id: 'c2', sortOrder: 2, title: '叛门', status: '完成', content: '夜色像一匹浸了墨的绢帛，低低地压在元门的青石阶上。\n\n林动手心的传讯玉简微微发烫，那上头只有一行字——「速走，勿回头」。\n\n他不知道这是谁递出来的消息。这五年来，他把自己活成一柄待鞘的刀，沉在元门最不起眼的杂役房。可他终究还是被看到了。当四长老的指印落在他肩头，他忽然明白，有些人注定藏不住。' },
    { id: 'c3', sortOrder: 3, title: '反目', status: '草稿', content: '' },
  ]
}

function seedOutline(): OutlineItem[] {
  return [
    { id: 'o1', level: 0, title: '少年磨砺 · 逆命崛起' },
    { id: 'o2', level: 1, title: '第二卷 · 云起' },
    { id: 'o3', level: 2, title: '叛门', refSortOrder: 2, desc: '冲突前置（揪心）· 教众质疑 → 长老出手 → 退门令 · 预告下卷暗线' },
    { id: 'o4', level: 2, title: '反目', pending: true },
  ]
}

const SEED_NOTES: Note[] = [{ id: 'n1', type: '元门 · 待确认', title: '元门 · 待确认' }]

/** 展示标题：由 sortOrder 直接拼出「第 N 章 · 名」。 */
export function chapterLabel(ch: Pick<Chapter, 'sortOrder' | 'title'>): string {
  return `第 ${ch.sortOrder} 章 · ${ch.title}`
}

export const useDataStore = defineStore('data', () => {
  // 版本/结构校验：旧版对象（无 id 字段）视为需重置，避免脏数据
  const initialChapters = (): Chapter[] => {
    const cands = loadFromStorage<Chapter[]>('chapters', seedChapters())
    const valid =
      Array.isArray(cands) &&
      cands.length > 0 &&
      cands.every((c) => c && typeof c.id === 'string' && typeof c.sortOrder === 'number')
    return valid ? cands : seedChapters()
  }
  const chapters = ref<Chapter[]>(initialChapters())
  const outline = ref<OutlineItem[]>(loadFromStorage('outline', seedOutline()))
  const notes = ref<Note[]>(loadFromStorage('notes', SEED_NOTES))

  // 自动持久化
  watch(
    chapters,
    (v) => saveToStorage('chapters', v),
    { deep: true }
  )
  watch(outline, (v) => saveToStorage('outline', v), { deep: true })
  watch(notes, (v) => saveToStorage('notes', v), { deep: true })

  /** 当前按 sortOrder 升序排序后的章节。 */
  const sortedChapters = computed(() =>
    [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )

  function chapterById(id: string): Chapter | undefined {
    return chapters.value.find((c) => c.id === id)
  }

  function nextId(): string {
    const max = chapters.value.reduce((m, c) => Math.max(m, parseInt(c.id.slice(1), 10) || 0), 0)
    return `c${max + 1}`
  }

  /** 立即把所有章节坐标紧凑化为 1,2,3…（按当前列表顺序）。 */
  function renumber() {
    const sorted = [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
    sorted.forEach((c, i) => (c.sortOrder = i + 1))
  }

  /**
   * 新建章节，插入到 sortOrder 为 afterSortOrder 的章节之后（省略则追加末尾）。
   * 插入后对全部章节做一次紧凑重排，保证坐标唯一连续（1,2,3…）。
   */
  function addChapter(afterSortOrder?: number): Chapter {
    const ch: Chapter = {
      id: nextId(),
      sortOrder: 0,
      title: '新章节',
      content: '',
      status: '草稿',
    }
    const sorted = [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
    let insIdx = sorted.length
    if (afterSortOrder !== undefined) {
      insIdx = sorted.findIndex((c) => c.sortOrder > afterSortOrder)
      if (insIdx === -1) insIdx = sorted.length
    }
    sorted.splice(insIdx, 0, ch)
    sorted.forEach((c, i) => (c.sortOrder = i + 1))
    chapters.value = sorted
    return ch
  }

  /** 删除章节并紧凑重排。返回是否删除成功。 */
  function removeChapter(id: string): boolean {
    const idx = chapters.value.findIndex((c) => c.id === id)
    if (idx === -1) return false
    chapters.value.splice(idx, 1)
    renumber()
    return true
  }

  function setTitle(id: string, title: string) {
    const c = chapterById(id)
    if (c) c.title = title || '未命名'
  }

  function setContent(id: string, content: string) {
    const c = chapterById(id)
    if (!c) return
    c.content = content
    c.status = '草稿'
  }

  return {
    chapters,
    sortedChapters,
    outline,
    notes,
    chapterById,
    addChapter,
    removeChapter,
    renumber,
    setTitle,
    setContent,
  }
})

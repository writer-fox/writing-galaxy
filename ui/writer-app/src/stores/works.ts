import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, type ChapterBackend, type Work } from '../api'
import { useDataStore } from './data'
import { useGraphStore } from './graph'
import { useCastStore } from './cast'

/** 作品与章节数据从后端驱动的来源。作品库 = 列表 + 切换 + 加载章节。 */
export const useWorksStore = defineStore('works', () => {
  const works = ref<Work[]>([])
  const currentWork = ref<Work | null>(null)
  const currentWorkId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadWorks() {
    loading.value = true
    error.value = null
    try {
      works.value = await api.works.list()
    } catch (e: any) {
      error.value = String(e?.message || e)
    } finally {
      loading.value = false
    }
  }

  async function createWork(title: string, genre?: string, summary?: string) {
    const w = await api.works.create(title, genre, summary)
    works.value = [...works.value, w]
    await selectWork(w)
    return w
  }

  async function selectWork(work: Work) {
    currentWork.value = work
    currentWorkId.value = work.id
    await loadChaptersForWork(work.id)
    // 同步图数据
    const graph = useGraphStore()
    graph.setWork(work.id)
    await graph.load('god', null).catch(() => {})
    // 同步设定集
    const cast = useCastStore()
    await cast.load(work.id).catch(() => {})
  }

  /** 把后端章节加载为前端 data store 可消费的形态，并重置 sort_order 重排。 */
  async function loadChaptersForWork(workId: number) {
    const data = useDataStore()
    data.loadingChapters = true
    try {
      const chapters: ChapterBackend[] = await api.chapters.listByWork(workId)
      data.importFromBackend(chapters)
    } finally {
      data.loadingChapters = false
    }
  }

  /** 初始化：自动选中第一个作品（若无则建一个占位空作品）。 */
  async function init() {
    if (currentWorkId.value != null) return
    try {
      await loadWorks()
      if (works.value.length) {
        await selectWork(works.value[0])
      } else {
        const w = await api.works.create('未命名作品')
        await selectWork(w)
      }
    } catch (e: any) {
      error.value = String(e?.message || e)
    }
  }

  return {
    works, currentWork, currentWorkId, loading, error,
    loadWorks, createWork, selectWork, init,
  }
})

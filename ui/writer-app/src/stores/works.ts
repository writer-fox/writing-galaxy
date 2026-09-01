import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, type ChapterBackend } from '../api'
import { useDataStore } from './data'
import { useGraphStore } from './graph'
import { useCastStore } from './cast'

/** 作品库：每本书 = 一个文件夹 + 独立库。列表 = 扫描作品根目录；选中 = 打开该库。 */
export const useWorksStore = defineStore('works', () => {
  const works = ref<any[]>([])
  const currentWork = ref<any | null>(null)
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
    await loadWorks()
    await selectWork(w)
    return w
  }

  /** 打开一个已存在的文件夹为作品；若该文件夹无 work.db，则初始化为新书 */
  async function openExisting(dir: string) {
    const r = await api.works.open(dir, false)
    if (r && r.needInit) {
      // 提示再确认初始化——此处简化为直接初始化
      const r2 = await api.works.open(dir, true)
      return completeOpen(dir, r2)
    }
    return completeOpen(dir, r)
  }

  // 统一处理打开后的加载
  async function completeOpen(dir: string, r: any) {
    if (!r || r.ok === false) { error.value = (r && r.error) || '打开失败'; return null }
    // 刷新列表并取该书元信息
    await loadWorks()
    const found = works.value.find((w: any) => String(w.dbPath) === String(dir + (dir.endsWith('/') ? '' : '/') + 'work.db') || String(w.dir) === dir)
    const target = found || { dir, dbPath: dir, title: dir.split(/[\\/]/).pop() || '作品' }
    await selectWork(target)
    return target
  }

  async function selectWork(work: any) {
    const r = await api.works.open(work.dbPath, true)
    if (!r || r.ok === false && !r.needInit) {
      error.value = (r && r.error) || '打开作品失败'
      return
    }
    currentWork.value = work
    // 每库一行 work(id 恒为当前书 id，前端存 1)；IPC 层按当前打开库解析，不再依赖此值
    currentWorkId.value = 1
    // 加载章节到 data store
    const data = useDataStore()
    data.loadingChapters = true
    try {
      const chapters: ChapterBackend[] = await api.chapters.listByWork(1)
      data.importFromBackend(chapters)
      await data.loadVolumes(1).catch(() => {})
    } finally { data.loadingChapters = false }
    // 同步图数据
    const graph = useGraphStore()
    await graph.load('god', null).catch(() => {})
    // 同步设定集
    const cast = useCastStore()
    await cast.load(1).catch(() => {})
  }

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
    loadWorks, createWork, selectWork, openExisting, init,
  }
})

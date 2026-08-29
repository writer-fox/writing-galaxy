import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type TabType = 'chapter' | 'outline' | 'graph' | 'setting'

export interface Tab {
  key: string // 唯一键；chapter 用 ch12，outline/graph 用固定键
  type: TabType
  label: string
  refKey?: string // chapter 关联章节 key
}

export const PANE_ID: Record<TabType, string> = {
  chapter: 'pane-editor',
  outline: 'pane-outline',
  graph: 'pane-graph',
  setting: 'pane-setting',
}

const PANE_LABEL: Record<TabType, string> = {
  chapter: '章节',
  outline: '大纲',
  graph: '关系图',
  setting: '设定集',
}

export const useTabsStore = defineStore('tabs', () => {
  const openTabs = ref<Tab[]>([])
  const activeKey = ref<string>('')

  const activeTab = computed(
    () => openTabs.value.find((t) => t.key === activeKey.value) || null
  )

  /** 幂等打开：已打开则聚焦，未打开则新增 tab。 */
  function open(tab: Tab) {
    const existing = openTabs.value.find((t) => t.key === tab.key)
    if (existing) {
      activeKey.value = existing.key
      return
    }
    openTabs.value.push(tab)
    activeKey.value = tab.key
  }

  function openChapter(key: string, label: string) {
    open({ key, type: 'chapter', refKey: key, label })
  }

  function openOutline() {
    open({ key: 'outline', type: 'outline', label: PANE_LABEL.outline })
  }

  function openGraph() {
    open({ key: 'graph', type: 'graph', label: PANE_LABEL.graph })
  }

  function openSetting() {
    open({ key: 'setting', type: 'setting', label: PANE_LABEL.setting })
  }

  function activate(key: string) {
    if (openTabs.value.some((t) => t.key === key)) activeKey.value = key
  }

  function close(key: string) {
    const idx = openTabs.value.findIndex((t) => t.key === key)
    if (idx === -1) return
    openTabs.value.splice(idx, 1)
    if (activeKey.value === key) {
      activeKey.value = openTabs.value.length
        ? openTabs.value[Math.min(idx, openTabs.value.length - 1)].key
        : ''
    }
  }

  /** 拖拽排序：把 from 移到 to 之前/之后。from≤to 时 target 为插入位。 */
  function reorder(fromKey: string, toKey: string) {
    const from = openTabs.value.findIndex((t) => t.key === fromKey)
    const to = openTabs.value.findIndex((t) => t.key === toKey)
    if (from === -1 || to === -1 || from === to) return
    const [moved] = openTabs.value.splice(from, 1)
    const toIdx = openTabs.value.findIndex((t) => t.key === toKey)
    openTabs.value.splice(toIdx, 0, moved)
  }

  return {
    openTabs,
    activeKey,
    activeTab,
    open,
    openChapter,
    openOutline,
    openGraph,
    openSetting,
    activate,
    close,
    reorder,
  }
})

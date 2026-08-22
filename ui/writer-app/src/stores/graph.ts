import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'

export type EntityType = 'character' | 'faction'

export type RelType =
  | 'belong_to' | 'ally' | 'enemy' | 'kinship'
  | 'master_disciple' | 'lover' | 'subordinate' | 'custom'

export interface GraphNode {
  id: string
  type: EntityType
  name: string
  factionId: number | null
  factionName: string | null
  importance: number
  color: string
  alive: boolean
  firstSort: number
  lastActiveSort: number | null
  size: number
}

export interface GraphLink {
  id: string
  source: string
  target: string
  type: RelType
  color: string
  width: number
  directed: boolean
  label: string
  startSort: number
  endSort: number | null
}

export interface GraphMeta {
  totalCharacters: number
  totalFactions: number
  currentSort: number | null
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  meta: GraphMeta
}

/** 后端返回的 rel 颜色是十六进制；这里是给前端的选中/过滤用色，保留原值即可 */
export const REL_TYPE_META: Record<string, { directed: boolean }> = {
  belong_to: { directed: true }, ally: { directed: false }, enemy: { directed: false },
  kinship: { directed: false }, master_disciple: { directed: true }, lover: { directed: false },
  subordinate: { directed: true }, custom: { directed: false },
}

/* ---------- Mock 数据（后端不可用时的星河风演示兜底） ---------- */
const MOCK_WORK_ID = -1
const MOCK_NODES: GraphNode[] = [
  { id: 'f1', type: 'faction', name: '青云门', factionId: null, factionName: null, importance: 0.9, color: '#4fd1c5', alive: true, firstSort: 1, lastActiveSort: 50, size: 22 },
  { id: 'f2', type: 'faction', name: '血魔宗', factionId: null, factionName: null, importance: 0.85, color: '#e5484d', alive: true, firstSort: 5, lastActiveSort: 50, size: 21 },
  { id: 'f3', type: 'faction', name: '皇室',   factionId: null, factionName: null, importance: 0.7, color: '#d9b64c', alive: true, firstSort: 10, lastActiveSort: 50, size: 18 },
  { id: 'c1', type: 'character', name: '林动',     factionId: 1, factionName: '青云门', importance: 1.0, color: '#4fd1c5', alive: true,  firstSort: 1,  lastActiveSort: 50, size: 30 },
  { id: 'c2', type: 'character', name: '苏瑶',     factionId: 1, factionName: '青云门', importance: 0.8, color: '#4fd1c5', alive: true,  firstSort: 3,  lastActiveSort: 50, size: 24 },
  { id: 'c3', type: 'character', name: '血魔老祖', factionId: 2, factionName: '血魔宗', importance: 0.9, color: '#e5484d', alive: true,  firstSort: 5,  lastActiveSort: 50, size: 26 },
  { id: 'c4', type: 'character', name: '太子',     factionId: 3, factionName: '皇室',   importance: 0.6, color: '#d9b64c', alive: true,  firstSort: 10, lastActiveSort: 50, size: 20 },
  { id: 'c5', type: 'character', name: '林父',     factionId: 1, factionName: '青云门', importance: 0.5, color: '#4fd1c5', alive: false, firstSort: 1,  lastActiveSort: 20, size: 18 },
]
const MOCK_LINKS: GraphLink[] = [
  { id: 'l1',  source: 'c1', target: 'f1', type: 'belong_to',       color: '#8d9199', width: 2,   directed: true,  label: '弟子', startSort: 1,  endSort: null },
  { id: 'l2',  source: 'c2', target: 'f1', type: 'belong_to',       color: '#8d9199', width: 2,   directed: true,  label: '弟子', startSort: 3,  endSort: null },
  { id: 'l3',  source: 'c3', target: 'f2', type: 'belong_to',       color: '#8d9199', width: 2.5, directed: true,  label: '宗主', startSort: 5,  endSort: null },
  { id: 'l4',  source: 'c4', target: 'f3', type: 'belong_to',       color: '#8d9199', width: 2,   directed: true,  label: '皇储', startSort: 10, endSort: null },
  { id: 'l5',  source: 'c5', target: 'f1', type: 'belong_to',       color: '#8d9199', width: 2,   directed: true,  label: '长老', startSort: 1,  endSort: 20 },
  { id: 'l6',  source: 'c1', target: 'c5', type: 'master_disciple', color: '#4f9df0', width: 2,   directed: true,  label: '师徒', startSort: 1,  endSort: 20 },
  { id: 'l7',  source: 'c1', target: 'c2', type: 'lover',           color: '#f07ab0', width: 2.5, directed: false, label: '情侣', startSort: 8,  endSort: null },
  { id: 'l8',  source: 'c1', target: 'c3', type: 'enemy',           color: '#e5484d', width: 2.5, directed: false, label: '仇敌', startSort: 12, endSort: null },
  { id: 'l9',  source: 'c3', target: 'c5', type: 'enemy',           color: '#e5484d', width: 2,   directed: false, label: '所杀', startSort: 15, endSort: 20 },
  { id: 'l10', source: 'c4', target: 'c3', type: 'ally',            color: '#3dbd7d', width: 2,   directed: false, label: '暗通', startSort: 25, endSort: null },
]
function mockGraph(mode: 'god' | 'timeline', sort: number | null): GraphData {
  if (mode === 'god') {
    return { nodes: MOCK_NODES, links: MOCK_LINKS, meta: { totalCharacters: 5, totalFactions: 3, currentSort: null } }
  }
  const s = sort ?? 50
  const nodes = MOCK_NODES.filter(n => n.firstSort <= s && (n.lastActiveSort == null || n.lastActiveSort >= s))
  const ids = new Set(nodes.map(n => n.id))
  const links = MOCK_LINKS.filter(l => ids.has(l.source) && ids.has(l.target) && l.startSort <= s && (l.endSort == null || l.endSort >= s))
  return { nodes, links, meta: { totalCharacters: nodes.filter(n => n.type === 'character').length, totalFactions: nodes.filter(n => n.type === 'faction').length, currentSort: s } }
}

export const useGraphStore = defineStore('graph', () => {
  const data = reactive<GraphData>({ nodes: [], links: [], meta: { totalCharacters: 0, totalFactions: 0, currentSort: null } })
  const currentWorkId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 初始化默认作品（取第一个；后端不可用则用 mock 兜底展示星河风） */
  async function initDefaultWork() {
    if (currentWorkId.value != null) return
    try {
      const works = await api.works.list()
      if (works && works.length) {
        currentWorkId.value = works[0].id
        await load('god', null)
        return
      }
    } catch {
      /* 后端不可用，落 mock */
    }
    currentWorkId.value = MOCK_WORK_ID
    Object.assign(data, mockGraph('god', null))
  }

  async function load(mode: 'god' | 'timeline', sort: number | null) {
    if (currentWorkId.value == null) return
    if (currentWorkId.value === MOCK_WORK_ID) {
      loading.value = true
      Object.assign(data, mockGraph(mode, sort))
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      const g = await api.graph.get(currentWorkId.value, mode, sort ?? undefined)
      data.nodes = g.nodes
      data.links = g.links
      data.meta = g.meta
    } catch (e: any) {
      error.value = String(e?.message || e)
    } finally {
      loading.value = false
    }
  }

  function setWork(id: number) {
    currentWorkId.value = id
  }

  return { data, currentWorkId, loading, error, initDefaultWork, load, setWork }
})

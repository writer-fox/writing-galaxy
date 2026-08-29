<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { api, type OutlineNode } from '../../api'
import { useWorksStore } from '../../stores/works'
import { useAIChatStore } from '../../stores/aichat'

const works = useWorksStore()
const chat = useAIChatStore()

const nodes = ref<OutlineNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const collapsed = ref<string[]>([])

const LEVEL_LABEL = ['总纲', '分卷', '章纲'] as const

async function load(workId: number) {
  loading.value = true
  error.value = null
  try {
    nodes.value = await api.outline.list(workId)
  } catch (e: any) {
    error.value = String(e?.message || e)
  } finally {
    loading.value = false
  }
}

watch(() => works.currentWorkId, async (id) => {
  if (id != null) { await load(id) } else { nodes.value = [] }
}, { immediate: true })

/** 节选一层树：把平铺节点按 parent 关系组装为有缩进的展示。 */
const tree = computed(() => {
  const byId = new Map<number, OutlineNode>()
  nodes.value.forEach((n) => byId.set(n.id, n))
  const roots: OutlineNode[] = []
  const children = new Map<number, OutlineNode[]>()
  nodes.value.forEach((n) => {
    if (n.parentId == null) roots.push(n)
    else {
      const k = n.parentId
      if (!children.has(k)) children.set(k, [])
      children.get(k)!.push(n)
    }
  })
  roots.sort((a, b) => a.sortOrder - b.sortOrder)
  const flatten: { node: OutlineNode; depth: number }[] = []
  const walk = (list: OutlineNode[], depth: number) => {
    list.forEach((n) => {
      flatten.push({ node: n, depth })
      const kids = children.get(n.id)
      if (kids) walk(kids.slice().sort((a, b) => a.sortOrder - b.sortOrder), depth + 1)
    })
  }
  walk(roots, 0)
  return flatten
})

function toggle(id: number) {
  const i = collapsed.value.indexOf('' + id)
  if (i === -1) collapsed.value.push('' + id)
  else collapsed.value.splice(i, 1)
}

async function addNode(level: number) {
  if (works.currentWorkId == null) return
  try {
    await api.outline.create(works.currentWorkId, { level, title: '新节点', sortOrder: 0 })
    await load(works.currentWorkId)
  } catch (e: any) {
    error.value = String(e?.message || e)
  }
}

async function deleteNode(id: number) {
  try {
    await api.outline.remove(id)
    if (works.currentWorkId != null) await load(works.currentWorkId)
  } catch (e: any) {
    error.value = String(e?.message || e)
  }
}
</script>

<template>
  <div class="outline-pane">
    <div class="ol-head">
      <div class="seg">
        <button @click="addNode(0)">＋ 总纲</button>
        <button @click="addNode(1)">＋ 分卷</button>
        <button @click="addNode(2)">＋ 章纲</button>
      </div>
      <div class="spacer"></div>
      <span v-if="loading" class="dim">加载中…</span>
      <button class="gen" :disabled="chat.busy" @click="chat.generateOutline(works.currentWorkId)">
        {{ chat.busy ? '生成中…' : 'AI 生成大纲' }}
      </button>
    </div>

    <div v-if="error" class="ol-err">{{ error }}</div>

    <div v-for="{ node, depth } in tree" :key="node.id" class="outline-item"
      :class="['o-lv-' + node.level, { collapsed: collapsed.includes('' + node.id) }]"
      :style="{ paddingLeft: 16 + depth * 28 + 'px' }"
      @click="node.level < 2 && toggle(node.id)">
      <span class="chev">▾</span>
      <span class="lv-tag" :class="node.level === 2 ? 'chapter' : ''">{{ LEVEL_LABEL[node.level] }}</span>
      <span class="row">
        <span class="txt">{{ node.title }}</span>
        <span v-if="node.content" class="desc">{{ node.content }}</span>
        <span v-if="node.refSortOrder != null" class="tag ok">关联第 {{ node.refSortOrder }} 章</span>
      </span>
      <button class="del" @click.stop="deleteNode(node.id)" title="删除">✕</button>
    </div>

    <div v-if="!nodes.length && !loading" class="empty">还没有大纲。点上方「AI 生成大纲」或手动添加。</div>
  </div>
</template>

<style scoped>
.outline-pane { padding: 16px 20px; max-width: 880px; margin: 0 auto; height: 100%; overflow: auto; }
.ol-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.seg { display: flex; gap: 4px; }
.seg button, .gen {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--fg-muted); cursor: pointer; font-size: 12px;
}
.seg button:hover, .gen:hover { color: var(--fg); background: var(--bg-hover); }
.gen { color: var(--accent); }
.gen:disabled { opacity: 0.5; cursor: default; }
.spacer { flex: 1; }
.dim { font-size: 11px; color: var(--fg-faint); }
.ol-err { padding: 8px 12px; background: var(--danger); color: #fff; border-radius: 6px; font-size: 12px; margin-bottom: 8px; }
.outline-item { display: flex; align-items: flex-start; gap: 8px; padding: 7px 10px; border-radius: 6px; cursor: pointer; transition: background 0.14s; position: relative; }
.outline-item:hover { background: var(--bg-hover); }
.chev { color: var(--fg-faint); font-size: 11px; transition: transform 0.14s; width: 12px; text-align: center; margin-top: 3px; }
.outline-item.collapsed .chev { transform: rotate(-90deg); }
.lv-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); color: var(--fg-faint); flex-shrink: 0; margin-top: 1px; }
.lv-tag.chapter { color: var(--accent); border-color: var(--accent); }
.o-lv-0 { font-weight: 600; }
.row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.txt { color: var(--fg); }
.desc { font-size: 12px; color: var(--fg-muted); }
.tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.tag.ok { color: var(--ok); border: 1px solid var(--ok); }
.del { margin-left: auto; border: none; background: transparent; color: var(--fg-faint); cursor: pointer; border-radius: 4px; }
.del:hover { color: var(--danger); }
.empty { color: var(--fg-faint); text-align: center; padding: 40px; font-size: 13px; }
</style>

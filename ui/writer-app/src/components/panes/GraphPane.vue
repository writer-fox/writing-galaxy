<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useGraphStore, type GraphNode } from '../../stores/graph'
import { useDataStore } from '../../stores/data'

// 3D 图组件懒加载（three.js 体积大，按需拆分 chunk，避免拖慢首屏）
const RelationGraph3D = defineAsyncComponent(() => import('./RelationGraph3D.vue'))

type Mode = 'god' | 'timeline'
const mode = ref<Mode>('god')
const projection = ref<'3d' | '2d'>('3d')
const threshold = ref(0)
const layoutPulse = ref(false)

const data = useDataStore()

/* ---- 图数据（从后端拉取） ---- */
const timelineActive = computed(() => mode.value === 'timeline')

// scrubber 刻度来源：data 空时（mock 模式）用 1..50 虚拟刻度，保证时间轴可拖动演示
const chaptersForScrub = computed(() => {
  if (data.sortedChapters.length) return data.sortedChapters
  return Array.from({ length: 50 }, (_, i) => ({ id: -(i + 1), sortOrder: i + 1 }))
})

const currentSort = ref<number>(chaptersForScrub.value.length
  ? chaptersForScrub.value[chaptersForScrub.value.length - 1].sortOrder
  : 0)

const graph = useGraphStore()

// 重要性阈值过滤（0..100 → importance 0..1）
const minImportance = computed(() => threshold.value / 100)

// 势力色映射：让人物取所属势力色，形成"同势力同色"的聚簇观感，与势力节点一眼区分派系
const nodes = computed(() => {
  const list = graph.data.nodes.filter((n) => n.importance >= minImportance.value - 0.001)
  const factionColor = new Map<string, string>()
  for (const n of list) {
    if (n.type === 'faction') factionColor.set('f' + n.id.slice(1), n.color) // id 形如 f3
  }
  return list.map((n) => {
    if (n.type === 'character' && n.factionId != null) {
      const key = 'f' + n.factionId
      const fc = factionColor.get(key)
      if (fc) return { ...n, color: fc }
    }
    return n
  })
})
const links = computed(() => {
  const ids = new Set(nodes.value.map((n) => n.id))
  return graph.data.links
    .filter((l) => ids.has(l.source) && ids.has(l.target))
    .map((l) => ({
      source: l.source,
      target: l.target,
      color: l.color,
      width: l.width,
      directed: l.directed,
      label: l.label,
    }))
})

const isLoading = computed(() => graph.loading)
const loadError = computed(() => graph.error)

// 启动初始化 + 数据随 mode/sort 变化刷新
onMounted(async () => {
  await graph.initDefaultWork()
})
watch([timelineActive, currentSort], async () => {
  await graph.load(timelineActive.value ? 'timeline' : 'god',
    timelineActive.value ? currentSort.value : null)
})

/* ---- 事件 ---- */
const selected = ref<GraphNode | null>(null)
function onNodeClick(n: GraphNode) {
  selected.value = n
}

function toggleProjection() {
  projection.value = projection.value === '3d' ? '2d' : '3d'
}
const forceKey = ref(0)
function relayout() {
  layoutPulse.value = !layoutPulse.value
  forceKey.value++ // 强制重建组件，让力导向重新收敛布局
}

/* ---- 时间轴 scrubber（拖拽 | 吸附到章节刻度） ---- */
const trackRef = ref<HTMLElement | null>(null)
let scrubDragging = false
const totalSort = () => (chaptersForScrub.value.length ? chaptersForScrub.value[chaptersForScrub.value.length - 1].sortOrder : 1)

function pct(sort: number): string {
  return (sort / totalSort()) * 100 + '%'
}
function indexFromX(clientX: number): number {
  const el = trackRef.value
  if (!el || !chaptersForScrub.value.length) return 0
  const r = el.getBoundingClientRect()
  const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  const idx = Math.round(t * (chaptersForScrub.value.length - 1))
  return idx
}
function applyIndex(i: number) {
  const list = chaptersForScrub.value
  if (!list.length) return
  currentSort.value = list[Math.max(0, Math.min(list.length - 1, i))].sortOrder
}
function onScrubDown(e: PointerEvent) {
  scrubDragging = true
  trackRef.value?.setPointerCapture?.(e.pointerId)
  applyIndex(indexFromX(e.clientX))
}
function onScrubMove(e: PointerEvent) {
  if (scrubDragging) applyIndex(indexFromX(e.clientX))
}
function onScrubUp() {
  scrubDragging = false
}
</script>

<template>
  <div class="graph-pane">
    <div class="graph-toolbar">
      <div class="seg">
        <button class="ghost-btn" :class="{ active: mode === 'god' }" @click="mode = 'god'">上帝视角</button>
        <button class="ghost-btn" :class="{ active: mode === 'timeline' }" @click="mode = 'timeline'">时间轴</button>
      </div>
      <div class="tool-divider"></div>
      <button class="ghost-btn dim">势力 ▾</button>
      <div class="tool-divider"></div>
      <div class="range-wrap">
        重要性 <input type="range" min="0" max="100" v-model.number="threshold" />
      </div>
      <div class="tool-divider"></div>
      <button class="ghost-btn icon-text" :class="{ active: projection === '3d' }" :title="projection === '3d' ? '当前为 3D 立体视图，点击切换为平面 2D' : '当前为 2D 平面视图，点击切换为 3D'" @click="toggleProjection">
        <svg v-if="projection === '3d'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3l9 5v8l-9 5-9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3" y="8" width="13" height="13" rx="2"/><path d="M6 8V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3"/></svg>
        <span>{{ projection === '3d' ? '3D 视图' : '2D 视图' }}</span>
      </button>
      <button class="ghost-btn icon-text" @click="relayout" :class="{ pulsing: layoutPulse }" title="把散乱的节点重新铺开布局">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="9" cy="17" r="2"/><circle cx="18" cy="16" r="2"/><path d="M6.5 7.3L8.5 15.5M16.2 9.8l1.4 5M7.9 16.2l7.9 2.4"/></svg>
        <span>重新布局</span>
      </button>
    </div>

    <div v-if="graph.currentWorkId == null" class="graph-empty">
      <p>暂无可展示的关系图。</p>
      <p class="dim">请先在后端创建一个作品并写入人物/势力/关系。</p>
    </div>
    <div v-else-if="loadError" class="graph-empty">
      <p>图数据加载失败：{{ loadError }}</p>
      <p class="dim">确认后端已启动（localhost:8080）后刷新。</p>
    </div>
    <template v-else>
      <RelationGraph3D :key="forceKey" :nodes="nodes" :links="links" :is2d="projection === '2d'" @node-click="onNodeClick" />
      <div v-if="isLoading" class="graph-loading">图数据加载中…</div>

      <!-- 选中节点详情浮层 -->
      <div v-if="selected" class="node-card">
        <button class="card-close" @click="selected = null">✕</button>
        <div class="card-name">{{ selected.name }}</div>
        <div class="card-type">{{ selected.type === 'faction' ? '势力' : '人物' }}</div>
        <div class="card-row">重要性：{{ selected.importance }}</div>
        <div class="card-row">首次出场：第 {{ selected.firstSort }} 章</div>
        <div class="card-row">最后活跃：第 {{ selected.lastActiveSort ?? '—' }} 章</div>
      </div>
    </template>

    <!-- 时间轴 -->
    <div class="scrubber">
      <div class="label-row">
        <span class="lbl">时间轴</span>
        <span class="cur" v-if="chaptersForScrub.length">当前：第 {{ currentSort }} 章</span>
      </div>
      <div
        ref="trackRef"
        class="track"
        @pointerdown="timelineActive && onScrubDown($event)"
        @pointermove="onScrubMove"
        @pointerup="onScrubUp"
        @pointercancel="onScrubUp"
        :class="{ active: timelineActive }"
      >
        <div class="base"></div>
        <div class="fill" :style="{ width: pct(currentSort) }"></div>
        <div v-for="s in chaptersForScrub" :key="s.id" class="bookmark" :class="{ cur: s.sortOrder === currentSort }" :style="{ left: pct(s.sortOrder) }"></div>
        <div class="knob" :style="{ left: pct(currentSort) }"></div>
      </div>
      <div v-if="!timelineActive" class="hint">切换到「时间轴」后可拖动下方滑块浏览各章节</div>
    </div>
  </div>
</template>

<style scoped>
.graph-pane {
  position: relative;
  height: 100%;
  background: radial-gradient(ellipse at 50% 38%, #1b2740 0%, #111827 46%, #070a12 78%, #04060b 100%);
  overflow: hidden;
}
.graph-toolbar {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 6px 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow);
  z-index: 5;
  white-space: nowrap;
  max-width: calc(100% - 28px);
  overflow-x: auto;
  scrollbar-width: none;
}
.graph-toolbar::-webkit-scrollbar { display: none; }
.seg { display: flex; align-items: center; gap: 2px; }
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  font-size: 12px;
}
.ghost-btn.icon-text svg { width: 14px; height: 14px; flex-shrink: 0; }
.ghost-btn:hover { color: var(--fg); }
.ghost-btn.active { background: var(--accent); color: var(--accent-fg); }
.ghost-btn.dim { color: var(--fg-faint); }
.ghost-btn.pulsing { animation: relayout-pulse 0.5s ease; }
@keyframes relayout-pulse { 0% { background: var(--accent-soft); } 100% { background: transparent; } }
.tool-divider { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }
.range-wrap { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--fg-muted); padding: 0 6px; }
.range-wrap input { width: 90px; accent-color: var(--accent); }

.node-card {
  position: absolute;
  right: 16px;
  top: 70px;
  width: 220px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 14px 16px;
  z-index: 6;
}
.graph-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
  color: var(--fg-muted);
  font-size: 14px;
}
.graph-empty .dim { color: var(--fg-faint); font-size: 12px; }
.graph-loading {
  position: absolute;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 12px;
  color: var(--fg-muted);
  z-index: 7;
}
.card-close { position: absolute; right: 10px; top: 10px; background: transparent; border: none; color: var(--fg-faint); }
.card-close:hover { color: var(--fg); }
.card-name { font-size: 16px; font-weight: 600; }
.card-type { font-size: 11px; color: var(--accent); margin-bottom: 8px; }
.card-row { font-size: 12.5px; color: var(--fg-muted); padding: 3px 0; }

.scrubber {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 76px;
  border-top: 1px solid var(--border);
  background: var(--bg-panel);
  padding: 10px 24px 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  z-index: 4;
}
.label-row { display: flex; align-items: baseline; justify-content: space-between; font-size: 11px; }
.label-row .lbl { color: var(--fg-muted); }
.label-row .cur { color: var(--accent); }
.track { position: relative; height: 24px; cursor: default; }
.track.active { cursor: pointer; }
.base { position: absolute; left: 0; right: 0; top: 50%; height: 3px; transform: translateY(-50%); background: var(--bg-hover); border-radius: 2px; }
.fill { position: absolute; left: 0; top: 50%; height: 3px; transform: translateY(-50%); background: var(--accent); border-radius: 2px; }
.bookmark { position: absolute; top: 50%; transform: translateY(-50%); width: 8px; height: 12px; background: var(--fg-faint); border-radius: 2px; }
.bookmark.cur { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.knob { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 16px; height: 16px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg-panel); box-shadow: var(--shadow); pointer-events: none; }
.hint { font-size: 11px; color: var(--fg-faint); text-align: center; }
</style>

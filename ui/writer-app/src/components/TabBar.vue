<script setup lang="ts">
import { ref } from 'vue'
import { useTabsStore } from '../stores/tabs'

const tabs = useTabsStore()
const barEl = ref<HTMLElement | null>(null)

// 拖拽排序（pointer 事件）
let dragEl: HTMLElement | null = null
let startX = 0
let startY = 0
let moved = false

const TAB_ICON: Record<string, string> = { chapter: '📄', outline: '🌲', graph: '✧' }

function onDown(e: PointerEvent) {
  const tab = (e.target as HTMLElement).closest('.tab') as HTMLElement | null
  if (!tab) return
  if ((e.target as HTMLElement).closest('.close')) return
  dragEl = tab
  startX = e.clientX
  startY = e.clientY
  moved = false
}
function onMove(e: PointerEvent) {
  if (!dragEl) return
  if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > 5) {
    moved = true
    // 确认是拖拽后才捕获，避免抢占 tab 的 click
    barEl.value?.setPointerCapture?.(e.pointerId)
  }
  if (!moved || !barEl.value) return
  dragEl.classList.add('dragging')
  const siblings = [...barEl.value.querySelectorAll<HTMLElement>('.tab:not(.dragging)')]
  let before: HTMLElement | null = null
  for (const t of siblings) {
    if (e.clientX < t.getBoundingClientRect().left + t.offsetWidth / 2) {
      before = t
      break
    }
  }
  const fromKey = dragEl.dataset.tabKey!
  if (before) {
    const toKey = before.dataset.tabKey!
    if (before !== dragEl) barEl.value.insertBefore(dragEl, before)
    tabs.reorder(fromKey, toKey)
  } else {
    barEl.value.appendChild(dragEl)
    const last = siblings[siblings.length - 1]
    if (last) tabs.reorder(fromKey, last.dataset.tabKey!)
  }
}
function onEnd() {
  if (dragEl) dragEl.classList.remove('dragging')
  // moved 后抑制当次的 click 切换
  if (moved) suppressClick = true
  dragEl = null
  moved = false
}
function onCancel() {
  if (dragEl) dragEl.classList.remove('dragging')
  dragEl = null
  moved = false
}

let suppressClick = false
function onTabClick(tabKey: string) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  tabs.activate(tabKey)
}
// 拖拽松手后，浏览器仍可能派发一次 click（通常因指针捕获落到 barEl）。
// 用 capture 层拦截，避免误吞下一次正常点击，也不影响未拖拽时的单击。
function onBarClickCapture(e: MouseEvent) {
  if (suppressClick) {
    suppressClick = false
    e.stopPropagation()
    e.preventDefault()
  }
}
</script>

<template>
  <div class="tabbar" ref="barEl" @pointerdown="onDown" @pointermove="onMove" @pointerup="onEnd" @pointercancel="onCancel" @click.capture="onBarClickCapture">
    <div
      v-for="t in tabs.openTabs"
      :key="t.key"
      class="tab"
      :class="{ active: tabs.activeKey === t.key }"
      :data-tab-key="t.key"
      @click="onTabClick(t.key)"
    >
      <span class="tic">{{ TAB_ICON[t.type] }}</span>
      <span class="lbl">{{ t.label }}</span>
      <span class="close" @click.stop="tabs.close(t.key)">✕</span>
    </div>
  </div>
</template>

<style scoped>
.tabbar {
  display: flex;
  align-items: flex-end;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  height: 36px;
  padding: 0 6px;
  gap: 2px;
  overflow-x: auto;
  flex-shrink: 0;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  margin-top: 4px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 7px 7px 0 0;
  color: var(--fg-muted);
  font-size: 12px;
  white-space: nowrap;
  user-select: none;
}
.tab.active { color: var(--fg); border-bottom: 2px solid var(--accent); background: var(--bg-panel); margin-bottom: -1px; }
.tab:hover { color: var(--fg); }
.tab.dragging { opacity: 0.55; box-shadow: var(--shadow); position: relative; z-index: 5; transform: scale(1.02); }
.tab .tic { color: var(--accent); }
.lbl { max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
.close {
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  border-radius: 4px;
  color: var(--fg-faint);
  font-size: 11px;
}
.close:hover { background: var(--bg-hover); color: var(--fg); }
</style>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

const isMax = ref(false)
const wx = (window as any).wxAPI

async function refreshMax() {
  try { isMax.value = await wx?.window?.isMaximized() } catch { isMax.value = false }
}
function min() { wx?.window?.minimize() }
async function maxToggle() {
  await wx?.window?.maximizeToggle()
  refreshMax()
}
function close() { wx?.window?.close() }

onMounted(() => {
  refreshMax()
  window.addEventListener('resize', refreshMax)
})
onBeforeUnmount(() => window.removeEventListener('resize', refreshMax))
</script>

<template>
  <div class="titlebar" :class="{ maximized: isMax }">
    <div class="tb-drag">
      <svg class="tb-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <path d="M12 3l2.2 5.5 5.5 2.2-5.5 2.2L12 18.5l-2.2-5.5L4.3 10.7l5.5-2.2z"/>
        <path d="M19 3l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>
      </svg>
      <span class="tb-title">写作星河</span>
    </div>
    <div class="tb-controls">
      <button class="tb-btn" title="最小化" @click="min">
        <svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" stroke-width="1.1"/></svg>
      </button>
      <button class="tb-btn" :title="isMax ? '还原' : '最大化'" @click="maxToggle">
        <svg v-if="!isMax" viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>
        <svg v-else viewBox="0 0 12 12"><path d="M3.5 3.5h5v5h-5z" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M4.5 3.5v-1h5v5h-1" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>
      </button>
      <button class="tb-btn tb-close" title="关闭" @click="close">
        <svg viewBox="0 0 12 12"><path d="M3 3l6 6M9 3L3 9" stroke="currentColor" stroke-width="1.1"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  -webkit-app-region: drag;
  height: var(--titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  user-select: none;
  flex-shrink: 0;
}
.tb-drag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 14px;
  height: 100%;
  flex: 1;
  min-width: 0;
}
.tb-logo { width: 17px; height: 17px; color: var(--accent); }
.tb-title { font-size: 12px; font-weight: 600; color: var(--fg-muted); letter-spacing: 0.3px; }
.tb-controls {
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  height: 100%;
}
.tb-btn {
  width: 44px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--fg-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.tb-btn svg { width: 13px; height: 13px; }
.tb-btn:hover { background: var(--bg-hover); color: var(--fg); }
.tb-close:hover { background: var(--danger); color: #fff; }
</style>

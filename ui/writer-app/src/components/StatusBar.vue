<script setup lang="ts">
import { computed } from 'vue'
import { useTabsStore } from '../stores/tabs'
import { useDataStore } from '../stores/data'

const tabs = useTabsStore()
const data = useDataStore()

const chapter = computed(() => {
  const refKey = tabs.activeTab?.refKey
  return refKey ? data.chapterById(refKey) : undefined
})
</script>

<template>
  <footer class="statusbar">
    <span class="seg"><span class="st-dot ok"></span> 已保存</span>
    <span class="sp"></span>
    <span class="seg">宋体 · 15px</span>
    <span class="seg" v-if="chapter">{{ chapter.content.length }} 字</span>
    <span class="seg" v-if="chapter">sort_order {{ chapter.sortOrder }}</span>
    <span class="seg accent">✦ AI 就绪</span>
  </footer>
</template>

<style scoped>
.statusbar {
  grid-area: status;
  background: var(--bg-sidebar);
  color: var(--fg-muted);
  font-size: 11px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 16px;
  border-top: 1px solid var(--border);
}
.sp { flex: 1; }
.seg { display: flex; align-items: center; gap: 6px; }
.st-dot { width: 7px; height: 7px; border-radius: 50%; }
.st-dot.ok { background: var(--ok); }
.accent { color: var(--accent); }
</style>

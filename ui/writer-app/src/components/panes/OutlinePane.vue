<script setup lang="ts">
import { ref } from 'vue'
import { useDataStore } from '../../stores/data'

const data = useDataStore()
const collapsed = ref<string[]>([])

const LEVEL_LABEL = ['总纲', '分卷', '章纲'] as const

function toggle(id: string) {
  const i = collapsed.value.indexOf(id)
  if (i === -1) collapsed.value.push(id)
  else collapsed.value.splice(i, 1)
}
function isCollapsed(id: string) {
  return collapsed.value.includes(id)
}
</script>

<template>
  <div class="outline-pane">
    <div
      v-for="item in data.outline"
      :key="item.id"
      class="outline-item"
      :class="['o-lv-' + item.level, { collapsed: isCollapsed(item.id) }]"
      @click="item.level < 2 && toggle(item.id)"
    >
      <span class="chev">▾</span>
      <span class="lv-tag" :class="item.level === 2 ? 'chapter' : ''">{{ LEVEL_LABEL[item.level] }}</span>
      <span class="row">
        <span class="txt">{{ item.title }}</span>
        <span v-if="item.desc" class="desc">{{ item.desc }}</span>
        <span class="tag" :class="item.pending ? 'warn' : 'ok'">
          {{ item.pending ? '待关联' : '已关联章节' }}
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.outline-pane {
  padding: 16px 20px;
  max-width: 880px;
  margin: 0 auto;
  height: 100%;
  overflow: auto;
}
.outline-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.14s;
}
.outline-item:hover { background: var(--bg-hover); }
.chev { color: var(--fg-faint); font-size: 11px; transition: transform 0.14s; width: 12px; text-align: center; margin-top: 3px; }
.outline-item.collapsed .chev { transform: rotate(-90deg); }
.lv-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); color: var(--fg-faint); flex-shrink: 0; margin-top: 1px; }
.lv-tag.chapter { color: var(--accent); border-color: var(--accent); }
.o-lv-0 { font-weight: 600; }
.o-lv-1 { padding-left: 24px; }
.o-lv-2 { padding-left: 48px; }
.row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.txt { color: var(--fg); }
.desc { font-size: 12px; color: var(--fg-muted); }
.tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.tag.ok { color: var(--ok); border: 1px solid var(--ok); }
.tag.warn { color: var(--warn); border: 1px solid var(--warn); }
</style>

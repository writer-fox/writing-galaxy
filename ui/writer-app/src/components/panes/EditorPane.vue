<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CodeMirrorEditor from '../CodeMirrorEditor.vue'
import { useTabsStore } from '../../stores/tabs'
import { useDataStore } from '../../stores/data'

const tabs = useTabsStore()
const data = useDataStore()

const chapter = computed(() => {
  const refKey = tabs.activeTab?.refKey
  return refKey ? data.chapterById(refKey) : undefined
})

const content = ref('')
let timer: ReturnType<typeof setTimeout> | null = null
let pendingId: string | null = null
const SAVE_DELAY = 600

// 激活章节变化时载入内容，并取消挂起的保存
watch(chapter, (c) => {
  if (timer) clearTimeout(timer)
  pendingId = null
  content.value = c?.content || ''
})

// 正文防抖自动保存到「挂起时所在的章节」，避免切换后串写
function onInput(v: string) {
  content.value = v
  if (!chapter.value) return
  pendingId = chapter.value.id
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    if (pendingId) data.setContent(pendingId, content.value)
    pendingId = null
  }, SAVE_DELAY)
}

function commitTitle(e: Event) {
  if (!chapter.value) return
  const el = e.target as HTMLInputElement
  const v = el.value.trim()
  if (v && v !== chapter.value.title) data.setTitle(chapter.value.id, v)
  el.blur()
}
</script>

<template>
  <div class="editor-pane" v-if="chapter">
    <div class="head">
      <div class="titleline">
        <h2></h2>
        <span class="seq">第 {{ chapter.sortOrder }} 章</span>
        <input
          class="title-input"
          :value="chapter.title"
          :placeholder="chapter.title"
          @change="commitTitle"
          @keydown.enter.prevent="commitTitle"
          title="点击修改章节名"
        />
      </div>
      <div class="meta">字数 {{ content.length }} · 分卷 Ⅱ 云起 · sort_order {{ chapter.sortOrder }}</div>
    </div>
    <div class="cm-wrap">
      <CodeMirrorEditor v-model="content" @update:model-value="onInput" />
    </div>
  </div>
  <div v-else class="editor-pane">
    <p class="ghost">在右侧内容树选择一章开始写作。</p>
  </div>
</template>

<style scoped>
.editor-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.head {
  padding: 20px 48px 8px;
  border-bottom: 1px solid var(--border);
}
.titleline {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.seq {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--fg);
}
.title-input {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.5px;
  line-height: 1.4;
  color: var(--fg);
  background: transparent;
  border: none;
  border-bottom: 1px dashed transparent;
  font-family: inherit;
  min-width: 60px;
  flex: 1;
}
.title-input:hover { border-bottom-style: dashed; border-bottom-color: var(--fg-faint); }
.title-input:focus {
  outline: none;
  border-bottom-style: dashed;
  border-bottom-color: var(--accent);
  background: var(--accent-soft);
}
.meta { color: var(--fg-faint); font-size: 12px; }
.cm-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.ghost { color: var(--fg-faint); font-style: italic; padding: 40px 48px; }
</style>

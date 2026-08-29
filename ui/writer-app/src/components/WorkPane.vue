<script setup lang="ts">
import { computed } from 'vue'
import TabBar from './TabBar.vue'
import EditorPane from './panes/EditorPane.vue'
import OutlinePane from './panes/OutlinePane.vue'
import GraphPane from './panes/GraphPane.vue'
import SettingPane from './panes/SettingPane.vue'
import { useTabsStore } from '../stores/tabs'
import { useDataStore } from '../stores/data'
import { useWorksStore } from '../stores/works'

const tabs = useTabsStore()
const data = useDataStore()
const works = useWorksStore()

const activeType = computed(() => tabs.activeTab?.type || 'chapter')

const chapter = computed(() => {
  const refKey = tabs.activeTab?.refKey
  return refKey ? data.chapterById(refKey) : undefined
})

const breadTitle = computed(() => {
  const t = tabs.activeTab
  return t ? t.label : '写作星河'
})
</script>

<template>
  <main class="work">
    <TabBar />

    <div class="breadcrumb">
      <span>{{ works.currentWork?.title || '写作星河' }}</span><span class="sep">/</span><b>{{ breadTitle }}</b>
      <div class="spacer"></div>
      <span class="stat" v-if="activeType === 'chapter' && chapter">
        <span class="save-dot"></span>已保存 {{ chapter.status }} · sort_order {{ chapter.sortOrder }}
      </span>
      <span class="stat" v-else>✦ AI 就绪</span>
    </div>

    <div class="workspace-main">
      <!-- 按激活 tab 类型渲染对应面板 -->
      <EditorPane v-if="activeType === 'chapter'" class="pane" />
      <OutlinePane v-else-if="activeType === 'outline'" class="pane" />
      <GraphPane v-else-if="activeType === 'graph'" class="pane" />
      <SettingPane v-else-if="activeType === 'setting'" class="pane" />
      <div v-else class="pane empty"><p class="ghost">从右侧内容树或 AI 栏打开内容。</p></div>
    </div>
  </main>
</template>

<style scoped>
.work {
  grid-area: work;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-editor);
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 12px;
  color: var(--fg-muted);
  background: var(--bg-workspace);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.breadcrumb b { color: var(--fg); font-weight: 500; }
.breadcrumb .sep { color: var(--fg-faint); }
.breadcrumb .spacer { flex: 1; }
.stat { font-size: 11px; color: var(--fg-faint); }
.save-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ok);
  display: inline-block;
  margin-right: 5px;
}
.workspace-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--bg-editor);
}
.pane { height: 100%; }
.empty { display: grid; place-items: center; height: 100%; }
.ghost { color: var(--fg-faint); font-style: italic; }
</style>

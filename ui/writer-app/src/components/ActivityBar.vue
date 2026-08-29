<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useWorksStore } from '../stores/works'
import { useDataStore, chapterLabel } from '../stores/data'
import { useTabsStore } from '../stores/tabs'
import type { Work } from '../api'

const theme = useThemeStore()
const works = useWorksStore()
const data = useDataStore()
const tabs = useTabsStore()

const libOpen = ref(false)
const newName = ref('')
const libError = ref<string | null>(null)

function toggleLib() {
  libOpen.value = !libOpen.value
  if (libOpen.value && !works.works.length) works.loadWorks()
}

async function createNew() {
  const name = newName.value.trim()
  if (!name) return
  libError.value = null
  try {
    const w = await works.createWork(name)
    await switchWork(w)
    newName.value = ''
    libOpen.value = false
  } catch (e: any) {
    libError.value = String(e?.message || e)
  }
}

async function switchWork(w: Work) {
  libError.value = null
  try {
    await works.selectWork(w)
    // 打开第一章
    const first = data.sortedChapters[0]
    if (first) {
      tabs.openChapter(first.id, chapterLabel(first))
    } else {
      const ch = await data.addChapter()
      tabs.openChapter(ch.id, chapterLabel(ch))
    }
    libOpen.value = false
  } catch (e: any) {
    libError.value = String(e?.message || e)
  }
}

async function selectExisting(w: Work) {
  await switchWork(w)
}
</script>

<template>
  <aside class="activity">
    <button class="icon-btn" :class="{ active: libOpen || works.currentWorkId != null }" title="作品库" @click="toggleLib">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="12" height="16" rx="2"/><path d="M17 4h4v16h-4"/><path d="M6 8h6M6 12h6"/></svg>
    </button>
    <button class="icon-btn" title="AI 助手">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>
    </button>
    <button class="icon-btn" title="设置" @click="tabs.openSetting()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"/></svg>
    </button>

    <div class="spacer"></div>

    <button class="theme-toggle" @click="theme.toggle" :title="theme.mode === 'dark' ? '切换到亮色主题' : '切换到暗色主题'">
      <template v-if="theme.mode === 'dark'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>
      </template>
      <template v-else>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
      </template>
    </button>

    <button class="icon-btn" title="作者">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    </button>

    <!-- 作品库浮层 -->
    <div v-if="libOpen" class="lib-mask" @click.self="libOpen = false">
      <div class="lib">
        <div class="lib-head">作品库</div>
        <div class="lib-list">
          <button
            v-for="w in works.works"
            :key="w.id"
            class="lib-item"
            :class="{ cur: works.currentWorkId === w.id }"
            @click="selectExisting(w)"
          >
            <span class="lib-title">{{ w.title }}</span>
            <span class="lib-genre">{{ w.genre || '—' }}</span>
          </button>
          <div v-if="!works.works.length && !works.loading" class="lib-empty">还没有作品</div>
          <div v-if="works.loading" class="lib-empty">加载中…</div>
        </div>
        <div class="lib-new">
          <input
            v-model="newName"
            placeholder="新建作品名，回车创建"
            @keydown.enter="createNew"
          />
          <button class="lib-add" @click="createNew">＋</button>
        </div>
        <div v-if="libError" class="lib-err">{{ libError }}</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.activity {
  grid-area: activity;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  gap: 6px;
  border-right: 1px solid var(--border);
  z-index: 5;
  min-width: 40px;
  max-width: 120px;
}
.spacer { flex: 1; }
.icon-btn, .theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--fg-muted);
  border: none;
  background: transparent;
  cursor: pointer;
}
.icon-btn svg, .theme-toggle svg { width: 18px; height: 18px; }
.icon-btn:hover, .theme-toggle:hover { color: var(--fg); background: var(--bg-hover); }
.icon-btn.active { color: var(--accent); background: var(--accent-soft); }

.lib-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.25);
  z-index: 60;
}
.lib {
  position: absolute;
  left: 52px;
  top: 12px;
  width: 300px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 12px;
  z-index: 61;
}
.lib-head { font-weight: 600; font-size: 13px; margin-bottom: 8px; }
.lib-list { max-height: 260px; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
.lib-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--fg);
  cursor: pointer;
  text-align: left;
}
.lib-item:hover { background: var(--bg-hover); }
.lib-item.cur { background: var(--accent-soft); }
.lib-title { font-weight: 500; }
.lib-genre { font-size: 11px; color: var(--fg-faint); }
.lib-empty { padding: 10px; color: var(--fg-faint); font-size: 12px; text-align: center; }
.lib-new { display: flex; gap: 6px; margin-top: 10px; }
.lib-new input {
  flex: 1;
  padding: 7px 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-workspace);
  color: var(--fg);
  font: inherit;
}
.lib-new input:focus { outline: 2px solid var(--accent); }
.lib-add {
  width: 32px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: var(--accent-fg);
  cursor: pointer;
  font-size: 16px;
}
.lib-add:hover { filter: brightness(1.1); }
.lib-err { color: var(--danger); font-size: 12px; margin-top: 8px; }
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTabsStore } from '../stores/tabs'
import { useAIChatStore } from '../stores/aichat'
import { useWorksStore } from '../stores/works'
import { useDataStore } from '../stores/data'

const tabs = useTabsStore()
const chat = useAIChatStore()
const works = useWorksStore()
const data = useDataStore()

const input = ref('')

onMounted(() => chat.refreshStatus())

function genOutline() {
  if (works.currentWorkId != null) chat.generateOutline(works.currentWorkId)
  else chat.push('ai', '请先选择一个作品再生成大纲。')
}

function analyzeChapter() {
  const t = tabs.activeTab
  const chapter = t?.type === 'chapter' && t.refKey ? data.chapterById(t.refKey) : undefined
  chat.analyzeChapter(works.currentWorkId, chapter?.rawId, chapter?.title)
}

function send() {
  const v = input.value.trim()
  if (!v) return
  chat.send(v)
  input.value = ''
}
</script>

<template>
  <aside class="ai-panel">
    <div class="ai-head">
      <div class="title"><span class="dot"></span> AI 助手</div>
      <button class="model-chip">{{ chat.configured ? 'AI 已配置' : 'GLM-4 ▾' }}</button>
    </div>

    <div class="quick">
      <div class="quick-label">写作快捷入口</div>
      <button class="quick-card" @click="genOutline">
        <span class="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.6 6.5 6.5 2.5-6.5 2.5L12 20l-2.6-6.5-6.5-2.5 6.5-2.5z"/></svg>
        </span>
        <span><div class="t">一键生成大纲</div><div class="s">从已写章节整理三层大纲</div></span>
      </button>
      <button class="quick-card" @click="analyzeChapter">
        <span class="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h10M4 17h7"/></svg>
        </span>
        <span><div class="t">分析本章人物关系</div><div class="s">抽取人物 / 势力 / 关系</div></span>
      </button>
      <button class="quick-card" @click="tabs.openGraph()">
        <span class="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 19l7-9 5 5 6-8M15 12h6"/></svg>
        </span>
        <span><div class="t">关系图</div><div class="s">上帝视角 / 时间轴</div></span>
      </button>
      <button class="quick-card" @click="tabs.openSetting()">
        <span class="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"/></svg>
        </span>
        <span><div class="t">设定集</div><div class="s">人物 / 势力 / 关系管理</div></span>
      </button>
    </div>

    <div class="ai-chat">
      <template v-for="m in chat.messages" :key="m.id">
        <div class="bubble" :class="m.who === 'ai' ? 'in' : 'out'">
          <div class="who">{{ m.who === 'ai' ? '✨ 星澜 · AI' : '我' }}</div>
          <div v-if="m.type === 'outline'" class="pre">{{ m.content }}</div>
          <div v-else>{{ m.content }}</div>
        </div>
      </template>
      <div v-if="!chat.messages.length" class="bubble in">
        <div class="who">✨ 星澜 · AI</div>下午好，创作者。从「一键大纲」或「分析本章」开始吧。
      </div>
      <div v-if="chat.busy" class="bubble in"><div class="who">✨ 星澜 · AI</div>分析中…</div>
    </div>

    <div v-if="!chat.configured" class="ai-notice">
      提示：AI 功能需在 backend 配置 llm.api-key 后启用
    </div>

    <div class="ai-input">
      <textarea rows="1" v-model="input" placeholder="问问我，或试试上面的快捷入口…" @keydown.enter.prevent="send"></textarea>
      <button class="send" @click="send">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20v-6l8-2-8-2V4l18 8z"/></svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.ai-panel {
  grid-area: ai;
  min-width: 200px;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--bg-panel);
  z-index: 4;
}
.ai-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
.title { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.model-chip { padding: 3px 8px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--fg-muted); font-size: 11px; cursor: pointer; }
.quick { padding: 12px; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid var(--border); }
.quick-label { font-size: 11px; color: var(--fg-faint); margin-bottom: 2px; }
.quick-card {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  border: 1px solid var(--border); border-radius: 8px; background: transparent;
  color: var(--fg); cursor: pointer; text-align: left; transition: background .14s;
}
.quick-card:hover { background: var(--bg-hover); border-color: var(--accent); }
.ic { width: 30px; height: 30px; border-radius: 7px; display: grid; place-items: center; color: var(--accent); background: var(--accent-soft); flex-shrink: 0; }
.ic svg { width: 16px; height: 16px; }
.t { font-size: 12.5px; font-weight: 500; }
.s { font-size: 11px; color: var(--fg-faint); }
.ai-chat { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.bubble { max-width: 100%; padding: 8px 11px; border-radius: 8px; font-size: 12.5px; line-height: 1.6; }
.bubble.in { align-self: flex-start; background: var(--bg-hover); color: var(--fg); border-top-left-radius: 2px; }
.bubble.out { align-self: flex-end; background: var(--accent-soft); color: var(--fg); border-top-right-radius: 2px; }
.bubble .who { font-size: 10px; color: var(--fg-faint); margin-bottom: 3px; }
.bubble .pre { background: var(--bg-workspace); padding: 8px; border-radius: 6px; white-space: pre-wrap; font-size: 11.5px; color: var(--fg-muted); }
.ai-notice { padding: 7px 13px; font-size: 10.5px; color: var(--warn); background: var(--accent-soft); border-top: 1px solid var(--border); }
.ai-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--border); align-items: flex-end; }
.ai-input textarea { flex: 1; resize: none; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; background: var(--bg-workspace); color: var(--fg); font: inherit; font-size: 12.5px; min-height: 34px; }
.ai-input textarea:focus { outline: 2px solid var(--accent); }
.send { width: 32px; height: 32px; border: none; border-radius: 50%; background: var(--accent); color: var(--accent-fg); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
.send svg { width: 15px; height: 15px; }
.send:hover { filter: brightness(1.1); }
</style>

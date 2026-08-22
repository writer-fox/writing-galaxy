<script setup lang="ts">
import { useTabsStore } from '../stores/tabs'

const tabs = useTabsStore()
</script>

<template>
  <aside class="ai-panel">
    <div class="ai-head">
      <div class="title"><span class="dot"></span> AI 助手</div>
      <button class="model-chip">GLM-4 ▾</button>
    </div>

    <div class="quick">
      <div class="quick-label">写作快捷入口</div>
      <button class="quick-card" @click="tabs.openOutline()">
        <span class="ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.6 6.5 6.5 2.5-6.5 2.5L12 20l-2.6-6.5-6.5-2.5 6.5-2.5z"/></svg>
        </span>
        <span><div class="t">一键生成大纲</div><div class="s">从已写章节整理三层大纲</div></span>
      </button>
      <button class="quick-card">
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
    </div>

    <div class="ai-chat">
      <div class="bubble in"><div class="who">✨ 星澜 · AI</div>下午好，创作者。今天是从第 12 章继续，还是让大纲先喘口气？</div>
      <div class="bubble out"><div class="who">我</div>帮我看看这段，林动叛出元门那章的节奏。</div>
      <div class="bubble in">
        <div class="who">✨ 星澜 · AI</div>没问题。这张是目前进展，我建议把冲突前置到章首前 200 字：
        <div class="block">冲突前置 + 教众质疑 → 长老出手 → 旧宗门令其退门</div>
        <span class="pill gotoline">接受 »</span>
      </div>
    </div>

    <div class="ai-input">
      <textarea rows="1" placeholder="问问我，或试试上面的快捷入口…"></textarea>
      <button class="send">
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
}
.ai-head {
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.title { font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.title .dot { width: 8px; height: 8px; border-radius: 3px; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.model-chip {
  font-size: 11px; color: var(--fg-muted); background: var(--bg-hover);
  border: none; border-radius: 6px; padding: 3px 8px; display: flex; align-items: center; gap: 4px;
}
.model-chip:hover { color: var(--fg); }

.quick {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}
.quick-label { font-size: 11px; color: var(--fg-faint); margin-bottom: 2px; }
.quick-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-panel);
  color: var(--fg);
  text-align: left;
  transition: all 0.14s ease;
}
.quick-card:hover { border-color: var(--accent); background: var(--accent-soft); transform: translateY(-1px); }
.quick-card .ic { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); flex-shrink: 0; }
.quick-card .ic svg { width: 16px; height: 16px; }
.quick-card .t { font-size: 13px; font-weight: 500; }
.quick-card .s { font-size: 11px; color: var(--fg-muted); }

.ai-chat {
  flex: 1;
  padding: 12px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bubble { max-width: 92%; padding: 10px 12px; border-radius: 10px; line-height: 1.6; font-size: 12.5px; }
.bubble.in { align-self: flex-start; background: var(--bg-hover); border-top-left-radius: 3px; }
.bubble.out { align-self: flex-end; background: var(--accent); color: var(--accent-fg); border-top-right-radius: 3px; }
.bubble .who { font-size: 11px; color: var(--fg-faint); margin-bottom: 4px; }
.bubble.in .who { color: var(--info); }
.bubble .block { background: var(--bg-panel); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-top: 8px; font-size: 12px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; }
.pill.gotoline { border: 1px solid var(--accent); color: var(--accent); background: transparent; margin-top: 8px; }

.ai-input {
  border-top: 1px solid var(--border);
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}
.ai-input textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--border);
  background: var(--bg-editor);
  color: var(--fg);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 12.5px;
  line-height: 1.5;
}
.ai-input textarea:focus { outline: 2px solid var(--accent); border-color: transparent; }
.ai-input .send {
  width: 34px; height: 34px; border-radius: 9px; border: none;
  background: var(--accent); color: var(--accent-fg);
  display: grid; place-items: center; flex-shrink: 0;
}
.ai-input .send:hover { filter: brightness(1.06); }
.ai-input .send svg { width: 16px; height: 16px; }
</style>

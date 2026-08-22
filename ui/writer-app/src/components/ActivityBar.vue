<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const theme = useThemeStore()
</script>

<template>
  <aside class="activity">
    <button class="icon-btn active" title="作品库">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="12" height="16" rx="2"/><path d="M17 4h4v16h-4"/><path d="M6 8h6M6 12h6"/></svg>
    </button>
    <button class="icon-btn" title="AI 助手">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>
    </button>
    <button class="icon-btn" title="设置">
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
.icon-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  position: relative;
  color: var(--fg-muted);
  border-radius: 8px;
  border: none;
  background: transparent;
  transition: all 0.14s ease;
}
.icon-btn:hover { color: var(--fg); background: var(--bg-hover); }
.icon-btn.active { color: var(--accent); background: var(--accent-soft); }
.icon-btn.active::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 22px;
  background: var(--accent);
  border-radius: 2px;
}
.icon-btn svg { width: 20px; height: 20px; }
.theme-toggle {
  border: none;
  background: transparent;
  color: var(--fg-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
}
.theme-toggle:hover { color: var(--fg); background: var(--bg-hover); }
.theme-toggle svg { width: 18px; height: 18px; }
</style>

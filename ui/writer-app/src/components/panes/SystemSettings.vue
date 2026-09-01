<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import { useAIChatStore } from '../../stores/aichat'

interface AppInfo {
  name: string
  version: string
  platform: string
  execPath: string
  userDataPath: string
  dbPath: string
  isPackaged: boolean
}

const auth = useAIChatStore()

const appInfo = ref<AppInfo | null>(null)
const infoErr = ref<string | null>(null)

// LLM 配置表单
const llmApiKey = ref('')
const llmBaseUrl = ref('')
const llmModel = ref('')
const cfgSaved = ref(false)
const cfgErr = ref<string | null>(null)

async function loadAppInfo() {
  try { appInfo.value = await api.app.info() } catch (e: any) { infoErr.value = e?.message || String(e) }
}
async function loadConfig() {
  try {
    const cfg = await api.config.get()
    llmApiKey.value = cfg?.llm?.apiKey || ''
    llmBaseUrl.value = cfg?.llm?.baseUrl || ''
    llmModel.value = cfg?.llm?.model || ''
  } catch (e: any) { cfgErr.value = e?.message || String(e) }
}
async function saveConfig() {
  cfgErr.value = null
  cfgSaved.value = false
  try {
    await api.config.update({ llm: { apiKey: llmApiKey.value, baseUrl: llmBaseUrl.value, model: llmModel.value } })
    cfgSaved.value = true
    auth.refreshStatus()
    setTimeout(() => (cfgSaved.value = false), 1600)
  } catch (e: any) { cfgErr.value = e?.message || String(e) }
}

onMounted(() => {
  loadAppInfo()
  loadConfig()
  auth.refreshStatus()
})
</script>

<template>
  <div class="sys-settings">
    <h2 class="title">设置</h2>

    <section class="card">
      <h3>🤖 AI / LLM 配置</h3>
      <p class="hint">用于「一键大纲」与「分析本章」。支持 GLM-4 / DeepSeek 等 Chat Completions 兼容 API。</p>

      <label>API Key</label>
      <input v-model="llmApiKey" type="password" placeholder="sk-..." autocomplete="off" />
      <label>Base URL（可选，默认 DeepSeek）</label>
      <input v-model="llmBaseUrl" placeholder="https://api.deepseek.com/v1" />
      <label>Model（可选，默认 deepseek-chat）</label>
      <input v-model="llmModel" placeholder="deepseek-chat / glm-4" />

      <div class="actions">
        <button class="primary" @click="saveConfig">保存配置</button>
        <span v-if="cfgSaved" class="saved">✓ 已保存</span>
        <span v-if="cfgErr" class="err">{{ cfgErr }}</span>
      </div>
      <div v-if="auth.configured != null" class="ai-state" :class="{ ok: auth.configured }">
        {{ auth.configured ? '✅ AI 已就绪' : '⚠️ 尚未配置 API Key' }}
      </div>
    </section>

    <section class="card">
      <h3>📁 数据与路径</h3>
      <div v-if="appInfo" class="info-list">
        <div class="row"><span class="k">作品/数据保存位置</span><span class="v mono">{{ appInfo.dbPath }}</span></div>
        <div class="row"><span class="k">当前软件路径</span><span class="v mono">{{ appInfo.execPath }}</span></div>
        <div class="row"><span class="k">用户数据目录</span><span class="v mono">{{ appInfo.userDataPath }}</span></div>
        <div class="row"><span class="k">平台</span><span class="v">{{ appInfo.platform }}</span></div>
      </div>
      <p v-if="infoErr" class="err">{{ infoErr }}</p>
      <p v-else-if="!appInfo" class="hint">正在读取应用信息…</p>
    </section>

    <section class="card">
      <h3>ℹ️ 关于</h3>
      <div class="about">
        <div class="app-logo">✨</div>
        <div class="app-name">写作星河</div>
        <div class="app-ver">{{ appInfo ? 'v' + appInfo.version : '' }}</div>
        <p>面向网文作者的本地桌面写作工具 —— 章节编辑 · 一键大纲 · 3D 人物关系图</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sys-settings {
  height: 100%;
  overflow-y: auto;
  padding: 24px 32px;
  max-width: 720px;
  margin: 0 auto;
  background: var(--bg-editor);
}
.title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: var(--fg); }
.card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 18px 20px;
  margin-bottom: 16px;
}
.card h3 { font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.hint { font-size: 12px; color: var(--fg-muted); margin-bottom: 12px; }
label { display: block; font-size: 12px; color: var(--fg-muted); margin: 10px 0 4px; }
input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-workspace);
  color: var(--fg);
  font: inherit;
  font-size: 13px;
}
input:focus { outline: 2px solid var(--accent); }
.actions { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
.primary {
  padding: 8px 18px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--accent-fg);
  font-size: 13px;
  cursor: pointer;
}
.primary:hover { filter: brightness(1.08); }
.saved { color: var(--ok); font-size: 12px; }
.err { color: var(--danger); font-size: 12px; }
.ai-state { margin-top: 10px; font-size: 12px; }
.ai-state.ok { color: var(--ok); }
.info-list .row { display: flex; gap: 10px; padding: 6px 0; font-size: 13px; flex-wrap: wrap; }
.info-list .k { width: 150px; color: var(--fg-muted); flex-shrink: 0; }
.info-list .v { color: var(--fg); word-break: break-all; }
.mono { font-family: 'SF Mono', Consolas, 'JetBrains Mono', monospace; font-size: 12px; }
.about { text-align: center; padding: 8px 0 4px; }
.app-logo { font-size: 40px; }
.app-name { font-size: 18px; font-weight: 700; margin-top: 4px; }
.app-ver { font-size: 12px; color: var(--fg-muted); margin: 2px 0 8px; }
.about p { font-size: 12px; color: var(--fg-muted); }
</style>

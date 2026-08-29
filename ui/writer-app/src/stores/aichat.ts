import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'

export interface ChatMsg {
  id: number
  who: 'ai' | 'me'
  type: 'text' | 'outline' | 'ai'
  content: string
}

let seq = 0

/** AI 交互：连接后端 /api/ai。未配 key 时展示后端返回的友好提示。 */
export const useAIChatStore = defineStore('aichat', () => {
  const messages = ref<ChatMsg[]>([])
  const busy = ref(false)
  const configured = ref<boolean | null>(null)
  const summary = ref<string>('')

  function push(who: ChatMsg['who'], content: string, type: ChatMsg['type'] = 'text') {
    messages.value.push({ id: ++seq, who, type, content })
  }

  async function refreshStatus() {
    try {
      const s = await api.ai.status()
      configured.value = s.configured
      summary.value = s.summary
    } catch {
      configured.value = null
    }
  }

  async function generateOutline(workId: number | null | undefined) {
    if (workId == null) { push('ai', '请先选择一个作品。'); return }
    if (busy.value) return
    busy.value = true
    push('me', '帮我整理一份三层大纲。', 'text')
    try {
      const { result } = await api.ai.outline(workId)
      push('ai', result, 'outline')
    } catch (e: any) {
      push('ai', e?.message || String(e), 'ai')
    } finally {
      busy.value = false
    }
  }

  async function analyzeChapter(_workId: number | null | undefined, chapterId?: number | undefined, chapterLabel?: string) {
    if (chapterId == null) { push('ai', '请先打开一章再分析。'); return }
    if (busy.value) return
    busy.value = true
    push('me', `分析本章「${chapterLabel || ''}」的人物与关系。`, 'text')
    try {
      const { result } = await api.ai.analyzeChapter(chapterId)
      push('ai', result, 'ai')
    } catch (e: any) {
      push('ai', e?.message || String(e), 'ai')
    } finally {
      busy.value = false
    }
  }

  function send(text: string) {
    push('me', text, 'text')
    push('ai', `大纲/AI 助手已接入，请在顶部使用「一键大纲」「分析本章」。要配置真实大模型，请在 backend/application.yml 设置 llm.api-key 后重启。`, 'ai')
  }

  return { messages, busy, configured, summary, push, send, refreshStatus, generateOutline, analyzeChapter }
})

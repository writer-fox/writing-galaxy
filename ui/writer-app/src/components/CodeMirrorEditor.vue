<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorView, basicSetup } from 'codemirror'
import type { ViewUpdate } from '@codemirror/view'
import { placeholder } from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const host = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
const themeCompartment = new Compartment()

function themeExtension() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  return EditorView.theme(
    {
      '&': {
        backgroundColor: 'var(--bg-editor)',
        color: 'var(--fg)',
        height: '100%',
        fontSize: '15px',
      },
      '.cm-content': {
        fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif',
        lineHeight: '1.7',
        padding: '48px 56px 120px',
      },
      '.cm-line': { maxWidth: '860px' },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': { fontFamily: 'inherit', overflow: 'auto' },
      '.cm-gutters': { backgroundColor: 'var(--bg-editor)', color: 'var(--fg-faint)', border: 'none', minWidth: '3em' },
      '.cm-activeLine': { backgroundColor: 'var(--accent-soft)' },
      '.cm-activeLineGutter': { backgroundColor: 'var(--accent-soft)' },
      '.cm-cursor': { borderLeftColor: 'var(--accent)' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--accent-soft)' },
      '.cm-placeholder': { color: 'var(--fg-faint)', fontStyle: 'italic' },
    },
    { dark }
  )
}

function createView() {
  if (!host.value) return
  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      basicSetup,
      markdown(),
      themeCompartment.of(themeExtension()),
      EditorView.lineWrapping,
      placeholder(props.placeholder || '这一章还没有落笔，开始写吧'),
      EditorState.readOnly.of(!!props.readonly),
      EditorView.updateListener.of((u: ViewUpdate) => {
        if (u.docChanged) emit('update:modelValue', u.state.doc.toString())
      }),
    ] as any[],
  })
  view = new EditorView({ state, parent: host.value })
}

onMounted(createView)
onBeforeUnmount(() => view?.destroy())

// 外部改 value（如切换章节）时同步
watch(
  () => props.modelValue,
  (val) => {
    if (view && val !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: val } })
    }
  }
)

// 主题切换 → reconfigure 主题侧
watch(
  () => document.documentElement.getAttribute('data-theme'),
  () => {
    if (view) {
      view.dispatch({ effects: themeCompartment.reconfigure(themeExtension()) })
    }
  }
)
</script>

<template>
  <div ref="host" class="cm-host"></div>
</template>

<style scoped>
.cm-host {
  height: 100%;
  overflow: hidden;
}
</style>

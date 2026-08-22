<script setup lang="ts">
import ActivityBar from './components/ActivityBar.vue'
import AiPanel from './components/AiPanel.vue'
import WorkPane from './components/WorkPane.vue'
import Explorer from './components/Explorer.vue'
import StatusBar from './components/StatusBar.vue'
import { useLayoutResize } from './composables/layout'

useLayoutResize()
</script>

<template>
  <div class="shell">
    <ActivityBar />
    <AiPanel />
    <WorkPane />
    <Explorer />
    <StatusBar />

    <div class="resizer r-ai" id="r-ai" title="拖动调整 AI 栏宽度"></div>
    <div class="resizer r-exp" id="r-exp" title="拖动调整内容树宽度"></div>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  display: grid;
  grid-template-columns: var(--act-w) var(--ai-w) 1fr var(--exp-w);
  grid-template-rows: 1fr 24px;
  grid-template-areas:
    'activity ai work explorer'
    'status status status status';
  height: 100vh;
}

.resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 20;
  touch-action: none;
}
.resizer:hover::after,
.resizer.dragging::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 2px;
  width: 1px;
  background: var(--accent);
  opacity: 0.6;
}
.r-ai {
  left: calc(var(--act-w) + var(--ai-w) - 3px); /* AI 栏右缘 */
}
.r-exp {
  right: calc(var(--exp-w) - 2px);
  left: auto;
}
</style>

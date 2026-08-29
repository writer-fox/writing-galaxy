<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import ActivityBar from './components/ActivityBar.vue'
import AiPanel from './components/AiPanel.vue'
import WorkPane from './components/WorkPane.vue'
import Explorer from './components/Explorer.vue'
import StatusBar from './components/StatusBar.vue'
import { useLayoutResize } from './composables/layout'
import { useWorksStore } from './stores/works'

useLayoutResize()
const works = useWorksStore()
onMounted(() => works.init())
</script>

<template>
  <div class="electron-root">
    <!-- 无边框窗口自定义标题栏 -->
    <TitleBar />
    <div class="shell">
      <ActivityBar />
      <AiPanel />
      <WorkPane />
      <Explorer />
      <StatusBar />

      <div class="resizer r-ai" id="r-ai" title="拖动调整 AI 栏宽度"></div>
      <div class="resizer r-exp" id="r-exp" title="拖动调整内容树宽度"></div>
    </div>
  </div>
</template>

<style scoped>
/* 无边框窗口外层圆角容器：内容与窗口边缘留间隙，呈现悬浮卡片质感 */
.electron-root {
  height: 100vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--window-radius);
  overflow: hidden;
  background: var(--bg-workspace);
  /* 窗口外部柔和投影(相对窗口层)；无边框 frame:false 时系统也提供阴影 */
}

.shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--act-w) var(--ai-w) 1fr var(--exp-w);
  grid-template-rows: 1fr 24px;
  grid-template-areas:
    'activity ai work explorer'
    'status status status status';
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

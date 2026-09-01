<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useTabsStore } from '../stores/tabs'
import { useDataStore, chapterLabel, type Chapter } from '../stores/data'
import { useWorksStore } from '../stores/works'

const tabs = useTabsStore()
const data = useDataStore()
const works = useWorksStore()

const collapsed = ref(new Set<string>()) // 折叠的分类 id
const collapsedVol = ref(new Set<number>()) // 折叠的卷 id
const editingId = ref<string>('') // 正在行内改标题的章节 id
const editingText = ref('')
const editingInput = ref<HTMLInputElement | null>(null)

function toggleCat(id: string) {
  collapsed.value = (() => {
    const next = new Set(collapsed.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })()
}
function isCollapsed(id: string) {
  return collapsed.value.has(id)
}
function toggleVol(id: number) {
  collapsedVol.value = (() => {
    const next = new Set(collapsedVol.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })()
}
function isVolCollapsed(id: number) {
  return collapsedVol.value.has(id)
}
async function addNewVolume() {
  const name = prompt('新分卷名称', '')
  if (name === null) return
  const v = await data.addVolume(name || undefined)
  if (v) collapsedVol.value.delete(v.id)
}

async function addAfter(c: Chapter) {
  const ch = await data.addChapter(c.sortOrder)
  tabs.openChapter(ch.id, chapterLabel(ch))
}
async function addEnd() {
  const ch = await data.addChapter()
  tabs.openChapter(ch.id, chapterLabel(ch))
}

async function del(c: Chapter) {
  tabs.close(c.id)
  await data.removeChapter(c.id)
}

function startEdit(c: Chapter) {
  editingId.value = c.id
  editingText.value = c.title
  nextTick(() => editingInput.value?.focus())
}
function commitEdit(c: Chapter) {
  if (editingId.value) data.setTitle(c.id, editingText.value)
  editingId.value = ''
}
function cancelEdit() {
  editingId.value = ''
}

async function compact() {
  tabs.close('')
  await data.renumber()
  const first = data.sortedChapters[0]
  if (first) tabs.openChapter(first.id, chapterLabel(first))
}
</script>

<template>
  <aside class="explorer">
    <div class="exp-head">
      内容树
      <span class="head-actions">
        <button class="add" title="追加新章节" @click="addEnd">＋</button>
        <button class="add" title="一键压实章节序号（1,2,3…）" @click="compact">≡</button>
      </span>
    </div>
    <div class="exp-body">
      <!-- 当前作品抬头 -->
      <div v-if="works.currentWork" class="exp-current">
        <span class="cur-dot"></span>
        <div class="cur-main">
          <div class="cur-name">{{ works.currentWork.title }}</div>
          <div class="cur-folder" :title="works.currentWork.dbPath">{{ works.currentWork.folderName || works.currentWork.title }}</div>
        </div>
      </div>

      <div class="exp-cat" @click="toggleCat('chapters')">
        <span class="chev" :class="{ down: !isCollapsed('chapters') }">▸</span>
        章节 <span class="cnt">· 共 {{ data.chapters.length }}</span>
        <button class="add-vol" title="新建分卷" @click.stop="addNewVolume">＋卷</button>
      </div>
      <template v-if="!isCollapsed('chapters')">
        <!-- 卷 > 章节 层级 -->
        <template v-for="g in data.chaptersByVolume" :key="g.volume.id">
          <div class="exp-vol" @click="toggleVol(g.volume.id)">
            <span class="chev" :class="{ down: !isVolCollapsed(g.volume.id) }">▸</span>
            <span class="vol-name">{{ g.volume.name }}</span>
            <span class="cnt">{{ g.chapters.length }} 章</span>
          </div>
          <template v-if="!isVolCollapsed(g.volume.id)">
            <div
              v-for="c in g.chapters"
              :key="c.id"
              class="exp-item"
              :class="{ active: tabs.activeKey === c.id }"
              @click="tabs.openChapter(c.id, chapterLabel(c))"
            >
              <span class="st" :class="c.status === '完成' ? 'st-done' : 'st-draft'"></span>
              <input
                v-if="editingId === c.id"
                ref="editingInput"
                v-model="editingText"
                class="rename"
                @click.stop
                @keydown.enter="commitEdit(c)"
                @keydown.esc="cancelEdit"
                @blur="commitEdit(c)"
              />
              <span
                v-else
                class="txt"
                :title="chapterLabel(c)"
                @dblclick.stop="startEdit(c)"
              >{{ chapterLabel(c) }}</span>
              <span class="hov">
                <button title="在此章后插入一章" @click.stop="addAfter(c)">＋</button>
                <button title="删除本章" @click.stop="del(c)">✕</button>
              </span>
            </div>
          </template>
        </template>
      </template>

      <div class="exp-cat" @click="toggleCat('outline')">
        <span class="chev" :class="{ down: !isCollapsed('outline') }">▸</span>大纲
      </div>
      <div class="exp-cat" @click="tabs.openGraph()">
        <span class="chev down">▸</span>人物关系图 <button class="jump">✧</button>
      </div>
      <div class="exp-cat" @click="tabs.openSetting()">
        <span class="chev down">▸</span>设定集 <span class="cnt">· 人物/势力/关系</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.explorer {
  grid-area: explorer;
  min-width: 220px;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  background: var(--bg-panel);
}
.exp-head {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.exp-head .add {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: grid;
  place-items: center;
  color: var(--fg-faint);
  border: none;
  background: transparent;
}
.exp-head .head-actions { display: flex; align-items: center; gap: 2px; }
.exp-head .add:hover { color: var(--accent); background: var(--accent-soft); }
.rename {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px dashed var(--accent);
  background: var(--accent-soft);
  color: var(--fg);
  font: inherit;
  padding: 1px 4px;
  border-radius: 3px;
}
.rename:focus { outline: 2px solid var(--accent); border-bottom-style: solid; }
.exp-body { flex: 1; overflow: auto; padding: 6px 4px; }
.exp-current {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 10px 8px;
  margin: 2px 4px 6px;
  border-radius: 8px;
  background: var(--accent-soft);
}
.cur-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); margin-top: 4px; flex-shrink: 0; }
.cur-main { flex: 1; min-width: 0; }
.cur-name { font-weight: 600; font-size: 13px; color: var(--fg); }
.cur-folder {
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.exp-cat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--fg-faint);
  cursor: pointer;
  border-radius: 6px;
  font-weight: 500;
}
.exp-cat:hover { color: var(--fg); background: var(--bg-hover); }
.exp-cat .cnt { font-weight: 400; }
.chev { font-size: 10px; transform: rotate(-90deg); transition: transform 0.14s; display: inline-block; }
.chev.down { transform: rotate(0deg); }
.add-vol {
  margin-left: auto;
  background: transparent;
  border: 1px dashed var(--border);
  color: var(--fg-faint);
  border-radius: 5px;
  font-size: 10px;
  padding: 1px 6px;
  cursor: pointer;
}
.add-vol:hover { border-color: var(--accent); color: var(--accent); }
.exp-vol {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-muted);
  cursor: pointer;
  border-radius: 6px;
  margin-top: 2px;
}
.exp-vol:hover { background: var(--bg-hover); color: var(--fg); }
.vol-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exp-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px 5px 26px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.14s;
  color: var(--fg);
}
.exp-item:hover { background: var(--bg-hover); }
.exp-item.active { background: var(--accent-soft); color: var(--accent); }
.exp-item.warn { color: var(--warn); }
.txt { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.st-draft { background: var(--fg-faint); }
.st-done { background: var(--ok); }
.st-todo { background: var(--warn); }
.hov { display: none; color: var(--fg-muted); gap: 2px; }
.exp-item:hover .hov { display: flex; }
.hov button {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  color: var(--fg-faint);
  border: none;
  background: transparent;
}
.hov button:hover { color: var(--accent); }
.jump {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--fg-faint);
  width: 18px;
  height: 18px;
  border-radius: 4px;
}
.jump:hover { color: var(--accent); background: var(--accent-soft); }
</style>

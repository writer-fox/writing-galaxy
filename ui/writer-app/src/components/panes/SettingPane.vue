<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCastStore } from '../../stores/cast'
import { useWorksStore } from '../../stores/works'
import type { EntityType, Relationship } from '../../api'

const cast = useCastStore()
const works = useWorksStore()

const seg = ref<'character' | 'faction' | 'relationship'>('character')
const err = ref<string | null>(null)

// 当前作品变化时加载设定
watch(() => works.currentWorkId, async (id) => {
  if (id != null) await cast.load(id)
  else cast.reset()
}, { immediate: true })

async function run(fn: () => Promise<any>) {
  err.value = null
  try { await fn() } catch (e: any) { err.value = String(e?.message || e) }
}

/* ---------- 人物 ---------- */
const newChar = ref({ name: '', role: '配角', importance: 0.5 })
function addChar() {
  const name = newChar.value.name.trim()
  if (!name) return
  run(() => cast.addCharacter({ name, role: newChar.value.role, importance: newChar.value.importance }))
  newChar.value = { name: '', role: '配角', importance: 0.5 }
}

/* ---------- 势力 ---------- */
const newFaction = ref({ name: '', type: '组织', color: '#4f9df0' })
function addFaction() {
  const name = newFaction.value.name.trim()
  if (!name) return
  run(() => cast.addFaction({ name, type: newFaction.value.type, color: newFaction.value.color }))
  newFaction.value = { name: '', type: '组织', color: '#4f9df0' }
}

/* ---------- 关系 ---------- */
const entities = computed<{ id: number; type: EntityType; label: string }[]>(() => [
  ...[...cast.characters].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, type: 'character' as EntityType, label: `👤 ${c.name}` })),
  ...[...cast.factions].sort((a, b) => a.id - b.id).map((f) => ({ id: f.id, type: 'faction' as EntityType, label: `🏛 ${f.name}` })),
])
const REL_TYPES = [
  { v: 'belong_to', l: '从属' }, { v: 'ally', l: '结盟' }, { v: 'enemy', l: '敌对' },
  { v: 'kinship', l: '亲属' }, { v: 'master_disciple', l: '师徒' }, { v: 'lover', l: '情侣' },
  { v: 'subordinate', l: '上下级' }, { v: 'custom', l: '自定义' },
]
const newRel = ref({ from: '', to: '', type: 'enemy', strength: 0.5, note: '' })
function addRel() {
  const from = entities.value.find((e) => e.id + '' === newRel.value.from)
  const to = entities.value.find((e) => e.id + '' === newRel.value.to)
  if (!from || !to) { err.value = '请选择关系两端'; return }
  if (from.id === to.id && from.type === to.type) { err.value = '两端不能是同一实体'; return }
  run(() => cast.addRelationship({
    fromId: from.id, fromType: from.type, toId: to.id, toType: to.type,
    relType: newRel.value.type, strength: newRel.value.strength, note: newRel.value.note || undefined,
  }))
  newRel.value = { from: '', to: '', type: 'enemy', strength: 0.5, note: '' }
}

function fmtEntity(r: Relationship, which: 'from' | 'to') {
  const id = which === 'from' ? r.fromId : r.toId
  const type = which === 'from' ? r.fromType : r.toType
  const pool = type === 'character' ? cast.characters : cast.factions
  return pool.find((e) => e.id === id)?.name || `[${id}]`
}
</script>

<template>
  <div class="setting-pane">
    <div class="set-head">
      <div class="seg">
        <button :class="{ active: seg === 'character' }" @click="seg = 'character'">人物</button>
        <button :class="{ active: seg === 'faction' }" @click="seg = 'faction'">势力</button>
        <button :class="{ active: seg === 'relationship' }" @click="seg = 'relationship'">关系</button>
      </div>
      <div class="spacer"></div>
      <span class="hint" v-if="cast.loading">加载中…</span>
    </div>

    <div v-if="err" class="set-err">{{ err }}</div>

    <div class="set-body">
      <!-- 人物 -->
      <template v-if="seg === 'character'">
        <div class="add-row">
          <input v-model="newChar.name" class="grow" placeholder="人物名" @keydown.enter="addChar" />
          <select v-model="newChar.role">
            <option v-for="r in ['主角','配角','反派','路人']" :key="r" :value="r">{{ r }}</option>
          </select>
          <button class="add-btn" @click="addChar">＋ 添加</button>
        </div>
        <div v-for="c in cast.characters" :key="c.id" class="row">
          <span class="dot" :style="{ background: c.avatarColor || '#888' }"></span>
          <b>{{ c.name }}</b>
          <span class="tag">{{ c.role }}</span>
          <span class="dim" v-if="c.factionId">→ {{ cast.factions.find((f) => f.id === c.factionId)?.name }}</span>
          <span class="spacer"></span>
          <span class="star" :class="{ on: c.confirmed }">{{ c.confirmed ? '✓' : c.role === '主角' ? '★' : '' }}</span>
          <button class="del" title="删除" @click="run(() => cast.removeCharacter(c.id))">✕</button>
        </div>
        <div v-if="!cast.characters.length" class="empty">还没有人物，添加第一位吧。</div>
      </template>

      <!-- 势力 -->
      <template v-else-if="seg === 'faction'">
        <div class="add-row">
          <input v-model="newFaction.name" class="grow" placeholder="势力名" @keydown.enter="addFaction" />
          <select v-model="newFaction.type">
            <option v-for="r in ['门派','国家','家族','组织']" :key="r" :value="r">{{ r }}</option>
          </select>
          <button class="add-btn" @click="addFaction">＋ 添加</button>
        </div>
        <div v-for="f in cast.factions" :key="f.id" class="row">
          <span class="dot" :style="{ background: f.color || '#888' }"></span>
          <b>{{ f.name }}</b>
          <span class="tag">{{ f.type }}</span>
          <span class="dim" v-if="f.parentFactionId">⊂ {{ cast.factions.find((x) => x.id === f.parentFactionId)?.name }}</span>
          <span class="spacer"></span>
          <span class="dim">{{ cast.characters.filter((c) => c.factionId === f.id).length }} 人</span>
          <button class="del" title="删除" @click="run(() => cast.removeFaction(f.id))">✕</button>
        </div>
        <div v-if="!cast.factions.length" class="empty">还没有势力。</div>
      </template>

      <!-- 关系 -->
      <template v-else>
        <div class="add-row rel">
          <select v-model="newRel.from">
            <option value="" disabled>起点 ▼</option>
            <option v-for="e in entities" :key="'f' + e.type + e.id" :value="e.id + ''">{{ e.label }}</option>
          </select>
          <select v-model="newRel.to">
            <option value="" disabled>终点 ▼</option>
            <option v-for="e in entities" :key="'t' + e.type + e.id" :value="e.id + ''">{{ e.label }}</option>
          </select>
          <select v-model="newRel.type">
            <option v-for="t in REL_TYPES" :key="t.v" :value="t.v">{{ t.l }}</option>
          </select>
          <input v-model="newRel.note" placeholder="备注" />
          <button class="add-btn" @click="addRel">＋</button>
        </div>
        <div v-for="r in cast.relationships" :key="r.id" class="row">
          <span class="rel-name">{{ fmtEntity(r, 'from') }}</span>
          <span class="rel-edge">{{ r.relType }}</span>
          <span class="rel-name">{{ fmtEntity(r, 'to') }}</span>
          <span class="dim" v-if="r.note">· {{ r.note }}</span>
          <span class="spacer"></span>
          <button v-if="!r.confirmed" class="confirm" @click="run(() => cast.confirmRelationship(r.id))">确认</button>
          <span v-else class="confirmed">已确认</span>
          <button class="del" @click="run(() => cast.removeRelationship(r.id))">✕</button>
        </div>
        <div v-if="!cast.relationships.length" class="empty">还没有关系，先在人物/势力间连线吧。</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.setting-pane { height: 100%; display: flex; flex-direction: column; background: var(--bg-editor); }
.set-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
}
.seg { display: flex; gap: 2px; }
.seg button {
  padding: 5px 14px; border-radius: 999px; border: none;
  background: transparent; color: var(--fg-muted); cursor: pointer; font-size: 12px;
}
.seg button.active { background: var(--accent); color: var(--accent-fg); }
.seg button:hover:not(.active) { color: var(--fg); background: var(--bg-hover); }
.cnt { font-size: 11px; color: var(--fg-faint); }
.hint { font-size: 11px; color: var(--fg-faint); }
.spacer { flex: 1; }
.set-err { padding: 8px 14px; background: var(--danger); color: #fff; font-size: 12px; }
.set-body { flex: 1; overflow: auto; padding: 12px 16px; }
.add-row { display: flex; gap: 6px; margin-bottom: 10px; align-items: center; }
.add-row input,
.add-row select {
  padding: 6px 9px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--bg-workspace); color: var(--fg); font: inherit; font-size: 13px;
}
.add-row .grow { flex: 1; min-width: 80px; }
.add-btn {
  padding: 6px 12px; border-radius: 6px; border: none;
  background: var(--accent); color: var(--accent-fg); cursor: pointer; font-size: 13px;
  white-space: nowrap;
}
.add-btn:hover { filter: brightness(1.08); }
.add-row.rel input { flex: 1; min-width: 60px; }
.row {
  display: flex; align-items: center; gap: 8px; padding: 7px 8px;
  border-radius: 6px; font-size: 13px;
}
.row:hover { background: var(--bg-hover); }
.row b { font-weight: 600; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.tag { font-size: 11px; color: var(--accent); background: var(--accent-soft); padding: 1px 6px; border-radius: 999px; }
.dim { color: var(--fg-faint); font-size: 12px; }
.star { color: var(--fg-faint); width: 14px; text-align: center; }
.star.on { color: var(--ok); }
.del, .confirm {
  border: none; border-radius: 5px; cursor: pointer; font-size: 12px;
  padding: 2px 8px;
}
.del { color: var(--fg-faint); background: transparent; }
.del:hover { color: var(--danger); background: var(--bg-hover); }
.confirm { color: var(--ok); background: var(--accent-soft); }
.confirmed { font-size: 11px; color: var(--ok); }
.rel-name { font-weight: 500; }
.rel-edge {
  font-size: 11px; color: var(--fg-faint); padding: 1px 6px;
  border: 1px solid var(--border); border-radius: 999px;
}
.empty { color: var(--fg-faint); text-align: center; padding: 30px; font-size: 13px; }
</style>

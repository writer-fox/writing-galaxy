import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, type Character, type Faction, type Relationship } from '../api'
import { useGraphStore } from './graph'

/** 设定集数据：人物/势力/关系，全部走后端。变更后刷新 3D 图。 */
export const useCastStore = defineStore('cast', () => {
  const characters = ref<Character[]>([])
  const factions = ref<Faction[]>([])
  const relationships = ref<Relationship[]>([])
  const workId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refreshGraph() {
    const g = useGraphStore()
    if (workId.value != null) g.setWork(workId.value)
    await g.load('god', null)
  }

  async function load(workIdArg: number) {
    workId.value = workIdArg
    loading.value = true
    error.value = null
    try {
      const [c, f, r] = await Promise.all([
        api.characters.list(workIdArg),
        api.factions.list(workIdArg),
        api.relationships.list(workIdArg),
      ])
      characters.value = c
      factions.value = f
      relationships.value = r
    } catch (e: any) {
      error.value = String(e?.message || e)
    } finally {
      loading.value = false
    }
  }

  async function addCharacter(payload: Partial<Omit<Character, 'id' | 'workId' | 'confirmed'>>) {
    if (workId.value == null) throw new Error('未选择作品')
    const c = await api.characters.create(workId.value, payload)
    characters.value = [...characters.value, c]
    await refreshGraph()
    return c
  }

  async function updateCharacter(id: number, patch: Partial<Omit<Character, 'id' | 'workId'>>) {
    const c = await api.characters.update(id, patch)
    characters.value = characters.value.map((x) => (x.id === id ? c : x))
    await refreshGraph()
    return c
  }

  async function removeCharacter(id: number) {
    await api.characters.remove(id)
    characters.value = characters.value.filter((x) => x.id !== id)
    relationships.value = relationships.value.filter(
      (r) => !(r.fromId === id && r.fromType === 'character') && !(r.toId === id && r.toType === 'character')
    )
    await refreshGraph()
  }

  async function addFaction(payload: Partial<Omit<Faction, 'id' | 'workId'>>) {
    if (workId.value == null) throw new Error('未选择作品')
    const f = await api.factions.create(workId.value, payload)
    factions.value = [...factions.value, f]
    await refreshGraph()
    return f
  }

  async function updateFaction(id: number, patch: Partial<Omit<Faction, 'id' | 'workId'>>) {
    const f = await api.factions.update(id, patch)
    factions.value = factions.value.map((x) => (x.id === id ? f : x))
    await refreshGraph()
    return f
  }

  async function removeFaction(id: number) {
    await api.factions.remove(id)
    factions.value = factions.value.filter((x) => x.id !== id)
    characters.value = characters.value.map((c) => (c.factionId === id ? { ...c, factionId: null } : c))
    relationships.value = relationships.value.filter(
      (r) => !(r.fromId === id && r.fromType === 'faction') && !(r.toId === id && r.toType === 'faction')
    )
    await refreshGraph()
  }

  async function addRelationship(payload: Partial<Omit<Relationship, 'id' | 'workId' | 'confirmed'>>) {
    if (workId.value == null) throw new Error('未选择作品')
    const r = await api.relationships.create(workId.value, payload)
    relationships.value = [...relationships.value, r]
    await refreshGraph()
    return r
  }

  async function confirmRelationship(id: number) {
    const r = await api.relationships.confirm(id)
    relationships.value = relationships.value.map((x) => (x.id === id ? r : x))
    await refreshGraph()
    return r
  }

  async function removeRelationship(id: number) {
    await api.relationships.remove(id)
    relationships.value = relationships.value.filter((x) => x.id !== id)
    await refreshGraph()
  }

  function reset() {
    workId.value = null
    characters.value = []
    factions.value = []
    relationships.value = []
  }

  return {
    characters, factions, relationships, workId, loading, error,
    load, reset,
    addCharacter, updateCharacter, removeCharacter,
    addFaction, updateFaction, removeFaction,
    addRelationship, confirmRelationship, removeRelationship,
  }
})

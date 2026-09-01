// 本地数据操作层：把原 Spring Controller/Service 逻辑移植到 better-sqlite3
let _db = null
let _getDb = null
let _configPath = null

function bind(getDb, configPath) {
  _getDb = getDb
  _configPath = configPath || null
}

function D() {
  return _getDb ? _getDb() : _db
}

/* ---------- 用户配置（LLM key/model/base、可由设置页读写） ---------- */
const fs = require('fs')
const pathMod = require('path')
const DEFAULT_CFG = { llm: { apiKey: '', baseUrl: '', model: '' } }

function readConfig() {
  if (!_configPath || !fs.existsSync(_configPath)) return JSON.parse(JSON.stringify(DEFAULT_CFG))
  try { return { ...JSON.parse(JSON.stringify(DEFAULT_CFG)), ...JSON.parse(fs.readFileSync(_configPath, 'utf8')) } }
  catch { return JSON.parse(JSON.stringify(DEFAULT_CFG)) }
}
function writeConfig(cfg) {
  if (!_configPath) throw new Error('配置路径未初始化')
  const dir = pathMod.dirname(_configPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(_configPath, JSON.stringify(cfg, null, 2), 'utf8')
  return cfg
}
function getConfig() {
  return readConfig()
}
function updateConfig(patch) {
  const cur = readConfig()
  const cfg = {
    ...cur,
    llm: { ...(cur.llm || {}), ...(patch.llm || {}) },
  }
  return writeConfig(cfg)
}

/* ---------- 章节 sort_order 重排（对齐原 ChapterService.renumber） ---------- */
function renumberChapters(workId) {
  const rows = D().prepare('SELECT id FROM chapter WHERE work_id=? ORDER BY sort_order').all(workId)
  const d = D()
  d.pragma('defer_foreign_keys = ON')
  const tx = d.transaction(() => {
    // 阶段1: 取负，阶段2: 设 1..N
    d.prepare('UPDATE chapter SET sort_order = -sort_order WHERE work_id=?').run(workId)
    rows.forEach((r, i) => {
      d.prepare('UPDATE chapter SET sort_order=? WHERE id=?').run(i + 1, r.id)
    })
  })
  tx()
}

/* ---------- 作品 ---------- */
function listWorks() {
  const rows = D().prepare(
    'SELECT id, title, genre, summary, created_at AS createdAt, updated_at AS updatedAt FROM work ORDER BY created_at DESC'
  ).all()
  return rows
}
function createWork(title, genre, summary) {
  const info = D().prepare('INSERT INTO work(title, genre, summary) VALUES(?,?,?)').run(title, genre || null, summary || null)
  return getWork(info.lastInsertRowid)
}
function getWork(id) {
  return D().prepare('SELECT id, title, genre, summary, created_at AS createdAt, updated_at AS updatedAt FROM work WHERE id=?').get(id) || null
}

/* ---------- 章节 ---------- */
function listChapters(workId) {
  return D().prepare(
    'SELECT id, work_id AS workId, sort_order AS sortOrder, title, content, word_count AS wordCount, status, analyzed_at AS analyzedAt FROM chapter WHERE work_id=? ORDER BY sort_order'
  ).all(workId)
}
function getChapter(id) {
  return D().prepare('SELECT id, work_id AS workId, sort_order AS sortOrder, title, content, word_count AS wordCount, status, analyzed_at AS analyzedAt FROM chapter WHERE id=?').get(id) || null
}
function createChapter(workId, title, afterSortOrder) {
  const t = (title && title.trim()) || '新章节'
  const max = D().prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM chapter WHERE work_id=?').get(workId).m
  const info = D().prepare('INSERT INTO chapter(work_id, sort_order, title, content, status) VALUES(?,?,?,?,0)')
    .run(workId, max + 1, t, '')
  if (afterSortOrder != null) {
    // 当前刚插入的在末尾；需将其移到 afterSortOrder 之后
    // 复刻原逻辑: 从列表按位置重排
  }
  renumberChapters(workId)
  // 处理插入位置: 重新定位
  const all = listChapters(workId)
  const moved = all.find((c) => c.id === info.lastInsertRowid)
  if (afterSortOrder != null && moved) {
    const rest = all.filter((c) => c.id !== moved.id)
    let idx = -1
    for (let i = 0; i < rest.length; i++) if (rest[i].sortOrder > afterSortOrder) { idx = i; break }
    rest.splice(idx === -1 ? rest.length : idx, 0, moved)
    const d = D()
    d.pragma('defer_foreign_keys = ON')
    d.transaction(() => {
      d.prepare('UPDATE chapter SET sort_order = -sort_order WHERE work_id=?').run(workId)
      rest.forEach((c, i) => { d.prepare('UPDATE chapter SET sort_order=? WHERE id=?').run(i + 1, c.id) })
    })()
  } else {
    renumberChapters(workId)
  }
  return getChapter(info.lastInsertRowid)
}
function updateChapter(id, patch) {
  const cur = getChapter(id)
  if (!cur) return null
  const title = patch.title != null ? patch.title : cur.title
  const content = patch.content != null ? patch.content : cur.content
  const status = patch.status != null ? patch.status : cur.status
  D().prepare('UPDATE chapter SET title=?, content=?, word_count=?, status=?, analyzed_at=datetime(\'now\') WHERE id=?')
    .run(title, content, content ? content.length : 0, status, id)
  return getChapter(id)
}
function deleteChapter(workId, id) {
  const cur = getChapter(id)
  if (!cur) return false
  D().prepare('DELETE FROM chapter WHERE id=?').run(id)
  renumberChapters(workId)
  return true
}

/* ---------- 人物 ---------- */
function listCharacters(workId) {
  return D().prepare(
    `SELECT id, work_id AS workId, name, aliases, faction_id AS factionId, role, description,
            avatar_color AS avatarColor, importance, first_sort_order AS firstSortOrder,
            last_active_sort_order AS lastActiveSortOrder, status,
            (confirmed != 0) AS confirmed
     FROM character WHERE work_id=? ORDER BY first_sort_order, id`
  ).all(workId)
}
function getCharacter(id) {
  return D().prepare(
    `SELECT id, work_id AS workId, name, aliases, faction_id AS factionId, role, description,
            avatar_color AS avatarColor, importance, first_sort_order AS firstSortOrder,
            last_active_sort_order AS lastActiveSortOrder, status,
            (confirmed != 0) AS confirmed
     FROM character WHERE id=?`
  ).get(id) || null
}
function createCharacter(workId, data) {
  const name = (data.name || '').trim() || '未命名'
  const importance = clamp(data.importance, 0.5)
  const first = data.firstSortOrder != null ? data.firstSortOrder : 1
  const info = D().prepare(
    'INSERT INTO character(work_id, name, aliases, faction_id, role, description, avatar_color, importance, first_sort_order, status) VALUES(?,?,?,?,?,?,?,?,?,?)'
  ).run(workId, name, data.aliases || '[]', data.factionId != null ? data.factionId : null,
    data.role || '配角', data.description || null, data.avatarColor || '#2a9d8f', importance, first, data.status || '存活')
  return getCharacter(info.lastInsertRowid)
}
function updateCharacter(id, data) {
  const cur = getCharacter(id)
  if (!cur) return null
  const sql = `UPDATE character SET
    name=?, aliases=?, faction_id=?, role=?, description=?, avatar_color=?, importance=?, first_sort_order=?, status=?, confirmed=? WHERE id=?`
  D().prepare(sql).run(
    data.name != null ? data.name : cur.name,
    data.aliases != null ? data.aliases : cur.aliases,
    data.factionId != null ? data.factionId : cur.factionId,
    data.role != null ? data.role : cur.role,
    data.description != null ? data.description : cur.description,
    data.avatarColor != null ? data.avatarColor : cur.avatarColor,
    data.importance != null ? clamp(data.importance, cur.importance) : cur.importance,
    data.firstSortOrder != null ? data.firstSortOrder : cur.firstSortOrder,
    data.status != null ? data.status : cur.status,
    data.confirmed != null ? (data.confirmed ? 1 : 0) : (cur.confirmed ? 1 : 0),
    id
  )
  return getCharacter(id)
}
function deleteCharacter(id) {
  if (!getCharacter(id)) return false
  const d = D()
  d.prepare('DELETE FROM relationship WHERE (from_id=? AND from_type=\'character\') OR (to_id=? AND to_type=\'character\')').run(id, id)
  d.prepare('DELETE FROM character WHERE id=?').run(id)
  return true
}

/* ---------- 势力 ---------- */
function listFactions(workId) {
  return D().prepare(
    `SELECT id, work_id AS workId, name, parent_faction_id AS parentFactionId, type, description,
            color, importance, first_sort_order AS firstSortOrder, last_active_sort_order AS lastActiveSortOrder
     FROM faction WHERE work_id=? ORDER BY first_sort_order, id`
  ).all(workId)
}
function getFaction(id) {
  return D().prepare(
    `SELECT id, work_id AS workId, name, parent_faction_id AS parentFactionId, type, description,
            color, importance, first_sort_order AS firstSortOrder, last_active_sort_order AS lastActiveSortOrder
     FROM faction WHERE id=?`
  ).get(id) || null
}
function createFaction(workId, data) {
  const name = (data.name || '').trim() || '未命名'
  const importance = clamp(data.importance, 0.5)
  const first = data.firstSortOrder != null ? data.firstSortOrder : 1
  const info = D().prepare(
    'INSERT INTO faction(work_id, name, parent_faction_id, type, description, color, importance, first_sort_order) VALUES(?,?,?,?,?,?,?,?)'
  ).run(workId, name, data.parentFactionId != null ? data.parentFactionId : null, data.type || '组织',
    data.description || null, data.color || '#4f9df0', importance, first)
  return getFaction(info.lastInsertRowid)
}
function updateFaction(id, data) {
  const cur = getFaction(id)
  if (!cur) return null
  D().prepare(`UPDATE faction SET name=?, parent_faction_id=?, type=?, description=?, color=?, importance=?, first_sort_order=? WHERE id=?`)
    .run(
      data.name != null ? data.name : cur.name,
      data.parentFactionId != null ? data.parentFactionId : cur.parentFactionId,
      data.type != null ? data.type : cur.type,
      data.description != null ? data.description : cur.description,
      data.color != null ? data.color : cur.color,
      data.importance != null ? clamp(data.importance, cur.importance) : cur.importance,
      data.firstSortOrder != null ? data.firstSortOrder : cur.firstSortOrder,
      id
    )
  return getFaction(id)
}
function deleteFaction(id) {
  if (!getFaction(id)) return false
  const d = D()
  d.prepare('DELETE FROM relationship WHERE (from_id=? AND from_type=\'faction\') OR (to_id=? AND to_type=\'faction\')').run(id, id)
  d.prepare('UPDATE character SET faction_id=NULL WHERE faction_id=?').run(id)
  d.prepare('DELETE FROM faction WHERE id=?').run(id)
  return true
}

/* ---------- 关系 ---------- */
function listRelationships(workId) {
  return D().prepare(
    `SELECT id, work_id AS workId, from_id AS fromId, from_type AS fromType, to_id AS toId, to_type AS toType,
            rel_type AS relType, strength, start_sort_order AS startSortOrder, end_sort_order AS endSortOrder,
            note, (confirmed != 0) AS confirmed
     FROM relationship WHERE work_id=? ORDER BY start_sort_order, id`
  ).all(workId)
}
function getRelationship(id) {
  return D().prepare(
    `SELECT id, work_id AS workId, from_id AS fromId, from_type AS fromType, to_id AS toId, to_type AS toType,
            rel_type AS relType, strength, start_sort_order AS startSortOrder, end_sort_order AS endSortOrder,
            note, (confirmed != 0) AS confirmed
     FROM relationship WHERE id=?`
  ).get(id) || null
}
const REL_META = {
  belong_to: ['#8d9199', true], ally: ['#3dbd7d', false], enemy: ['#e5484d', false],
  kinship: ['#d9b64c', false], master_disciple: ['#4f9df0', true], lover: ['#f07ab0', false],
  subordinate: ['#f29d3f', true], custom: ['#a86ce0', false],
}
const REL_LABEL = { belong_to: '从属', ally: '结盟', enemy: '敌对', kinship: '亲属', master_disciple: '师徒', lover: '情侣', subordinate: '上下级' }
function createRelationship(workId, data) {
  const fromType = data.fromType || 'character'
  const toType = data.toType || 'character'
  const relType = data.relType || 'custom'
  const strength = clamp(data.strength, 0.5)
  const start = data.startSortOrder != null ? data.startSortOrder : 1
  const info = D().prepare(
    'INSERT INTO relationship(work_id, from_id, from_type, to_id, to_type, rel_type, strength, start_sort_order, end_sort_order, note) VALUES(?,?,?,?,?,?,?,?,?,?)'
  ).run(workId, data.fromId, fromType, data.toId, toType, relType, strength, start, data.endSortOrder != null ? data.endSortOrder : null, data.note || null)
  return getRelationship(info.lastInsertRowid)
}
function confirmRelationship(id) {
  const cur = getRelationship(id)
  if (!cur) return null
  D().prepare('UPDATE relationship SET confirmed=1 WHERE id=?').run(id)
  return getRelationship(id)
}
function deleteRelationship(id) {
  if (!getRelationship(id)) return false
  D().prepare('DELETE FROM relationship WHERE id=?').run(id)
  return true
}

/* ---------- 大纲 ---------- */
function listOutline(workId) {
  return D().prepare(
    'SELECT id, work_id AS workId, parent_id AS parentId, level, ref_sort_order AS refSortOrder, title, content, sort_order AS sortOrder FROM outline_node WHERE work_id=? ORDER BY sort_order, id'
  ).all(workId)
}
function getOutlineNode(id) {
  return D().prepare('SELECT id, work_id AS workId, parent_id AS parentId, level, ref_sort_order AS refSortOrder, title, content, sort_order AS sortOrder FROM outline_node WHERE id=?').get(id) || null
}
function createOutlineNode(workId, data) {
  const level = data.level != null ? data.level : 0
  const max = D().prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM outline_node WHERE work_id=?').get(workId).m
  const sort = data.sortOrder != null ? data.sortOrder : max + 1
  const info = D().prepare('INSERT INTO outline_node(work_id, parent_id, level, ref_sort_order, title, content, sort_order) VALUES(?,?,?,?,?,?,?)')
    .run(workId, data.parentId != null ? data.parentId : null, level, data.refSortOrder != null ? data.refSortOrder : null, data.title || '', data.content || null, sort)
  return getOutlineNode(info.lastInsertRowid)
}
function updateOutlineNode(id, data) {
  const cur = getOutlineNode(id)
  if (!cur) return null
  D().prepare(`UPDATE outline_node SET parent_id=?, level=?, ref_sort_order=?, title=?, content=?, sort_order=? WHERE id=?`)
    .run(
      data.parentId != null ? data.parentId : cur.parentId,
      data.level != null ? data.level : cur.level,
      data.refSortOrder != null ? data.refSortOrder : cur.refSortOrder,
      data.title != null ? data.title : cur.title,
      data.content != null ? data.content : cur.content,
      data.sortOrder != null ? data.sortOrder : cur.sortOrder,
      id
    )
  return getOutlineNode(id)
}
function deleteOutlineNode(id) {
  if (!getOutlineNode(id)) return null
  const d = D()
  d.prepare('DELETE FROM outline_node WHERE parent_id=?').run(id)
  d.prepare('DELETE FROM outline_node WHERE id=?').run(id)
  return true
}

/* ---------- 图数据组装（对齐原 GraphService.build） ---------- */
function buildGraph(workId, mode, sort) {
  const timeline = mode === 'timeline'
  const S = timeline ? (sort != null ? sort : Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
  const chars = listCharacters(workId)
  const factions = listFactions(workId)
  const rels = listRelationships(workId)
  const factionById = new Map(factions.map((f) => [f.id, f]))

  const nodes = []
  for (const c of chars) {
    if (timeline && c.firstSortOrder > S) continue
    const fa = c.factionId != null ? factionById.get(c.factionId) : null
    nodes.push({
      id: 'c' + c.id, type: 'character', name: c.name,
      factionId: c.factionId, factionName: fa ? fa.name : null,
      importance: c.importance, color: c.avatarColor, alive: c.status !== '死亡',
      firstSort: c.firstSortOrder, lastActiveSort: c.lastActiveSortOrder,
      size: Math.round(5 + c.importance * 25),
    })
  }
  for (const f of factions) {
    if (timeline && f.firstSortOrder > S) continue
    const parent = f.parentFactionId != null ? factionById.get(f.parentFactionId) : null
    nodes.push({
      id: 'f' + f.id, type: 'faction', name: f.name,
      factionId: f.parentFactionId, factionName: parent ? parent.name : null,
      importance: f.importance, color: f.color, alive: true,
      firstSort: f.firstSortOrder, lastActiveSort: f.lastActiveSortOrder,
      size: Math.round(5 + f.importance * 25),
    })
  }
  const links = []
  for (const r of rels) {
    if (timeline) {
      if (r.startSortOrder > S) continue
      if (r.endSortOrder != null && r.endSortOrder < S) continue
    }
    const meta = REL_META[r.relType]
    const color = meta ? meta[0] : '#a86ce0'
    const directed = meta ? meta[1] : false
    links.push({
      id: 'r' + r.id,
      source: (r.fromType === 'character' ? 'c' : 'f') + r.fromId,
      target: (r.toType === 'character' ? 'c' : 'f') + r.toId,
      type: r.relType, color, width: r.strength * 3, directed,
      label: REL_LABEL[r.relType] || '自定义',
      startSort: r.startSortOrder, endSort: r.endSortOrder,
    })
  }
  return {
    nodes, links,
    meta: {
      totalCharacters: chars.length,
      totalFactions: factions.length,
      currentSort: timeline ? (S === Number.MAX_SAFE_INTEGER ? null : S) : null,
    },
  }
}

/* ---------- AI（主进程直连 LLM） ---------- */
/** 解析 LLM 配置：优先环境变量，其次用户配置文件(设置页写入) */
function llmConf() {
  const cfg = readConfig() || {}
  const llm = cfg.llm || {}
  return {
    apiKey: process.env.LLM_API_KEY || llm.apiKey || '',
    baseUrl: process.env.LLM_BASE_URL || llm.baseUrl || '',
    model: process.env.LLM_MODEL || llm.model || '',
  }
}
function aiStatus() {
  const c = llmConf()
  return {
    configured: !!(c.apiKey || ''),
    summary: c.apiKey ? `已配置 LLM（model: ${c.model || '默认'}）` : '未配置 LLM API（可在设置页填写）',
  }
}
async function aiOutline(workId) {
  const chapters = listChapters(workId)
  const text = chapters.map((c) => `【第${c.sortOrder}章·${c.title}】\n${c.content}`).join('\n\n')
  return callLlm(
    '你是网文大纲整理助手。整理成三层大纲 JSON，只输出 JSON。',
    text || '（暂无章节）'
  )
}
async function aiAnalyzeChapter(chapterId) {
  const c = getChapter(chapterId)
  if (!c) throw new Error('章节不存在')
  return callLlm(
    '你是网文关系抽取助手。读取章节，输出新人物与关系 JSON，只输出 JSON。',
    `【第${c.sortOrder}章·${c.title}】\n${c.content}`
  )
}
async function callLlm(system, user) {
  const conf = llmConf()
  if (!conf.apiKey) throw new Error('LLM 未配置：请到「设置」填写 API Key')
  const base = conf.baseUrl || 'https://api.deepseek.com/v1'
  const model = conf.model || 'deepseek-chat'
  const res = await fetch(base.replace(/\/$/, '') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + conf.apiKey },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.4,
    }),
  })
  if (!res.ok) throw new Error('LLM HTTP ' + res.status + ': ' + (await res.text()))
  const data = await res.json()
  return { result: data.choices?.[0]?.message?.content || '' }
}

function clamp(v, def) {
  if (v == null) return def
  return Math.max(0, Math.min(1, Number(v)))
}

// ID 前缀：与 Graph 前端一致
module.exports = {
  bind,
  listWorks, createWork, getWork,
  listChapters, getChapter, createChapter, updateChapter, deleteChapter,
  listCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter,
  listFactions, getFaction, createFaction, updateFaction, deleteFaction,
  listRelationships, getRelationship, createRelationship, confirmRelationship, deleteRelationship,
  listOutline, getOutlineNode, createOutlineNode, updateOutlineNode, deleteOutlineNode,
  buildGraph,
  getConfig, updateConfig,
  aiStatus, aiOutline, aiAnalyzeChapter,
}


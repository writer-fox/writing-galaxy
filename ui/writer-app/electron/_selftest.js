// 临时验证：在 Electron 环境下加载 better-sqlite3 + 初始化库
const { app } = require('electron')
const fs = require('fs')
const path = require('path')
const dbMod = require('./db')
const store = require('./store')

app.whenReady().then(() => {
  try {
    const testDir = path.join(app.getPath('temp'), 'wx_selftest')
    fs.mkdirSync(testDir, { recursive: true })
    const dbPath = path.join(testDir, 'test.db')
    const database = dbMod.init(dbPath)
    store.bind(() => database)

    // 冒烟: 建作品 -> 章节 -> 人物 -> 势力 -> 关系 -> graph
    const w = store.createWork('自检作品', '测试', 'selftest')
    const c1 = store.createChapter(w.id, '第一章')
    const c2 = store.createChapter(w.id, '第二章')
    const f = store.createFaction(w.id, { name: '门派' })
    const ch = store.createCharacter(w.id, { name: '主角', factionId: f.id })
    store.createRelationship(w.id, { fromId: ch.id, fromType: 'character', toId: f.id, toType: 'faction', relType: 'belong_to' })
    const g = store.buildGraph(w.id, 'god')
    const t = store.buildGraph(w.id, 'timeline', 1)

    console.log('==== ELECTRON SELF-TEST PASSED ====')
    console.log('works:', store.listWorks().length)
    console.log('chapters:', store.listChapters(w.id).length)
    console.log('characters:', store.listCharacters(w.id).length)
    console.log('factions:', store.listFactions(w.id).length)
    console.log('relationships:', store.listRelationships(w.id).length)
    console.log('graph nodes:', g.nodes.length, 'links:', g.links.length)
    console.log('timeline@1 nodes:', t.nodes.length)
    console.log('ai status:', JSON.stringify(store.aiStatus()))

    try { fs.rmSync(testDir, { recursive: true, force: true }) } catch { /* 临时目录占用则跳过清理 */ }
    app.exit(0)
  } catch (e) {
    console.error('ELECTRON SELF-TEST FAILED:', e)
    app.exit(1)
  }
})

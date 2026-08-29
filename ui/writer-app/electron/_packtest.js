// 从打包产物 app.asar 加载，复现真实 exe 的渲染，并捕获失败原因
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const db = require('./db')
const store = require('./store')

// 复用真实 main.js 的 IPC 注册逻辑(全部 handler)
function registerIpc(database) {
  store.bind(() => database)
  const handlers = {
    'work:list': () => store.listWorks(),
    'work:create': (t, g, s) => store.createWork(t, g, s),
    'work:get': (id) => store.getWork(id),
    'chapter:list': (wid) => store.listChapters(wid),
    'chapter:get': (id) => store.getChapter(id),
    'chapter:create': (wid, t, a) => store.createChapter(wid, t, a),
    'chapter:update': (id, p) => store.updateChapter(id, p),
    'chapter:delete': (wid, id) => store.deleteChapter(wid, id),
    'character:list': (wid) => store.listCharacters(wid),
    'character:create': (wid, d) => store.createCharacter(wid, d),
    'character:update': (id, d) => store.updateCharacter(id, d),
    'character:delete': (id) => store.deleteCharacter(id),
    'faction:list': (wid) => store.listFactions(wid),
    'faction:create': (wid, d) => store.createFaction(wid, d),
    'faction:update': (id, d) => store.updateFaction(id, d),
    'faction:delete': (id) => store.deleteFaction(id),
    'relationship:list': (wid) => store.listRelationships(wid),
    'relationship:create': (wid, d) => store.createRelationship(wid, d),
    'relationship:confirm': (id) => store.confirmRelationship(id),
    'relationship:delete': (id) => store.deleteRelationship(id),
    'outline:list': (wid) => store.listOutline(wid),
    'outline:get': (id) => store.getOutlineNode(id),
    'outline:create': (wid, d) => store.createOutlineNode(wid, d),
    'outline:update': (id, d) => store.updateOutlineNode(id, d),
    'outline:delete': (id) => store.deleteOutlineNode(id),
    'graph:get': (wid, mode, sort) => store.buildGraph(wid, mode, sort),
    'ai:status': () => store.aiStatus(),
    'ai:outline': (wid) => store.aiOutline(wid),
    'ai:analyzeChapter': (cid) => store.aiAnalyzeChapter(cid),
  }
  Object.entries(handlers).forEach(([ch, fn]) => {
    ipcMain.handle(ch, async (_e, ...a) => {
      try { return { ok: true, data: await fn(...a) } } catch (e) { return { ok: false, error: e.message } }
    })
  })
}

app.whenReady().then(() => {
  const testDir = path.join(app.getPath('temp'), 'wx_pack_render')
  fs.mkdirSync(testDir, { recursive: true })
  const database = db.init(path.join(testDir, 'pr.db'))
  registerIpc(database)

  const win = new BrowserWindow({
    width: 1000, height: 700, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  })
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.log('DID-FAIL-LOAD code=', code, 'desc=', desc, 'url=', url)
  })
  win.webContents.on('did-finish-load', async () => {
    try {
      await new Promise((r) => setTimeout(r, 3000))
      const children = await win.webContents.executeJavaScript(`document.getElementById('app') ? document.getElementById('app').children.length : -999`)
      const shell = await win.webContents.executeJavaScript(`!!document.querySelector('.shell')`)
      const txt = await win.webContents.executeJavaScript(`(document.body.innerText || '').slice(0,100)`)
      console.log('==== PACK RENDER CHECK ====')
      console.log('#app children:', children, 'has .shell:', shell)
      console.log('body:', JSON.stringify(txt))
      try { fs.rmSync(testDir, { recursive: true, force: true }) } catch {}
      app.exit(0)
    } catch (e) { console.error('ERR', e.message); app.exit(1) }
  })
  // 模拟真实 main.js 的加载路径
  win.loadFile(path.join(__dirname, '../dist/index.html'))
})

// 验证修复后的 dist 在 Electron(file://) 下能否真实渲染出 Vue 界面(非空白)
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const db = require('./db')
const store = require('./store')

function registerIpc(database) {
  store.bind(() => database)
  const handlers = {
    'work:list': () => store.listWorks(),
    'chapter:list': (wid) => store.listChapters(wid),
    'character:list': (wid) => store.listCharacters(wid),
    'faction:list': (wid) => store.listFactions(wid),
    'relationship:list': (wid) => store.listRelationships(wid),
    'outline:list': (wid) => store.listOutline(wid),
    'graph:get': (wid, mode, sort) => store.buildGraph(wid, mode, sort),
    'ai:status': () => store.aiStatus(),
  }
  Object.entries(handlers).forEach(([ch, fn]) => {
    ipcMain.handle(ch, async (_e, ...a) => {
      try { return { ok: true, data: await fn(...a) } } catch (e) { return { ok: false, error: e.message } }
    })
  })
}

app.whenReady().then(() => {
  const dir = path.join(os.tmpdir(), 'wx_render_test')
  fs.mkdirSync(dir, { recursive: true })
  const database = db.init(path.join(dir, 'rt.db'))
  registerIpc(database)

  const win = new BrowserWindow({
    width: 1000, height: 700, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  })
  win.webContents.on('console-message', (_e, _l, msg) => console.log('[render]', msg.slice(0, 120)))
  win.webContents.on('did-finish-load', async () => {
    try {
      // 等 Vue 挂载 #app
      await new Promise((r) => setTimeout(r, 2500))
      const appChildren = await win.webContents.executeJavaScript(
        `(document.getElementById('app') ? document.getElementById('app').children.length : -1)`
      )
      const bodyText = await win.webContents.executeJavaScript(`(document.body.innerText || '').slice(0, 150)`)
      const hasApp = await win.webContents.executeJavaScript(`!!document.querySelector('.shell')`)
      console.log('==== RENDER CHECK ====')
      console.log('#app children count:', appChildren)
      console.log('has .shell root:', hasApp)
      console.log('body sample:', JSON.stringify(bodyText))
      if (hasApp && appChildren > 0) {
        console.log('==== RENDER PASSED (界面非空白) ====')
      } else {
        console.log('==== RENDER STILL BLANK ====')
      }
      try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
      app.exit(hasApp && appChildren > 0 ? 0 : 1)
    } catch (e) {
      console.error('RENDER ERROR:', e.message)
      app.exit(1)
    }
  })
  win.loadFile(path.join(__dirname, '../dist/index.html'))
})

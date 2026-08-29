// 集成验证：Electron 窗口加载 dist + IPC(SQLite) + 渲染进程实际调用 wxAPI
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
    'graph:get': (wid, mode, sort) => store.buildGraph(wid, mode, sort),
  }
  Object.entries(handlers).forEach(([ch, fn]) => {
    ipcMain.handle(ch, async (_e, ...a) => {
      try { return { ok: true, data: await fn(...a) } } catch (e) { return { ok: false, error: e.message } }
    })
  })
}

app.whenReady().then(() => {
  const dir = path.join(os.tmpdir(), 'wx_integration')
  fs.mkdirSync(dir, { recursive: true })
  const database = db.init(path.join(dir, 'it.db'))
  registerIpc(database)
  // seed 一个作品供读取
  const w = store.createWork('集成测试作品', '测试', 'ok')

  const win = new BrowserWindow({
    width: 800, height: 600, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  })
  win.loadFile(path.join(__dirname, '../dist/index.html'))
  win.webContents.on('did-finish-load', async () => {
    try {
      const hasAPI = await win.webContents.executeJavaScript('!!window.wxAPI')
      const works = await win.webContents.executeJavaScript(
        'window.wxAPI.works.list().then(r => JSON.stringify(r))'
      )
      const graph = await win.webContents.executeJavaScript(
        'window.wxAPI.graph.get(1, "god", null).then(r => ({n: r.nodes.length}))'
      )
      console.log('==== INTEGRATION CHECK ====')
      console.log('wxAPI exposed:', hasAPI)
      console.log('works via IPC:', works)
      console.log('graph nodes by IPC:', JSON.stringify(graph))
      if (hasAPI && works && works.includes('集成测试作品')) {
        console.log('==== INTEGRATION PASSED ====')
        try { fs.rmSync(dir, { recursive: true, force: true }) } catch { /* 忽略清理失败 */ }
        app.exit(0)
      } else {
        console.log('==== INTEGRATION FAILED ====')
        app.exit(1)
      }
    } catch (e) {
      console.error('INTEGRATION ERROR:', e.message)
      app.exit(1)
    }
  })
})

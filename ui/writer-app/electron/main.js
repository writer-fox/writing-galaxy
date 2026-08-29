// Electron 主进程：创建窗口 + IPC 桥 + 本地 SQLite
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const db = require('./db')
const store = require('./store')

let mainWin = null

/** 数据文件放在用户数据目录下（独立于安装位置的本地文件） */
function resolveDbPath() {
  const dir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'writing-galaxy.db')
}

function isDev() {
  return !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL
}

function createWindow() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: '写作星河',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    mainWin.loadURL(devUrl)
  } else {
    mainWin.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 渲染诊断（生产时不影响功能，仅打日志便于排查空白问题）
  // 渲染诊断：加载失败时在窗口内显示错误(而非白屏)，便于定位/反馈
  mainWin.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.log('[WX][did-fail-load]', code, desc, url)
    if (mainWin) {
      mainWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
        '<div style="font-family:sans-serif;padding:40px;color:#333">' +
        '<h2>界面加载失败</h2><p>错误码: ' + code + '</p><p>原因: ' + desc + '</p>' +
        '<p>加载地址: ' + url + '</p><p>请将以上信息反馈给开发者。</p></div>'))
    }
  })
  mainWin.webContents.on('did-finish-load', () => {
    // 校验界面是否真正渲染(Vue 挂载)，非空白则正常
    mainWin.webContents.executeJavaScript(
      `document.getElementById('app') ? document.getElementById('app').children.length : -999`)
      .then((kids) => { if (kids <= 0) console.log('[WX][warn] renderer empty, #app=', kids) })
      .catch(() => {})
  })
  if (process.env.WX_DEBUG) {
    mainWin.webContents.on('console-message', (_e, level, msg) => {
      console.log('[WX][console]', level, String(msg).slice(0, 160))
    })
  }

  mainWin.on('closed', () => { mainWin = null })
}

/** 注册 IPC：渲染进程经 preload 的 wxAPI 调用 */
function registerIpc(database) {
  store.bind(() => database)

  // 便捷：把 store 方法映射为 IPC 处理器（方法名即操作名）
  const handlers = {
    'work:list': () => store.listWorks(),
    'work:create': (title, genre, summary) => store.createWork(title, genre, summary),
    'work:get': (id) => store.getWork(id),

    'chapter:list': (workId) => store.listChapters(workId),
    'chapter:get': (id) => store.getChapter(id),
    'chapter:create': (workId, title, after) => store.createChapter(workId, title, after),
    'chapter:update': (id, patch) => store.updateChapter(id, patch),
    'chapter:delete': (workId, id) => store.deleteChapter(workId, id),

    'character:list': (workId) => store.listCharacters(workId),
    'character:create': (workId, data) => store.createCharacter(workId, data),
    'character:update': (id, data) => store.updateCharacter(id, data),
    'character:delete': (id) => store.deleteCharacter(id),

    'faction:list': (workId) => store.listFactions(workId),
    'faction:create': (workId, data) => store.createFaction(workId, data),
    'faction:update': (id, data) => store.updateFaction(id, data),
    'faction:delete': (id) => store.deleteFaction(id),

    'relationship:list': (workId) => store.listRelationships(workId),
    'relationship:create': (workId, data) => store.createRelationship(workId, data),
    'relationship:confirm': (id) => store.confirmRelationship(id),
    'relationship:delete': (id) => store.deleteRelationship(id),

    'outline:list': (workId) => store.listOutline(workId),
    'outline:get': (id) => store.getOutlineNode(id),
    'outline:create': (workId, data) => store.createOutlineNode(workId, data),
    'outline:update': (id, data) => store.updateOutlineNode(id, data),
    'outline:delete': (id) => store.deleteOutlineNode(id),

    'graph:get': (workId, mode, sort) => store.buildGraph(workId, mode, sort),

    'ai:status': () => store.aiStatus(),
    'ai:outline': (workId) => store.aiOutline(workId),
    'ai:analyzeChapter': (chapterId) => store.aiAnalyzeChapter(chapterId),
  }

  Object.entries(handlers).forEach(([channel, fn]) => {
    ipcMain.handle(channel, async (_evt, ...args) => {
      try {
        return { ok: true, data: await fn(...args) }
      } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) }
      }
    })
  })
}

app.whenReady().then(() => {
  const database = db.init(resolveDbPath())
  registerIpc(database)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

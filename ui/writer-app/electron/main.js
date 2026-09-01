// Electron 主进程：创建窗口 + IPC 桥 + 本地 SQLite
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const db = require('./db')
const store = require('./store')
const { migrateLegacy } = require('./migrate-legacy')

let mainWin = null

// 固定应用与数据目录名，保证开发/打包/各平台路径一致
app.setName('writing-galaxy')
const APP_DATA_NAME = 'writing-galaxy'

/** 数据文件放在用户数据目录下（独立于安装位置的本地文件） */
function resolveDbPath() {
  const dir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'writing-galaxy.db')
}

/** 应用信息（供设置页展示：软件路径、数据路径、版本、平台） */
function appInfo() {
  return {
    name: app.getName(),
    version: app.getVersion(),
    platform: process.platform,
    execPath: process.execPath,                    // 当前软件 exe 路径
    userDataPath: app.getPath('userData'),         // 用户数据根目录
    worksRoot: db.getWorksRoot(),                  // 作品根目录（可配置）
    dbPath: resolveDbPath(),                       // （兼容旧字段）
    isPackaged: app.isPackaged,
  }
}

function isDev() {
  return !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL
}

function prepare() {
  // Electron 开发模式下 userData 默认是 "Electron"；统一改为 writing-galaxy，避免路径漂移
  if (process.env.VITE_DEV_SERVER_URL || !app.isPackaged) {
    app.setPath('userData', path.join(app.getPath('appData'), APP_DATA_NAME))
  }
}


function createWindow() {
  mainWin = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: '写作星河',
    // 无边框窗口：隐藏系统标题栏，前端自绘标题栏（拖拽区 + 最小化/最大化/关闭按钮）
    frame: false,
    titleBarStyle: 'hidden',
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
function registerIpc() {
  // 第三个参数指向"当前打开的书库"；无打开书时 store 回退到旧单库句柄
  store.bind(null, path.join(app.getPath('userData'), 'config.json'), db.getCurrentBookMeta)

  // 便捷：把 store 方法映射为 IPC 处理器（方法名即操作名）
  const handlers = {
    'work:list': () => store.listWorks(),
    'work:create': (title, genre, summary) => store.createWork(title, genre, summary),
    'work:get': (id) => store.getWork(id),
    'work:open': (dir, init) => store.openWork(dir, init),
    'work:close': () => store.closeWork(),
    'works:root': () => store.getWorksRoot(),
    'works:setRoot': (dir) => { store.setWorksRoot(dir); store.updateConfig({ worksRoot: dir }); return dir },
    'works:exportMd': (dir) => store.exportWorkToMarkdown(dir),

    'chapter:list': (workId) => store.listChapters(workId),
    'chapter:get': (id) => store.getChapter(id),
    'chapter:create': (workId, title, after, volId) => store.createChapter(workId, title, after, volId),
    'chapter:update': (id, patch) => store.updateChapter(id, patch),
    'chapter:delete': (workId, id) => store.deleteChapter(workId, id),

    'volume:list': (workId) => store.listVolumes(workId),
    'volume:create': (workId, name) => store.createVolume(workId, name),
    'volume:rename': (id, name) => store.renameVolume(id, name),
    'volume:moveChapter': (chapterId, volumeId) => store.moveChapterToVolume(chapterId, volumeId),

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

    'config:get': () => store.getConfig(),
    'config:update': (patch) => store.updateConfig(patch),
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

  // 窗口控制（无边框标题栏）
  ipcMain.handle('window:minimize', () => { mainWin?.minimize(); return { ok: true } })
  ipcMain.handle('window:maximize-toggle', () => {
    if (!mainWin) return { ok: true }
    if (mainWin.isMaximized()) mainWin.unmaximize(); else mainWin.maximize()
    return { ok: true, data: mainWin.isMaximized() }
  })
  ipcMain.handle('window:close', async () => { mainWin?.close(); return { ok: true } })
  ipcMain.handle('window:is-maximized', () =>
    ({ ok: true, data: mainWin ? mainWin.isMaximized() : false }))

  // 应用信息（设置页展示）
  ipcMain.handle('app:info', () => ({ ok: true, data: appInfo() }))

  // 目录选择框（“打开作品文件夹”用）
  ipcMain.handle('dialog:openDirectory', async () => {
    const r = await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory'],
      title: '选择作品文件夹',
    })
    return { ok: true, data: r.canceled ? null : r.filePaths[0] }
  })
}

prepare()

app.whenReady().then(() => {
  // 读取/初始化作品根目录（默认 userData/works；可由设置页配置）
  const cfg = store.getConfig()
  const root = (cfg && cfg.worksRoot) || path.join(app.getPath('userData'), 'works')
  db.setWorksRoot(root)

  // 一次性迁移：若有旧单库且作品目录为空，把其中的每本书拆为独立库
  try {
    const legacyPath = resolveDbPath()
    const res = migrateLegacy(require('better-sqlite3'), legacyPath, root)
    if (res && res.migrated > 0) {
      console.log('[WX][migrate] 迁移了', res.migrated, '本书到独立目录:', res.works.map(w => w.title).join(', '))
    }
  } catch (e) { console.log('[WX][migrate] 迁移跳过:', e && e.message) }

  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

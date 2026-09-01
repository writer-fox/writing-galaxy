// 写作星河 · 本地存储层（Electron 主进程）
// 存储模型：每本书 = 一个文件夹，内含一个独立 SQLite 库 work.db
//   worksRoot/              （作品根目录，可在设置里改）
//     <书1名>/work.db
//     <书2名>/work.db
// 库内保留统一表结构（work 表仅一行代表这本书）
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

let worksRoot = null          // 作品根目录
let currentBook = null        // 当前打开的库：{ dir, title, db }

// 建表（幂等）
function ensureSchema(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS work (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    genre      TEXT,
    summary    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chapter (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id    INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    status     SMALLINT NOT NULL DEFAULT 0,
    analyzed_at TEXT,
    volume_no  INTEGER NOT NULL DEFAULT 1,
    UNIQUE (work_id, sort_order)
  );
  CREATE TABLE IF NOT EXISTS volume (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id    INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    name       TEXT NOT NULL DEFAULT '第一卷',
    sort_order INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS character (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id            INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    name               TEXT NOT NULL,
    aliases            TEXT DEFAULT '[]',
    faction_id         INTEGER REFERENCES faction(id),
    role               TEXT DEFAULT '配角',
    description        TEXT,
    avatar_color       TEXT DEFAULT '#2a9d8f',
    importance         REAL NOT NULL DEFAULT 0.5,
    first_sort_order   INTEGER NOT NULL DEFAULT 1,
    last_active_sort_order INTEGER,
    status             TEXT DEFAULT '存活',
    confirmed          INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS faction (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id           INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    parent_faction_id INTEGER REFERENCES faction(id),
    type              TEXT DEFAULT '组织',
    description       TEXT,
    color             TEXT DEFAULT '#4f9df0',
    importance        REAL NOT NULL DEFAULT 0.5,
    first_sort_order  INTEGER NOT NULL DEFAULT 1,
    last_active_sort_order INTEGER
  );
  CREATE TABLE IF NOT EXISTS relationship (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id          INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    from_id          INTEGER NOT NULL,
    from_type        TEXT NOT NULL,
    to_id            INTEGER NOT NULL,
    to_type          TEXT NOT NULL,
    rel_type         TEXT NOT NULL,
    strength         REAL NOT NULL DEFAULT 0.5,
    start_sort_order INTEGER NOT NULL,
    end_sort_order   INTEGER,
    note             TEXT,
    confirmed        INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS outline_node (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id        INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    parent_id      INTEGER REFERENCES outline_node(id) ON DELETE CASCADE,
    level          SMALLINT NOT NULL DEFAULT 0,
    ref_sort_order INTEGER,
    title          TEXT,
    content        TEXT,
    sort_order     INTEGER NOT NULL DEFAULT 0
  );
  `)
}

/** 打开一个库文件。若不存在则新建并初始化一行 work。isNew 表示是否新建书。 */
function openBookDb(dbPath, meta) {
  const existed = fs.existsSync(dbPath)
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  ensureSchema(db)
  if (!existed || !meta.keepWork) {
    // 确保 work 表恰好一行
    const n = db.prepare('SELECT COUNT(*) AS c FROM work').get().c
    if (n === 0) {
      db.prepare('INSERT INTO work(title, genre, summary) VALUES(?,?,?)')
        .run((meta && meta.title) || '未命名', (meta && meta.genre) || null, (meta && meta.summary) || null)
    }
  }
  return db
}

/** 设置作品根目录 */
function setWorksRoot(dir) {
  worksRoot = dir
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return worksRoot
}
function getWorksRoot() {
  if (!worksRoot || !fs.existsSync(worksRoot)) fs.mkdirSync(worksRoot || defaultWorksRoot(), { recursive: true })
  return worksRoot
}
function defaultWorksRoot() {
  return worksRoot || ''
}

/** 扫描作品根目录，返回每本书的元信息（文件夹、工作库、标题、更新时间、章节数） */
function listBooks() {
  const root = getWorksRoot()
  const out = []
  if (!fs.existsSync(root)) return out
  for (const name of fs.readdirSync(root)) {
    const dir = path.join(root, name)
    if (!fs.statSync(dir).isDirectory()) continue
    const dbPath = path.join(dir, 'work.db')
    if (!fs.existsSync(dbPath)) continue // 非本软件作品目录则跳过
    let meta = { dir, dbPath, folderName: name, title: name, hasDb: true }
    try {
      const db = openBookDb(dbPath, { keepWork: true })
      const r = db.prepare('SELECT title, genre, summary, updated_at AS updatedAt FROM work LIMIT 1').get()
      const cnt = db.prepare('SELECT COUNT(*) AS c FROM chapter').get().c
      db.close()
      if (r) { meta.title = r.title; meta.genre = r.genre; meta.summary = r.summary; meta.updatedAt = r.updatedAt }
      meta.chapterCount = cnt
    } catch (e) { meta.error = String(e && e.message || e) }
    out.push(meta)
  }
  return out
}

/** 创建一本书：新建文件夹+库，返回元信息 */
function createBook(title, genre, summary, dirOverride) {
  const safe = String(title || '未命名').replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名'
  const root = dirOverride || getWorksRoot()
  // 避免重名：如果同名文件夹已存在则加序号
  let dir = path.join(root, safe)
  let i = 2
  while (fs.existsSync(dir)) { dir = path.join(root, safe + '_' + i); i++ }
  fs.mkdirSync(dir, { recursive: true })
  const dbPath = path.join(dir, 'work.db')
  const db = openBookDb(dbPath, { title, genre, summary })
  db.close()
  return { dir, dbPath, folderName: path.basename(dir), title, genre, summary }
}

/** 打开一本书（支持任意文件夹：有 work.db 则打开；无则询问初始化——这里默认初始化新书） */
function openBook(dirPath, initFromScratch) {
  const abs = path.resolve(dirPath)
  if (!fs.existsSync(abs)) return { error: '路径不存在: ' + abs }
  const stat = fs.statSync(abs)
  let dbPath
  if (stat.isDirectory()) dbPath = path.join(abs, 'work.db')
  else if (abs.endsWith('.db')) dbPath = abs
  else return { error: '不是文件夹也不是 .db 文件' }

  let db
  if (fs.existsSync(dbPath)) {
    db = openBookDb(dbPath, { keepWork: true })
  } else {
    // 初始化为一本新书
    if (!initFromScratch) return { ok: false, needInit: true, dir: abs, dbPath }
    db = openBookDb(dbPath, { title: path.basename(abs), genre: null, summary: null })
  }
  // 更新当前库
  if (currentBook) { try { currentBook.db.close() } catch {} }
  currentBook = { dir: stat.isDirectory() ? abs : path.dirname(abs), dbPath, db, title: path.basename(abs) }
  const r = db.prepare('SELECT title, genre, summary FROM work LIMIT 1').get()
  if (r) currentBook.title = r.title
  return { ok: true, meta: getCurrentBookMeta() }
}

/** 返回当前打开的书元信息（含 db 句柄供 store 使用） */
function getCurrentBookMeta() {
  if (!currentBook) return null
  let cnt = 0
  try { cnt = currentBook.db.prepare('SELECT COUNT(*) AS c FROM chapter').get().c } catch {}
  return {
    dir: currentBook.dir,
    dbPath: currentBook.dbPath,
    title: currentBook.title,
    folderName: path.basename(currentBook.dir),
    chapterCount: cnt,
    db: currentBook.db,   // 当前库句柄（store 的 D() 用它）
  }
}

/** 获取当前库句柄（供 store.js 使用）；无打开返回 null */
function current() { return currentBook ? currentBook.db : null }

function closeCurrent() { if (currentBook) { try { currentBook.db.close() } catch {} } currentBook = null }

module.exports = {
  init: (p) => openBookDb(p, {}),     // 兼容旧调用
  openBookDb, setWorksRoot, getWorksRoot,
  listBooks, createBook, openBook, getCurrentBookMeta, current, closeCurrent,
}

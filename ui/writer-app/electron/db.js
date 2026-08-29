// 本地 SQLite 数据层（Electron 主进程）
// 表结构对齐 /backend/src/main/resources/schema.sql 与 技术方案 4.2
// 数据文件: Electron 用户数据目录下的 writing-galaxy.db
const Database = require('better-sqlite3')

let db = null

/** 初始化数据库（建表 + 演示数据） */
function init(dbPath) {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

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
    UNIQUE (work_id, sort_order)
  );

  CREATE TABLE IF NOT EXISTS character (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id             INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    aliases             TEXT DEFAULT '[]',
    faction_id          INTEGER REFERENCES faction(id),
    role                TEXT DEFAULT '配角',
    description         TEXT,
    avatar_color        TEXT DEFAULT '#2a9d8f',
    importance          REAL NOT NULL DEFAULT 0.5,
    first_sort_order    INTEGER NOT NULL DEFAULT 1,
    last_active_sort_order INTEGER,
    status              TEXT DEFAULT '存活',
    confirmed           INTEGER NOT NULL DEFAULT 0
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

  seedIfEmpty()
  return db
}

function seedIfEmpty() {
  const n = db.prepare('SELECT COUNT(*) AS c FROM work').get().c
  if (n > 0) return
  const wid = db.prepare('INSERT INTO work(title, genre, summary) VALUES(?,?,?)')
    .run('示例作品', '玄幻', '一个用于演示的本地作品。').lastInsertRowid

  const ins = (sql, ...args) => db.prepare(sql).run(...args).lastInsertRowid
  for (let i = 1; i <= 3; i++) {
    db.prepare('INSERT INTO chapter(work_id, sort_order, title, content, status) VALUES(?,?,?,?,1)')
      .run(wid, i, ['风起', '叛门', '反目'][i - 1], `第${i}章正文示例`)
  }
  const f1 = ins('INSERT INTO faction(work_id, name, type, color, importance, first_sort_order) VALUES(?,?,?,?,?,?)', wid, '元门', '门派', '#4f9df0', 0.9, 1)
  const f2 = ins('INSERT INTO faction(work_id, name, type, color, importance, first_sort_order) VALUES(?,?,?,?,?,?)', wid, '应家', '家族', '#5e8ad6', 0.5, 1)
  const c1 = ins('INSERT INTO character(work_id, name, faction_id, role, avatar_color, importance, first_sort_order) VALUES(?,?,?,?,?,?,?)', wid, '林动', f1, '主角', '#1f8f6e', 0.85, 1)
  const c2 = ins('INSERT INTO character(work_id, name, faction_id, role, avatar_color, importance, first_sort_order) VALUES(?,?,?,?,?,?,?)', wid, '应无涯', f2, '配角', '#5e8ad6', 0.6, 1)
  db.prepare('INSERT INTO relationship(work_id, from_id, from_type, to_id, to_type, rel_type, strength, start_sort_order, confirmed) VALUES(?,?,?,?,?,?,?,?,1)')
    .run(wid, c1, 'character', f1, 'faction', 'belong_to', 0.8, 1)
  db.prepare('INSERT INTO relationship(work_id, from_id, from_type, to_id, to_type, rel_type, strength, start_sort_order, confirmed) VALUES(?,?,?,?,?,?,?,?,1)')
    .run(wid, c1, 'character', c2, 'character', 'master_disciple', 0.7, 1)
  db.prepare('INSERT INTO relationship(work_id, from_id, from_type, to_id, to_type, rel_type, strength, start_sort_order, confirmed) VALUES(?,?,?,?,?,?,?,?,1)')
    .run(wid, c1, 'character', f2, 'faction', 'ally', 0.5, 2)
}

module.exports = { init }

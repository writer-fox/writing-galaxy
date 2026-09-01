// 一次性迁移：把旧的单库(所有作品挤在一个 writing-galaxy.db)转为「每本书一个文件夹+独立库」
// 触发时机：应用启动时检测作品根目录还没有书、且旧库存在
const path = require('path')
const fs = require('fs')

function migrateLegacy(Database, legacyPath, worksRoot) {
  if (!legacyPath || !fs.existsSync(legacyPath)) return { migrated: 0, reason: 'no-legacy' }
  // 作品根目录已有书则不再迁移
  if (fs.existsSync(worksRoot) && fs.readdirSync(worksRoot).some((n) => fs.existsSync(path.join(worksRoot, n, 'work.db')))) {
    return { migrated: 0, reason: 'already-works' }
  }

  const src = new Database(legacyPath, { readonly: true })
  const works = src.prepare('SELECT id, title, genre, summary FROM work ORDER BY id').all()
  let migrated = 0
  const out = []
  for (const w of works) {
    const wid = w.id
    const safe = String(w.title || ('作品' + wid)).replace(/[\\/:*?"<>|]/g, '_').trim() || ('作品' + wid)
    const dir = path.join(worksRoot, safe)
    fs.mkdirSync(dir, { recursive: true })
    const dbPath = path.join(dir, 'work.db')
    if (fs.existsSync(dbPath)) continue

    const dst = new Database(dbPath)
    dst.pragma('journal_mode = WAL')
    // 建表
    dst.exec(`
      CREATE TABLE work (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, genre TEXT, summary TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      CREATE TABLE chapter (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, sort_order INTEGER NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', word_count INTEGER NOT NULL DEFAULT 0, status SMALLINT NOT NULL DEFAULT 0, analyzed_at TEXT, UNIQUE(work_id, sort_order));
      CREATE TABLE character (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, name TEXT NOT NULL, aliases TEXT DEFAULT '[]', faction_id INTEGER, role TEXT DEFAULT '配角', description TEXT, avatar_color TEXT DEFAULT '#2a9d8f', importance REAL NOT NULL DEFAULT 0.5, first_sort_order INTEGER NOT NULL DEFAULT 1, last_active_sort_order INTEGER, status TEXT DEFAULT '存活', confirmed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE faction (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, name TEXT NOT NULL, parent_faction_id INTEGER, type TEXT DEFAULT '组织', description TEXT, color TEXT DEFAULT '#4f9df0', importance REAL NOT NULL DEFAULT 0.5, first_sort_order INTEGER NOT NULL DEFAULT 1, last_active_sort_order INTEGER);
      CREATE TABLE relationship (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, from_id INTEGER NOT NULL, from_type TEXT NOT NULL, to_id INTEGER NOT NULL, to_type TEXT NOT NULL, rel_type TEXT NOT NULL, strength REAL NOT NULL DEFAULT 0.5, start_sort_order INTEGER NOT NULL, end_sort_order INTEGER, note TEXT, confirmed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE outline_node (id INTEGER PRIMARY KEY AUTOINCREMENT, work_id INTEGER NOT NULL, parent_id INTEGER, level SMALLINT NOT NULL DEFAULT 0, ref_sort_order INTEGER, title TEXT, content TEXT, sort_order INTEGER NOT NULL DEFAULT 0);
    `)
    // 写入本作品 work 行
    dst.prepare('INSERT INTO work(title, genre, summary) VALUES(?,?,?)').run(w.title, w.genre, w.summary)
    // chapter: 直接拷,work_id→1
    for (const r of src.prepare('SELECT * FROM chapter WHERE work_id=?').all(wid)) {
      dst.prepare('INSERT INTO chapter(work_id,sort_order,title,content,word_count,status,analyzed_at) VALUES(1,?,?,?,?,?,?)')
        .run(r.sort_order, r.title, r.content || '', r.word_count || 0, r.status || 0, r.analyzed_at || null)
    }
    // faction: 拷并记 old-to-new id 映射（parent_faction_id 需重映射）
    const facMap = {}
    for (const r of src.prepare('SELECT * FROM faction WHERE work_id=?').all(wid)) {
      const info = dst.prepare('INSERT INTO faction(work_id,name,parent_faction_id,type,description,color,importance,first_sort_order,last_active_sort_order) VALUES(1,?,?,?,?,?,?,?,?)')
        .run(r.name, r.parent_faction_id ? facMap[r.parent_faction_id] || null : null, r.type, r.description, r.color, r.importance ?? 0.5, r.first_sort_order ?? 1, r.last_active_sort_order)
      facMap[r.id] = info.lastInsertRowid
    }
    // character: 拷并重映射 faction_id
    const charMap = {}
    for (const r of src.prepare('SELECT * FROM character WHERE work_id=?').all(wid)) {
      const info = dst.prepare('INSERT INTO character(work_id,name,aliases,faction_id,role,description,avatar_color,importance,first_sort_order,last_active_sort_order,status,confirmed) VALUES(1,?,?,?,?,?,?,?,?,?,?,?)')
        .run(r.name, r.aliases, r.faction_id ? facMap[r.faction_id] || null : null, r.role, r.description, r.avatar_color, r.importance ?? 0.5, r.first_sort_order ?? 1, r.last_active_sort_order, r.status, r.confirmed ?? 0)
      charMap[r.id] = info.lastInsertRowid
    }
    // relationship: 拷并重映射 from_id/to_id
    for (const r of src.prepare('SELECT * FROM relationship WHERE work_id=?').all(wid)) {
      dst.prepare('INSERT INTO relationship(work_id,from_id,from_type,to_id,to_type,rel_type,strength,start_sort_order,end_sort_order,note,confirmed) VALUES(1,?,?,?,?,?,?,?,?,?,?)')
        .run(
          r.from_type === 'character' ? (charMap[r.from_id] || null) : (facMap[r.from_id] || null), r.from_type,
          r.to_type === 'character' ? (charMap[r.to_id] || null) : (facMap[r.to_id] || null), r.to_type,
          r.rel_type, r.strength ?? 0.5, r.start_sort_order ?? 1, r.end_sort_order, r.note, r.confirmed ?? 0)
    }
    // outline_node: 拷,parent_id 需重映射
    const outlineMap = {}
    for (const r of src.prepare('SELECT * FROM outline_node WHERE work_id=? ORDER BY id').all(wid)) {
      const info = dst.prepare('INSERT INTO outline_node(work_id,parent_id,level,ref_sort_order,title,content,sort_order) VALUES(1,?,?,?,?,?,?)')
        .run(r.parent_id ? outlineMap[r.parent_id] || null : null, r.level ?? 0, r.ref_sort_order, r.title, r.content, r.sort_order ?? 0)
      outlineMap[r.id] = info.lastInsertRowid
    }
    dst.close()
    migrated++
    out.push({ title: w.title, dir })
  }
  src.close()
  return { migrated, works: out }
}

module.exports = { migrateLegacy }

-- 写作星河 · SQLite schema（对齐技术方案 4.2）
-- 幂等：启动时由 Spring sql.init 执行，CREATE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS work (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          VARCHAR(200) NOT NULL,
  genre          VARCHAR(50),
  summary        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chapter (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id        INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL,
  title          VARCHAR(200) NOT NULL,
  content        TEXT NOT NULL DEFAULT '',
  word_count     INTEGER NOT NULL DEFAULT 0,
  status         SMALLINT NOT NULL DEFAULT 0,   -- 0草稿 1完成 2已分析
  analyzed_at    TEXT,
  UNIQUE (work_id, sort_order)
);

CREATE TABLE IF NOT EXISTS character (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id           INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  aliases           TEXT DEFAULT '[]',          -- JSON 数组
  faction_id        INTEGER REFERENCES faction(id),
  role              VARCHAR(50) DEFAULT '配角',
  description       TEXT,
  avatar_color      VARCHAR(20) DEFAULT '#2a9d8f',
  importance        REAL NOT NULL DEFAULT 0.5,
  first_sort_order  INTEGER NOT NULL DEFAULT 1,
  last_active_sort_order INTEGER,
  status            VARCHAR(20) DEFAULT '存活',
  confirmed         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faction (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id           INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  parent_faction_id INTEGER REFERENCES faction(id),
  type              VARCHAR(30) DEFAULT '组织',
  description       TEXT,
  color             VARCHAR(20) DEFAULT '#4f9df0',
  importance        REAL NOT NULL DEFAULT 0.5,
  first_sort_order  INTEGER NOT NULL DEFAULT 1,
  last_active_sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS relationship (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id           INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  from_id           INTEGER NOT NULL,
  from_type         VARCHAR(10) NOT NULL,       -- character / faction
  to_id             INTEGER NOT NULL,
  to_type           VARCHAR(10) NOT NULL,
  rel_type          VARCHAR(30) NOT NULL,
  strength          REAL NOT NULL DEFAULT 0.5,
  start_sort_order  INTEGER NOT NULL,
  end_sort_order    INTEGER,                    -- null=持续至今
  note              VARCHAR(200),
  confirmed         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS outline_node (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id        INTEGER NOT NULL REFERENCES work(id) ON DELETE CASCADE,
  parent_id      INTEGER REFERENCES outline_node(id) ON DELETE CASCADE,
  level          SMALLINT NOT NULL DEFAULT 0,   -- 0总纲 1分卷 2章纲
  ref_sort_order INTEGER,
  title          VARCHAR(200),
  content        TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

-- 章节序号插入/删除后重排用辅助：事务内更新

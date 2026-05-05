CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cat TEXT NOT NULL,
  title TEXT NOT NULL,
  due TEXT,
  stars INTEGER DEFAULT 3,
  status TEXT DEFAULT 'todo',
  memo TEXT DEFAULT '',
  waiting_for TEXT DEFAULT '',
  guide TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'url',
  url TEXT DEFAULT '',
  memo TEXT DEFAULT '',
  tag TEXT DEFAULT '기타',
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO categories (name, sort_order) VALUES
  ('급여 및 4대보험', 1),
  ('임직원 관리', 2),
  ('규정관리', 3),
  ('인사평가', 4),
  ('SW관리', 5),
  ('교육·행사', 6),
  ('정부지원금', 7),
  ('복리후생', 8),
  ('외부연계', 9);
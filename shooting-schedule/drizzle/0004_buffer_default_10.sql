-- P0-4: locations.buffer_before / buffer_after のデフォルト値を 0 → 10 に変更
-- SQLite は ALTER TABLE ... ALTER COLUMN をサポートしないためテーブル再作成で対応

PRAGMA foreign_keys = OFF;

CREATE TABLE locations_new (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  place_id TEXT,
  lat REAL,
  lng REAL,
  shooting_duration INTEGER NOT NULL DEFAULT 60,
  buffer_before INTEGER NOT NULL DEFAULT 10,
  buffer_after INTEGER NOT NULL DEFAULT 10,
  has_meal INTEGER NOT NULL DEFAULT 0,
  meal_type TEXT,
  meal_duration_min INTEGER NOT NULL DEFAULT 60,
  priority TEXT NOT NULL DEFAULT 'medium',
  time_slot TEXT NOT NULL DEFAULT 'normal',
  time_slot_start TEXT,
  time_slot_end TEXT,
  notes TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO locations_new SELECT * FROM locations;

DROP TABLE locations;

ALTER TABLE locations_new RENAME TO locations;

PRAGMA foreign_keys = ON;

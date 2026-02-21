-- P0-1: accommodations.name を任意（nullable）に変更
-- SQLite は ALTER TABLE ... ALTER COLUMN をサポートしないためテーブル再作成で対応

PRAGMA foreign_keys = OFF;

CREATE TABLE accommodations_new (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  place_id TEXT,
  lat REAL,
  lng REAL,
  check_in_date TEXT,
  check_out_date TEXT,
  check_in_time TEXT DEFAULT '15:00',
  check_out_time TEXT DEFAULT '10:00',
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  nights INTEGER,
  budget_per_night INTEGER,
  is_auto_suggested INTEGER NOT NULL DEFAULT 0
);

INSERT INTO accommodations_new SELECT * FROM accommodations;

DROP TABLE accommodations;

ALTER TABLE accommodations_new RENAME TO accommodations;

PRAGMA foreign_keys = ON;

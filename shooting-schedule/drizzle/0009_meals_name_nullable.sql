-- P0-2: meals.name を任意（nullable）に変更
-- SQLite は ALTER TABLE ... ALTER COLUMN をサポートしないためテーブル再作成で対応

PRAGMA foreign_keys = OFF;

CREATE TABLE meals_new (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  place_id TEXT,
  lat REAL,
  lng REAL,
  meal_type TEXT NOT NULL,
  scheduled_date TEXT,
  scheduled_time TEXT,
  duration INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO meals_new SELECT * FROM meals;

DROP TABLE meals;

ALTER TABLE meals_new RENAME TO meals;

PRAGMA foreign_keys = ON;

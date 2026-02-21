import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

export function createDb(d1: D1Database) {
  return drizzleD1(d1, { schema });
}

/**
 * ローカル開発用: better-sqlite3 で SQLite ファイルに接続
 * Cloudflare D1 の代わりに使用（getRequestContext が使えない環境）
 */
export async function createLocalDb(): Promise<Database> {
  // dynamic import で edge ランタイムでのバンドルを回避
  const BetterSqlite3 = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const path = await import('path');
  const fs = await import('fs');

  const dbPath = path.join(process.cwd(), '.local-dev.sqlite');

  // DBファイルが存在しない場合はスキーマを適用
  const isNew = !fs.existsSync(dbPath);
  const sqlite = new BetterSqlite3(dbPath);

  // WALモードで高速化
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema }) as unknown as Database;

  if (isNew) {
    await applyLocalSchema(sqlite);
  }

  return db;
}

/** ローカル開発用スキーマを適用する */
function applyLocalSchema(sqlite: import('better-sqlite3').Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active' NOT NULL,
      duration_mode TEXT DEFAULT 'fixed' NOT NULL,
      start_date TEXT,
      end_date TEXT,
      work_start_time TEXT DEFAULT '09:00' NOT NULL,
      work_end_time TEXT DEFAULT '18:00' NOT NULL,
      allow_early_morning INTEGER DEFAULT 0 NOT NULL,
      early_morning_start TEXT DEFAULT '05:00',
      allow_night_shooting INTEGER DEFAULT 0 NOT NULL,
      night_shooting_end TEXT DEFAULT '22:00',
      transport_mode_to_location TEXT DEFAULT 'car',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      place_id TEXT,
      lat REAL,
      lng REAL,
      shooting_duration INTEGER DEFAULT 60 NOT NULL,
      buffer_before INTEGER DEFAULT 10 NOT NULL,
      buffer_after INTEGER DEFAULT 10 NOT NULL,
      has_meal INTEGER DEFAULT 0 NOT NULL,
      meal_type TEXT,
      meal_duration INTEGER DEFAULT 60 NOT NULL,
      time_slot TEXT DEFAULT 'normal' NOT NULL,
      time_slot_start TEXT,
      time_slot_end TEXT,
      preferred_time_start TEXT,
      preferred_time_end TEXT,
      priority TEXT DEFAULT 'medium' NOT NULL,
      notes TEXT,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accommodations (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
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
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT,
      address TEXT,
      place_id TEXT,
      lat REAL,
      lng REAL,
      meal_type TEXT NOT NULL,
      scheduled_date TEXT,
      scheduled_time TEXT,
      duration INTEGER DEFAULT 60 NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rest_stops (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      place_id TEXT,
      lat REAL,
      lng REAL,
      duration INTEGER DEFAULT 15 NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transports (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      type TEXT DEFAULT 'car' NOT NULL,
      notes TEXT,
      default_travel_buffer INTEGER DEFAULT 10 NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      schedule_mode TEXT DEFAULT 'fixed' NOT NULL,
      generated_at INTEGER NOT NULL,
      total_days INTEGER NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_items (
      id TEXT PRIMARY KEY NOT NULL,
      schedule_id TEXT NOT NULL,
      day INTEGER NOT NULL,
      date TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      type TEXT NOT NULL,
      time_slot TEXT DEFAULT 'normal',
      ref_id TEXT,
      name TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      "order" INTEGER DEFAULT 0 NOT NULL,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS excluded_locations (
      id TEXT PRIMARY KEY NOT NULL,
      schedule_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      date TEXT NOT NULL,
      reason TEXT,
      priority TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
    );
  `);
}

export { schema };

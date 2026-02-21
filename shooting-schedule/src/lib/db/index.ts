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
  const BetterSqlite3 = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  const path = await import('path');
  const fs = await import('fs');

  const dbPath = path.join(process.cwd(), '.local-dev.sqlite');
  const isNew = !fs.existsSync(dbPath);
  const sqlite = new BetterSqlite3(dbPath);

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema }) as unknown as Database;

  if (isNew) {
    applyLocalSchema(sqlite);
  }

  return db;
}

/** ローカル開発用スキーマを適用する（developブランチのschema.tsに準拠） */
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
      status TEXT DEFAULT 'draft' NOT NULL,
      duration_mode TEXT DEFAULT 'fixed' NOT NULL,
      start_date TEXT,
      end_date TEXT,
      work_start_time TEXT DEFAULT '09:00' NOT NULL,
      work_end_time TEXT DEFAULT '18:00' NOT NULL,
      allow_early_morning INTEGER DEFAULT 0 NOT NULL,
      early_morning_start TEXT DEFAULT '05:00',
      allow_night_shooting INTEGER DEFAULT 0 NOT NULL,
      night_shooting_end TEXT DEFAULT '22:00',
      departure_location TEXT,
      departure_lat REAL,
      departure_lng REAL,
      departure_place_id TEXT,
      return_location TEXT,
      return_lat REAL,
      return_lng REAL,
      return_place_id TEXT,
      return_same_as_departure INTEGER DEFAULT 1 NOT NULL,
      transport_mode_to_location TEXT DEFAULT 'car' NOT NULL,
      default_transport_mode TEXT DEFAULT 'driving' NOT NULL,
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
      meal_duration_min INTEGER DEFAULT 60 NOT NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      time_slot TEXT DEFAULT 'normal' NOT NULL,
      time_slot_start TEXT,
      time_slot_end TEXT,
      preferred_time_start TEXT,
      preferred_time_end TEXT,
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
      nights INTEGER,
      budget_per_night INTEGER,
      is_auto_suggested INTEGER DEFAULT 0 NOT NULL,
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
      transport_type TEXT DEFAULT 'local' NOT NULL,
      mode TEXT DEFAULT 'driving' NOT NULL,
      description TEXT,
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
      optimization_type TEXT,
      total_distance_km REAL,
      total_duration_min INTEGER,
      has_overtime_warning INTEGER DEFAULT 0 NOT NULL,
      calculated_days INTEGER,
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
      ref_id TEXT,
      name TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      "order" INTEGER DEFAULT 0 NOT NULL,
      travel_from_previous_min INTEGER,
      travel_from_previous_km REAL,
      transport_mode TEXT,
      buffer_before_min INTEGER,
      buffer_after_min INTEGER,
      includes_meal INTEGER DEFAULT 0 NOT NULL,
      meal_duration_min INTEGER,
      is_outside_work_hours INTEGER DEFAULT 0 NOT NULL,
      is_auto_inserted INTEGER DEFAULT 0 NOT NULL,
      time_slot TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS excluded_locations (
      id TEXT PRIMARY KEY NOT NULL,
      schedule_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      date TEXT,
      reason TEXT,
      priority TEXT,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
    );
  `);
}

export { schema };

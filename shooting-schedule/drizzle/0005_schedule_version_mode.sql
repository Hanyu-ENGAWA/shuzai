-- P1-2: schedules テーブルに version / schedule_mode カラムを追加

ALTER TABLE schedules ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE schedules ADD COLUMN schedule_mode TEXT NOT NULL DEFAULT 'fixed';

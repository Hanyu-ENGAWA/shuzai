-- P1-3: locations テーブルに preferred_time_start / preferred_time_end カラムを追加

ALTER TABLE locations ADD COLUMN preferred_time_start TEXT;
ALTER TABLE locations ADD COLUMN preferred_time_end TEXT;

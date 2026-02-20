-- Phase 2: ルート最適化 マイグレーション
-- locations テーブルへの追加
ALTER TABLE locations ADD COLUMN meal_duration_min INTEGER NOT NULL DEFAULT 60;
ALTER TABLE locations ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE locations ADD COLUMN time_slot TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE locations ADD COLUMN time_slot_start TEXT;
ALTER TABLE locations ADD COLUMN time_slot_end TEXT;

-- schedules テーブルへの追加
ALTER TABLE schedules ADD COLUMN optimization_type TEXT;
ALTER TABLE schedules ADD COLUMN total_distance_km REAL;
ALTER TABLE schedules ADD COLUMN total_duration_min INTEGER;
ALTER TABLE schedules ADD COLUMN has_overtime_warning INTEGER NOT NULL DEFAULT 0;
ALTER TABLE schedules ADD COLUMN calculated_days INTEGER;

-- schedule_items テーブルへの追加
ALTER TABLE schedule_items ADD COLUMN travel_from_previous_min INTEGER;
ALTER TABLE schedule_items ADD COLUMN travel_from_previous_km REAL;
ALTER TABLE schedule_items ADD COLUMN transport_mode TEXT;
ALTER TABLE schedule_items ADD COLUMN buffer_before_min INTEGER;
ALTER TABLE schedule_items ADD COLUMN buffer_after_min INTEGER;
ALTER TABLE schedule_items ADD COLUMN includes_meal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE schedule_items ADD COLUMN meal_duration_min INTEGER;
ALTER TABLE schedule_items ADD COLUMN is_outside_work_hours INTEGER NOT NULL DEFAULT 0;
ALTER TABLE schedule_items ADD COLUMN is_auto_inserted INTEGER NOT NULL DEFAULT 0;

-- excluded_locations テーブルへの追加
ALTER TABLE excluded_locations ADD COLUMN reason TEXT;
ALTER TABLE excluded_locations ADD COLUMN priority TEXT;

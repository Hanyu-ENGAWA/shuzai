-- Phase2 最適化カラム追加
-- locations: time_slot, priority, meal_duration
ALTER TABLE `locations` ADD COLUMN `time_slot` text DEFAULT 'normal' NOT NULL;
ALTER TABLE `locations` ADD COLUMN `time_slot_start` text;
ALTER TABLE `locations` ADD COLUMN `time_slot_end` text;
ALTER TABLE `locations` ADD COLUMN `priority` text DEFAULT 'medium' NOT NULL;
ALTER TABLE `locations` ADD COLUMN `meal_duration` integer DEFAULT 60 NOT NULL;

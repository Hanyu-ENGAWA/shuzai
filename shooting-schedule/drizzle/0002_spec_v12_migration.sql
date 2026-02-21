-- 仕様書 v1.2 軌道修正: projects に transport_mode_to_location, schedule_mode 関連カラム追加
-- schedule_items に time_slot 追加（前処理）
-- excluded_locations に reason/priority 追加
ALTER TABLE `projects` ADD COLUMN `transport_mode_to_location` text DEFAULT 'car';
ALTER TABLE `schedule_items` ADD COLUMN `time_slot` text DEFAULT 'normal';
ALTER TABLE `excluded_locations` ADD COLUMN `reason` text;
ALTER TABLE `excluded_locations` ADD COLUMN `priority` text;

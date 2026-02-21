-- schedules に version/schedule_mode 追加
ALTER TABLE `schedules` ADD COLUMN `version` integer DEFAULT 1 NOT NULL;
ALTER TABLE `schedules` ADD COLUMN `schedule_mode` text DEFAULT 'fixed' NOT NULL;

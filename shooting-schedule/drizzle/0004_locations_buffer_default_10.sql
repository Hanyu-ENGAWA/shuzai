-- locations buffer デフォルト 0→10（SQLiteはALTER COLUMNのデフォルト変更不可のためテーブル再作成）
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `locations_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`place_id` text,
	`lat` real,
	`lng` real,
	`shooting_duration` integer DEFAULT 60 NOT NULL,
	`buffer_before` integer DEFAULT 10 NOT NULL,
	`buffer_after` integer DEFAULT 10 NOT NULL,
	`has_meal` integer DEFAULT false NOT NULL,
	`meal_type` text,
	`meal_duration` integer DEFAULT 60 NOT NULL,
	`time_slot` text DEFAULT 'normal' NOT NULL,
	`time_slot_start` text,
	`time_slot_end` text,
	`preferred_time_start` text,
	`preferred_time_end` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`notes` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `locations_new` SELECT
	`id`, `project_id`, `name`, `address`, `place_id`, `lat`, `lng`,
	`shooting_duration`,
	COALESCE(`buffer_before`, 10),
	COALESCE(`buffer_after`, 10),
	`has_meal`, `meal_type`,
	COALESCE(`meal_duration`, 60),
	COALESCE(`time_slot`, 'normal'),
	`time_slot_start`, `time_slot_end`,
	NULL, NULL,
	COALESCE(`priority`, 'medium'),
	`notes`, `order`, `created_at`, `updated_at`
FROM `locations`;
--> statement-breakpoint
DROP TABLE `locations`;
--> statement-breakpoint
ALTER TABLE `locations_new` RENAME TO `locations`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;

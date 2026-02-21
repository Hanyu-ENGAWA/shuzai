-- meals.name を nullable に（テーブル再作成）
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `meals_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text,
	`address` text,
	`place_id` text,
	`lat` real,
	`lng` real,
	`meal_type` text NOT NULL,
	`scheduled_date` text,
	`scheduled_time` text,
	`duration` integer DEFAULT 60 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `meals_new` SELECT * FROM `meals`;
--> statement-breakpoint
DROP TABLE `meals`;
--> statement-breakpoint
ALTER TABLE `meals_new` RENAME TO `meals`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;

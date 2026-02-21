-- accommodations.name を nullable に（テーブル再作成）
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `accommodations_new` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text,
	`address` text,
	`place_id` text,
	`lat` real,
	`lng` real,
	`check_in_date` text,
	`check_out_date` text,
	`check_in_time` text DEFAULT '15:00',
	`check_out_time` text DEFAULT '10:00',
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `accommodations_new` SELECT * FROM `accommodations`;
--> statement-breakpoint
DROP TABLE `accommodations`;
--> statement-breakpoint
ALTER TABLE `accommodations_new` RENAME TO `accommodations`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;

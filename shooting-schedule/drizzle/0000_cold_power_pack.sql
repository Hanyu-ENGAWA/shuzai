CREATE TABLE `accommodations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
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
CREATE TABLE `excluded_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`location_id` text NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`place_id` text,
	`lat` real,
	`lng` real,
	`shooting_duration` integer DEFAULT 60 NOT NULL,
	`buffer_before` integer DEFAULT 0 NOT NULL,
	`buffer_after` integer DEFAULT 0 NOT NULL,
	`has_meal` integer DEFAULT false NOT NULL,
	`meal_type` text,
	`notes` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
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
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`duration_mode` text DEFAULT 'fixed' NOT NULL,
	`start_date` text,
	`end_date` text,
	`work_start_time` text DEFAULT '08:00' NOT NULL,
	`work_end_time` text DEFAULT '19:00' NOT NULL,
	`allow_early_morning` integer DEFAULT false NOT NULL,
	`early_morning_start` text DEFAULT '05:00',
	`allow_night_shooting` integer DEFAULT false NOT NULL,
	`night_shooting_end` text DEFAULT '22:00',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rest_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`place_id` text,
	`lat` real,
	`lng` real,
	`duration` integer DEFAULT 15 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule_items` (
	`id` text PRIMARY KEY NOT NULL,
	`schedule_id` text NOT NULL,
	`day` integer NOT NULL,
	`date` text,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`type` text NOT NULL,
	`ref_id` text,
	`name` text NOT NULL,
	`address` text,
	`notes` text,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`generated_at` integer NOT NULL,
	`total_days` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transports` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text DEFAULT 'car' NOT NULL,
	`notes` text,
	`default_travel_buffer` integer DEFAULT 10 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
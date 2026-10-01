CREATE TABLE `building_template_divisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`division_code` text NOT NULL,
	`division_name` text NOT NULL,
	`base_rate_usd_per_m2` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `building_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `building_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`default_floors` integer DEFAULT 1 NOT NULL,
	`reference_gfa_m2` real DEFAULT 0 NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `building_templates_slug_unique` ON `building_templates` (`slug`);--> statement-breakpoint
ALTER TABLE `project_items` ADD `rate_usd` real;--> statement-breakpoint
ALTER TABLE `project_items` ADD `phase` text;--> statement-breakpoint
ALTER TABLE `project_items` ADD `base_duration_months` real;--> statement-breakpoint
ALTER TABLE `project_items` ADD `base_size` real;--> statement-breakpoint
ALTER TABLE `project_items` ADD `duration_exponent` real;
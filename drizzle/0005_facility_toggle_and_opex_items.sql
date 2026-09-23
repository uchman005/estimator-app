CREATE TABLE `project_opex_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`label` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`annual_amount_usd` real DEFAULT 0 NOT NULL,
	`is_included` integer DEFAULT true NOT NULL,
	`notes` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `is_included` integer DEFAULT true NOT NULL;
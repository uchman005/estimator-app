CREATE TABLE `program_collaborators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`user_id` integer,
	`invited_email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`author` text,
	`owner_id` integer NOT NULL,
	`country_id` text NOT NULL,
	`region_id` integer,
	`land_cost_usd` real DEFAULT 0 NOT NULL,
	`escalation_pct` real DEFAULT 10 NOT NULL,
	`funded_usd` real DEFAULT 0 NOT NULL,
	`opex_override_usd` real DEFAULT 0 NOT NULL,
	`opex_pct_of_capex_per_year` real DEFAULT 8 NOT NULL,
	`annual_revenue_usd` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `program_id` integer REFERENCES programs(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `phase` text DEFAULT 'phase_1' NOT NULL;
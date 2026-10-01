PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_project_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`class_node_id` integer,
	`custom_label` text,
	`custom_unit` text,
	`custom_unif_code` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`rate_usd` real DEFAULT 0 NOT NULL,
	`phase` text DEFAULT 'vertical' NOT NULL,
	`base_duration_months` real DEFAULT 1 NOT NULL,
	`base_size` real DEFAULT 1 NOT NULL,
	`duration_exponent` real DEFAULT 0.2 NOT NULL,
	`is_addon` integer DEFAULT false NOT NULL,
	`is_included` integer DEFAULT true NOT NULL,
	`gen_tag` text,
	`notes` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_node_id`) REFERENCES `class_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_project_items`("id", "project_id", "class_node_id", "custom_label", "custom_unit", "custom_unif_code", "quantity", "rate_usd", "phase", "base_duration_months", "base_size", "duration_exponent", "is_addon", "is_included", "gen_tag", "notes") SELECT "id", "project_id", "class_node_id", "custom_label", "custom_unit", "custom_unif_code", "quantity", "rate_usd", "phase", "base_duration_months", "base_size", "duration_exponent", "is_addon", "is_included", "gen_tag", "notes" FROM `project_items`;--> statement-breakpoint
DROP TABLE `project_items`;--> statement-breakpoint
ALTER TABLE `__new_project_items` RENAME TO `project_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
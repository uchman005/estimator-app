PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_assemblies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`class_node_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`unit` text NOT NULL,
	`pricing_mode` text DEFAULT 'tier' NOT NULL,
	`has_variants` integer DEFAULT false NOT NULL,
	`base_duration_months` real DEFAULT 3 NOT NULL,
	`base_size` real DEFAULT 1 NOT NULL,
	`duration_exponent` real DEFAULT 0.3 NOT NULL,
	`phase` text DEFAULT 'vertical' NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`class_node_id`) REFERENCES `class_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_assemblies`("id", "program_id", "class_node_id", "name", "slug", "unit", "pricing_mode", "has_variants", "base_duration_months", "base_size", "duration_exponent", "phase", "is_custom") SELECT "id", "program_id", "class_node_id", "name", "slug", "unit", "pricing_mode", "has_variants", "base_duration_months", "base_size", "duration_exponent", "phase", "is_custom" FROM `assemblies`;--> statement-breakpoint
DROP TABLE `assemblies`;--> statement-breakpoint
ALTER TABLE `__new_assemblies` RENAME TO `assemblies`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_micro_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`source_note` text,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_micro_items`("id", "program_id", "name", "unit", "source_note") SELECT "id", "program_id", "name", "unit", "source_note" FROM `micro_items`;--> statement-breakpoint
DROP TABLE `micro_items`;--> statement-breakpoint
ALTER TABLE `__new_micro_items` RENAME TO `micro_items`;--> statement-breakpoint
CREATE TABLE `__new_sub_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`name` text NOT NULL,
	`source_note` text,
	`labour_basic` real DEFAULT 0 NOT NULL,
	`labour_standard` real DEFAULT 0 NOT NULL,
	`labour_premium` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sub_items`("id", "program_id", "name", "source_note", "labour_basic", "labour_standard", "labour_premium") SELECT "id", "program_id", "name", "source_note", "labour_basic", "labour_standard", "labour_premium" FROM `sub_items`;--> statement-breakpoint
DROP TABLE `sub_items`;--> statement-breakpoint
ALTER TABLE `__new_sub_items` RENAME TO `sub_items`;
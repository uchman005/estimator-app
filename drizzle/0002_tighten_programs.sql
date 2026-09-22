DROP TABLE `project_collaborators`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`program_id` integer NOT NULL,
	`phase` text DEFAULT 'phase_1' NOT NULL,
	`name` text NOT NULL,
	`author` text,
	`aace_class` integer DEFAULT 5 NOT NULL,
	`delivery_strategy` text DEFAULT 'phased' NOT NULL,
	`design_fee_pct` real DEFAULT 8 NOT NULL,
	`pm_fee_pct` real DEFAULT 6 NOT NULL,
	`permit_fee_pct` real DEFAULT 2 NOT NULL,
	`contingency_pct_override` real,
	`fast_track_premium_pct` real DEFAULT 12 NOT NULL,
	`land_months` real DEFAULT 4 NOT NULL,
	`design_months` real DEFAULT 3 NOT NULL,
	`design_permit_overlap_pct` real DEFAULT 50 NOT NULL,
	`commission_months` real DEFAULT 2 NOT NULL,
	`start_date` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "program_id", "phase", "name", "author", "aace_class", "delivery_strategy", "design_fee_pct", "pm_fee_pct", "permit_fee_pct", "contingency_pct_override", "fast_track_premium_pct", "land_months", "design_months", "design_permit_overlap_pct", "commission_months", "start_date", "created_at", "updated_at") SELECT "id", "program_id", "phase", "name", "author", "aace_class", "delivery_strategy", "design_fee_pct", "pm_fee_pct", "permit_fee_pct", "contingency_pct_override", "fast_track_premium_pct", "land_months", "design_months", "design_permit_overlap_pct", "commission_months", "start_date", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
CREATE TABLE `project_hospital_equipment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`label` text NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`commissioning_pct` real DEFAULT 0 NOT NULL,
	`is_included` integer DEFAULT true NOT NULL,
	`notes` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);

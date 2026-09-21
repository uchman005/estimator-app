CREATE TABLE `aace_classes` (
	`class_number` integer PRIMARY KEY NOT NULL,
	`contingency_pct` real NOT NULL,
	`band_low_pct` real NOT NULL,
	`band_high_pct` real NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assemblies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
	FOREIGN KEY (`class_node_id`) REFERENCES `class_nodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `assembly_tier_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assembly_id` integer NOT NULL,
	`tier` text NOT NULL,
	`unit_rate_usd` real NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assemblies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assembly_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assembly_id` integer NOT NULL,
	`label` text NOT NULL,
	`unit_rate_usd` real NOT NULL,
	`labor_pct` real NOT NULL,
	`material_pct` real NOT NULL,
	`source_note` text,
	FOREIGN KEY (`assembly_id`) REFERENCES `assemblies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `building_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`driver_unit` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `class_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`standard` text DEFAULT 'UNIFORMAT_II' NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`level` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency_code` text NOT NULL,
	`base_cost_index` real DEFAULT 1 NOT NULL,
	`notes` text,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `currencies` (
	`code` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`currency_code` text NOT NULL,
	`rate_to_usd` real NOT NULL,
	`source` text NOT NULL,
	`is_manual_override` integer DEFAULT false NOT NULL,
	`fetched_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`currency_code`) REFERENCES `currencies`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `macro_item_sub_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`macro_item_id` integer NOT NULL,
	`sub_item_id` integer NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`macro_item_id`) REFERENCES `macro_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sub_item_id`) REFERENCES `sub_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `macro_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assembly_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`source_note` text,
	`labour_basic` real DEFAULT 0 NOT NULL,
	`labour_standard` real DEFAULT 0 NOT NULL,
	`labour_premium` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`assembly_id`) REFERENCES `assemblies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `micro_item_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`micro_item_id` integer NOT NULL,
	`tier` text NOT NULL,
	`unit_rate_usd` real NOT NULL,
	FOREIGN KEY (`micro_item_id`) REFERENCES `micro_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `micro_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`source_note` text
);
--> statement-breakpoint
CREATE TABLE `project_collaborators` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`user_id` integer,
	`invited_email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`assembly_id` integer,
	`class_node_id` integer,
	`custom_label` text,
	`custom_unit` text,
	`custom_unif_code` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`tier` text DEFAULT 'standard',
	`variant_id` integer,
	`rate_override_usd` real,
	`is_addon` integer DEFAULT false NOT NULL,
	`is_included` integer DEFAULT true NOT NULL,
	`gen_tag` text,
	`notes` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assembly_id`) REFERENCES `assemblies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_node_id`) REFERENCES `class_nodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `assembly_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`author` text,
	`owner_id` integer NOT NULL,
	`country_id` text NOT NULL,
	`region_id` integer,
	`aace_class` integer DEFAULT 5 NOT NULL,
	`delivery_strategy` text DEFAULT 'phased' NOT NULL,
	`design_fee_pct` real DEFAULT 8 NOT NULL,
	`pm_fee_pct` real DEFAULT 6 NOT NULL,
	`permit_fee_pct` real DEFAULT 2 NOT NULL,
	`land_cost_usd` real DEFAULT 0 NOT NULL,
	`escalation_pct` real DEFAULT 10 NOT NULL,
	`contingency_pct_override` real,
	`fast_track_premium_pct` real DEFAULT 12 NOT NULL,
	`land_months` real DEFAULT 4 NOT NULL,
	`design_months` real DEFAULT 3 NOT NULL,
	`design_permit_overlap_pct` real DEFAULT 50 NOT NULL,
	`commission_months` real DEFAULT 2 NOT NULL,
	`start_date` text,
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
CREATE TABLE `regions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_id` text NOT NULL,
	`name` text NOT NULL,
	`offset_pct` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `space_template_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`label` text NOT NULL,
	`pct_of_gfa` real NOT NULL,
	`assembly_id` integer,
	FOREIGN KEY (`template_id`) REFERENCES `space_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assembly_id`) REFERENCES `assemblies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `space_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`building_type_id` integer NOT NULL,
	`name` text NOT NULL,
	`gfa_per_driver_basic` real NOT NULL,
	`gfa_per_driver_standard` real NOT NULL,
	`gfa_per_driver_premium` real NOT NULL,
	FOREIGN KEY (`building_type_id`) REFERENCES `building_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sub_item_micro_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sub_item_id` integer NOT NULL,
	`micro_item_id` integer NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`sub_item_id`) REFERENCES `sub_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`micro_item_id`) REFERENCES `micro_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sub_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`source_note` text,
	`labour_basic` real DEFAULT 0 NOT NULL,
	`labour_standard` real DEFAULT 0 NOT NULL,
	`labour_premium` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
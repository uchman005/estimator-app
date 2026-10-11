ALTER TABLE `projects` ADD `sub_contractor_markup_pct` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `mobilization_fee_pct` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `contractor_profit_pct` real DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `commissioning_fee_pct` real DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `construction_qc_pct` real DEFAULT 5 NOT NULL;
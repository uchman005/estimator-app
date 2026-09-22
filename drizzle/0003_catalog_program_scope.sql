ALTER TABLE `assemblies` ADD `program_id` integer REFERENCES programs(id);--> statement-breakpoint
ALTER TABLE `micro_items` ADD `program_id` integer REFERENCES programs(id);--> statement-breakpoint
ALTER TABLE `programs` ADD `is_template` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sub_items` ADD `program_id` integer REFERENCES programs(id);
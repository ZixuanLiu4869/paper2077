CREATE TABLE `archives` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`story` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `archives_fingerprint_unique` ON `archives` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `generation_budget` (
	`scope` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);

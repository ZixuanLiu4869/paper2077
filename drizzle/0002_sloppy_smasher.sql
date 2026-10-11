CREATE TABLE `paper_search_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text,
	`status` integer,
	`expires_at` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`lease_token` text
);
--> statement-breakpoint
CREATE TABLE `request_limits` (
	`scope` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL
);

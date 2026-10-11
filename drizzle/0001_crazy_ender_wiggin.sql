CREATE TABLE `generation_jobs` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL
);

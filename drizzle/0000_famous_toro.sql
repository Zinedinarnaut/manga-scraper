CREATE TABLE `manga` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`cover_image` text,
	`latest_chapter` text,
	`genres` text,
	`release_time` text
);

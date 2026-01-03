CREATE TABLE `bible_reading_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookName` varchar(50) NOT NULL,
	`chaptersRead` int NOT NULL DEFAULT 0,
	`totalChapters` int NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`lastReadAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bible_reading_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_book_idx` UNIQUE(`userId`,`bookName`)
);
--> statement-breakpoint
CREATE TABLE `medals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`category` enum('BIBLE_BOOK','STREAK','MILESTONE','SPECIAL') NOT NULL,
	`iconUrl` varchar(512),
	`iconEmoji` varchar(10),
	`requirement` text NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_medals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`medalId` int NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	`progress` int NOT NULL DEFAULT 0,
	CONSTRAINT `user_medals_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_medal_idx` UNIQUE(`userId`,`medalId`)
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `bible_reading_progress` (`userId`);--> statement-breakpoint
CREATE INDEX `completed_idx` ON `bible_reading_progress` (`isCompleted`);--> statement-breakpoint
CREATE INDEX `categoryIdx` ON `medals` (`category`);--> statement-breakpoint
CREATE INDEX `orderIdx` ON `medals` (`order`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `user_medals` (`userId`);--> statement-breakpoint
CREATE INDEX `medal_idx` ON `user_medals` (`medalId`);
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`approvedBy` int,
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`leaderId` int NOT NULL,
	`memberCount` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `groupIdx` ON `group_members` (`groupId`);--> statement-breakpoint
CREATE INDEX `userIdx` ON `group_members` (`userId`);
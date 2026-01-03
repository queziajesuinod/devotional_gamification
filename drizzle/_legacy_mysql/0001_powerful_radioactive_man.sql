CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`devotionalDayId` int NOT NULL,
	`type` enum('READING','DEVOTIONAL','REFLECTION','EXTRA') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`baseXp` int NOT NULL DEFAULT 10,
	`baseDenario` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devotional_days` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`dayNumber` int NOT NULL,
	`date` date NOT NULL,
	`bibleReference` varchar(255) NOT NULL,
	`devotionalText` text,
	`reflectionQuestion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `devotional_days_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_day_idx` UNIQUE(`planId`,`dayNumber`)
);
--> statement-breakpoint
CREATE TABLE `devotional_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`year` int NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `devotional_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`source` enum('CHALLENGE','BONUS_STREAK','ADMIN','PURCHASE') NOT NULL,
	`xp` int NOT NULL DEFAULT 0,
	`denario` int NOT NULL DEFAULT 0,
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `point_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ranking_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodType` enum('MONTH','YEAR') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ranking_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('BACKGROUND','CLOTHES','ACCESSORY') NOT NULL,
	`rarity` enum('COMMON','RARE','EPIC') NOT NULL DEFAULT 'COMMON',
	`imageUrl` varchar(512),
	`priceDenario` int NOT NULL,
	`description` text,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shop_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`challengeId` int NOT NULL,
	`status` enum('PENDING','COMPLETED') NOT NULL DEFAULT 'PENDING',
	`xpEarned` int NOT NULL DEFAULT 0,
	`denariosEarned` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_challenge_idx` UNIQUE(`userId`,`challengeId`)
);
--> statement-breakpoint
CREATE TABLE `user_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` int NOT NULL,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_item_idx` UNIQUE(`userId`,`itemId`)
);
--> statement-breakpoint
CREATE TABLE `user_ranking_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rankingPeriodId` int NOT NULL,
	`userId` int NOT NULL,
	`xpTotal` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_ranking_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `period_user_idx` UNIQUE(`rankingPeriodId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `nickname` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `xpTotal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `level` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `denarioBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarConfig` text;--> statement-breakpoint
ALTER TABLE `users` ADD `equippedBackgroundId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `equippedClothesId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `equippedAccessoryId` int;--> statement-breakpoint
CREATE INDEX `devotional_day_idx` ON `challenges` (`devotionalDayId`);--> statement-breakpoint
CREATE INDEX `date_idx` ON `devotional_days` (`date`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `point_transactions` (`userId`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `point_transactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `period_type_idx` ON `ranking_periods` (`periodType`);--> statement-breakpoint
CREATE INDEX `active_idx` ON `ranking_periods` (`isActive`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `user_challenges` (`userId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `user_items` (`userId`);--> statement-breakpoint
CREATE INDEX `period_xp_idx` ON `user_ranking_scores` (`rankingPeriodId`,`xpTotal`);
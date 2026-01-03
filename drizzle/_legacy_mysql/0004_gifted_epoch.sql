ALTER TABLE `user_challenges` MODIFY COLUMN `completedAt` datetime;--> statement-breakpoint
ALTER TABLE `user_challenges` MODIFY COLUMN `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `user_challenges` ADD `responseText` text;--> statement-breakpoint
ALTER TABLE `user_challenges` ADD `denarioEarned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_challenges` ADD `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `user_challenges` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `user_challenges` DROP COLUMN `denariosEarned`;
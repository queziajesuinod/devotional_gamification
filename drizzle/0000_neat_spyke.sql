CREATE TYPE "public"."challenge_type" AS ENUM('READING', 'DEVOTIONAL', 'REFLECTION', 'EXTRA');--> statement-breakpoint
CREATE TYPE "public"."group_member_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."medal_category" AS ENUM('BIBLE_BOOK', 'STREAK', 'MILESTONE', 'SPECIAL');--> statement-breakpoint
CREATE TYPE "public"."point_source" AS ENUM('CHALLENGE', 'BONUS_STREAK', 'ADMIN', 'PURCHASE');--> statement-breakpoint
CREATE TYPE "public"."ranking_period_type" AS ENUM('MONTH', 'YEAR');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."shop_item_rarity" AS ENUM('COMMON', 'RARE', 'EPIC');--> statement-breakpoint
CREATE TYPE "public"."shop_item_type" AS ENUM('BACKGROUND', 'CLOTHES', 'ACCESSORY');--> statement-breakpoint
CREATE TABLE "bible_reading_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"bookName" varchar(50) NOT NULL,
	"chaptersRead" integer DEFAULT 0 NOT NULL,
	"totalChapters" integer NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp,
	"lastReadAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotionalDayId" integer NOT NULL,
	"type" "challenge_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"baseXp" integer DEFAULT 10 NOT NULL,
	"baseDenario" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devotional_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"planId" integer NOT NULL,
	"dayNumber" integer NOT NULL,
	"date" date NOT NULL,
	"bibleReference" varchar(255) NOT NULL,
	"devotionalText" text,
	"reflectionQuestion" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devotional_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" integer NOT NULL,
	"userId" integer NOT NULL,
	"status" "group_member_status" DEFAULT 'pending' NOT NULL,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"approvedAt" timestamp,
	"approvedBy" integer
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"leaderId" integer NOT NULL,
	"memberCount" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" "medal_category" NOT NULL,
	"iconUrl" varchar(512),
	"iconEmoji" varchar(10),
	"requirement" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"source" "point_source" NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"denario" integer DEFAULT 0 NOT NULL,
	"description" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ranking_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"periodType" "ranking_period_type" NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "shop_item_type" NOT NULL,
	"rarity" "shop_item_rarity" DEFAULT 'COMMON' NOT NULL,
	"imageUrl" varchar(512),
	"priceDenario" integer NOT NULL,
	"description" text,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"challengeId" integer NOT NULL,
	"completedAt" timestamp,
	"responseText" text,
	"xpEarned" integer DEFAULT 0 NOT NULL,
	"denarioEarned" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"itemId" integer NOT NULL,
	"purchasedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_medals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"medalId" integer NOT NULL,
	"earnedAt" timestamp DEFAULT now() NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ranking_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"rankingPeriodId" integer NOT NULL,
	"userId" integer NOT NULL,
	"xpTotal" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"avatarUrl" varchar(500),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"nickname" varchar(100) NOT NULL,
	"xpTotal" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"denarioBalance" integer DEFAULT 0 NOT NULL,
	"avatarConfig" text,
	"equippedBackgroundId" integer,
	"equippedClothesId" integer,
	"equippedAccessoryId" integer,
	"currentStreak" integer DEFAULT 0 NOT NULL,
	"longestStreak" integer DEFAULT 0 NOT NULL,
	"lastActivityDate" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bible_reading_progress_user_book_idx" ON "bible_reading_progress" USING btree ("userId","bookName");--> statement-breakpoint
CREATE INDEX "bible_reading_progress_user_idx" ON "bible_reading_progress" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "bible_reading_progress_completed_idx" ON "bible_reading_progress" USING btree ("isCompleted");--> statement-breakpoint
CREATE INDEX "challenges_devotional_day_idx" ON "challenges" USING btree ("devotionalDayId");--> statement-breakpoint
CREATE UNIQUE INDEX "devotional_days_plan_day_idx" ON "devotional_days" USING btree ("planId","dayNumber");--> statement-breakpoint
CREATE INDEX "devotional_days_date_idx" ON "devotional_days" USING btree ("date");--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "group_members_user_idx" ON "group_members" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "medals_category_idx" ON "medals" USING btree ("category");--> statement-breakpoint
CREATE INDEX "medals_order_idx" ON "medals" USING btree ("order");--> statement-breakpoint
CREATE INDEX "point_transactions_user_idx" ON "point_transactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "point_transactions_created_at_idx" ON "point_transactions" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "ranking_periods_period_type_idx" ON "ranking_periods" USING btree ("periodType");--> statement-breakpoint
CREATE INDEX "ranking_periods_active_idx" ON "ranking_periods" USING btree ("isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "user_challenges_user_challenge_idx" ON "user_challenges" USING btree ("userId","challengeId");--> statement-breakpoint
CREATE INDEX "user_challenges_user_idx" ON "user_challenges" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_items_user_item_idx" ON "user_items" USING btree ("userId","itemId");--> statement-breakpoint
CREATE INDEX "user_items_user_idx" ON "user_items" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_medals_user_medal_idx" ON "user_medals" USING btree ("userId","medalId");--> statement-breakpoint
CREATE INDEX "user_medals_user_idx" ON "user_medals" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_medals_medal_idx" ON "user_medals" USING btree ("medalId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_ranking_scores_period_user_idx" ON "user_ranking_scores" USING btree ("rankingPeriodId","userId");--> statement-breakpoint
CREATE INDEX "user_ranking_scores_period_xp_idx" ON "user_ranking_scores" USING btree ("rankingPeriodId","xpTotal");
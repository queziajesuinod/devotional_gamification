-- Fase 2 de gamificação: atividade diária, missões semanais, meta da célula,
-- encorajamento e ligas semanais. Idempotente: pode ser rodado mais de uma vez.

ALTER TYPE "public"."point_source" ADD VALUE IF NOT EXISTS 'QUEST';
--> statement-breakpoint
ALTER TYPE "public"."point_source" ADD VALUE IF NOT EXISTS 'GROUP_CHEST';
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."league_tier" AS ENUM('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."encouragement_type" AS ENUM('PRAYED', 'CHEER', 'PROUD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_activity_days" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "day" date NOT NULL,
  "challengesCompleted" integer DEFAULT 0 NOT NULL,
  "xp" integer DEFAULT 0 NOT NULL,
  "reflections" integer DEFAULT 0 NOT NULL,
  "readings" integer DEFAULT 0 NOT NULL,
  "fullDay" boolean DEFAULT false NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_activity_days_user_day_idx" ON "user_activity_days" ("userId", "day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_activity_days_day_idx" ON "user_activity_days" ("day");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weekly_quest_claims" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "weekKey" varchar(10) NOT NULL,
  "questId" varchar(50) NOT NULL,
  "claimedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_quest_claims_user_week_quest_idx" ON "weekly_quest_claims" ("userId", "weekKey", "questId");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "group_chest_claims" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "groupId" integer NOT NULL,
  "weekKey" varchar(10) NOT NULL,
  "claimedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "group_chest_claims_user_group_week_idx" ON "group_chest_claims" ("userId", "groupId", "weekKey");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encouragements" (
  "id" serial PRIMARY KEY NOT NULL,
  "fromUserId" integer NOT NULL,
  "toUserId" integer NOT NULL,
  "groupId" integer NOT NULL,
  "type" "encouragement_type" NOT NULL,
  "day" date NOT NULL,
  "seenAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "encouragements_from_to_day_idx" ON "encouragements" ("fromUserId", "toUserId", "day");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encouragements_to_user_idx" ON "encouragements" ("toUserId", "createdAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encouragements_from_day_idx" ON "encouragements" ("fromUserId", "day");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "league_memberships" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "weekKey" varchar(10) NOT NULL,
  "tier" "league_tier" DEFAULT 'BRONZE' NOT NULL,
  "xp" integer DEFAULT 0 NOT NULL,
  "previousOutcome" varchar(16),
  "previousRank" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "league_memberships_user_week_idx" ON "league_memberships" ("userId", "weekKey");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "league_memberships_week_tier_xp_idx" ON "league_memberships" ("weekKey", "tier", "xp");

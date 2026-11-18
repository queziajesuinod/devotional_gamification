-- Fase 1 de gamificação: Graças (proteção de sequência), tiers/recompensas de medalhas
-- e novas origens de pontos. Idempotente: pode ser rodado mais de uma vez.

ALTER TYPE "public"."point_source" ADD VALUE IF NOT EXISTS 'MEDAL';
--> statement-breakpoint
ALTER TYPE "public"."point_source" ADD VALUE IF NOT EXISTS 'LEVEL_UP';
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."medal_tier" AS ENUM('BRONZE', 'SILVER', 'GOLD', 'DIAMOND');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streakFreezes" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streakFreezeWeek" varchar(10);
--> statement-breakpoint
ALTER TABLE "medals" ADD COLUMN IF NOT EXISTS "tier" "medal_tier" DEFAULT 'BRONZE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "medals" ADD COLUMN IF NOT EXISTS "xpReward" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "medals" ADD COLUMN IF NOT EXISTS "denarioReward" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Tiers/recompensas padrão (espelha shared/medal-rewards.ts). Só toca medalhas ainda sem recompensa.
WITH req AS (
  SELECT id, requirement::jsonb AS j FROM "medals" WHERE "xpReward" = 0 AND "denarioReward" = 0
), calc AS (
  SELECT id,
    CASE j->>'type'
      WHEN 'streak' THEN CASE WHEN (j->>'days')::int >= 365 THEN 'DIAMOND' WHEN (j->>'days')::int >= 100 THEN 'GOLD' WHEN (j->>'days')::int >= 30 THEN 'SILVER' ELSE 'BRONZE' END
      WHEN 'total_devotionals' THEN CASE WHEN (j->>'count')::int >= 365 THEN 'DIAMOND' WHEN (j->>'count')::int >= 100 THEN 'GOLD' WHEN (j->>'count')::int >= 50 THEN 'SILVER' ELSE 'BRONZE' END
      WHEN 'total_reflections' THEN CASE WHEN (j->>'count')::int >= 200 THEN 'GOLD' ELSE 'SILVER' END
      WHEN 'book' THEN CASE WHEN (j->>'chapters')::int >= 100 THEN 'DIAMOND' WHEN (j->>'chapters')::int >= 50 THEN 'GOLD' WHEN (j->>'chapters')::int > 16 THEN 'SILVER' ELSE 'BRONZE' END
      WHEN 'multiple_books' THEN 'GOLD'
      ELSE 'BRONZE'
    END AS tier,
    CASE j->>'type'
      WHEN 'streak' THEN CASE WHEN (j->>'days')::int >= 365 THEN 300 WHEN (j->>'days')::int >= 100 THEN 100 WHEN (j->>'days')::int >= 30 THEN 50 ELSE 20 END
      WHEN 'total_devotionals' THEN CASE WHEN (j->>'count')::int >= 365 THEN 200 WHEN (j->>'count')::int >= 100 THEN 80 WHEN (j->>'count')::int >= 50 THEN 40 ELSE 20 END
      WHEN 'total_reflections' THEN CASE WHEN (j->>'count')::int >= 200 THEN 100 ELSE 50 END
      WHEN 'book' THEN CASE WHEN (j->>'chapters')::int >= 100 THEN 200 WHEN (j->>'chapters')::int >= 50 THEN 120 WHEN (j->>'chapters')::int > 16 THEN 60 ELSE 30 END
      WHEN 'multiple_books' THEN 150
      ELSE 10
    END AS xp,
    CASE j->>'type'
      WHEN 'streak' THEN CASE WHEN (j->>'days')::int >= 365 THEN 1000 WHEN (j->>'days')::int >= 100 THEN 300 WHEN (j->>'days')::int >= 30 THEN 100 ELSE 30 END
      WHEN 'total_devotionals' THEN CASE WHEN (j->>'count')::int >= 365 THEN 500 WHEN (j->>'count')::int >= 100 THEN 150 WHEN (j->>'count')::int >= 50 THEN 60 ELSE 20 END
      WHEN 'total_reflections' THEN CASE WHEN (j->>'count')::int >= 200 THEN 250 ELSE 80 END
      WHEN 'book' THEN CASE WHEN (j->>'chapters')::int >= 100 THEN 400 WHEN (j->>'chapters')::int >= 50 THEN 250 WHEN (j->>'chapters')::int > 16 THEN 100 ELSE 50 END
      WHEN 'multiple_books' THEN 300
      WHEN 'first_devotional' THEN 20
      ELSE 15
    END AS den
  FROM req
)
UPDATE "medals" m
SET "tier" = calc.tier::"medal_tier", "xpReward" = calc.xp, "denarioReward" = calc.den
FROM calc WHERE m.id = calc.id;

-- Baús configuráveis no admin (tipos de baú) + snapshot do nome/cor no baú do jogador.
-- Idempotente, sem enums. Cria os 3 baús iniciais (Bronze, Prata, Ouro) se a tabela estiver vazia.

CREATE TABLE IF NOT EXISTS "chest_types" (
  "id" serial PRIMARY KEY,
  "name" varchar(60) NOT NULL,
  "description" varchar(200) DEFAULT '' NOT NULL,
  "color" varchar(9) DEFAULT '#E0A800' NOT NULL,
  "price" integer NOT NULL,
  "days" integer NOT NULL,
  "challengeCount" integer NOT NULL,
  "rewardXp" integer NOT NULL,
  "rewardDenario" integer NOT NULL,
  "challenges" text NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_chests" ADD COLUMN IF NOT EXISTS "chestTypeId" integer;
--> statement-breakpoint
ALTER TABLE "user_chests" ADD COLUMN IF NOT EXISTS "name" varchar(60);
--> statement-breakpoint
ALTER TABLE "user_chests" ADD COLUMN IF NOT EXISTS "color" varchar(9);
--> statement-breakpoint
INSERT INTO "chest_types" ("name", "description", "color", "price", "days", "challengeCount", "rewardXp", "rewardDenario", "challenges", "sortOrder")
SELECT * FROM (VALUES
  ('Baú de Bronze', '1 desafio para fazer hoje', '#B87333', 50, 1, 1, 40, 75,
   '[{"kind":"ENCOURAGE_PEOPLE","target":2},{"kind":"PRAY_FOR","target":1},{"kind":"DEVOTIONAL_DAYS","target":1},{"kind":"REFLECTIONS","target":1},{"kind":"EARN_XP","target":50}]', 1),
  ('Baú de Prata', '2 desafios em 3 dias', '#8E9AAF', 120, 3, 2, 120, 180,
   '[{"kind":"ENCOURAGE_PEOPLE","target":5},{"kind":"PRAY_FOR","target":3},{"kind":"DEVOTIONAL_DAYS","target":2},{"kind":"REFLECTIONS","target":2},{"kind":"EARN_XP","target":150},{"kind":"STREAK","target":4},{"kind":"HONOR","target":1,"text":"Leia um Salmo em voz alta para alguém da sua casa","emoji":"🎵"},{"kind":"HONOR","target":1,"text":"Faça uma boa ação escondido, sem ninguém pedir","emoji":"🤫"}]', 2),
  ('Baú de Ouro', '3 desafios em 7 dias', '#E0A800', 250, 7, 3, 300, 380,
   '[{"kind":"ENCOURAGE_PEOPLE","target":10},{"kind":"PRAY_FOR","target":5},{"kind":"DEVOTIONAL_DAYS","target":5},{"kind":"REFLECTIONS","target":4},{"kind":"EARN_XP","target":400},{"kind":"STREAK","target":7},{"kind":"HONOR","target":1,"text":"Ore junto com alguém da sua família","emoji":"🏠"},{"kind":"HONOR","target":1,"text":"Agradeça a alguém por algo que fez por você","emoji":"💛"}]', 3)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "chest_types");

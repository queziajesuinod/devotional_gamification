-- Mensagens de encorajamento cadastradas no admin. Cada mensagem tem uma categoria
-- (PRAYED/CHEER/PROUD) gravada na coluna enum existente; o id da mensagem vai em messageId.
-- Idempotente, sem mexer em enums. Cria as 3 mensagens atuais se a tabela estiver vazia.

CREATE TABLE IF NOT EXISTS "encouragement_messages" (
  "id" serial PRIMARY KEY,
  "label" varchar(60) NOT NULL,
  "receivedText" varchar(80) NOT NULL,
  "emoji" varchar(16) DEFAULT '' NOT NULL,
  "category" varchar(10) DEFAULT 'CHEER' NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "encouragements" ADD COLUMN IF NOT EXISTS "messageId" integer;
--> statement-breakpoint
INSERT INTO "encouragement_messages" ("label", "receivedText", "emoji", "category", "sortOrder")
SELECT * FROM (VALUES
  ('Estou orando por você', 'está orando por você', '🙏', 'PRAYED', 1),
  ('Continue firme!', 'disse: continue firme!', '👏', 'CHEER', 2),
  ('Você me inspira', 'disse que você inspira', '💪', 'PROUD', 3)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM "encouragement_messages");
--> statement-breakpoint
-- Old encouragements point to the first message of their category
UPDATE "encouragements" e SET "messageId" = m.id
FROM (SELECT DISTINCT ON ("category") id, "category" FROM "encouragement_messages" ORDER BY "category", "sortOrder", id) m
WHERE e."messageId" IS NULL AND m."category" = e."type"::text;

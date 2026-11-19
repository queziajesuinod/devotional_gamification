-- Baús de Desafio (Mercado / Tesouro). Idempotente, sem enums (texto simples),
-- então o plano_user pode aplicar.

CREATE TABLE IF NOT EXISTS "user_chests" (
  "id" serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "tier" varchar(10) NOT NULL,
  "challenges" text NOT NULL,
  "status" varchar(12) DEFAULT 'ACTIVE' NOT NULL,
  "pricePaid" integer NOT NULL,
  "rewardXp" integer NOT NULL,
  "rewardDenario" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "claimedAt" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_chests_user_idx" ON "user_chests" ("userId", "status");

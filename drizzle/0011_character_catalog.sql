-- Figurinhas: personagem escolhido no usuário e itens de catálogo na loja.
-- Idempotente. Sem mudanças em enums (os itens usam CLOTHES, HAIR_COLOR e ACCESSORY).
-- Depois de aplicar: `pnpm catalog:sync` para criar/atualizar os itens.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "characterKey" varchar(20);
--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN IF NOT EXISTS "slug" varchar(80);
--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN IF NOT EXISTS "characterKey" varchar(20);
--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN IF NOT EXISTS "assetKey" varchar(60);
--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN IF NOT EXISTS "minLevel" integer;
--> statement-breakpoint
ALTER TABLE "shop_items" ADD COLUMN IF NOT EXISTS "medalsRequired" integer;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shop_items_slug_unique" ON "shop_items" ("slug");

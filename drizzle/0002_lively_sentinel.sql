ALTER TYPE "public"."shop_item_type" ADD VALUE 'HAIR_STYLE';--> statement-breakpoint
ALTER TYPE "public"."shop_item_type" ADD VALUE 'HAIR_COLOR';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equippedHairStyleId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "equippedHairColorId" integer;
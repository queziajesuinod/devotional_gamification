DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_item_type' AND e.enumlabel = 'HAIR_STYLE'
  ) THEN
    ALTER TYPE "public"."shop_item_type" ADD VALUE 'HAIR_STYLE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_item_type' AND e.enumlabel = 'HAIR_COLOR'
  ) THEN
    ALTER TYPE "public"."shop_item_type" ADD VALUE 'HAIR_COLOR';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedHairStyleId" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedHairColorId" integer;

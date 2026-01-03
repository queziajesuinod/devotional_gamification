DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE "public"."role" AS ENUM ('user', 'admin');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "role" DEFAULT 'user' NOT NULL;

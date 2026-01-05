ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" varchar(16);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthDate" date;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp" varchar(32);
--> statement-breakpoint

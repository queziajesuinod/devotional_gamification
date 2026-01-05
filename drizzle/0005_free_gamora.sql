CREATE TABLE "bible_reading_segments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"devotionalDayId" integer NOT NULL,
	"planId" integer NOT NULL,
	"bookName" varchar(50) NOT NULL,
	"chapter" integer NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthDate" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "whatsapp" varchar(32);--> statement-breakpoint
CREATE UNIQUE INDEX "bible_reading_segments_user_day_chapter_idx" ON "bible_reading_segments" USING btree ("userId","devotionalDayId","bookName","chapter");--> statement-breakpoint
CREATE INDEX "bible_reading_segments_user_book_idx" ON "bible_reading_segments" USING btree ("userId","bookName");--> statement-breakpoint
CREATE INDEX "bible_reading_segments_book_chapter_idx" ON "bible_reading_segments" USING btree ("bookName","chapter");
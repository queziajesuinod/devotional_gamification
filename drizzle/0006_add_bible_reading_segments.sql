CREATE TABLE "bible_reading_segments" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "devotionalDayId" integer NOT NULL,
  "planId" integer NOT NULL,
  "bookName" varchar(50) NOT NULL,
  "chapter" integer NOT NULL,
  "completedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "bible_reading_segments_user_day_chapter_idx" ON "bible_reading_segments" USING btree ("userId","devotionalDayId","bookName","chapter");
CREATE INDEX "bible_reading_segments_user_book_idx" ON "bible_reading_segments" USING btree ("userId","bookName");
CREATE INDEX "bible_reading_segments_book_chapter_idx" ON "bible_reading_segments" USING btree ("bookName","chapter");

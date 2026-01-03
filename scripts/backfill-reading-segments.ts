import "dotenv/config";
import { and, eq, sql } from "drizzle-orm";
import { challenges, userChallenges } from "../drizzle/schema";
import { getDb, recordBibleReadingForDay } from "../server/db";

type Pair = {
  userId: number;
  devotionalDayId: number;
};

async function main() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available. Check DATABASE_URL.");
  }

  const rows = await db
    .select({
      userId: userChallenges.userId,
      devotionalDayId: challenges.devotionalDayId,
      completedAt: userChallenges.completedAt,
    })
    .from(userChallenges)
    .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
    .where(and(eq(challenges.type, "READING"), sql`${userChallenges.completedAt} IS NOT NULL`));

  const pairs = new Map<string, Pair>();
  for (const row of rows) {
    const key = `${row.userId}:${row.devotionalDayId}`;
    if (!pairs.has(key)) {
      pairs.set(key, { userId: row.userId, devotionalDayId: row.devotionalDayId });
    }
  }

  let processed = 0;
  let missingDays = 0;
  let updatedBooks = 0;

  for (const pair of pairs.values()) {
    const results = await recordBibleReadingForDay(pair.userId, pair.devotionalDayId);
    processed += 1;
    if (results.length === 0) {
      missingDays += 1;
    } else {
      updatedBooks += results.length;
    }
  }

  console.log(
    `[Backfill] Done. Pairs: ${processed}, missingDays: ${missingDays}, updatedBooks: ${updatedBooks}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Backfill] Failed:", error);
    process.exit(1);
  });

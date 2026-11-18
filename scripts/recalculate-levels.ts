/**
 * Recalculates users.level from xpTotal using the curve in shared/progression.ts.
 * Run once after deploying the new level curve:
 *   pnpm recalculate:levels
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { levelFromXp } from "../shared/progression";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({ id: users.id, xpTotal: users.xpTotal, level: users.level })
    .from(users);
  let changed = 0;
  for (const row of rows) {
    const level = levelFromXp(row.xpTotal);
    if (level !== row.level) {
      await db.update(users).set({ level }).where(eq(users.id, row.id));
      changed += 1;
    }
  }
  console.log(
    `✅ ${changed} de ${rows.length} usuários tiveram o nível recalculado.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

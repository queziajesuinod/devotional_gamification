/**
 * Read-only check of which hand-written migrations (drizzle/0009+) are applied.
 * This project does NOT use `drizzle-kit migrate` for these: apply the pending SQL files
 * with psql as the database owner/superuser (see the commands printed at the end).
 *
 *   pnpm db:status
 */
import "dotenv/config";
import { Pool } from "pg";

type Check = { label: string; sql: string; params?: unknown[] };

const MIGRATIONS: { file: string; checks: Check[] }[] = [
  {
    file: "drizzle/0009_gamification_foundation.sql",
    checks: [
      { label: "users.streakFreezes", sql: `select 1 from information_schema.columns where table_name='users' and column_name='streakFreezes'` },
      { label: "medals.tier", sql: `select 1 from information_schema.columns where table_name='medals' and column_name='tier'` },
      ...["MEDAL", "LEVEL_UP"].map((v) => ({
        label: `point_source += ${v}`,
        sql: `select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='point_source' and e.enumlabel=$1`,
        params: [v],
      })),
    ],
  },
  {
    file: "drizzle/0010_engagement_phase2.sql",
    checks: [
      ...["user_activity_days", "weekly_quest_claims", "group_chest_claims", "encouragements", "league_memberships"].map((t) => ({
        label: `tabela ${t}`,
        sql: `select 1 from information_schema.tables where table_name=$1`,
        params: [t],
      })),
      ...["QUEST", "GROUP_CHEST"].map((v) => ({
        label: `point_source += ${v}`,
        sql: `select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='point_source' and e.enumlabel=$1`,
        params: [v],
      })),
    ],
  },
  {
    file: "drizzle/0011_character_catalog.sql",
    checks: [
      { label: "shop_items.slug", sql: `select 1 from information_schema.columns where table_name='shop_items' and column_name='slug'` },
      { label: "users.characterKey", sql: `select 1 from information_schema.columns where table_name='users' and column_name='characterKey'` },
    ],
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const pending: string[] = [];
  try {
    for (const m of MIGRATIONS) {
      const missing: string[] = [];
      for (const c of m.checks) {
        const r = await pool.query(c.sql, c.params as unknown[] | undefined);
        if (r.rowCount === 0) missing.push(c.label);
      }
      console.log(`${missing.length ? "✗" : "✓"} ${m.file}${missing.length ? `  — falta: ${missing.join(", ")}` : ""}`);
      if (missing.length) pending.push(m.file);
    }
    const owners = await pool.query(
      `select t.typname, pg_get_userbyid(t.typowner) as owner from pg_type t where t.typname in ('point_source','shop_item_type')`
    );
    console.log("\nDono dos enums:", owners.rows.map((r) => `${r.typname}=${r.owner}`).join(", "), "| usuário do app:", (await pool.query("select current_user")).rows[0].current_user);
  } finally {
    await pool.end();
  }
  if (pending.length) {
    console.log("\nAplique como superusuário (dono dos enums), nesta ordem:");
    for (const f of pending) console.log(`  psql "$DATABASE_URL_SUPERUSER" -f ${f}`);
  } else {
    console.log("\nTudo aplicado. ✅");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

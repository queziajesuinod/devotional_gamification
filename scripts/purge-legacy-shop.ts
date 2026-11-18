/**
 * One-off: remove the old NiceAvatar shop (items without slug) after backing it up.
 *
 *   npx tsx scripts/purge-legacy-shop.ts            -> backup + delete (in one transaction)
 *   npx tsx scripts/purge-legacy-shop.ts --dry-run  -> backup only, prints what would go
 *
 * Backup: backups/legacy-shop-<timestamp>.json (gitignored — contains user ids).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const EQUIP_COLUMNS = ["equippedBackgroundId", "equippedClothesId", "equippedAccessoryId", "equippedHairStyleId", "equippedHairColorId"];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const items = (await client.query(`select * from shop_items where slug is null order by id`)).rows;
    const ids = items.map((i) => i.id);
    const purchases = ids.length
      ? (await client.query(`select * from user_items where "itemId" = any($1::int[]) order by id`, [ids])).rows
      : [];
    const users = (
      await client.query(
        `select id, "avatarConfig", ${EQUIP_COLUMNS.map((c) => `"${c}"`).join(", ")} from users order by id`
      )
    ).rows;

    const dir = path.join(process.cwd(), "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `legacy-shop-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    fs.writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), items, purchases, users }, null, 2));
    console.log(`backup: ${path.relative(process.cwd(), file)} (${items.length} itens, ${purchases.length} compras, ${users.length} usuários)`);

    if (dryRun) {
      console.log("dry-run: nada foi apagado");
      return;
    }

    await client.query("begin");
    let unequipped = 0;
    for (const column of EQUIP_COLUMNS) {
      const r = await client.query(`update users set "${column}" = null where "${column}" = any($1::int[])`, [ids]);
      unequipped += r.rowCount ?? 0;
    }
    const avatars = await client.query(`update users set "avatarConfig" = null where "avatarConfig" is not null`);
    const deletedPurchases = await client.query(`delete from user_items where "itemId" = any($1::int[])`, [ids]);
    const deletedItems = await client.query(`delete from shop_items where slug is null`);
    await client.query("commit");

    console.log(
      `apagados: ${deletedItems.rowCount} itens, ${deletedPurchases.rowCount} compras; ` +
        `${unequipped} equipamentos removidos; avatarConfig limpo em ${avatars.rowCount} usuários`
    );
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("ERRO (nada foi alterado):", error.message);
  process.exit(1);
});

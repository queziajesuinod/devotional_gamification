/**
 * Applies shared/character-catalog.ts to the shop_items table.
 *
 *   pnpm catalog:sync            -> apply
 *   pnpm catalog:sync --dry-run  -> only print what would change
 *
 * - Catalog items are upserted by slug (name, price, rarity, level, image...).
 * - Legacy NiceAvatar items (no slug) are hidden from the shop (isAvailable = false);
 *   users who bought them keep them in user_items.
 * - Purchases are never deleted.
 */
import "dotenv/config";
import { isNull } from "drizzle-orm";
import { getDb } from "../server/db";
import { shopItems } from "../drizzle/schema";
import { catalogItems } from "../shared/character-catalog";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = await getDb();
  if (!db) throw new Error("Database not available (DATABASE_URL)");

  const existing = await db.select().from(shopItems);
  const bySlug = new Map(existing.filter((i) => i.slug).map((i) => [i.slug!, i]));
  const legacy = existing.filter((i) => !i.slug && i.isAvailable);

  let created = 0;
  let updated = 0;
  for (const item of catalogItems()) {
    const values = {
      slug: item.slug,
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      priceDenario: item.price,
      description: item.description,
      imageUrl: item.imageUrl,
      characterKey: item.characterKey,
      assetKey: item.assetKey,
      minLevel: item.minLevel,
      medalsRequired: item.medalsRequired,
      isAvailable: true,
    };
    const current = bySlug.get(item.slug);
    if (!current) {
      created += 1;
      console.log(`+ ${item.slug}  ${item.price} denários (${item.rarity}, nível ${item.minLevel})`);
    } else if (current.priceDenario !== item.price || current.rarity !== item.rarity || current.minLevel !== item.minLevel || current.name !== item.name || !current.isAvailable) {
      updated += 1;
      console.log(`~ ${item.slug}  ${current.priceDenario} -> ${item.price}`);
    }
    if (!dryRun) {
      await db
        .insert(shopItems)
        .values(values)
        .onConflictDoUpdate({ target: shopItems.slug, set: { ...values, slug: undefined } });
    }
  }

  console.log(`\n${created} novos, ${updated} alterados, ${legacy.length} itens antigos serão escondidos da loja`);
  if (!dryRun && legacy.length) {
    await db.update(shopItems).set({ isAvailable: false }).where(isNull(shopItems.slug));
  }
  console.log(dryRun ? "(dry-run: nada foi gravado)" : "✅ catálogo sincronizado");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

/**
 * Baús de Desafio: buy (denários) → challenges tracked from real activity → open (reward).
 * Rules: shared/chests.ts. Chest types are configured in the admin (chest_types, drizzle/0013);
 * each purchase is a row in user_chests with its drawn challenges.
 */
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { chestTypes, encouragements, pointTransactions, userActivityDays, userChests, users } from "../drizzle/schema";
import {
  MAX_ACTIVE_CHESTS,
  drawChallenges,
  type ChestChallenge,
  type ChestTypeView,
  type ChestView,
  type PoolChallenge,
} from "../shared/chests";
import { getCampoGrandeDateString } from "../shared/_core/time";
import * as db from "./db";
import { grantReward } from "./rewards";

const DAY_MS = 24 * 60 * 60 * 1000;

const parseChallenges = (raw: string): ChestChallenge[] => {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** How far the player got on each challenge since the chest was bought. */
async function measure(userId: number, since: Date, challenges: ChestChallenge[]) {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const kinds = new Set(challenges.map((c) => c.kind));
  const sinceDay = getCampoGrandeDateString(since);
  const out: Partial<Record<ChestChallenge["kind"], number>> & { byMessage?: Map<number, number> } = {};

  if (kinds.has("ENCOURAGE_PEOPLE") || kinds.has("PRAY_FOR")) {
    const [row] = await database
      .select({
        people: sql<number>`count(distinct ${encouragements.toUserId})::int`,
        prayed: sql<number>`count(distinct ${encouragements.toUserId}) filter (where ${encouragements.type} = 'PRAYED')::int`,
      })
      .from(encouragements)
      .where(and(eq(encouragements.fromUserId, userId), gte(encouragements.createdAt, since)));
    out.ENCOURAGE_PEOPLE = row?.people ?? 0;
    out.PRAY_FOR = row?.prayed ?? 0;
  }

  if (kinds.has("SEND_MESSAGE")) {
    // Different friends who received each specific message since the purchase
    const ids = [...new Set(challenges.map((c) => c.messageId).filter((v): v is number => !!v))];
    out.byMessage = new Map();
    if (ids.length) {
      const rows = await database
        .select({
          messageId: encouragements.messageId,
          people: sql<number>`count(distinct ${encouragements.toUserId})::int`,
        })
        .from(encouragements)
        .where(
          and(
            eq(encouragements.fromUserId, userId),
            gte(encouragements.createdAt, since),
            inArray(encouragements.messageId, ids),
          ),
        )
        .groupBy(encouragements.messageId);
      for (const r of rows) if (r.messageId) out.byMessage.set(r.messageId, r.people);
    }
  }

  if (kinds.has("DEVOTIONAL_DAYS") || kinds.has("REFLECTIONS")) {
    // The purchase day only counts if there was activity after buying
    const rows = await database
      .select({
        day: userActivityDays.day,
        challenges: userActivityDays.challengesCompleted,
        reflections: userActivityDays.reflections,
        updatedAt: userActivityDays.updatedAt,
      })
      .from(userActivityDays)
      .where(and(eq(userActivityDays.userId, userId), gte(userActivityDays.day, sinceDay)));
    const counted = rows.filter((r) => String(r.day) > sinceDay || new Date(r.updatedAt) >= since);
    out.DEVOTIONAL_DAYS = counted.filter((r) => r.challenges > 0).length;
    out.REFLECTIONS = counted.reduce((sum, r) => sum + r.reflections, 0);
  }

  if (kinds.has("EARN_XP")) {
    const [row] = await database
      .select({ xp: sql<number>`coalesce(sum(${pointTransactions.xp}), 0)::int` })
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          gte(pointTransactions.createdAt, since),
          sql`${pointTransactions.xp} > 0`,
          sql`coalesce(${pointTransactions.description}, '') not like 'Baú%'`,
        ),
      );
    out.EARN_XP = row?.xp ?? 0;
  }

  if (kinds.has("STREAK")) {
    const user = await db.getUserById(userId);
    out.STREAK = user?.currentStreak ?? 0;
  }
  return out;
}

async function toView(row: typeof userChests.$inferSelect): Promise<ChestView> {
  const challenges = parseChallenges(row.challenges);
  const createdAt = new Date(row.createdAt);
  const tracked = row.status === "ACTIVE" ? await measure(row.userId, createdAt, challenges) : {};
  const withProgress = challenges.map((c) => {
    const progress =
      row.status === "CLAIMED"
        ? c.target
        : c.kind === "HONOR"
          ? c.done
            ? 1
            : 0
          : c.kind === "SEND_MESSAGE"
            ? Math.min(c.target, (c.messageId && tracked.byMessage?.get(c.messageId)) || 0)
            : Math.min(c.target, (tracked[c.kind] as number | undefined) ?? 0);
    return { ...c, progress, complete: progress >= c.target };
  });
  const allDone = withProgress.every((c) => c.complete);
  let status: ChestView["status"] = row.status as ChestView["status"];
  if (row.status === "ACTIVE") {
    if (allDone) status = "READY";
    else if (Date.now() > new Date(row.expiresAt).getTime()) status = "EXPIRED";
  }
  return {
    id: row.id,
    chestTypeId: row.chestTypeId ?? null,
    name: row.name ?? "Baú",
    color: row.color ?? "#E0A800",
    status,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(row.expiresAt).toISOString(),
    claimedAt: row.claimedAt ? new Date(row.claimedAt).toISOString() : null,
    reward: { xp: row.rewardXp, denario: row.rewardDenario },
    challenges: withProgress,
  };
}

/** The player's chests: in progress first, then the last opened/expired ones. */
export async function listChests(userId: number): Promise<ChestView[]> {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select()
    .from(userChests)
    .where(eq(userChests.userId, userId))
    .orderBy(desc(userChests.createdAt))
    .limit(30);
  const views = await Promise.all(rows.map(toView));
  // Persist expirations so they stop counting as "in progress"
  const expired = views.filter((v) => v.status === "EXPIRED").map((v) => v.id);
  const stale = rows.filter((r) => r.status === "ACTIVE" && expired.includes(r.id)).map((r) => r.id);
  if (stale.length) await database.update(userChests).set({ status: "EXPIRED" }).where(inArray(userChests.id, stale));
  const order = { READY: 0, ACTIVE: 1, CLAIMED: 2, EXPIRED: 3 } as const;
  return views.sort((a, b) => order[a.status] - order[b.status]);
}

export const parsePool = (raw: string): PoolChallenge[] => {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((p) => p && typeof p.kind === "string") : [];
  } catch {
    return [];
  }
};

const toTypeView = (t: typeof chestTypes.$inferSelect): ChestTypeView => ({
  id: t.id,
  name: t.name,
  description: t.description,
  color: t.color,
  price: t.price,
  days: t.days,
  challengeCount: t.challengeCount,
  reward: { xp: t.rewardXp, denario: t.rewardDenario },
});

/** Chests for sale in the Mercado (active types, admin order). */
export async function listChestCatalog(): Promise<ChestTypeView[]> {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const rows = await database
    .select()
    .from(chestTypes)
    .where(eq(chestTypes.isActive, true))
    .orderBy(asc(chestTypes.sortOrder), asc(chestTypes.price));
  return rows.map(toTypeView);
}

export async function buyChest(userId: number, chestTypeId: number) {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const [type] = await database.select().from(chestTypes).where(eq(chestTypes.id, chestTypeId)).limit(1);
  if (!type || !type.isActive) throw new Error("Esse baú não está à venda");
  const pool = parsePool(type.challenges);
  const challenges = drawChallenges(pool, type.challengeCount);
  if (challenges.length === 0) throw new Error("Esse baú ainda não tem desafios configurados");

  const active = (await listChests(userId)).filter((c) => c.status === "ACTIVE" || c.status === "READY");
  if (active.some((c) => c.chestTypeId === type.id)) throw new Error(`Você já tem um ${type.name} em andamento. Termine ele primeiro!`);
  if (active.length >= MAX_ACTIVE_CHESTS) throw new Error(`Dá para ter até ${MAX_ACTIVE_CHESTS} baús ao mesmo tempo`);

  const [paid] = await database
    .update(users)
    .set({ denarioBalance: sql`${users.denarioBalance} - ${type.price}` })
    .where(and(eq(users.id, userId), gte(users.denarioBalance, type.price)))
    .returning({ denarioBalance: users.denarioBalance });
  if (!paid) throw new Error("Faltam denários! Complete desafios para ganhar mais.");

  const now = new Date();
  const [row] = await database
    .insert(userChests)
    .values({
      userId,
      tier: "custom",
      chestTypeId: type.id,
      name: type.name,
      color: type.color,
      challenges: JSON.stringify(challenges),
      pricePaid: type.price,
      rewardXp: type.rewardXp,
      rewardDenario: type.rewardDenario,
      createdAt: now,
      expiresAt: new Date(now.getTime() + Math.max(1, type.days) * DAY_MS),
    })
    .returning();
  await db.createPointTransaction({ userId, source: "PURCHASE", xp: 0, denario: -type.price, description: `Comprou ${type.name}` });
  return { chest: await toView(row), denarioBalance: paid.denarioBalance };
}

async function ownChest(userId: number, chestId: number) {
  const database = await db.getDb();
  if (!database) throw new Error("Database not available");
  const [row] = await database
    .select()
    .from(userChests)
    .where(and(eq(userChests.id, chestId), eq(userChests.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Baú não encontrado");
  return { database, row };
}

/** The player says they did an honor challenge ("fiz!"). */
export async function markHonorDone(userId: number, chestId: number, challengeId: string) {
  const { database, row } = await ownChest(userId, chestId);
  if (row.status !== "ACTIVE" || Date.now() > new Date(row.expiresAt).getTime()) throw new Error("Esse baú não está mais aberto");
  const list = parseChallenges(row.challenges);
  const target = list.find((c) => c.id === challengeId && c.kind === "HONOR");
  if (!target) throw new Error("Desafio não encontrado");
  target.done = true;
  await database.update(userChests).set({ challenges: JSON.stringify(list) }).where(eq(userChests.id, row.id));
  return toView({ ...row, challenges: JSON.stringify(list) });
}

/** Open a finished chest: pays XP + denários (once). */
export async function claimChest(userId: number, chestId: number) {
  const { database, row } = await ownChest(userId, chestId);
  const view = await toView(row);
  if (view.status === "CLAIMED") throw new Error("Esse baú já foi aberto");
  if (view.status !== "READY") throw new Error("Complete todos os desafios para abrir o baú");
  // Mark first (guards against double taps), then pay
  const [locked] = await database
    .update(userChests)
    .set({ status: "CLAIMED", claimedAt: new Date() })
    .where(and(eq(userChests.id, row.id), eq(userChests.status, "ACTIVE")))
    .returning({ id: userChests.id });
  if (!locked) throw new Error("Esse baú já foi aberto");
  const name = row.name ?? "Baú";
  const result = await grantReward(userId, { xp: row.rewardXp, denario: row.rewardDenario }, "CHALLENGE", `Baú aberto: ${name}`);
  return { name, ...result };
}

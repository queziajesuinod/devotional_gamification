import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { resolveFigurine, type Figurine } from "../shared/character-catalog";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  challenges,
  devotionalDays,
  devotionalPlans,
  groups,
  groupMembers,
  medals,
  userMedals,
  bibleReadingProgress,
  bibleReadingSegments,
  InsertChallenge,
  InsertDevotionalDay,
  InsertDevotionalPlan,
  InsertGroup,
  InsertGroupMember,
  InsertPointTransaction,
  InsertRankingPeriod,
  InsertShopItem,
  InsertUser,
  InsertUserChallenge,
  InsertUserItem,
  InsertUserRankingScore,
  InsertUserMedal,
  InsertBibleReadingProgress,
  pointTransactions,
  rankingPeriods,
  shopItems,
  userChallenges,
  userItems,
  userRankingScores,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getCampoGrandeDateString } from "../shared/_core/time";
import {
  STREAK_MILESTONES,
  diffDateStrings,
  levelFromXp,
} from "../shared/progression";
import {
  DEFAULT_CHARACTER,
  DEFAULT_LOOK,
  accessorySlug,
  hairSlug,
  isCharacterKey,
  lookSlug,
  needsOriginalLook,
  wardrobeFor,
} from "../shared/character-catalog";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      nickname:
        user.nickname || user.name || user.email?.split("@")[0] || "Usuário",
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    // Handle nickname separately since it's required
    if (user.nickname) {
      values.nickname = user.nickname;
      updateSet.nickname = user.nickname;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: {
  email: string;
  passwordHash: string;
  nickname: string;
  name?: string | null;
  loginMethod?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId for custom auth users
  const openId = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const insertData: InsertUser = {
    openId,
    email: user.email,
    passwordHash: user.passwordHash,
    nickname: user.nickname,
    name: user.name || user.nickname,
    loginMethod: user.loginMethod || "email",
    lastSignedIn: new Date(),
  };

  await db.insert(users).values(insertData);

  // Fetch the created user
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  if (result.length === 0) {
    throw new Error("Failed to create user");
  }

  return result[0];
}

export async function updateUserXpAndDenario(
  userId: number,
  xpDelta: number,
  denarioDelta: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [updated] = await db
    .update(users)
    .set({
      xpTotal: sql`${users.xpTotal} + ${xpDelta}`,
      denarioBalance: sql`${users.denarioBalance} + ${denarioDelta}`,
    })
    .where(eq(users.id, userId))
    .returning({ xpTotal: users.xpTotal, level: users.level });

  if (!updated) return null;

  // Level follows the curve in shared/progression.ts
  const newLevel = levelFromXp(updated.xpTotal);
  if (newLevel !== updated.level) {
    await db.update(users).set({ level: newLevel }).where(eq(users.id, userId));
  }

  return {
    xpTotal: updated.xpTotal,
    levelBefore: updated.level,
    levelAfter: newLevel,
  };
}

export async function updateUserAvatar(
  userId: number,
  avatarConfig: string,
  equippedBackgroundId?: number | null,
  equippedClothesId?: number | null,
  equippedAccessoryId?: number | null,
  equippedHairStyleId?: number | null,
  equippedHairColorId?: number | null,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { avatarConfig };
  if (equippedBackgroundId !== undefined)
    updateData.equippedBackgroundId = equippedBackgroundId;
  if (equippedClothesId !== undefined)
    updateData.equippedClothesId = equippedClothesId;
  if (equippedAccessoryId !== undefined)
    updateData.equippedAccessoryId = equippedAccessoryId;
  if (equippedHairStyleId !== undefined)
    updateData.equippedHairStyleId = equippedHairStyleId;
  if (equippedHairColorId !== undefined)
    updateData.equippedHairColorId = equippedHairColorId;

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

// ============================================
// DEVOTIONAL PLAN
// ============================================

export async function getActiveDevotionalPlan() {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(devotionalPlans)
    .where(eq(devotionalPlans.isActive, true))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getDevotionalDayByDate(date: Date | string) {
  const db = await getDb();
  if (!db) return undefined;

  const dateStr =
    typeof date === "string" ? date : date.toISOString().split("T")[0];
  const result = await db
    .select()
    .from(devotionalDays)
    .where(eq(devotionalDays.date, dateStr as any))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getDevotionalDayById(devotionalDayId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(devotionalDays)
    .where(eq(devotionalDays.id, devotionalDayId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getChallengesByDevotionalDayId(devotionalDayId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(challenges)
    .where(eq(challenges.devotionalDayId, devotionalDayId));
}

// ============================================
// CHALLENGES
// ============================================

export async function getUserChallengeStatus(
  userId: number,
  challengeId: number,
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userChallenges)
    .where(
      and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId),
      ),
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUserChallenge(data: InsertUserChallenge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(userChallenges).values(data);
}

export async function completeUserChallenge(
  userId: number,
  challengeId: number,
  xpEarned: number,
  denariosEarned: number,
  responseText?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userChallenges)
    .set({
      xpEarned,
      denarioEarned: denariosEarned,
      responseText: responseText || null,
      completedAt: new Date(),
    })
    .where(
      and(
        eq(userChallenges.userId, userId),
        eq(userChallenges.challengeId, challengeId),
      ),
    );

  // Update user's streak
  const streak = await updateUserStreak(userId);

  // Add points to user's group
  await addPointsToUserGroup(userId, xpEarned);

  return { streak };
}

export async function getChallengeById(challengeId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserReflections(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: userChallenges.id,
      responseText: userChallenges.responseText,
      completedAt: userChallenges.completedAt,
      challengeTitle: challenges.title,
      challengeDescription: challenges.description,
      devotionalDate: devotionalDays.date,
      bibleReference: devotionalDays.bibleReference,
    })
    .from(userChallenges)
    .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
    .innerJoin(
      devotionalDays,
      eq(challenges.devotionalDayId, devotionalDays.id),
    )
    .where(
      and(
        eq(userChallenges.userId, userId),
        eq(challenges.type, "REFLECTION"),
        sql`${userChallenges.responseText} IS NOT NULL`,
      ),
    )
    .orderBy(desc(userChallenges.completedAt));

  return result;
}

export type StreakUpdateResult = {
  currentStreak: number;
  longestStreak: number;
  increased: boolean;
  wasReset: boolean;
  milestoneReached: number | null;
  bonusDenarios: number;
};

/**
 * Updates the streak using the app's day (America/Campo_Grande), not the server clock.
 * A missed day resets the streak (the old "Graças"/streak freezes were removed from the game).
 */
export async function updateUserStreak(
  userId: number,
): Promise<StreakUpdateResult | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserById(userId);
  if (!user) return;

  const today = getCampoGrandeDateString();
  const lastActivity = user.lastActivityDate
    ? String(user.lastActivityDate).slice(0, 10)
    : null;
  const daysDiff = lastActivity ? diffDateStrings(lastActivity, today) : null;

  if (daysDiff !== null && daysDiff <= 0) {
    // Already counted today
    return {
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      increased: false,
      wasReset: false,
      milestoneReached: null,
      bonusDenarios: 0,
    };
  }

  let newStreak = 1;
  let wasReset = false;
  if (daysDiff === 1) {
    newStreak = (user.currentStreak || 0) + 1;
  } else if (daysDiff !== null && daysDiff > 1) {
    wasReset = user.currentStreak > 0;
  }

  const newLongestStreak = Math.max(newStreak, user.longestStreak || 0);
  const milestone = STREAK_MILESTONES.find((m) => m.days === newStreak) ?? null;
  const bonusDenarios = milestone?.denarios ?? 0;

  await db
    .update(users)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: today,
      ...(bonusDenarios > 0
        ? { denarioBalance: sql`${users.denarioBalance} + ${bonusDenarios}` }
        : {}),
    })
    .where(eq(users.id, userId));

  if (bonusDenarios > 0) {
    await createPointTransaction({
      userId,
      source: "BONUS_STREAK",
      xp: 0,
      denario: bonusDenarios,
      description: `Marco de sequência: ${newStreak} dias`,
    });
  }

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    increased: true,
    wasReset,
    milestoneReached: milestone?.days ?? null,
    bonusDenarios,
  };
}

// ============================================
// POINT TRANSACTIONS
// ============================================

export async function createPointTransaction(data: InsertPointTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(pointTransactions).values(data);
  } catch (error) {
    // The remote database may not have every point_source value yet (MEDAL, LEVEL_UP, QUEST,
    // GROUP_CHEST need the enum owner to add them — see pnpm db:status). Never let the
    // history log break a reward that was already paid: record it under CHALLENGE instead.
    const message = String((error as { message?: string; cause?: { message?: string } })?.cause?.message ?? (error as Error)?.message ?? "");
    if (data.source !== "CHALLENGE" && /invalid input value for enum|point_source/i.test(message)) {
      await db.insert(pointTransactions).values({
        ...data,
        source: "CHALLENGE",
        description: `[${data.source}] ${data.description ?? ""}`.trim(),
      });
      return;
    }
    throw error;
  }
}

// ============================================
// SHOP & ITEMS
// ============================================

export async function getAllShopItems() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(shopItems).where(eq(shopItems.isAvailable, true));
}

export async function getShopItemById(itemId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(shopItems)
    .where(eq(shopItems.id, itemId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserItems(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: userItems.id,
      itemId: userItems.itemId,
      purchasedAt: userItems.purchasedAt,
      item: shopItems,
    })
    .from(userItems)
    .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
    .where(eq(userItems.userId, userId));
}

export async function userOwnsItem(userId: number, itemId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(userItems)
    .where(and(eq(userItems.userId, userId), eq(userItems.itemId, itemId)))
    .limit(1);

  return result.length > 0;
}

export async function purchaseItem(
  userId: number,
  itemId: number,
  price: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deduct denarios atomically (never below zero, even with double taps)
  const [debited] = await db
    .update(users)
    .set({
      denarioBalance: sql`${users.denarioBalance} - ${price}`,
    })
    .where(and(eq(users.id, userId), gte(users.denarioBalance, price)))
    .returning({ id: users.id });
  if (!debited) {
    throw new Error("Insufficient denarios");
  }

  // Add item to user's inventory
  await db.insert(userItems).values({
    userId,
    itemId,
  });

  // Record transaction
  await createPointTransaction({
    userId,
    source: "PURCHASE",
    xp: 0,
    denario: -price,
    description: `Compra de item #${itemId}`,
  });
}

export async function grantFreeItemsToUser(userId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all free items (price = 0)
    const freeItems = await db
      .select()
      .from(shopItems)
      .where(
        and(eq(shopItems.priceDenario, 0), eq(shopItems.isAvailable, true)),
      );

    // Grant each free item to the user
    for (const item of freeItems) {
      // Check if user already has this item
      const hasItem = await userOwnsItem(userId, item.id);
      if (!hasItem) {
        await db.insert(userItems).values({
          userId,
          itemId: item.id,
        });
      }
    }

    console.log(`✅ Granted ${freeItems.length} free items to user ${userId}`);
  } catch (error) {
    console.error("Error granting free items:", error);
  }
}

export async function equipItem(userId: number, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get item details
  const item = await getShopItemById(itemId);
  if (!item) {
    throw new Error("Item not found");
  }

  // Free catalog items are owned by everyone
  const owns = (item.slug && item.priceDenario === 0) || (await userOwnsItem(userId, itemId));
  if (!owns) {
    throw new Error("User does not own this item");
  }

  // Looks and hair colors belong to one character
  if (item.characterKey) {
    const user = await getUserById(userId);
    if ((user?.characterKey ?? DEFAULT_CHARACTER) !== item.characterKey) {
      throw new Error("Este item é de outro personagem");
    }
  }

  // Update user's equipped item based on type
  const updateData: any = {};
  if (item.type === "BACKGROUND") {
    updateData.equippedBackgroundId = itemId;
  } else if (item.type === "CLOTHES") {
    updateData.equippedClothesId = itemId;
  } else if (item.type === "ACCESSORY") {
    updateData.equippedAccessoryId = itemId;
  } else if (item.type === "HAIR_STYLE") {
    updateData.equippedHairStyleId = itemId;
  } else if (item.type === "HAIR_COLOR") {
    updateData.equippedHairColorId = itemId;
  }

  // Pose accessories (harp, cap…) only exist on the Original look with the character's own hair
  if (item.type === "ACCESSORY" && needsOriginalLook(item.assetKey)) {
    updateData.equippedClothesId = null;
  } else if (item.type === "CLOTHES" && item.assetKey !== DEFAULT_LOOK) {
    const user = await getUserById(userId);
    const worn = user?.equippedAccessoryId ? await getShopItemById(user.equippedAccessoryId) : null;
    if (needsOriginalLook(worn?.assetKey)) updateData.equippedAccessoryId = null;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

/**
 * Guarda-roupa: put on a whole look (outfit + hair color + pose accessory) unlocked by level.
 * Nothing is bought — the look just has to be unlocked (shared/character-catalog wardrobeFor).
 */
export async function equipWardrobeLook(userId: number, lookId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await getUserById(userId);
  if (!user) throw new Error("Usuário não encontrado");
  const character = isCharacterKey(user.characterKey) ? user.characterKey : DEFAULT_CHARACTER;
  const look = wardrobeFor(character).find((w) => w.id === lookId);
  if (!look) throw new Error("Look não encontrado");
  const level = levelFromXp(user.xpTotal);
  if (level < look.minLevel) throw new Error(`Esse look libera no nível ${look.minLevel}`);

  const slugs = {
    clothes: look.look === DEFAULT_LOOK ? null : lookSlug(character, look.look),
    hair: look.hair ? hairSlug(character, look.hair) : null,
    accessory: look.accessory ? accessorySlug(look.accessory) : null,
  };
  const wanted = Object.values(slugs).filter((v): v is string => !!v);
  const rows = wanted.length
    ? await db.select({ id: shopItems.id, slug: shopItems.slug }).from(shopItems).where(inArray(shopItems.slug, wanted))
    : [];
  const idOf = (slug: string | null) => {
    if (!slug) return null;
    const row = rows.find((r) => r.slug === slug);
    if (!row) throw new Error("Catálogo desatualizado: peça para a liderança sincronizar (pnpm catalog:sync)");
    return row.id;
  };
  await db
    .update(users)
    .set({
      equippedClothesId: idOf(slugs.clothes),
      equippedHairColorId: idOf(slugs.hair),
      equippedAccessoryId: idOf(slugs.accessory),
    })
    .where(eq(users.id, userId));
  return { look };
}

export async function unequipItem(
  userId: number,
  itemType:
    | "BACKGROUND"
    | "CLOTHES"
    | "ACCESSORY"
    | "HAIR_STYLE"
    | "HAIR_COLOR"
    | "BASE_FEATURE",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update user's equipped item to null based on type
  const updateData: any = {};
  if (itemType === "BACKGROUND") {
    updateData.equippedBackgroundId = null;
  } else if (itemType === "CLOTHES") {
    updateData.equippedClothesId = null;
  } else if (itemType === "ACCESSORY") {
    updateData.equippedAccessoryId = null;
  } else if (itemType === "HAIR_STYLE") {
    updateData.equippedHairStyleId = null;
  } else if (itemType === "HAIR_COLOR") {
    updateData.equippedHairColorId = null;
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

/** Pick the figurine character; looks/hair of the previous character are unequipped. */
export async function setUserCharacter(userId: number, characterKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ characterKey, equippedClothesId: null, equippedHairColorId: null })
    .where(eq(users.id, userId));
}

/**
 * Figurines for many users at once (ranking faces): two queries, no per-user lookups.
 * Users missing from the result fall back to the default character on the client.
 */
export async function getFigurinesForUsers(userIds: number[]): Promise<Map<number, Figurine>> {
  const out = new Map<number, Figurine>();
  const ids = [...new Set(userIds)];
  const db = await getDb();
  if (!db || ids.length === 0) return out;

  const rows = await db
    .select({
      id: users.id,
      characterKey: users.characterKey,
      clothesId: users.equippedClothesId,
      hairColorId: users.equippedHairColorId,
      accessoryId: users.equippedAccessoryId,
    })
    .from(users)
    .where(inArray(users.id, ids));

  const itemIds = [
    ...new Set(
      rows.flatMap((r) => [r.clothesId, r.hairColorId, r.accessoryId]).filter((v): v is number => typeof v === "number"),
    ),
  ];
  const items = itemIds.length
    ? await db
        .select({ id: shopItems.id, slug: shopItems.slug, assetKey: shopItems.assetKey, characterKey: shopItems.characterKey })
        .from(shopItems)
        .where(inArray(shopItems.id, itemIds))
    : [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const pick = (id: number | null) => (id ? byId.get(id) ?? null : null);

  for (const r of rows) {
    out.set(
      r.id,
      resolveFigurine(r.characterKey, {
        clothes: pick(r.clothesId),
        hairColor: pick(r.hairColorId),
        accessory: pick(r.accessoryId),
      }),
    );
  }
  return out;
}

export async function getEquippedItems(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const user = await getUserById(userId);
  if (!user) return null;

  const equipped: any = {
    background: null,
    clothes: null,
    accessory: null,
    hairStyle: null,
    hairColor: null,
  };

  if (user.equippedBackgroundId) {
    equipped.background = await getShopItemById(user.equippedBackgroundId);
  }
  if (user.equippedClothesId) {
    equipped.clothes = await getShopItemById(user.equippedClothesId);
  }
  if (user.equippedAccessoryId) {
    equipped.accessory = await getShopItemById(user.equippedAccessoryId);
  }
  if (user.equippedHairStyleId) {
    equipped.hairStyle = await getShopItemById(user.equippedHairStyleId);
  }
  if (user.equippedHairColorId) {
    equipped.hairColor = await getShopItemById(user.equippedHairColorId);
  }

  return equipped;
}

// ============================================
// RANKING / LEADERBOARD
// ============================================

export async function getActiveRankingPeriod(periodType: "MONTH" | "YEAR") {
  const db = await getDb();
  if (!db) return undefined;

  const today = new Date().toISOString().split("T")[0];
  const result = await db
    .select()
    .from(rankingPeriods)
    .where(
      and(
        eq(rankingPeriods.periodType, periodType),
        eq(rankingPeriods.isActive, true),
        lte(rankingPeriods.startDate, today as any),
        gte(rankingPeriods.endDate, today as any),
      ),
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRankingScore(
  rankingPeriodId: number,
  userId: number,
  xpDelta: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to update existing score
  const existing = await db
    .select()
    .from(userRankingScores)
    .where(
      and(
        eq(userRankingScores.rankingPeriodId, rankingPeriodId),
        eq(userRankingScores.userId, userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userRankingScores)
      .set({
        xpTotal: sql`${userRankingScores.xpTotal} + ${xpDelta}`,
      })
      .where(
        and(
          eq(userRankingScores.rankingPeriodId, rankingPeriodId),
          eq(userRankingScores.userId, userId),
        ),
      );
  } else {
    await db.insert(userRankingScores).values({
      rankingPeriodId,
      userId,
      xpTotal: xpDelta,
    });
  }
}

export async function getLeaderboard(
  rankingPeriodId: number,
  limit: number = 100,
) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      userId: userRankingScores.userId,
      xpTotal: userRankingScores.xpTotal,
      nickname: users.nickname,
      level: users.level,
    })
    .from(userRankingScores)
    .innerJoin(users, eq(userRankingScores.userId, users.id))
    .where(eq(userRankingScores.rankingPeriodId, rankingPeriodId))
    .orderBy(desc(userRankingScores.xpTotal))
    .limit(limit);
}

export async function getUserRankingPosition(
  rankingPeriodId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return undefined;

  const userScore = await db
    .select()
    .from(userRankingScores)
    .where(
      and(
        eq(userRankingScores.rankingPeriodId, rankingPeriodId),
        eq(userRankingScores.userId, userId),
      ),
    )
    .limit(1);

  if (userScore.length === 0) return undefined;

  const higherScores = await db
    .select({ count: sql<number>`count(*)` })
    .from(userRankingScores)
    .where(
      and(
        eq(userRankingScores.rankingPeriodId, rankingPeriodId),
        sql`${userRankingScores.xpTotal} > ${userScore[0].xpTotal}`,
      ),
    );

  return {
    position: (higherScores[0]?.count ?? 0) + 1,
    xpTotal: userScore[0].xpTotal,
  };
}

// ============================================
// GROUPS / CELLS
// ============================================

export async function getAllGroups() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(groups).orderBy(desc(groups.totalPoints));
}

export async function getGroupById(groupId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return result[0];
}

export async function getGroupByLeaderId(leaderId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(groups)
    .where(eq(groups.leaderId, leaderId))
    .limit(1);
  return result[0];
}

export async function createGroup(data: InsertGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(groups).values(data);
}

/** Every join request of a user (pending / approved / rejected), one row per cell. */
export async function getUserGroupRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ groupId: groupMembers.groupId, status: groupMembers.status })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));
}

export async function requestJoinGroup(userId: number, groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already has a request or is a member
  const existing = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)),
    )
    .limit(1);

  if (existing.length > 0) {
    // A rejected request can be sent again: reopen the same row as a fresh request
    if (existing[0].status === "rejected") {
      await db
        .update(groupMembers)
        .set({ status: "pending", requestedAt: new Date(), approvedAt: null, approvedBy: null })
        .where(eq(groupMembers.id, existing[0].id));
      return;
    }
    throw new Error(
      existing[0].status === "approved"
        ? "Você já faz parte desta célula"
        : "Você já solicitou entrada nesta célula",
    );
  }

  await db.insert(groupMembers).values({
    userId,
    groupId,
    status: "pending",
  });
}

export async function approveGroupMember(
  requestId: number,
  approverId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const request = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.id, requestId))
    .limit(1);

  if (request.length === 0) {
    throw new Error("Solicitação não encontrada");
  }

  const groupId = request[0].groupId;

  await db
    .update(groupMembers)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy: approverId,
    })
    .where(eq(groupMembers.id, requestId));

  // Increment group member count
  await db
    .update(groups)
    .set({
      memberCount: sql`${groups.memberCount} + 1`,
    })
    .where(eq(groups.id, groupId));
}

export async function rejectGroupMember(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(groupMembers)
    .set({
      status: "rejected",
    })
    .where(eq(groupMembers.id, requestId));
}

export async function getGroupMembers(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      status: groupMembers.status,
      requestedAt: groupMembers.requestedAt,
      approvedAt: groupMembers.approvedAt,
      userName: users.name,
      userNickname: users.nickname,
      userLevel: users.level,
      userXp: users.xpTotal,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(desc(groupMembers.requestedAt));
}

export async function getPendingGroupRequests(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      requestedAt: groupMembers.requestedAt,
      userName: users.name,
      userNickname: users.nickname,
      userLevel: users.level,
      userEmail: users.email,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "pending"),
      ),
    )
    .orderBy(desc(groupMembers.requestedAt));
}

export async function getGroupMemberRequestById(requestId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select({
      id: groupMembers.id,
      groupId: groupMembers.groupId,
      userId: groupMembers.userId,
      status: groupMembers.status,
      leaderId: groups.leaderId,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.id, requestId))
    .limit(1);

  return result[0];
}

export async function getGroupMembersForLeader(groupId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      status: groupMembers.status,
      userName: users.name,
      userNickname: users.nickname,
      userLevel: users.level,
      userXp: users.xpTotal,
      currentStreak: users.currentStreak,
      longestStreak: users.longestStreak,
      lastActivityDate: users.lastActivityDate,
      lastSignedIn: users.lastSignedIn,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "approved"),
      ),
    )
    .orderBy(desc(users.xpTotal));
}

export async function getUserGroup(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const membership = await db
    .select({
      groupId: groupMembers.groupId,
      status: groupMembers.status,
      groupName: groups.name,
      groupDescription: groups.description,
      memberCount: groups.memberCount,
      totalPoints: groups.totalPoints,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(
      and(eq(groupMembers.userId, userId), eq(groupMembers.status, "approved")),
    )
    .limit(1);

  return membership[0];
}

export async function addPointsToUserGroup(userId: number, points: number) {
  const db = await getDb();
  if (!db) return;

  const userGroup = await getUserGroup(userId);
  if (!userGroup) return;

  await db
    .update(groups)
    .set({
      totalPoints: sql`${groups.totalPoints} + ${points}`,
    })
    .where(eq(groups.id, userGroup.groupId));
}

export async function getGroupRanking(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: groups.id,
      name: groups.name,
      memberCount: groups.memberCount,
      totalPoints: groups.totalPoints,
      leaderName: users.name,
    })
    .from(groups)
    .innerJoin(users, eq(groups.leaderId, users.id))
    .orderBy(desc(groups.totalPoints))
    .limit(limit);
}

// ============================================
// SEED DATA HELPERS
// ============================================

export async function seedDevotionalPlan(data: InsertDevotionalPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(devotionalPlans).values(data);
}

export async function seedDevotionalDay(data: InsertDevotionalDay) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(devotionalDays).values(data);
}

export async function seedChallenge(data: InsertChallenge) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(challenges).values(data);
}

export async function seedShopItem(data: InsertShopItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(shopItems).values(data);
}

export async function seedRankingPeriod(data: InsertRankingPeriod) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(rankingPeriods).values(data);
}

// ============================================
// MEDALS / BADGES
// ============================================

export async function getAllMedals() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(medals)
    .where(eq(medals.isActive, true))
    .orderBy(medals.category, medals.order);
}

export async function getUserMedals(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      medalId: userMedals.medalId,
      earnedAt: userMedals.earnedAt,
      progress: userMedals.progress,
      name: medals.name,
      description: medals.description,
      category: medals.category,
      iconEmoji: medals.iconEmoji,
      iconUrl: medals.iconUrl,
      iconUrlGray: medals.iconUrlGray,
    })
    .from(userMedals)
    .innerJoin(medals, eq(userMedals.medalId, medals.id))
    .where(eq(userMedals.userId, userId))
    .orderBy(desc(userMedals.earnedAt));
}

export async function getUserMedalCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userMedals)
    .where(eq(userMedals.userId, userId));

  return Number(result[0]?.count ?? 0);
}

export async function getUserMedalsWithProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all medals
  const allMedals = await getAllMedals();

  // Get user's earned medals
  const earnedMedals = await db
    .select()
    .from(userMedals)
    .where(eq(userMedals.userId, userId));

  // Map to include earned status
  return allMedals.map((medal) => {
    const userMedal = earnedMedals.find((um) => um.medalId === medal.id);
    return {
      ...medal,
      isEarned: !!userMedal,
      earnedAt: userMedal?.earnedAt || null,
      progress: userMedal?.progress || 0,
    };
  });
}

export async function awardMedal(
  userId: number,
  medalId: number,
  progress: number = 100,
) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if user already has this medal
    const existing = await db
      .select()
      .from(userMedals)
      .where(
        and(eq(userMedals.userId, userId), eq(userMedals.medalId, medalId)),
      )
      .limit(1);

    if (existing.length > 0) {
      return { ...existing[0], isNew: false as const, medal: null };
    }

    // Award the medal (unique index guards against concurrent double awards)
    const inserted = await db
      .insert(userMedals)
      .values({
        userId,
        medalId,
        progress,
        earnedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: userMedals.id });

    if (inserted.length === 0) {
      return { userId, medalId, progress, isNew: false as const, medal: null };
    }

    // Grant the medal's rewards
    const [medal] = await db
      .select()
      .from(medals)
      .where(eq(medals.id, medalId))
      .limit(1);
    if (medal && (medal.xpReward > 0 || medal.denarioReward > 0)) {
      await updateUserXpAndDenario(userId, medal.xpReward, medal.denarioReward);
      await createPointTransaction({
        userId,
        source: "MEDAL",
        xp: medal.xpReward,
        denario: medal.denarioReward,
        description: `Medalha conquistada: ${medal.name}`,
      });
    }

    return {
      userId,
      medalId,
      progress,
      isNew: true as const,
      medal: medal ?? null,
    };
  } catch (error) {
    console.error("Error awarding medal:", error);
    return null;
  }
}

export async function updateMedalProgress(
  userId: number,
  medalId: number,
  progress: number,
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(userMedals)
    .set({ progress })
    .where(and(eq(userMedals.userId, userId), eq(userMedals.medalId, medalId)));
}

// ============================================
// BIBLE READING PROGRESS
// ============================================

type ParsedBibleReference = {
  bookName: string;
  chapters: number[];
};

const normalizeBookName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

const parseChapterToken = (value: string): number[] => {
  const token = value.trim();
  if (!token) return [];

  const chapterText = token.split(":")[0]?.trim();
  if (!chapterText) return [];

  const rangeMatch = chapterText.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1], 10);
    const end = Number.parseInt(rangeMatch[2], 10);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
    const chapters: number[] = [];
    for (let chapter = start; chapter <= end; chapter += 1) {
      chapters.push(chapter);
    }
    return chapters;
  }

  const single = Number.parseInt(chapterText, 10);
  return Number.isNaN(single) ? [] : [single];
};

const parseBibleReference = (reference: string): ParsedBibleReference[] => {
  if (!reference) return [];

  const parts = reference.split(/[;,]/);
  const bookMap = new Map<string, Set<number>>();

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;

    const match = part.match(/^(.+?)\s+(\d.+)$/);
    if (!match) continue;

    const bookName = normalizeBookName(match[1]);
    const chapterPart = match[2];
    const chapterTokens = chapterPart.split(",");

    for (const token of chapterTokens) {
      const chapters = parseChapterToken(token);
      if (chapters.length === 0) continue;

      const existing = bookMap.get(bookName) ?? new Set<number>();
      for (const chapter of chapters) {
        existing.add(chapter);
      }
      bookMap.set(bookName, existing);
    }
  }

  return Array.from(bookMap.entries()).map(([bookName, chapters]) => ({
    bookName,
    chapters: Array.from(chapters).sort((a, b) => a - b),
  }));
};

export async function getBibleReadingProgress(
  userId: number,
  bookName: string,
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(bibleReadingProgress)
    .where(
      and(
        eq(bibleReadingProgress.userId, userId),
        eq(bibleReadingProgress.bookName, bookName),
      ),
    )
    .limit(1);

  return result[0] || null;
}

export async function updateBibleReadingProgress(
  userId: number,
  bookName: string,
  chaptersRead: number,
  totalChapters: number,
) {
  const db = await getDb();
  if (!db) return null;

  const isCompleted = chaptersRead >= totalChapters;

  try {
    // Check if progress exists
    const existing = await getBibleReadingProgress(userId, bookName);

    if (existing) {
      // Update existing progress
      await db
        .update(bibleReadingProgress)
        .set({
          chaptersRead,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          lastReadAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bibleReadingProgress.userId, userId),
            eq(bibleReadingProgress.bookName, bookName),
          ),
        );
    } else {
      // Insert new progress
      await db.insert(bibleReadingProgress).values({
        userId,
        bookName,
        chaptersRead,
        totalChapters,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        lastReadAt: new Date(),
      });
    }

    return { userId, bookName, chaptersRead, totalChapters, isCompleted };
  } catch (error) {
    console.error("Error updating Bible reading progress:", error);
    return null;
  }
}

export async function recalculateBibleProgressForBook(
  userId: number,
  planId: number,
  bookName: string,
) {
  const db = await getDb();
  if (!db) return null;

  const normalizedBook = normalizeBookName(bookName);
  const days = await db
    .select({
      id: devotionalDays.id,
      bibleReference: devotionalDays.bibleReference,
    })
    .from(devotionalDays)
    .where(eq(devotionalDays.planId, planId));

  const requiredSegments = new Map<number, number>();
  for (const day of days) {
    const entries = parseBibleReference(day.bibleReference);
    for (const entry of entries) {
      if (entry.bookName !== normalizedBook) continue;
      for (const chapter of entry.chapters) {
        requiredSegments.set(chapter, (requiredSegments.get(chapter) ?? 0) + 1);
      }
    }
  }

  if (requiredSegments.size === 0) {
    return null;
  }

  const completedRows = await db
    .select({
      chapter: bibleReadingSegments.chapter,
      count: sql<number>`count(*)`,
    })
    .from(bibleReadingSegments)
    .where(
      and(
        eq(bibleReadingSegments.userId, userId),
        eq(bibleReadingSegments.planId, planId),
        eq(bibleReadingSegments.bookName, normalizedBook),
      ),
    )
    .groupBy(bibleReadingSegments.chapter);

  const completedMap = new Map<number, number>();
  for (const row of completedRows) {
    completedMap.set(row.chapter, Number(row.count ?? 0));
  }

  let chaptersRead = 0;
  for (const [chapter, required] of requiredSegments.entries()) {
    const completed = completedMap.get(chapter) ?? 0;
    if (completed >= required) {
      chaptersRead += 1;
    }
  }

  const totalChapters = requiredSegments.size;
  return updateBibleReadingProgress(
    userId,
    normalizedBook,
    chaptersRead,
    totalChapters,
  );
}

export async function recordBibleReadingForDay(
  userId: number,
  devotionalDayId: number,
) {
  const db = await getDb();
  if (!db) return [];

  const devotionalDay = await getDevotionalDayById(devotionalDayId);
  if (!devotionalDay) return [];

  const entries = parseBibleReference(devotionalDay.bibleReference);
  if (entries.length === 0) return [];

  const planId = devotionalDay.planId;
  const updatedBooks = new Set<string>();

  for (const entry of entries) {
    if (entry.chapters.length === 0) continue;
    const bookName = normalizeBookName(entry.bookName);

    for (const chapter of entry.chapters) {
      await db
        .insert(bibleReadingSegments)
        .values({
          userId,
          devotionalDayId,
          planId,
          bookName,
          chapter,
        })
        .onConflictDoNothing();
    }

    updatedBooks.add(bookName);
  }

  const results: Array<{
    bookName: string;
    progress: InsertBibleReadingProgress | null;
  }> = [];
  for (const bookName of updatedBooks) {
    const progress = await recalculateBibleProgressForBook(
      userId,
      planId,
      bookName,
    );
    results.push({ bookName, progress });
  }

  return results;
}

export async function getUserBibleProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(bibleReadingProgress)
    .where(eq(bibleReadingProgress.userId, userId))
    .orderBy(desc(bibleReadingProgress.lastReadAt));
}

export async function getCompletedBooks(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(bibleReadingProgress)
    .where(
      and(
        eq(bibleReadingProgress.userId, userId),
        eq(bibleReadingProgress.isCompleted, true),
      ),
    )
    .orderBy(desc(bibleReadingProgress.completedAt));
}

export async function getUserCompletedChallengesCount(
  userId: number,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userChallenges)
    .where(
      and(
        eq(userChallenges.userId, userId),
        sql`${userChallenges.completedAt} IS NOT NULL`,
      ),
    );

  return result[0]?.count || 0;
}

export async function getUserCompletedChallengesCountByType(
  userId: number,
  challengeType: string,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userChallenges)
    .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
    .where(
      and(
        eq(userChallenges.userId, userId),
        eq(challenges.type, challengeType as typeof challenges.type.$type),
        sql`${userChallenges.completedAt} IS NOT NULL`,
      ),
    );

  return result[0]?.count || 0;
}

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  encouragementMessages,
  encouragements,
  chestTypes,
  userChests,
  challenges,
  devotionalDays,
  devotionalPlans,
  groupMembers,
  groups,
  medals,
  shopItems,
  userActivityDays,
  userMedals,
  users,
} from "../drizzle/schema";
import { getCampoGrandeDateString } from "../shared/_core/time";
import { checkAndAwardAllMedals } from "./medal-helpers";
import { applyRarityDefaultPrice } from "../shared/shop-rules";
import {
  CHARACTER_KEYS,
  DEFAULT_LOOK,
  POSE_ACCESSORIES,
  accessorySlug,
  hairSlug,
  isCharacterKey,
  lookSlug,
  resolveFigurine,
  wardrobeFor,
  wardrobeLookOf,
  type CharacterKey,
} from "../shared/character-catalog";
import { levelFromXp } from "../shared/progression";
import { CHALLENGE_KINDS } from "../shared/chests";

async function requireDb() {
  const database = await db.getDb();
  if (!database) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }
  return database;
}

const shopItemSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "BACKGROUND",
    "CLOTHES",
    "ACCESSORY",
    "HAIR_STYLE",
    "HAIR_COLOR",
    "BASE_FEATURE",
  ]),
  rarity: z.enum(["COMMON", "RARE", "EPIC"]).default("COMMON"),
  imageUrl: z.string().url().optional().nullable(),
  avatarConfig: z.string().optional().nullable(),
  priceDenario: z.number().int().min(0),
  description: z.string().optional().nullable(),
  isAvailable: z.boolean().optional(),
});

const groupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  leaderId: z.number().int().min(1),
});

const devotionalPlanSchema = z.object({
  name: z.string().min(1),
  year: z.number().int().min(1900),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const devotionalDaySchema = z.object({
  planId: z.number().int().min(1),
  dayNumber: z.number().int().min(1),
  date: z.string().min(8),
  bibleReference: z.string().min(1),
  devotionalText: z.string().optional().nullable(),
  reflectionQuestion: z.string().optional().nullable(),
});

const challengeSchema = z.object({
  devotionalDayId: z.number().int().min(1),
  type: z.enum(["READING", "DEVOTIONAL", "REFLECTION", "EXTRA"]),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  baseXp: z.number().int().min(0),
  baseDenario: z.number().int().min(0),
});

const medalSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["BIBLE_BOOK", "STREAK", "MILESTONE", "SPECIAL"]),
  iconUrl: z.string().url().optional().nullable(),
  iconUrlGray: z.string().url().optional().nullable(),
  iconEmoji: z.string().optional().nullable(),
  requirement: z.string().min(1),
  order: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

const ADMIN_PAGE_LIMIT = 10;
const adminPaginationInput = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
});

const resolvePagination = (input?: z.infer<typeof adminPaginationInput>) => ({
  page: input?.page ?? 1,
  limit: input?.limit ?? ADMIN_PAGE_LIMIT,
});

const encouragementMessageSchema = z.object({
  label: z.string().trim().min(2).max(60),
  receivedText: z.string().trim().min(2).max(80),
  emoji: z.string().trim().max(16).default(""),
  category: z.enum(["PRAYED", "CHEER", "PROUD"]),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
});

const chestChallengeSchema = z.object({
  kind: z.enum(CHALLENGE_KINDS.map((k) => k.kind) as [string, ...string[]]),
  target: z.number().int().min(1).max(10000),
  text: z.string().max(140).optional(),
  emoji: z.string().max(16).optional(),
  messageId: z.number().int().optional(),
  messageLabel: z.string().max(60).optional(),
});

const chestTypeBase = z.object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(200).default(""),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    price: z.number().int().min(0).max(100000),
    days: z.number().int().min(1).max(60),
    challengeCount: z.number().int().min(1).max(10),
    rewardXp: z.number().int().min(0).max(100000),
    rewardDenario: z.number().int().min(0).max(100000),
    challenges: z.array(chestChallengeSchema).min(1).max(40),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(1000),
});

/** Pool must allow drawing `challengeCount` (max 1 honor per chest); honor needs a text. */
const checkChestPool = (v: z.infer<typeof chestTypeBase>, ctx: z.RefinementCtx) => {
    const tracked = v.challenges.filter((c) => c.kind !== "HONOR").length;
    const honor = v.challenges.length - tracked;
    // at most one honor challenge is drawn per chest
    if (tracked + Math.min(honor, 1) < v.challengeCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["challengeCount"],
        message: "Desafios insuficientes: cada baú sorteia no máximo 1 desafio de confiança.",
      });
    }
    if (v.challenges.some((c) => c.kind === "SEND_MESSAGE" && !c.messageId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["challenges"], message: "Escolha qual mensagem deve ser enviada." });
    }
    if (v.challenges.some((c) => c.kind === "HONOR" && !c.text?.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["challenges"], message: "Desafio de confiança precisa de um texto." });
    }
};

const chestTypeSchema = chestTypeBase.superRefine(checkChestPool);
const chestTypeUpdateSchema = chestTypeBase.extend({ id: z.number().int() }).superRefine(checkChestPool);

const chestTypeValues = (v: z.infer<typeof chestTypeBase>) => ({
  name: v.name,
  description: v.description,
  color: v.color,
  price: v.price,
  days: v.days,
  challengeCount: v.challengeCount,
  rewardXp: v.rewardXp,
  rewardDenario: v.rewardDenario,
  challenges: JSON.stringify(
    v.challenges.map((c) => ({
      kind: c.kind,
      target: c.kind === "HONOR" ? 1 : c.target,
      ...(c.text?.trim() ? { text: c.text.trim() } : {}),
      ...(c.emoji?.trim() ? { emoji: c.emoji.trim() } : {}),
      ...(c.kind === "SEND_MESSAGE" && c.messageId ? { messageId: c.messageId, messageLabel: c.messageLabel } : {}),
    })),
  ),
  isActive: v.isActive,
  sortOrder: v.sortOrder,
});

export const adminRouter = router({
  me: adminProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    nickname: ctx.user.nickname,
    email: ctx.user.email,
    role: ctx.user.role,
  })),

  /** Dashboard KPIs: one round of aggregate queries (counts/sums only, no rows). */
  stats: adminProcedure.query(async () => {
    const database = await requireDb();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      days.push(getCampoGrandeDateString(new Date(now.getTime() - i * 24 * 60 * 60 * 1000)));
    }

    const [userAgg] = await database
      .select({
        total: sql<number>`count(*)::int`,
        active7d: sql<number>`count(*) filter (where ${users.lastSignedIn} >= ${weekAgo})::int`,
        new7d: sql<number>`count(*) filter (where ${users.createdAt} >= ${weekAgo})::int`,
        leaders: sql<number>`count(*) filter (where ${users.role} = 'leader')::int`,
        denarios: sql<number>`coalesce(sum(${users.denarioBalance}), 0)::int`,
        onStreak: sql<number>`count(*) filter (where ${users.currentStreak} > 0)::int`,
        bestStreak: sql<number>`coalesce(max(${users.currentStreak}), 0)::int`,
      })
      .from(users);

    const activity = await database
      .select({
        day: sql<string>`${userActivityDays.day}::text`,
        players: sql<number>`count(distinct ${userActivityDays.userId})::int`,
        challenges: sql<number>`coalesce(sum(${userActivityDays.challengesCompleted}), 0)::int`,
        fullDays: sql<number>`count(*) filter (where ${userActivityDays.fullDay})::int`,
      })
      .from(userActivityDays)
      .where(sql`${userActivityDays.day} >= ${days[0]}::date`)
      .groupBy(userActivityDays.day);
    const byDay = new Map(activity.map((a) => [a.day, a]));
    const week = days.map((day) => ({
      day,
      players: byDay.get(day)?.players ?? 0,
      challenges: byDay.get(day)?.challenges ?? 0,
      fullDays: byDay.get(day)?.fullDays ?? 0,
    }));

    const [groupAgg] = await database
      .select({ total: sql<number>`count(*)::int` })
      .from(groups);
    const [requestAgg] = await database
      .select({ pending: sql<number>`count(*)::int` })
      .from(groupMembers)
      .where(eq(groupMembers.status, "pending"));
    const [planAgg] = await database
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${devotionalPlans.isActive})::int`,
      })
      .from(devotionalPlans);
    const [dayAgg] = await database
      .select({ total: sql<number>`count(*)::int` })
      .from(devotionalDays);
    const [medalAgg] = await database
      .select({ total: sql<number>`count(*)::int` })
      .from(medals);
    const [shopAgg] = await database
      .select({
        total: sql<number>`count(*)::int`,
        available: sql<number>`count(*) filter (where ${shopItems.isAvailable})::int`,
      })
      .from(shopItems);

    const today = week[week.length - 1];
    return {
      users: userAgg,
      today: { day: today.day, players: today.players, challenges: today.challenges },
      week,
      groups: { total: groupAgg?.total ?? 0, pendingRequests: requestAgg?.pending ?? 0 },
      content: {
        plans: planAgg?.total ?? 0,
        activePlans: planAgg?.active ?? 0,
        days: dayAgg?.total ?? 0,
        medals: medalAgg?.total ?? 0,
        shopItems: shopAgg?.total ?? 0,
        shopAvailable: shopAgg?.available ?? 0,
      },
    };
  }),

  users: router({
    list: adminProcedure
      .input(adminPaginationInput.optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const [items, totalRows] = await Promise.all([
          database
            .select({
              id: users.id,
              openId: users.openId,
              nickname: users.nickname,
              email: users.email,
              role: users.role,
              xpTotal: users.xpTotal,
              denarioBalance: users.denarioBalance,
              lastSignedIn: users.lastSignedIn,
              createdAt: users.createdAt,
            })
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset),
          database.select({ total: sql<number>`count(*)` }).from(users),
        ]);
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.number().int().min(1),
          role: z.enum(["user", "admin", "leader"]),
        }),
      )
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(users)
          .set({ role: input.role })
          .where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  // Encouragement messages players send each other (shared/engagement.ts)
  encouragementMessages: router({
    list: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const monthAgo = new Date(Date.now() - 30 * 86_400_000);
      const [rows, counts] = await Promise.all([
        database.select().from(encouragementMessages).orderBy(encouragementMessages.sortOrder, encouragementMessages.id),
        database
          .select({
            messageId: encouragements.messageId,
            total: sql<number>`count(*)::int`,
            last30: sql<number>`count(*) filter (where ${encouragements.createdAt} >= ${monthAgo})::int`,
          })
          .from(encouragements)
          .groupBy(encouragements.messageId),
      ]);
      return rows.map((r) => {
        const c = counts.find((x) => x.messageId === r.id);
        return { ...r, sent: c?.total ?? 0, sent30: c?.last30 ?? 0 };
      });
    }),
    byId: adminProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [row] = await database.select().from(encouragementMessages).where(eq(encouragementMessages.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Mensagem não encontrada" });
      return row;
    }),
    create: adminProcedure.input(encouragementMessageSchema).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [row] = await database.insert(encouragementMessages).values(input).returning({ id: encouragementMessages.id });
      return row;
    }),
    update: adminProcedure.input(encouragementMessageSchema.extend({ id: z.number().int() })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { id, ...values } = input;
      await database.update(encouragementMessages).set({ ...values, updatedAt: new Date() }).where(eq(encouragementMessages.id, id));
      return { success: true };
    }),
    /** Messages already sent keep showing (they fall back to their category's text). */
    delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const active = await database
        .select({ n: sql<number>`count(*)::int` })
        .from(encouragementMessages)
        .where(eq(encouragementMessages.isActive, true));
      const [target] = await database.select().from(encouragementMessages).where(eq(encouragementMessages.id, input.id)).limit(1);
      if (target?.isActive && (active[0]?.n ?? 0) <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Deixe pelo menos uma mensagem ativa para os jogadores." });
      }
      await database.delete(encouragementMessages).where(eq(encouragementMessages.id, input.id));
      return { success: true };
    }),
  }),

  // Baús de Desafio: chest types sold in the Mercado (shared/chests.ts)
  chestTypes: router({
    list: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [types, stats] = await Promise.all([
        database.select().from(chestTypes).orderBy(chestTypes.sortOrder, chestTypes.price),
        database
          .select({
            chestTypeId: userChests.chestTypeId,
            bought: sql<number>`count(*)::int`,
            claimed: sql<number>`count(*) filter (where ${userChests.status} = 'CLAIMED')::int`,
            expired: sql<number>`count(*) filter (where ${userChests.status} = 'EXPIRED')::int`,
            spent: sql<number>`coalesce(sum(${userChests.pricePaid}), 0)::int`,
          })
          .from(userChests)
          .groupBy(userChests.chestTypeId),
      ]);
      return types.map((t) => {
        const st = stats.find((x) => x.chestTypeId === t.id);
        return {
          ...t,
          poolSize: (() => {
            try {
              return (JSON.parse(t.challenges) as unknown[]).length;
            } catch {
              return 0;
            }
          })(),
          bought: st?.bought ?? 0,
          claimed: st?.claimed ?? 0,
          expired: st?.expired ?? 0,
          spent: st?.spent ?? 0,
        };
      });
    }),
    byId: adminProcedure.input(z.object({ id: z.number().int() })).query(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [row] = await database.select().from(chestTypes).where(eq(chestTypes.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Baú não encontrado" });
      return row;
    }),
    create: adminProcedure.input(chestTypeSchema).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [row] = await database.insert(chestTypes).values(chestTypeValues(input)).returning({ id: chestTypes.id });
      return row;
    }),
    update: adminProcedure.input(chestTypeUpdateSchema).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database
        .update(chestTypes)
        .set({ ...chestTypeValues(input), updatedAt: new Date() })
        .where(eq(chestTypes.id, input.id));
      return { success: true };
    }),
    /** Chests already bought keep their own copy (name, challenges, reward), so deleting is safe. */
    delete: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await database.delete(chestTypes).where(eq(chestTypes.id, input.id));
      return { success: true };
    }),
  }),

  // Guarda-roupa: looks are code-defined (shared/character-catalog wardrobeFor) and unlock by
  // level. This shows who is wearing what and whether shop_items has every row equip needs.
  wardrobe: router({
    overview: adminProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [items, players] = await Promise.all([
        database
          .select({ id: shopItems.id, slug: shopItems.slug, assetKey: shopItems.assetKey, characterKey: shopItems.characterKey })
          .from(shopItems),
        database
          .select({
            characterKey: users.characterKey,
            xpTotal: users.xpTotal,
            clothesId: users.equippedClothesId,
            hairColorId: users.equippedHairColorId,
            accessoryId: users.equippedAccessoryId,
          })
          .from(users)
          .where(eq(users.role, "user")),
      ]);
      const byId = new Map(items.map((i) => [i.id, i]));
      const slugs = new Set(items.map((i) => i.slug).filter(Boolean));

      // Rows the wardrobe needs in shop_items (equip stores item ids)
      const required = new Set<string>();
      for (const c of CHARACTER_KEYS) {
        for (const w of wardrobeFor(c)) {
          if (w.look !== DEFAULT_LOOK) required.add(lookSlug(c, w.look));
          if (w.hair) required.add(hairSlug(c, w.hair));
        }
      }
      for (const acc of POSE_ACCESSORIES) required.add(accessorySlug(acc));
      const missing = [...required].filter((slug) => !slugs.has(slug));

      const wearing: Record<string, Record<string, number>> = {};
      const perCharacter: Record<string, number> = {};
      let notChosen = 0;
      let other = 0;
      const levels: number[] = [];
      for (const p of players) {
        levels.push(levelFromXp(p.xpTotal));
        if (!isCharacterKey(p.characterKey)) {
          notChosen += 1;
          continue;
        }
        const c = p.characterKey as CharacterKey;
        perCharacter[c] = (perCharacter[c] ?? 0) + 1;
        const ref = (id: number | null) => (id ? byId.get(id) ?? null : null);
        const fig = resolveFigurine(c, { clothes: ref(p.clothesId), hairColor: ref(p.hairColorId), accessory: ref(p.accessoryId) });
        const look = wardrobeLookOf(fig);
        if (!look) {
          other += 1;
          continue;
        }
        wearing[c] ??= {};
        wearing[c][look.id] = (wearing[c][look.id] ?? 0) + 1;
      }
      levels.sort((x, y) => x - y);
      return {
        players: players.length,
        notChosen,
        other,
        perCharacter,
        wearing,
        missing,
        medianLevel: levels.length ? levels[Math.floor(levels.length / 2)] : 1,
        levels,
      };
    }),
  }),

  shopItems: router({
    list: adminProcedure
      .input(adminPaginationInput.optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const [items, totalRows] = await Promise.all([
          database
            .select()
            .from(shopItems)
            .orderBy(desc(shopItems.createdAt))
            .limit(limit)
            .offset(offset),
          database.select({ total: sql<number>`count(*)` }).from(shopItems),
        ]);
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    byId: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const database = await requireDb();
        const rows = await database.select().from(shopItems).where(eq(shopItems.id, input.id)).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
        return rows[0];
      }),
    setAvailability: adminProcedure
      .input(z.object({ id: z.number().int().min(1), isAvailable: z.boolean() }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(shopItems)
          .set({ isAvailable: input.isAvailable })
          .where(eq(shopItems.id, input.id));
        return { success: true };
      }),
    create: adminProcedure.input(shopItemSchema).mutation(async ({ input }) => {
      const database = await requireDb();
      const priceDenario = applyRarityDefaultPrice(
        input.rarity ?? "COMMON",
        input.priceDenario,
      );
      await database.insert(shopItems).values({
        name: input.name,
        type: input.type,
        rarity: input.rarity ?? "COMMON",
        imageUrl: input.imageUrl || null,
        avatarConfig: input.avatarConfig?.trim() || null,
        priceDenario,
        description: input.description || null,
        isAvailable: input.isAvailable ?? true,
      });
      return { success: true };
    }),
    update: adminProcedure
      .input(shopItemSchema.extend({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        const priceDenario = applyRarityDefaultPrice(
          input.rarity ?? "COMMON",
          input.priceDenario,
        );
        await database
          .update(shopItems)
          .set({
            name: input.name,
            type: input.type,
            rarity: input.rarity ?? "COMMON",
            imageUrl: input.imageUrl || null,
            avatarConfig: input.avatarConfig?.trim() || null,
            priceDenario,
            description: input.description || null,
            isAvailable: input.isAvailable ?? true,
          })
          .where(eq(shopItems.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database.delete(shopItems).where(eq(shopItems.id, input.id));
        return { success: true };
      }),
  }),

  groups: router({
    list: adminProcedure
      .input(adminPaginationInput.optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const [items, totalRows] = await Promise.all([
          database
            .select({
              id: groups.id,
              name: groups.name,
              description: groups.description,
              leaderId: groups.leaderId,
              leaderName: users.nickname,
              memberCount: groups.memberCount,
              totalPoints: groups.totalPoints,
              createdAt: groups.createdAt,
              updatedAt: groups.updatedAt,
            })
            .from(groups)
            .innerJoin(users, eq(groups.leaderId, users.id))
            .orderBy(desc(groups.createdAt))
            .limit(limit)
            .offset(offset),
          database.select({ total: sql<number>`count(*)` }).from(groups),
        ]);
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    byId: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const database = await requireDb();
        const rows = await database
          .select({
            id: groups.id,
            name: groups.name,
            description: groups.description,
            leaderId: groups.leaderId,
            leaderName: users.nickname,
            memberCount: groups.memberCount,
            totalPoints: groups.totalPoints,
          })
          .from(groups)
          .leftJoin(users, eq(groups.leaderId, users.id))
          .where(eq(groups.id, input.id))
          .limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Célula não encontrada" });
        return rows[0];
      }),
    create: adminProcedure
      .input(groupSchema)
      .mutation(async ({ ctx, input }) => {
        const database = await requireDb();
        const now = new Date();
        const created = await database
          .insert(groups)
          .values({
            name: input.name,
            description: input.description || null,
            leaderId: input.leaderId,
            memberCount: 1,
            totalPoints: 0,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: groups.id });

        const groupId = created[0]?.id;
        if (groupId) {
          await database.insert(groupMembers).values({
            groupId,
            userId: input.leaderId,
            status: "approved",
            requestedAt: now,
            approvedAt: now,
            approvedBy: ctx.user.id,
          });
        }

        return { success: true };
      }),
    update: adminProcedure
      .input(groupSchema.extend({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(groups)
          .set({
            name: input.name,
            description: input.description || null,
            leaderId: input.leaderId,
            updatedAt: new Date(),
          })
          .where(eq(groups.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .delete(groupMembers)
          .where(eq(groupMembers.groupId, input.id));
        await database.delete(groups).where(eq(groups.id, input.id));
        return { success: true };
      }),
  }),

  groupRequests: router({
    pending: adminProcedure
      .input(adminPaginationInput.optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const [items, totalRows] = await Promise.all([
          database
            .select({
              requestId: groupMembers.id,
              groupId: groups.id,
              groupName: groups.name,
              userId: users.id,
              userNickname: users.nickname,
              userEmail: users.email,
              requestedAt: groupMembers.requestedAt,
            })
            .from(groupMembers)
            .innerJoin(groups, eq(groupMembers.groupId, groups.id))
            .innerJoin(users, eq(groupMembers.userId, users.id))
            .where(eq(groupMembers.status, "pending"))
            .orderBy(desc(groupMembers.requestedAt))
            .limit(limit)
            .offset(offset),
          database
            .select({ total: sql<number>`count(*)` })
            .from(groupMembers)
            .where(eq(groupMembers.status, "pending")),
        ]);
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    approve: adminProcedure
      .input(z.object({ requestId: z.number().int().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await db.approveGroupMember(input.requestId, ctx.user.id);
        return { success: true };
      }),
    reject: adminProcedure
      .input(z.object({ requestId: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        await db.rejectGroupMember(input.requestId);
        return { success: true };
      }),
  }),

  devotionalPlans: router({
    list: adminProcedure
      .input(adminPaginationInput.optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const [items, totalRows] = await Promise.all([
          database
            .select()
            .from(devotionalPlans)
            .orderBy(desc(devotionalPlans.year))
            .limit(limit)
            .offset(offset),
          database
            .select({ total: sql<number>`count(*)` })
            .from(devotionalPlans),
        ]);
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    byId: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const database = await requireDb();
        const rows = await database.select().from(devotionalPlans).where(eq(devotionalPlans.id, input.id)).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
        return rows[0];
      }),
    create: adminProcedure
      .input(devotionalPlanSchema)
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database.insert(devotionalPlans).values({
          name: input.name,
          year: input.year,
          description: input.description || null,
          isActive: input.isActive ?? true,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(devotionalPlanSchema.extend({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(devotionalPlans)
          .set({
            name: input.name,
            year: input.year,
            description: input.description || null,
            isActive: input.isActive ?? true,
          })
          .where(eq(devotionalPlans.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        const dayIds = await database
          .select({ id: devotionalDays.id })
          .from(devotionalDays)
          .where(eq(devotionalDays.planId, input.id));
        const ids = dayIds.map((day) => day.id);

        if (ids.length > 0) {
          await database
            .delete(challenges)
            .where(inArray(challenges.devotionalDayId, ids));
        }
        await database
          .delete(devotionalDays)
          .where(eq(devotionalDays.planId, input.id));
        await database
          .delete(devotionalPlans)
          .where(eq(devotionalPlans.id, input.id));
        return { success: true };
      }),
  }),

  devotionalDays: router({
    list: adminProcedure
      .input(
        adminPaginationInput
          .extend({ planId: z.number().int().min(1).optional() })
          .optional(),
      )
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const planId = input?.planId;
        const baseQuery = database.select().from(devotionalDays);
        const filteredQuery = planId
          ? baseQuery.where(eq(devotionalDays.planId, planId))
          : baseQuery;
        const items = await filteredQuery
          .orderBy(desc(devotionalDays.date))
          .limit(limit)
          .offset(offset);
        let totalQuery = database
          .select({ total: sql<number>`count(*)` })
          .from(devotionalDays);
        if (planId) {
          totalQuery = totalQuery.where(eq(devotionalDays.planId, planId));
        }
        const totalRows = await totalQuery;
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    byId: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const database = await requireDb();
        const rows = await database.select().from(devotionalDays).where(eq(devotionalDays.id, input.id)).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
        return rows[0];
      }),
    create: adminProcedure
      .input(devotionalDaySchema)
      .mutation(async ({ input }) => {
        const database = await requireDb();
        const created = await database
          .insert(devotionalDays)
          .values({
            planId: input.planId,
            dayNumber: input.dayNumber,
            date: input.date,
            bibleReference: input.bibleReference,
            devotionalText: input.devotionalText || null,
            reflectionQuestion: input.reflectionQuestion || null,
          })
          .returning({ id: devotionalDays.id });
        return { success: true, id: created[0]?.id ?? null };
      }),
    update: adminProcedure
      .input(devotionalDaySchema.extend({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(devotionalDays)
          .set({
            planId: input.planId,
            dayNumber: input.dayNumber,
            date: input.date,
            bibleReference: input.bibleReference,
            devotionalText: input.devotionalText || null,
            reflectionQuestion: input.reflectionQuestion || null,
          })
          .where(eq(devotionalDays.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .delete(challenges)
          .where(eq(challenges.devotionalDayId, input.id));
        await database
          .delete(devotionalDays)
          .where(eq(devotionalDays.id, input.id));
        return { success: true };
      }),
  }),

  challenges: router({
    list: adminProcedure
      .input(
        adminPaginationInput
          .extend({ devotionalDayId: z.number().int().min(1).optional() })
          .optional(),
      )
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const devotionalDayId = input?.devotionalDayId;
        const baseQuery = database.select().from(challenges);
        const filteredQuery = devotionalDayId
          ? baseQuery.where(eq(challenges.devotionalDayId, devotionalDayId))
          : baseQuery;
        const items = await filteredQuery
          .orderBy(desc(challenges.createdAt))
          .limit(limit)
          .offset(offset);
        let totalQuery = database
          .select({ total: sql<number>`count(*)` })
          .from(challenges);
        if (devotionalDayId) {
          totalQuery = totalQuery.where(
            eq(challenges.devotionalDayId, devotionalDayId),
          );
        }
        const totalRows = await totalQuery;
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    byId: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const database = await requireDb();
        const rows = await database.select().from(challenges).where(eq(challenges.id, input.id)).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
        return rows[0];
      }),
    create: adminProcedure
      .input(challengeSchema)
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database.insert(challenges).values({
          devotionalDayId: input.devotionalDayId,
          type: input.type,
          title: input.title,
          description: input.description || null,
          baseXp: input.baseXp,
          baseDenario: input.baseDenario,
        });
        return { success: true };
      }),
    update: adminProcedure
      .input(challengeSchema.extend({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(challenges)
          .set({
            devotionalDayId: input.devotionalDayId,
            type: input.type,
            title: input.title,
            description: input.description || null,
            baseXp: input.baseXp,
            baseDenario: input.baseDenario,
          })
          .where(eq(challenges.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database.delete(challenges).where(eq(challenges.id, input.id));
        return { success: true };
      }),
  }),

  medals: router({
    list: adminProcedure
      .input(adminPaginationInput.optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const { page, limit } = resolvePagination(input);
        const offset = (page - 1) * limit;
        const [items, totalRows] = await Promise.all([
          database
            .select()
            .from(medals)
            .orderBy(desc(medals.createdAt))
            .limit(limit)
            .offset(offset),
          database.select({ total: sql<number>`count(*)` }).from(medals),
        ]);
        const total = Number(totalRows[0]?.total ?? 0);
        return { items, page, limit, total };
      }),
    byId: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .query(async ({ input }) => {
        const database = await requireDb();
        const rows = await database.select().from(medals).where(eq(medals.id, input.id)).limit(1);
        if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Registro não encontrado" });
        return rows[0];
      }),
    /**
     * Re-check the medal rules for EVERY user (the player-side checkMedals only covers
     * the caller). Awards anything already earned; never removes medals. Runs a few users
     * at a time so a big base doesn't open hundreds of queries at once.
     */
    recalculateAll: adminProcedure.mutation(async () => {
      const database = await requireDb();
      const rows = await database.select({ id: users.id }).from(users);
      let awarded = 0;
      let failed = 0;
      const BATCH = 5;
      for (let i = 0; i < rows.length; i += BATCH) {
        const results = await Promise.allSettled(rows.slice(i, i + BATCH).map((r) => checkAndAwardAllMedals(r.id)));
        for (const r of results) {
          if (r.status === "fulfilled") awarded += r.value.length;
          else failed += 1;
        }
      }
      return { users: rows.length, awarded, failed };
    }),
    create: adminProcedure.input(medalSchema).mutation(async ({ input }) => {
      const database = await requireDb();
      await database.insert(medals).values({
        name: input.name,
        description: input.description,
        category: input.category,
        iconUrl: input.iconUrl || null,
        iconUrlGray: input.iconUrlGray || null,
        iconEmoji: input.iconEmoji || null,
        requirement: input.requirement,
        order: input.order,
        isActive: input.isActive ?? true,
      });
      return { success: true };
    }),
    update: adminProcedure
      .input(medalSchema.extend({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .update(medals)
          .set({
            name: input.name,
            description: input.description,
            category: input.category,
            iconUrl: input.iconUrl || null,
            iconUrlGray: input.iconUrlGray || null,
            iconEmoji: input.iconEmoji || null,
            requirement: input.requirement,
            order: input.order,
            isActive: input.isActive ?? true,
          })
          .where(eq(medals.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().min(1) }))
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database
          .delete(userMedals)
          .where(eq(userMedals.medalId, input.id));
        await database.delete(medals).where(eq(medals.id, input.id));
        return { success: true };
      }),
  }),
});

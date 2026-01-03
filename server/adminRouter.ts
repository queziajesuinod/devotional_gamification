import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  challenges,
  devotionalDays,
  devotionalPlans,
  groupMembers,
  groups,
  medals,
  shopItems,
  userMedals,
  users,
} from "../drizzle/schema";
import { applyRarityDefaultPrice } from "../shared/shop-rules";

async function requireDb() {
  const database = await db.getDb();
  if (!database) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  }
  return database;
}

const shopItemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["BACKGROUND", "CLOTHES", "ACCESSORY", "HAIR_STYLE", "HAIR_COLOR"]),
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

export const adminRouter = router({
  me: adminProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    nickname: ctx.user.nickname,
    email: ctx.user.email,
    role: ctx.user.role,
  })),

  users: router({
    list: adminProcedure.query(async () => {
      const database = await requireDb();
      return database
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
        .orderBy(desc(users.createdAt));
    }),
    updateRole: adminProcedure
      .input(
        z.object({
          userId: z.number().int().min(1),
          role: z.enum(["user", "admin", "leader"]),
        })
      )
      .mutation(async ({ input }) => {
        const database = await requireDb();
        await database.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
  }),

  shopItems: router({
    list: adminProcedure.query(async () => {
      const database = await requireDb();
      return database.select().from(shopItems).orderBy(desc(shopItems.createdAt));
    }),
    create: adminProcedure.input(shopItemSchema).mutation(async ({ input }) => {
      const database = await requireDb();
      const priceDenario = applyRarityDefaultPrice(input.rarity ?? "COMMON", input.priceDenario);
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
        const priceDenario = applyRarityDefaultPrice(input.rarity ?? "COMMON", input.priceDenario);
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
    list: adminProcedure.query(async () => {
      const database = await requireDb();
      return database
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
        .orderBy(desc(groups.createdAt));
    }),
    create: adminProcedure.input(groupSchema).mutation(async ({ ctx, input }) => {
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
        await database.delete(groupMembers).where(eq(groupMembers.groupId, input.id));
        await database.delete(groups).where(eq(groups.id, input.id));
        return { success: true };
      }),
  }),

  groupRequests: router({
    pending: adminProcedure.query(async () => {
      const database = await requireDb();
      return database
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
        .orderBy(desc(groupMembers.requestedAt));
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
    list: adminProcedure.query(async () => {
      const database = await requireDb();
      return database.select().from(devotionalPlans).orderBy(desc(devotionalPlans.year));
    }),
    create: adminProcedure.input(devotionalPlanSchema).mutation(async ({ input }) => {
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
          await database.delete(challenges).where(inArray(challenges.devotionalDayId, ids));
        }
        await database.delete(devotionalDays).where(eq(devotionalDays.planId, input.id));
        await database.delete(devotionalPlans).where(eq(devotionalPlans.id, input.id));
        return { success: true };
      }),
  }),

  devotionalDays: router({
    list: adminProcedure
      .input(z.object({ planId: z.number().int().min(1).optional() }).optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const query = database.select().from(devotionalDays);
        if (input?.planId) {
          return query.where(eq(devotionalDays.planId, input.planId)).orderBy(desc(devotionalDays.date));
        }
        return query.orderBy(desc(devotionalDays.date));
      }),
    create: adminProcedure.input(devotionalDaySchema).mutation(async ({ input }) => {
      const database = await requireDb();
      const created = await database.insert(devotionalDays).values({
        planId: input.planId,
        dayNumber: input.dayNumber,
        date: input.date,
        bibleReference: input.bibleReference,
        devotionalText: input.devotionalText || null,
        reflectionQuestion: input.reflectionQuestion || null,
      }).returning({ id: devotionalDays.id });
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
        await database.delete(challenges).where(eq(challenges.devotionalDayId, input.id));
        await database.delete(devotionalDays).where(eq(devotionalDays.id, input.id));
        return { success: true };
      }),
  }),

  challenges: router({
    list: adminProcedure
      .input(z.object({ devotionalDayId: z.number().int().min(1).optional() }).optional())
      .query(async ({ input }) => {
        const database = await requireDb();
        const query = database.select().from(challenges);
        if (input?.devotionalDayId) {
          return query
            .where(eq(challenges.devotionalDayId, input.devotionalDayId))
            .orderBy(desc(challenges.createdAt));
        }
        return query.orderBy(desc(challenges.createdAt));
      }),
    create: adminProcedure.input(challengeSchema).mutation(async ({ input }) => {
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
    list: adminProcedure.query(async () => {
      const database = await requireDb();
      return database.select().from(medals).orderBy(desc(medals.createdAt));
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
        await database.delete(userMedals).where(eq(userMedals.medalId, input.id));
        await database.delete(medals).where(eq(medals.id, input.id));
        return { success: true };
      }),
  }),
});

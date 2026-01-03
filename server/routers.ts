import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminRouter } from "./adminRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { checkAndAwardAllMedals, checkAndAwardBookMedal, checkTimeBasedMedals } from "./medal-helpers";
import { getRarityLock, getRarityRule } from "../shared/shop-rules";

const ensureLeaderAccess = async (user: { id: number; role: string }, groupId: number) => {
  if (user.role !== "admin" && user.role !== "leader") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Leader role required" });
  }
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
  }
  if (user.role === "leader" && group.leaderId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return group;
};

const ensureLeaderRequestAccess = async (user: { id: number; role: string }, requestId: number) => {
  if (user.role !== "admin" && user.role !== "leader") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Leader role required" });
  }
  const request = await db.getGroupMemberRequestById(requestId);
  if (!request) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
  }
  if (user.role === "leader" && request.leaderId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return request;
};

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============================================
  // USER & AUTH
  // ============================================
  user: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        throw new Error("User not found");
      }

      const parseConfig = (value?: string | null) => {
        if (!value) return {};
        try {
          const parsed = JSON.parse(value) as Record<string, unknown>;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          return {};
        }
        return {};
      };

      const applyPatch = (base: Record<string, unknown>, patchValue?: string | null) => {
        if (!patchValue) return base;
        try {
          const patch = JSON.parse(patchValue) as Record<string, unknown>;
          if (patch && typeof patch === "object" && !Array.isArray(patch)) {
            return { ...base, ...patch };
          }
        } catch {
          return base;
        }
        return base;
      };

      const baseConfig = parseConfig(user.avatarConfig);
      const equipped = await db.getEquippedItems(ctx.user.id);
      const mergedConfig = [
        equipped?.background?.avatarConfig,
        equipped?.hairStyle?.avatarConfig,
        equipped?.hairColor?.avatarConfig,
        equipped?.clothes?.avatarConfig,
        equipped?.accessory?.avatarConfig,
      ].reduce((acc, patch) => applyPatch(acc, patch), baseConfig);
      const resolvedAvatarConfig = Object.keys(mergedConfig).length > 0 ? mergedConfig : null;

      return {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        avatarUrl: user.avatarUrl,
        xpTotal: user.xpTotal,
        level: user.level,
        denarioBalance: user.denarioBalance,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        avatarConfig: resolvedAvatarConfig,
        equippedBackgroundId: user.equippedBackgroundId,
        equippedClothesId: user.equippedClothesId,
        equippedAccessoryId: user.equippedAccessoryId,
        equippedHairStyleId: user.equippedHairStyleId,
        equippedHairColorId: user.equippedHairColorId,
      };
    }),

    updateAvatar: protectedProcedure
      .input(
        z.object({
          avatarConfig: z.record(
            z.string(),
            z.union([z.string(), z.number(), z.boolean(), z.null()])
          ),
          equippedBackgroundId: z.number().nullable().optional(),
          equippedClothesId: z.number().nullable().optional(),
          equippedAccessoryId: z.number().nullable().optional(),
          equippedHairStyleId: z.number().nullable().optional(),
          equippedHairColorId: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserAvatar(
          ctx.user.id,
          JSON.stringify(input.avatarConfig),
          input.equippedBackgroundId,
          input.equippedClothesId,
          input.equippedAccessoryId,
          input.equippedHairStyleId,
          input.equippedHairColorId
        );

        return { success: true };
      }),
  }),

  // ============================================
  // DEVOTIONAL & CHALLENGES
  // ============================================
  devotional: router({
    today: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date();
      const devotionalDay = await db.getDevotionalDayByDate(today);

      if (!devotionalDay) {
        return {
          date: today.toISOString().split('T')[0],
          bibleReference: null,
          devotionalText: null,
          reflectionQuestion: null,
          challenges: [],
        };
      }

      const challenges = await db.getChallengesByDevotionalDayId(devotionalDay.id);

      // Get user challenge status for each challenge
      const challengesWithStatus = await Promise.all(
        challenges.map(async (challenge) => {
          const userChallenge = await db.getUserChallengeStatus(ctx.user.id, challenge.id);

          // If no user challenge exists, create one
          if (!userChallenge) {
            await db.createUserChallenge({
              userId: ctx.user.id,
              challengeId: challenge.id,
            });
          }

          return {
            id: challenge.id,
            type: challenge.type,
            title: challenge.title,
            description: challenge.description,
            baseXp: challenge.baseXp,
            baseDenario: challenge.baseDenario,
            completed: !!userChallenge?.completedAt,
            xpEarned: userChallenge?.xpEarned || 0,
            denarioEarned: userChallenge?.denarioEarned || 0,
            completedAt: userChallenge?.completedAt,
            responseText: userChallenge?.responseText || null,
          };
        })
      );

      return {
        date: devotionalDay.date,
        dayNumber: devotionalDay.dayNumber,
        bibleReference: devotionalDay.bibleReference,
        devotionalText: devotionalDay.devotionalText,
        reflectionQuestion: devotionalDay.reflectionQuestion,
        challenges: challengesWithStatus,
      };
    }),

    getReflectionHistory: protectedProcedure
      .query(async ({ ctx }) => {
        const reflections = await db.getUserReflections(ctx.user.id);
        return reflections;
      }),

    completeChallenge: protectedProcedure
      .input(z.object({ 
        challengeId: z.number(),
        responseText: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const challenge = await db.getChallengeById(input.challengeId);
        if (!challenge) {
          throw new Error("Challenge not found");
        }

        const userChallenge = await db.getUserChallengeStatus(ctx.user.id, input.challengeId);
        if (!userChallenge) {
          throw new Error("User challenge not found");
        }

        if (userChallenge.completedAt) {
          throw new Error("Challenge already completed");
        }

        // Validate reflection response
        if (challenge.type === "REFLECTION" && (!input.responseText || input.responseText.trim().length === 0)) {
          throw new Error("Reflection response is required");
        }

        const xpEarned = challenge.baseXp;
        const denariosEarned = challenge.baseDenario;

        // Complete the challenge
        await db.completeUserChallenge(ctx.user.id, input.challengeId, xpEarned, denariosEarned, input.responseText);

        // Update user XP and Denario
        await db.updateUserXpAndDenario(ctx.user.id, xpEarned, denariosEarned);

        // Record transaction
        await db.createPointTransaction({
          userId: ctx.user.id,
          source: "CHALLENGE",
          xp: xpEarned,
          denario: denariosEarned,
          description: `Desafio completado: ${challenge.title}`,
        });

        // Update ranking scores
        const monthlyPeriod = await db.getActiveRankingPeriod("MONTH");
        if (monthlyPeriod) {
          await db.updateUserRankingScore(monthlyPeriod.id, ctx.user.id, xpEarned);
        }

        const yearlyPeriod = await db.getActiveRankingPeriod("YEAR");
        if (yearlyPeriod) {
          await db.updateUserRankingScore(yearlyPeriod.id, ctx.user.id, xpEarned);
        }

        if (challenge.type === "READING") {
          const readingResults = await db.recordBibleReadingForDay(
            ctx.user.id,
            challenge.devotionalDayId
          );

          for (const result of readingResults) {
            if (result.progress?.isCompleted) {
              await checkAndAwardBookMedal(ctx.user.id, result.bookName);
            }
          }
        }

        // Check and award medals
        await checkAndAwardAllMedals(ctx.user.id);
        
        // Check time-based medals (early bird, night owl)
        await checkTimeBasedMedals(ctx.user.id);

        return {
          success: true,
          xpEarned,
          denariosEarned,
        };
      }),
  }),

  // ============================================
  // SHOP
  // ============================================
  shop: router({
    items: protectedProcedure.query(async ({ ctx }) => {
      const [items, userItems, user, medalCount] = await Promise.all([
        db.getAllShopItems(),
        db.getUserItems(ctx.user.id),
        db.getUserById(ctx.user.id),
        db.getUserMedalCount(ctx.user.id),
      ]);
      if (!user) {
        throw new Error("User not found");
      }
      const ownedItemIds = new Set(userItems.map((ui) => ui.itemId));

      return items.map((item) => {
        const owned = ownedItemIds.has(item.id);
        const rule = getRarityRule(item.rarity);
        const lock = getRarityLock(item.rarity, user.level, medalCount);
        const isLocked = !item.isAvailable || (!owned && lock.isLocked);
        const lockReason = !item.isAvailable ? "Indisponivel" : lock.reason;

        return {
          id: item.id,
          name: item.name,
          type: item.type,
          rarity: item.rarity,
          imageUrl: item.imageUrl,
          avatarConfig: item.avatarConfig,
          priceDenario: item.priceDenario,
          description: item.description,
          owned,
          isLocked,
          lockReason,
          minLevel: rule.minLevel,
          medalsRequired: rule.medalsRequired,
        };
      });
    }),

    userItems: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserItems(ctx.user.id);
    }),

    buy: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getShopItemById(input.itemId);
        if (!item) {
          throw new Error("Item not found");
        }

        if (!item.isAvailable) {
          throw new Error("Item not available");
        }

        const alreadyOwned = await db.userOwnsItem(ctx.user.id, input.itemId);
        if (alreadyOwned) {
          throw new Error("Item already owned");
        }

        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new Error("User not found");
        }
        const medalCount = await db.getUserMedalCount(ctx.user.id);
        const lock = getRarityLock(item.rarity, user.level, medalCount);
        if (lock.isLocked) {
          throw new Error(lock.reason || "Item locked");
        }

        if (user.denarioBalance < item.priceDenario) {
          throw new Error("Insufficient denarios");
        }

        await db.purchaseItem(ctx.user.id, input.itemId, item.priceDenario);

        return { success: true };
      }),

    equipItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.equipItem(ctx.user.id, input.itemId);
        return { success: true };
      }),

    unequipItem: protectedProcedure
      .input(
        z.object({
          itemType: z.enum(["BACKGROUND", "CLOTHES", "ACCESSORY", "HAIR_STYLE", "HAIR_COLOR"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.unequipItem(ctx.user.id, input.itemType);
        return { success: true };
      }),

    equippedItems: protectedProcedure.query(async ({ ctx }) => {
      return db.getEquippedItems(ctx.user.id);
    }),
  }),

  // ============================================
  // LEADERBOARD
  // ============================================
  leaderboard: router({
    monthly: protectedProcedure.query(async ({ ctx }) => {
      const period = await db.getActiveRankingPeriod("MONTH");
      if (!period) {
        return {
          rankings: [],
          userPosition: null,
        };
      }

      const rankings = await db.getLeaderboard(period.id);
      const userPosition = await db.getUserRankingPosition(period.id, ctx.user.id);

      return {
        rankings: rankings.map((r, index) => ({
          position: index + 1,
          userId: r.userId,
          nickname: r.nickname,
          level: r.level,
          xpTotal: r.xpTotal,
        })),
        userPosition,
      };
    }),

    yearly: protectedProcedure.query(async ({ ctx }) => {
      const period = await db.getActiveRankingPeriod("YEAR");
      if (!period) {
        return {
          rankings: [],
          userPosition: null,
        };
      }

      const rankings = await db.getLeaderboard(period.id);
      const userPosition = await db.getUserRankingPosition(period.id, ctx.user.id);

      return {
        rankings: rankings.map((r, index) => ({
          position: index + 1,
          userId: r.userId,
          nickname: r.nickname,
          level: r.level,
          xpTotal: r.xpTotal,
        })),
        userPosition,
      };
    }),
  }),

  // ============================================
  // GROUPS / CELLS
  // ============================================
  groups: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllGroups();
    }),

    myGroup: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserGroup(ctx.user.id);
    }),

    details: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ input }) => {
        const group = await db.getGroupById(input.groupId);
        if (!group) {
          throw new Error("Grupo não encontrado");
        }

        const members = await db.getGroupMembers(input.groupId);

        return {
          group,
          members: members.filter((m) => m.status === "approved"),
        };
      }),

    requestJoin: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.requestJoinGroup(ctx.user.id, input.groupId);
        return { success: true };
      }),

    pendingRequests: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .query(async ({ ctx, input }) => {
        await ensureLeaderAccess(ctx.user, input.groupId);
        return await db.getPendingGroupRequests(input.groupId);
      }),

    approveRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const request = await ensureLeaderRequestAccess(ctx.user, input.requestId);
        if (request.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
        }
        await db.approveGroupMember(input.requestId, ctx.user.id);
        return { success: true };
      }),

    rejectRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const request = await ensureLeaderRequestAccess(ctx.user, input.requestId);
        if (request.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
        }
        await db.rejectGroupMember(input.requestId);
        return { success: true };
      }),

    ranking: protectedProcedure.query(async () => {
      return await db.getGroupRanking(10);
    }),
  }),

  // ============================================
  // LEADER DASHBOARD
  // ============================================
  leader: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "leader" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Leader role required" });
      }

      const group = await db.getGroupByLeaderId(ctx.user.id);
      if (!group) {
        return {
          group: null,
          members: [],
          pendingRequests: [],
        };
      }

      const [members, pendingRequests] = await Promise.all([
        db.getGroupMembersForLeader(group.id),
        db.getPendingGroupRequests(group.id),
      ]);

      return {
        group,
        members,
        pendingRequests,
      };
    }),

    approveRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const request = await ensureLeaderRequestAccess(ctx.user, input.requestId);
        if (request.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
        }
        await db.approveGroupMember(input.requestId, ctx.user.id);
        return { success: true };
      }),

    rejectRequest: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const request = await ensureLeaderRequestAccess(ctx.user, input.requestId);
        if (request.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
        }
        await db.rejectGroupMember(input.requestId);
        return { success: true };
      }),
  }),

  // ============================================
  // MEDALS / BADGES
  // ============================================
  medals: router({
    // Get all medals with user's progress
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserMedalsWithProgress(ctx.user.id);
    }),

    // Get only earned medals
    earned: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserMedals(ctx.user.id);
    }),

    // Update Bible reading progress
    updateBibleProgress: protectedProcedure
      .input(
        z.object({
          bookName: z.string(),
          chaptersRead: z.number().min(0),
          totalChapters: z.number().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.updateBibleReadingProgress(
          ctx.user.id,
          input.bookName,
          input.chaptersRead,
          input.totalChapters
        );

        // Check if book is completed and award medal
        if (result?.isCompleted) {
          await checkAndAwardBookMedal(ctx.user.id, input.bookName);
        }

        return { success: true, progress: result };
      }),

    // Get user's Bible reading progress
    bibleProgress: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBibleProgress(ctx.user.id);
    }),

    // Manually check and award medals (for testing or admin)
    checkMedals: protectedProcedure.mutation(async ({ ctx }) => {
      await checkAndAwardAllMedals(ctx.user.id);
      return { success: true };
    }),
  }),
});

// Medal checking logic moved to server/medal-helpers.ts

export type AppRouter = typeof appRouter;

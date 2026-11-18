import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as engagement from "./engagement";
import { ENCOURAGEMENT_TYPES } from "../shared/engagement";

/** Wraps rule violations thrown by the engagement layer as BAD_REQUEST. */
const asBadRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: (error as Error).message,
    });
  }
};

export const engagementRouter = router({
  // Weekly quests
  weeklyQuests: protectedProcedure.query(({ ctx }) =>
    engagement.getWeeklyQuests(ctx.user.id),
  ),

  claimQuest: protectedProcedure
    .input(z.object({ questId: z.string().max(50) }))
    .mutation(({ ctx, input }) =>
      asBadRequest(() => engagement.claimQuest(ctx.user.id, input.questId)),
    ),

  // Cell weekly goal (members of the cell, its leader or admins)
  groupWeek: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ ctx, input }) => {
      const group = await db.getGroupById(input.groupId);
      if (!group)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Célula não encontrada",
        });
      const membership = await db.getUserGroup(ctx.user.id);
      const allowed =
        membership?.groupId === input.groupId ||
        group.leaderId === ctx.user.id ||
        ctx.user.role === "admin";
      if (!allowed)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Apenas membros da célula",
        });
      return engagement.getGroupWeek(input.groupId, ctx.user.id);
    }),

  claimGroupChest: protectedProcedure
    .input(z.object({ weekKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .mutation(({ ctx, input }) =>
      asBadRequest(() =>
        engagement.claimGroupChest(ctx.user.id, input.weekKey),
      ),
    ),

  // Encouragements
  encourage: protectedProcedure
    .input(
      z.object({ toUserId: z.number(), type: z.enum(ENCOURAGEMENT_TYPES) }),
    )
    .mutation(({ ctx, input }) =>
      asBadRequest(() =>
        engagement.sendEncouragement(ctx.user.id, input.toUserId, input.type),
      ),
    ),

  inbox: protectedProcedure.query(({ ctx }) =>
    engagement.getEncouragementInbox(ctx.user.id),
  ),

  markInboxSeen: protectedProcedure.mutation(({ ctx }) =>
    engagement.markEncouragementsSeen(ctx.user.id),
  ),

  // Weekly league
  league: protectedProcedure.query(({ ctx }) =>
    engagement.getLeague(ctx.user.id),
  ),
});

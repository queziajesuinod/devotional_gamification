/**
 * Phase 2 data layer: daily activity, weekly quests, cell weekly goal + chest,
 * encouragements and weekly leagues. Rules live in shared/engagement.ts.
 */
import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import {
  challenges,
  encouragements,
  encouragementMessages,
  groupChestClaims,
  groupMembers,
  groups,
  leagueMemberships,
  userActivityDays,
  userChallenges,
  users,
  weeklyQuestClaims,
} from "../drizzle/schema";
import { getDb, getFigurinesForUsers, getUserGroup } from "./db";
import { grantReward } from "./rewards";
import { getCampoGrandeDateString } from "../shared/_core/time";
import { weekKey } from "../shared/progression";
import {
  ENCOURAGEMENT_INFO,
  isEncouragementType,
  type EncouragementMessageView,
  GROUP_CHEST_REWARD,
  groupWeeklyGoal,
  leagueZones,
  previousWeekKey,
  questProgress,
  questsForWeek,
  resolveInactiveWeeks,
  resolveLeagueWeek,
  weekDays,
  weekRange,
  type EncouragementType,
  type LeagueOutcome,
  type LeagueTier,
  type WeeklyStats,
} from "../shared/engagement";

const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
};

// ============================================
// DAILY ACTIVITY
// ============================================

/**
 * Records a completed challenge on today's activity row.
 * Returns whether this completion closed the whole day (all challenges done).
 */
export async function recordActivity(params: {
  userId: number;
  xp: number;
  challengeType: string;
  devotionalDayId: number;
}) {
  const db = await requireDb();
  const day = getCampoGrandeDateString();
  const isReflection = params.challengeType === "REFLECTION" ? 1 : 0;
  const isReading = params.challengeType === "READING" ? 1 : 0;

  // Did the user finish every challenge of this devotional day?
  const [{ total, done }] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(${userChallenges.completedAt})::int`,
    })
    .from(challenges)
    .leftJoin(
      userChallenges,
      and(
        eq(userChallenges.challengeId, challenges.id),
        eq(userChallenges.userId, params.userId),
      ),
    )
    .where(eq(challenges.devotionalDayId, params.devotionalDayId));
  const dayComplete = total > 0 && done >= total;

  const [before] = await db
    .select({ fullDay: userActivityDays.fullDay })
    .from(userActivityDays)
    .where(
      and(
        eq(userActivityDays.userId, params.userId),
        eq(userActivityDays.day, day),
      ),
    )
    .limit(1);

  await db
    .insert(userActivityDays)
    .values({
      userId: params.userId,
      day,
      challengesCompleted: 1,
      xp: params.xp,
      reflections: isReflection,
      readings: isReading,
      fullDay: dayComplete,
    })
    .onConflictDoUpdate({
      target: [userActivityDays.userId, userActivityDays.day],
      set: {
        challengesCompleted: sql`${userActivityDays.challengesCompleted} + 1`,
        xp: sql`${userActivityDays.xp} + ${params.xp}`,
        reflections: sql`${userActivityDays.reflections} + ${isReflection}`,
        readings: sql`${userActivityDays.readings} + ${isReading}`,
        fullDay: sql`${userActivityDays.fullDay} OR ${dayComplete}`,
        updatedAt: new Date(),
      },
    });

  return { dayComplete: dayComplete && !before?.fullDay };
}

export async function getWeeklyStats(
  userId: number,
  week: string,
): Promise<WeeklyStats> {
  const db = await requireDb();
  const { start, end } = weekRange(week);

  const [activity] = await db
    .select({
      daysActive: sql<number>`count(*)::int`,
      reflections: sql<number>`coalesce(sum(${userActivityDays.reflections}), 0)::int`,
      readings: sql<number>`coalesce(sum(${userActivityDays.readings}), 0)::int`,
      fullDays: sql<number>`count(*) filter (where ${userActivityDays.fullDay})::int`,
      xp: sql<number>`coalesce(sum(${userActivityDays.xp}), 0)::int`,
    })
    .from(userActivityDays)
    .where(
      and(
        eq(userActivityDays.userId, userId),
        gte(userActivityDays.day, start),
        lte(userActivityDays.day, end),
        gt(userActivityDays.challengesCompleted, 0),
      ),
    );

  const [sent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(encouragements)
    .where(
      and(
        eq(encouragements.fromUserId, userId),
        gte(encouragements.day, start),
        lte(encouragements.day, end),
      ),
    );

  return {
    daysActive: activity?.daysActive ?? 0,
    reflections: activity?.reflections ?? 0,
    readings: activity?.readings ?? 0,
    fullDays: activity?.fullDays ?? 0,
    xp: activity?.xp ?? 0,
    encouragementsSent: sent?.count ?? 0,
  };
}

// ============================================
// WEEKLY QUESTS
// ============================================

export async function getWeeklyQuests(userId: number) {
  const db = await requireDb();
  const today = getCampoGrandeDateString();
  const week = weekKey(today);
  const group = await getUserGroup(userId);
  const [stats, claims] = await Promise.all([
    getWeeklyStats(userId, week),
    db
      .select({ questId: weeklyQuestClaims.questId })
      .from(weeklyQuestClaims)
      .where(
        and(
          eq(weeklyQuestClaims.userId, userId),
          eq(weeklyQuestClaims.weekKey, week),
        ),
      ),
  ]);
  const claimed = new Set(claims.map((c) => c.questId));
  const days = weekDays(today);

  return {
    weekKey: week,
    daysLeft: days.length - days.indexOf(today) - 1,
    stats,
    quests: questsForWeek(week, !!group).map((quest) => ({
      ...quest,
      ...questProgress(quest, stats),
      claimed: claimed.has(quest.id),
    })),
  };
}

export async function claimQuest(userId: number, questId: string) {
  const db = await requireDb();
  const week = weekKey(getCampoGrandeDateString());
  const group = await getUserGroup(userId);
  const quest = questsForWeek(week, !!group).find((q) => q.id === questId);
  if (!quest) throw new Error("Missão não disponível nesta semana");

  const stats = await getWeeklyStats(userId, week);
  if (!questProgress(quest, stats).done)
    throw new Error("Missão ainda não concluída");

  const inserted = await db
    .insert(weeklyQuestClaims)
    .values({ userId, weekKey: week, questId })
    .onConflictDoNothing()
    .returning({ id: weeklyQuestClaims.id });
  if (inserted.length === 0) throw new Error("Recompensa já resgatada");

  return grantReward(
    userId,
    { xp: quest.xpReward, denario: quest.denarioReward },
    "QUEST",
    `Missão semanal: ${quest.title}`,
  );
}

// ============================================
// CELL WEEKLY GOAL + CHEST
// ============================================

async function getApprovedMembers(groupId: number) {
  const db = await requireDb();
  return db
    .select({
      userId: groupMembers.userId,
      nickname: users.nickname,
      name: users.name,
      xpTotal: users.xpTotal,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.status, "approved"),
      ),
    );
}

async function getGroupWeekProgress(groupId: number, week: string) {
  const db = await requireDb();
  const members = await getApprovedMembers(groupId);
  const memberIds = members.map((m) => m.userId);
  const { start, end } = weekRange(week);

  const activity = memberIds.length
    ? await db
        .select({ userId: userActivityDays.userId, day: userActivityDays.day })
        .from(userActivityDays)
        .where(
          and(
            inArray(userActivityDays.userId, memberIds),
            gte(userActivityDays.day, start),
            lte(userActivityDays.day, end),
            gt(userActivityDays.challengesCompleted, 0),
          ),
        )
    : [];

  const daysByUser = new Map<number, string[]>();
  for (const row of activity) {
    const list = daysByUser.get(row.userId) ?? [];
    list.push(String(row.day).slice(0, 10));
    daysByUser.set(row.userId, list);
  }

  const goal = groupWeeklyGoal(members.length);
  const progress = activity.length;
  return {
    members,
    daysByUser,
    goal,
    progress,
    reached: members.length > 0 && progress >= goal,
  };
}

/** Cell weekly goal, chest state and per-member week for the viewer. */
export async function getGroupWeek(groupId: number, viewerId: number) {
  const db = await requireDb();
  const today = getCampoGrandeDateString();
  const week = weekKey(today);
  const prevWeek = previousWeekKey(today);

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) throw new Error("Célula não encontrada");

  const [current, previous, claims, sentToday] = await Promise.all([
    getGroupWeekProgress(groupId, week),
    getGroupWeekProgress(groupId, prevWeek),
    db
      .select({ weekKey: groupChestClaims.weekKey })
      .from(groupChestClaims)
      .where(
        and(
          eq(groupChestClaims.userId, viewerId),
          eq(groupChestClaims.groupId, groupId),
          inArray(groupChestClaims.weekKey, [week, prevWeek]),
        ),
      ),
    db
      .select({ toUserId: encouragements.toUserId })
      .from(encouragements)
      .where(
        and(
          eq(encouragements.fromUserId, viewerId),
          eq(encouragements.day, today),
        ),
      ),
  ]);

  const claimedWeeks = new Set(claims.map((c) => c.weekKey));
  const isMember = current.members.some((m) => m.userId === viewerId);
  const canClaim = (progress: typeof current, wk: string) =>
    isMember &&
    progress.reached &&
    (progress.daysByUser.get(viewerId)?.length ?? 0) > 0 &&
    !claimedWeeks.has(wk);
  const encouragedToday = new Set(sentToday.map((s) => s.toUserId));

  return {
    group: { id: group.id, name: group.name, leaderId: group.leaderId },
    weekKey: week,
    weekDays: weekDays(today),
    today,
    goal: current.goal,
    progress: current.progress,
    reached: current.reached,
    chestReward: GROUP_CHEST_REWARD,
    chest: {
      canClaimCurrent: canClaim(current, week),
      claimedCurrent: claimedWeeks.has(week),
      canClaimPrevious: canClaim(previous, prevWeek),
      previousWeekKey: prevWeek,
    },
    isMember,
    members: current.members
      .map((m) => ({
        userId: m.userId,
        nickname: m.nickname || m.name || "Membro",
        activeDays: (current.daysByUser.get(m.userId) ?? []).sort(),
        encouragedToday: encouragedToday.has(m.userId),
      }))
      .sort((a, b) => b.activeDays.length - a.activeDays.length),
  };
}

export async function claimGroupChest(userId: number, week: string) {
  const db = await requireDb();
  const today = getCampoGrandeDateString();
  if (week !== weekKey(today) && week !== previousWeekKey(today)) {
    throw new Error("Este baú não está mais disponível");
  }
  const membership = await getUserGroup(userId);
  if (!membership) throw new Error("Você precisa estar em uma célula");

  const progress = await getGroupWeekProgress(membership.groupId, week);
  if (!progress.reached) throw new Error("A célula ainda não atingiu a meta");
  if ((progress.daysByUser.get(userId)?.length ?? 0) === 0) {
    throw new Error(
      "Participe de pelo menos um dia da semana para abrir o baú",
    );
  }

  const inserted = await db
    .insert(groupChestClaims)
    .values({ userId, groupId: membership.groupId, weekKey: week })
    .onConflictDoNothing()
    .returning({ id: groupChestClaims.id });
  if (inserted.length === 0) throw new Error("Baú já aberto");

  return grantReward(
    userId,
    GROUP_CHEST_REWARD,
    "GROUP_CHEST",
    `Baú da célula ${membership.groupName}`,
  );
}

// ============================================
// ENCOURAGEMENTS
// ============================================

/** Messages a player can send (admin-configured, active, in order). */
export async function listEncouragementMessages(includeInactive = false): Promise<EncouragementMessageView[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(encouragementMessages)
    .where(includeInactive ? undefined : eq(encouragementMessages.isActive, true))
    .orderBy(asc(encouragementMessages.sortOrder), asc(encouragementMessages.id));
  return rows.map(toMessageView);
}

const toMessageView = (m: typeof encouragementMessages.$inferSelect): EncouragementMessageView => {
  const category: EncouragementType = isEncouragementType(m.category) ? m.category : "CHEER";
  return {
    id: m.id,
    label: m.label,
    received: m.receivedText,
    emoji: m.emoji,
    category,
    icon: ENCOURAGEMENT_INFO[category].icon,
  };
};

export async function sendEncouragement(
  fromUserId: number,
  toUserId: number,
  messageId: number,
) {
  if (fromUserId === toUserId) throw new Error("Escolha outro membro");
  const db = await requireDb();
  const [message] = await db
    .select()
    .from(encouragementMessages)
    .where(and(eq(encouragementMessages.id, messageId), eq(encouragementMessages.isActive, true)))
    .limit(1);
  if (!message) throw new Error("Essa mensagem não está mais disponível");
  const type: EncouragementType = isEncouragementType(message.category) ? message.category : "CHEER";

  const [fromGroup, toGroup] = await Promise.all([
    getUserGroup(fromUserId),
    getUserGroup(toUserId),
  ]);
  if (!fromGroup || !toGroup || fromGroup.groupId !== toGroup.groupId) {
    throw new Error("Vocês precisam estar na mesma célula");
  }

  const inserted = await db
    .insert(encouragements)
    .values({
      fromUserId,
      toUserId,
      groupId: fromGroup.groupId,
      type,
      messageId: message.id,
      day: getCampoGrandeDateString(),
    })
    .onConflictDoNothing()
    .returning({ id: encouragements.id });
  if (inserted.length === 0)
    throw new Error("Você já encorajou essa pessoa hoje");

  return { success: true };
}

/** Encouragements received in the last 7 days. */
export async function getEncouragementInbox(userId: number) {
  const db = await requireDb();
  const since = new Date(Date.now() - 7 * 86_400_000);
  const rows = await db
    .select({
      id: encouragements.id,
      type: encouragements.type,
      createdAt: encouragements.createdAt,
      seenAt: encouragements.seenAt,
      fromUserId: encouragements.fromUserId,
      fromNickname: users.nickname,
      messageLabel: encouragementMessages.label,
      messageReceived: encouragementMessages.receivedText,
      messageEmoji: encouragementMessages.emoji,
    })
    .from(encouragements)
    .innerJoin(users, eq(encouragements.fromUserId, users.id))
    .leftJoin(encouragementMessages, eq(encouragements.messageId, encouragementMessages.id))
    .where(
      and(
        eq(encouragements.toUserId, userId),
        gte(encouragements.createdAt, since),
      ),
    )
    .orderBy(desc(encouragements.createdAt))
    .limit(30);
  const faces = await getFigurinesForUsers(rows.map((r) => r.fromUserId));

  return {
    unseen: rows.filter((r) => !r.seenAt).length,
    items: rows.map(({ messageLabel, messageReceived, messageEmoji, ...r }) => {
      // Old encouragements (before messages were configurable) fall back to their category
      const info = ENCOURAGEMENT_INFO[r.type];
      return {
        ...r,
        figurine: faces.get(r.fromUserId) ?? null,
        label: messageLabel ?? info.label,
        icon: info.icon,
        emoji: messageEmoji || info.emoji,
        text: `${r.fromNickname} ${messageReceived ?? info.received}`,
      };
    }),
  };
}

export async function markEncouragementsSeen(userId: number) {
  const db = await requireDb();
  await db
    .update(encouragements)
    .set({ seenAt: new Date() })
    .where(
      and(eq(encouragements.toUserId, userId), isNull(encouragements.seenAt)),
    );
  return { success: true };
}

// ============================================
// LEAGUES
// ============================================

async function rankInLeague(week: string, tier: LeagueTier, xp: number) {
  const db = await requireDb();
  const [row] = await db
    .select({
      size: sql<number>`count(*)::int`,
      above: sql<number>`count(*) filter (where ${leagueMemberships.xp} > ${xp})::int`,
    })
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.weekKey, week),
        eq(leagueMemberships.tier, tier),
      ),
    );
  return { rank: (row?.above ?? 0) + 1, size: row?.size ?? 1 };
}

/**
 * Returns the user's membership for the current week, creating it (and resolving
 * last week's promotion/demotion) on first access.
 */
export async function ensureLeagueMembership(userId: number) {
  const db = await requireDb();
  const today = getCampoGrandeDateString();
  const week = weekKey(today);

  const [existing] = await db
    .select()
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, userId),
        eq(leagueMemberships.weekKey, week),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [last] = await db
    .select()
    .from(leagueMemberships)
    .where(eq(leagueMemberships.userId, userId))
    .orderBy(desc(leagueMemberships.weekKey))
    .limit(1);

  let tier: LeagueTier = "BRONZE";
  let outcome: LeagueOutcome | null = null;
  let previousRank: number | null = null;

  if (last) {
    if (last.weekKey === previousWeekKey(today)) {
      const { rank, size } = await rankInLeague(
        last.weekKey,
        last.tier,
        last.xp,
      );
      ({ tier, outcome } = resolveLeagueWeek({
        tier: last.tier,
        rank,
        size,
        xp: last.xp,
      }));
      previousRank = rank;
    } else {
      ({ tier, outcome } = resolveInactiveWeeks(last.tier));
    }
  }

  await db
    .insert(leagueMemberships)
    .values({
      userId,
      weekKey: week,
      tier,
      xp: 0,
      previousOutcome: outcome,
      previousRank,
    })
    .onConflictDoNothing();

  const [created] = await db
    .select()
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.userId, userId),
        eq(leagueMemberships.weekKey, week),
      ),
    )
    .limit(1);
  return created;
}

export async function addLeagueXp(userId: number, xp: number) {
  if (xp <= 0) return;
  const db = await requireDb();
  const membership = await ensureLeagueMembership(userId);
  await db
    .update(leagueMemberships)
    .set({ xp: sql`${leagueMemberships.xp} + ${xp}` })
    .where(eq(leagueMemberships.id, membership.id));
}

export async function getLeague(userId: number) {
  const db = await requireDb();
  const me = await ensureLeagueMembership(userId);
  const today = getCampoGrandeDateString();
  const days = weekDays(today);

  const standings = await db
    .select({
      userId: leagueMemberships.userId,
      xp: leagueMemberships.xp,
      nickname: users.nickname,
      xpTotal: users.xpTotal,
    })
    .from(leagueMemberships)
    .innerJoin(users, eq(leagueMemberships.userId, users.id))
    .where(
      and(
        eq(leagueMemberships.weekKey, me.weekKey),
        eq(leagueMemberships.tier, me.tier),
      ),
    )
    .orderBy(desc(leagueMemberships.xp), leagueMemberships.createdAt)
    .limit(100);

  const faces = await getFigurinesForUsers(standings.map((s) => s.userId));
  const size = standings.length;
  const zones = leagueZones(size);
  const myIndex = standings.findIndex((s) => s.userId === userId);

  return {
    weekKey: me.weekKey,
    tier: me.tier,
    daysLeft: days.length - days.indexOf(today) - 1,
    previousOutcome: me.previousOutcome as LeagueOutcome | null,
    previousRank: me.previousRank,
    myRank: myIndex >= 0 ? myIndex + 1 : null,
    myXp: me.xp,
    size,
    promoteUntil: me.tier === "DIAMOND" ? 0 : zones.promoteUntil,
    demoteFrom:
      me.tier === "BRONZE"
        ? null
        : Number.isFinite(zones.demoteFrom)
          ? zones.demoteFrom
          : null,
    standings: standings.map((s, i) => ({
      ...s,
      position: i + 1,
      isMe: s.userId === userId,
      figurine: faces.get(s.userId) ?? null,
    })),
  };
}

/**
 * Phase 2 rules: weekly quests, cell (group) weekly goal and weekly leagues.
 * Pure functions only, so they can be shared by server and app and unit-tested.
 */
import type { GameIconName } from "../components/game-icon";
import { weekKey } from "./progression";

// ============================================
// WEEKS
// ============================================

const addDays = (dateString: string, days: number) => {
  const [y, m, d] = dateString.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
};

/** Monday..Sunday date strings (YYYY-MM-DD) of the week containing `dateString`. */
export const weekDays = (dateString: string) => {
  const start = weekKey(dateString);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const weekRange = (dateString: string) => {
  const days = weekDays(dateString);
  return { start: days[0], end: days[6] };
};

export const previousWeekKey = (dateString: string) =>
  weekKey(addDays(weekKey(dateString), -7));

// ============================================
// WEEKLY QUESTS
// ============================================

export type WeeklyStats = {
  daysActive: number;
  reflections: number;
  readings: number;
  fullDays: number;
  xp: number;
  encouragementsSent: number;
};

export type QuestMetric = keyof WeeklyStats;

export type QuestDefinition = {
  id: string;
  title: string;
  emoji: string;
  icon: GameIconName;
  metric: QuestMetric;
  target: number;
  xpReward: number;
  denarioReward: number;
  requiresGroup?: boolean;
};

export const QUEST_CATALOG: QuestDefinition[] = [
  {
    id: "days-5",
    title: "Faça desafios em 5 dias da semana",
    emoji: "📅",
    icon: "calendar",
    metric: "daysActive",
    target: 5,
    xpReward: 50,
    denarioReward: 50,
  },
  {
    id: "reflections-3",
    title: "Escreva 3 reflexões",
    emoji: "💭",
    icon: "reflection",
    metric: "reflections",
    target: 3,
    xpReward: 40,
    denarioReward: 40,
  },
  {
    id: "readings-5",
    title: "Conclua 5 leituras bíblicas",
    emoji: "📖",
    icon: "reading-purple",
    metric: "readings",
    target: 5,
    xpReward: 40,
    denarioReward: 40,
  },
  {
    id: "fulldays-3",
    title: "Complete todos os desafios do dia 3 vezes",
    emoji: "✅",
    icon: "trophy",
    metric: "fullDays",
    target: 3,
    xpReward: 50,
    denarioReward: 50,
  },
  {
    id: "xp-250",
    title: "Ganhe 250 XP nesta semana",
    emoji: "⚡",
    icon: "bolt",
    metric: "xp",
    target: 250,
    xpReward: 30,
    denarioReward: 40,
  },
  {
    id: "encourage-3",
    title: "Encoraje 3 pessoas da sua célula",
    emoji: "🙏",
    icon: "pray",
    metric: "encouragementsSent",
    target: 3,
    xpReward: 30,
    denarioReward: 40,
    requiresGroup: true,
  },
  {
    id: "days-7",
    title: "Esteja presente todos os 7 dias",
    emoji: "🔥",
    icon: "streak",
    metric: "daysActive",
    target: 7,
    xpReward: 80,
    denarioReward: 80,
  },
  {
    id: "reflections-5",
    title: "Escreva 5 reflexões",
    emoji: "✍️",
    icon: "reflection",
    metric: "reflections",
    target: 5,
    xpReward: 60,
    denarioReward: 50,
  },
];

export const QUESTS_PER_WEEK = 3;

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/**
 * The week's quests. Same for everyone (so a cell shares the same goals), picked
 * deterministically from the week key. Group-only quests are skipped for users
 * without a cell. Never two quests on the same metric.
 */
export const questsForWeek = (
  week: string,
  inGroup: boolean,
): QuestDefinition[] => {
  const pool = QUEST_CATALOG.filter((q) => inGroup || !q.requiresGroup);
  const start = hashString(week) % pool.length;
  const picked: QuestDefinition[] = [];
  for (let i = 0; i < pool.length && picked.length < QUESTS_PER_WEEK; i += 1) {
    const quest = pool[(start + i * 3) % pool.length];
    if (!picked.some((p) => p.id === quest.id || p.metric === quest.metric))
      picked.push(quest);
  }
  // Fallback in case the stride skipped too many
  for (const quest of pool) {
    if (picked.length >= QUESTS_PER_WEEK) break;
    if (!picked.some((p) => p.id === quest.id || p.metric === quest.metric))
      picked.push(quest);
  }
  return picked;
};

export const questProgress = (quest: QuestDefinition, stats: WeeklyStats) => {
  const current = Math.min(stats[quest.metric] ?? 0, quest.target);
  return { current, target: quest.target, done: current >= quest.target };
};

// ============================================
// CELL (GROUP) WEEKLY GOAL
// ============================================

/** Active days per member the cell aims for each week. */
export const GROUP_DAYS_PER_MEMBER = 4;
export const GROUP_CHEST_REWARD = { xp: 40, denario: 60 };

export const groupWeeklyGoal = (memberCount: number) =>
  Math.max(1, memberCount) * GROUP_DAYS_PER_MEMBER;

// ============================================
// LEAGUES
// ============================================

export const LEAGUE_TIERS = ["BRONZE", "SILVER", "GOLD", "DIAMOND"] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];

export const LEAGUE_INFO: Record<
  LeagueTier,
  { label: string; emoji: string; icon: GameIconName; color: string }
> = {
  BRONZE: { label: "Liga Bronze", emoji: "🥉", icon: "medal-bronze", color: "#B87333" },
  SILVER: { label: "Liga Prata", emoji: "🥈", icon: "medal-silver", color: "#9CA3AF" },
  GOLD: { label: "Liga Ouro", emoji: "🥇", icon: "medal-gold", color: "#EAB308" },
  DIAMOND: { label: "Liga Diamante", emoji: "💎", icon: "medal-diamond", color: "#38BDF8" },
};

/** Share of a league promoted / demoted at the end of the week. */
export const LEAGUE_PROMOTE_SHARE = 0.2;
export const LEAGUE_DEMOTE_SHARE = 0.2;
/** Demotion by rank only applies to leagues at least this big (zero XP always demotes). */
export const LEAGUE_MIN_SIZE_FOR_DEMOTION = 5;

export type LeagueOutcome = "promoted" | "demoted" | "stayed";

const shift = (tier: LeagueTier, delta: number): LeagueTier => {
  const index = Math.min(
    LEAGUE_TIERS.length - 1,
    Math.max(0, LEAGUE_TIERS.indexOf(tier) + delta),
  );
  return LEAGUE_TIERS[index];
};

/** Zones for a league of `size` players (1-based ranks). */
export const leagueZones = (size: number) => ({
  promoteUntil: Math.max(1, Math.ceil(size * LEAGUE_PROMOTE_SHARE)),
  demoteFrom:
    size >= LEAGUE_MIN_SIZE_FOR_DEMOTION
      ? size - Math.floor(size * LEAGUE_DEMOTE_SHARE) + 1
      : Infinity,
});

/**
 * Result of a finished week.
 * - rank: 1-based position inside the tier, size: players in that tier that week
 */
export const resolveLeagueWeek = (params: {
  tier: LeagueTier;
  rank: number;
  size: number;
  xp: number;
}): { tier: LeagueTier; outcome: LeagueOutcome } => {
  const { tier, rank, size, xp } = params;
  const zones = leagueZones(size);
  if (xp > 0 && rank <= zones.promoteUntil && tier !== "DIAMOND") {
    return { tier: shift(tier, 1), outcome: "promoted" };
  }
  if ((xp <= 0 || rank >= zones.demoteFrom) && tier !== "BRONZE") {
    return { tier: shift(tier, -1), outcome: "demoted" };
  }
  return { tier, outcome: "stayed" };
};

/** A player who skipped one or more whole weeks drops one tier. */
export const resolveInactiveWeeks = (
  tier: LeagueTier,
): { tier: LeagueTier; outcome: LeagueOutcome } =>
  tier === "BRONZE"
    ? { tier, outcome: "stayed" }
    : { tier: shift(tier, -1), outcome: "demoted" };

// ============================================
// ENCOURAGEMENTS
// ============================================

export const ENCOURAGEMENT_TYPES = ["PRAYED", "CHEER", "PROUD"] as const;
export type EncouragementType = (typeof ENCOURAGEMENT_TYPES)[number];

export const ENCOURAGEMENT_INFO: Record<
  EncouragementType,
  { emoji: string; icon: GameIconName; label: string; received: string }
> = {
  PRAYED: { emoji: "🙏", icon: "pray", label: "Orei por você", received: "orou por você" },
  CHEER: {
    emoji: "👏",
    icon: "clap",
    label: "Continue firme!",
    received: "disse: continue firme!",
  },
  PROUD: {
    emoji: "💪",
    icon: "heart",
    label: "Você me inspira",
    received: "disse que você inspira",
  },
};

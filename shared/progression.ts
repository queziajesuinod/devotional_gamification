/**
 * Level curve, titles and level-up rewards.
 *
 * XP needed to go from level n to n+1 grows linearly:
 *   cost(n) = BASE_COST + STEP_COST * (n - 1)
 * With ~50 XP/day this puts an engaged user around level 10 after a month
 * and level ~35 after a full year, so levels keep meaning something.
 */
import type { GameIconName } from "../components/game-icon";


const BASE_COST = 50;
const STEP_COST = 25;

/** XP needed to go from `level` to `level + 1`. */
export const xpCostOfLevel = (level: number) =>
  BASE_COST + STEP_COST * (Math.max(1, level) - 1);

/** Total XP required to reach `level` (level 1 = 0 XP). */
export const totalXpForLevel = (level: number) => {
  const n = Math.max(1, Math.floor(level)) - 1;
  return BASE_COST * n + (STEP_COST * n * (n - 1)) / 2;
};

export const levelFromXp = (xpTotal: number) => {
  const xp = Math.max(0, Math.floor(xpTotal || 0));
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level += 1;
  return level;
};

export type LevelTitle = { minLevel: number; title: string; emoji: string; icon: GameIconName };

export const LEVEL_TITLES: LevelTitle[] = [
  { minLevel: 1, title: "Semente", emoji: "🌱", icon: "sprout" },
  { minLevel: 5, title: "Broto", emoji: "🌿", icon: "xp" },
  { minLevel: 10, title: "Semeador", emoji: "🌾", icon: "level-shield" },
  { minLevel: 15, title: "Discípulo", emoji: "📖", icon: "reading-purple" },
  { minLevel: 20, title: "Peregrino", emoji: "🥾", icon: "map" },
  { minLevel: 25, title: "Servo Fiel", emoji: "🤝", icon: "heart" },
  { minLevel: 30, title: "Atalaia", emoji: "🗼", icon: "bell" },
  { minLevel: 35, title: "Embaixador", emoji: "🕊️", icon: "grace" },
  { minLevel: 40, title: "Coluna", emoji: "🏛️", icon: "crown" },
];

export const getLevelTitle = (level: number): LevelTitle => {
  let current = LEVEL_TITLES[0];
  for (const entry of LEVEL_TITLES) {
    if (level >= entry.minLevel) current = entry;
  }
  return current;
};

/** True when reaching `level` unlocks a new title. */
export const isTitleLevel = (level: number) =>
  LEVEL_TITLES.some((t) => t.minLevel === level && level > 1);

/** Denários granted for reaching `level` (bigger on title levels). */
export const levelUpDenarioReward = (level: number) =>
  isTitleLevel(level) ? 100 : 10 + 2 * level;

export type LevelProgress = {
  level: number;
  title: LevelTitle;
  xpIntoLevel: number;
  xpForNextLevel: number;
  percent: number;
  nextTitle: LevelTitle | null;
};

export const getLevelProgress = (xpTotal: number): LevelProgress => {
  const level = levelFromXp(xpTotal);
  const xpIntoLevel = Math.max(
    0,
    Math.floor(xpTotal || 0) - totalXpForLevel(level),
  );
  const xpForNextLevel = xpCostOfLevel(level);
  const nextTitle = LEVEL_TITLES.find((t) => t.minLevel > level) ?? null;
  return {
    level,
    title: getLevelTitle(level),
    xpIntoLevel,
    xpForNextLevel,
    percent: Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)),
    nextTitle,
  };
};

// ============================================
// STREAK
// ============================================

export const STREAK_MILESTONES: { days: number; denarios: number }[] = [
  { days: 7, denarios: 50 },
  { days: 30, denarios: 200 },
  { days: 100, denarios: 500 },
  { days: 365, denarios: 1000 },
];

/** Max "Graças" (streak freezes) a user can hold at once. */
export const MAX_STREAK_FREEZES = 2;
/** Price in denários to buy one extra Graça. */
export const STREAK_FREEZE_PRICE = 60;

/** Difference in whole days between two YYYY-MM-DD strings (b - a). */
export const diffDateStrings = (a: string, b: string) => {
  const parse = (value: string) => {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
};

/** ISO-like week key (Monday-based) for a YYYY-MM-DD date. */
export const weekKey = (dateString: string) => {
  const [y, m, d] = dateString.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dayOfWeek);
  return date.toISOString().slice(0, 10);
};

export type StreakStatus =
  | "none"
  | "done_today"
  | "at_risk"
  | "protected"
  | "broken";

/**
 * Display state of a streak without mutating it.
 * - done_today: activity already counted today
 * - at_risk: last activity was yesterday, still time today
 * - protected: missed day(s) but enough Graças to cover them (if user acts today)
 * - broken: missed more days than Graças available
 */
export const getStreakStatus = (params: {
  currentStreak: number;
  lastActivityDate: string | null;
  freezes: number;
  today: string;
}): StreakStatus => {
  if (!params.lastActivityDate || params.currentStreak <= 0) return "none";
  const diff = diffDateStrings(params.lastActivityDate, params.today);
  if (diff <= 0) return "done_today";
  if (diff === 1) return "at_risk";
  return diff - 1 <= params.freezes ? "protected" : "broken";
};

import * as db from "./db";
import type { Medal } from "../drizzle/schema";

const parseRequirement = (value: string): Record<string, any> | null => {
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return null;
  }
};

const sameBook = (a: string, b: string) =>
  a.trim().toLocaleUpperCase("pt-BR") === b.trim().toLocaleUpperCase("pt-BR");

/** Current hour in the app's timezone (America/Campo_Grande). */
const campoGrandeHour = (date = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Campo_Grande",
      hour: "numeric",
      hour12: false,
    })
      .formatToParts(date)
      .find((p) => p.type === "hour")?.value ?? 0,
  ) % 24;

export type EarnedMedal = Pick<
  Medal,
  | "id"
  | "name"
  | "description"
  | "iconEmoji"
  | "iconUrl"
  | "tier"
  | "xpReward"
  | "denarioReward"
>;

const toEarned = (medal: Medal): EarnedMedal => ({
  id: medal.id,
  name: medal.name,
  description: medal.description,
  iconEmoji: medal.iconEmoji,
  iconUrl: medal.iconUrl,
  tier: medal.tier,
  xpReward: medal.xpReward,
  denarioReward: medal.denarioReward,
});

async function award(userId: number, medal: Medal, earned: EarnedMedal[]) {
  const result = await db.awardMedal(userId, medal.id);
  if (result?.isNew) earned.push(toEarned(medal));
}

type UserStats = {
  currentStreak: number;
  longestStreak: number;
  completedChallenges: number;
  reflections: number;
  countByType: (type: string) => Promise<number>;
  bibleProgress: {
    bookName: string;
    chaptersRead: number;
    totalChapters: number;
    isCompleted: boolean;
  }[];
};

async function loadStats(userId: number): Promise<UserStats | null> {
  const user = await db.getUserById(userId);
  if (!user) return null;
  const [completedChallenges, reflections, bibleProgress] = await Promise.all([
    db.getUserCompletedChallengesCount(userId),
    db.getUserReflections(userId),
    db.getUserBibleProgress(userId),
  ]);
  const typeCache = new Map<string, number>();
  return {
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    completedChallenges: Number(completedChallenges) || 0,
    reflections: reflections.length,
    bibleProgress,
    countByType: async (type) => {
      if (!typeCache.has(type)) {
        typeCache.set(
          type,
          Number(
            await db.getUserCompletedChallengesCountByType(userId, type),
          ) || 0,
        );
      }
      return typeCache.get(type)!;
    },
  };
}

/**
 * Progress towards a medal as { current, target }, or null when it can't be measured
 * (e.g. time-of-day medals).
 */
async function measure(requirement: Record<string, any>, stats: UserStats) {
  switch (requirement.type) {
    case "streak":
      return {
        current: stats.currentStreak,
        target: Number(requirement.days) || 0,
      };
    case "total_devotionals":
      return {
        current: stats.completedChallenges,
        target: Number(requirement.count) || 0,
      };
    case "first_devotional":
      return { current: Math.min(stats.completedChallenges, 1), target: 1 };
    case "total_reflections":
      return {
        current: stats.reflections,
        target: Number(requirement.count) || 0,
      };
    case "challenge_type_count":
      return {
        current: await stats.countByType(String(requirement.challengeType)),
        target: Number(requirement.count) || 0,
      };
    case "book": {
      const bookName = String(requirement.bookName ?? requirement.book ?? "");
      const row = stats.bibleProgress.find((b) =>
        sameBook(b.bookName, bookName),
      );
      const target = Number(requirement.chapters) || row?.totalChapters || 0;
      return {
        current: row?.isCompleted ? target : (row?.chaptersRead ?? 0),
        target,
      };
    }
    case "multiple_books": {
      const books: string[] = Array.isArray(requirement.books)
        ? requirement.books
        : [];
      const done = books.filter((book) =>
        stats.bibleProgress.some(
          (b) => b.isCompleted && sameBook(b.bookName, book),
        ),
      ).length;
      return { current: done, target: books.length };
    }
    default:
      return null;
  }
}

/**
 * Check and award all count/streak based medals.
 * Returns medals earned for the first time in this call.
 */
export async function checkAndAwardAllMedals(
  userId: number,
): Promise<EarnedMedal[]> {
  const earned: EarnedMedal[] = [];
  const stats = await loadStats(userId);
  if (!stats) return earned;

  const medals = await db.getAllMedals();
  for (const medal of medals) {
    const requirement = parseRequirement(medal.requirement);
    if (!requirement || typeof requirement.type !== "string") continue;
    // Book medals are handled by checkAndAwardBookMedal; time medals by checkTimeBasedMedals
    if (
      ["book", "multiple_books", "early_bird", "night_owl"].includes(
        requirement.type,
      )
    )
      continue;

    try {
      const progress = await measure(requirement, stats);
      if (
        progress &&
        progress.target > 0 &&
        progress.current >= progress.target
      ) {
        await award(userId, medal, earned);
      }
    } catch (error) {
      console.error("Error checking medal:", error);
    }
  }
  return earned;
}

/**
 * Check and award medal for completing a Bible book (plus multi-book medals).
 */
export async function checkAndAwardBookMedal(
  userId: number,
  bookName: string,
): Promise<EarnedMedal[]> {
  const earned: EarnedMedal[] = [];
  const medals = await db.getAllMedals();
  const bookMedal = medals.find((m) => {
    const requirement = parseRequirement(m.requirement);
    if (requirement?.type === "book") {
      const reqBook =
        (requirement.bookName as string | undefined) ||
        (requirement.book as string | undefined);
      return !!reqBook && sameBook(reqBook, bookName);
    }
    return false;
  });

  if (bookMedal) {
    await award(userId, bookMedal, earned);
  }

  earned.push(...(await checkSpecialBookMedals(userId, medals)));
  return earned;
}

async function checkSpecialBookMedals(
  userId: number,
  medals: Medal[],
): Promise<EarnedMedal[]> {
  const earned: EarnedMedal[] = [];
  const completedBooks = await db.getCompletedBooks(userId);

  for (const medal of medals) {
    const requirement = parseRequirement(medal.requirement);
    if (
      requirement?.type !== "multiple_books" ||
      !Array.isArray(requirement.books)
    )
      continue;
    try {
      const hasAllBooks = requirement.books.every((book: string) =>
        completedBooks.some((b) => sameBook(b.bookName, book)),
      );
      if (hasAllBooks) await award(userId, medal, earned);
    } catch (error) {
      console.error("Error checking special book medal:", error);
    }
  }
  return earned;
}

/**
 * Check and award time-based special medals (early bird, night owl), using the app timezone.
 */
export async function checkTimeBasedMedals(
  userId: number,
): Promise<EarnedMedal[]> {
  const earned: EarnedMedal[] = [];
  const medals = await db.getAllMedals();
  const hour = campoGrandeHour();

  for (const medal of medals) {
    const requirement = parseRequirement(medal.requirement);
    if (!requirement || typeof requirement.hour !== "number") continue;
    try {
      if (
        (requirement.type === "early_bird" && hour < requirement.hour) ||
        (requirement.type === "night_owl" && hour >= requirement.hour)
      ) {
        await award(userId, medal, earned);
      }
    } catch (error) {
      console.error("Error checking time-based medal:", error);
    }
  }
  return earned;
}

/**
 * All active medals with earned status and measurable progress for the user.
 */
export async function getMedalsWithProgress(userId: number) {
  const [medals, stats] = await Promise.all([
    db.getUserMedalsWithProgress(userId),
    loadStats(userId),
  ]);

  return Promise.all(
    medals.map(async (medal) => {
      const requirement = parseRequirement(medal.requirement);
      const measured =
        !medal.isEarned && requirement && stats
          ? await measure(requirement, stats)
          : null;
      return {
        ...medal,
        progressCurrent: measured
          ? Math.min(measured.current, measured.target)
          : null,
        progressTarget: measured?.target ?? null,
      };
    }),
  );
}

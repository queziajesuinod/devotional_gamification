import * as db from "./db";

const parseRequirement = (value: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Check and award all applicable medals for a user
 * Should be called after significant events like:
 * - Challenge completion
 * - Streak updates
 * - Bible reading progress
 */
export async function checkAndAwardAllMedals(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) return;

  const medals = await db.getAllMedals();
  const completedChallenges = await db.getUserCompletedChallengesCount(userId);

  for (const medal of medals) {
    const requirement = parseRequirement(medal.requirement);
    if (!requirement || typeof requirement.type !== "string") {
      continue;
    }

    try {
      // Check streak medals
      if (
        requirement.type === "streak" &&
        typeof requirement.days === "number" &&
        user.currentStreak >= requirement.days
      ) {
        await db.awardMedal(userId, medal.id);
      }

      // Check total devotionals
      if (
        requirement.type === "total_devotionals" &&
        typeof requirement.count === "number" &&
        completedChallenges >= requirement.count
      ) {
        await db.awardMedal(userId, medal.id);
      }

      // Check first devotional
      if (requirement.type === "first_devotional" && completedChallenges >= 1) {
        await db.awardMedal(userId, medal.id);
      }

      // Check total reflections
      if (requirement.type === "total_reflections" && typeof requirement.count === "number") {
        const reflections = await db.getUserReflections(userId);
        if (reflections.length >= requirement.count) {
          await db.awardMedal(userId, medal.id);
        }
      }

      // Check challenge type count
      if (
        requirement.type === "challenge_type_count" &&
        typeof requirement.challengeType === "string" &&
        typeof requirement.count === "number"
      ) {
        const count = await db.getUserCompletedChallengesCountByType(
          userId,
          requirement.challengeType
        );
        if (count >= requirement.count) {
          await db.awardMedal(userId, medal.id);
        }
      }
    } catch (error) {
      console.error("Error checking medal:", error);
    }
  }
}

/**
 * Check and award medal for completing a Bible book
 */
export async function checkAndAwardBookMedal(userId: number, bookName: string) {
  const medals = await db.getAllMedals();
  const bookNameLower = bookName.toLowerCase();
  const bookMedal = medals.find((m) => {
    const requirement = parseRequirement(m.requirement);
    if (requirement?.type === "book") {
      const reqBook =
        (requirement.bookName as string | undefined) ||
        (requirement.book as string | undefined);
      return !!reqBook && reqBook.toLowerCase() === bookNameLower;
    }
    return m.category === "BIBLE_BOOK" && m.requirement.includes(bookName);
  });

  if (bookMedal) {
    await db.awardMedal(userId, bookMedal.id);
  }

  // Check for special medals (multiple books)
  await checkSpecialBookMedals(userId);
}

/**
 * Check and award special medals that require multiple books
 */
async function checkSpecialBookMedals(userId: number) {
  const completedBooks = await db.getCompletedBooks(userId);
  const bookNames = completedBooks.map((b) => b.bookName);
  const medals = await db.getAllMedals();

  for (const medal of medals.filter((m) => m.category === "SPECIAL")) {
    try {
      const requirement = parseRequirement(medal.requirement);
      if (!requirement) {
        continue;
      }
      
      if (requirement.type === "multiple_books" && requirement.books) {
        const hasAllBooks = requirement.books.every((book: string) =>
          bookNames.includes(book)
        );
        
        if (hasAllBooks) {
          await db.awardMedal(userId, medal.id);
        }
      }
    } catch (error) {
      console.error("Error checking special book medal:", error);
    }
  }
}

/**
 * Check and award time-based special medals (early bird, night owl)
 */
export async function checkTimeBasedMedals(userId: number) {
  const medals = await db.getAllMedals();
  const now = new Date();
  const hour = now.getHours();

  for (const medal of medals.filter((m) => m.category === "SPECIAL")) {
    try {
      const requirement = parseRequirement(medal.requirement);
      if (!requirement) {
        continue;
      }
      
      // Early bird medal (before 6 AM)
      if (
        requirement.type === "early_bird" &&
        typeof requirement.hour === "number" &&
        hour < requirement.hour
      ) {
        await db.awardMedal(userId, medal.id);
      }
      
      // Night owl medal (after 10 PM)
      if (
        requirement.type === "night_owl" &&
        typeof requirement.hour === "number" &&
        hour >= requirement.hour
      ) {
        await db.awardMedal(userId, medal.id);
      }
    } catch (error) {
      console.error("Error checking time-based medal:", error);
    }
  }
}

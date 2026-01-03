import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin", "leader"]);
export const challengeTypeEnum = pgEnum("challenge_type", [
  "READING",
  "DEVOTIONAL",
  "REFLECTION",
  "EXTRA",
]);
export const pointSourceEnum = pgEnum("point_source", [
  "CHALLENGE",
  "BONUS_STREAK",
  "ADMIN",
  "PURCHASE",
]);
export const shopItemTypeEnum = pgEnum("shop_item_type", [
  "BACKGROUND",
  "CLOTHES",
  "ACCESSORY",
  "HAIR_STYLE",
  "HAIR_COLOR",
]);
export const shopItemRarityEnum = pgEnum("shop_item_rarity", ["COMMON", "RARE", "EPIC"]);
export const rankingPeriodTypeEnum = pgEnum("ranking_period_type", ["MONTH", "YEAR"]);
export const groupMemberStatusEnum = pgEnum("group_member_status", [
  "pending",
  "approved",
  "rejected",
]);
export const medalCategoryEnum = pgEnum("medal_category", [
  "BIBLE_BOOK",
  "STREAK",
  "MILESTONE",
  "SPECIAL",
]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    avatarUrl: varchar("avatarUrl", { length: 500 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: roleEnum("role").default("user").notNull(),
    
    // Gamification fields
    nickname: varchar("nickname", { length: 100 }).notNull(),
    xpTotal: integer("xpTotal").default(0).notNull(),
    level: integer("level").default(1).notNull(),
    denarioBalance: integer("denarioBalance").default(0).notNull(),
    
    // Avatar configuration (JSON)
    avatarConfig: text("avatarConfig"),
    
    // Equipped items
    equippedBackgroundId: integer("equippedBackgroundId"),
    equippedClothesId: integer("equippedClothesId"),
    equippedAccessoryId: integer("equippedAccessoryId"),
    equippedHairStyleId: integer("equippedHairStyleId"),
    equippedHairColorId: integer("equippedHairColorId"),
    
    // Streak tracking
    currentStreak: integer("currentStreak").default(0).notNull(),
    longestStreak: integer("longestStreak").default(0).notNull(),
    lastActivityDate: date("lastActivityDate"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  }
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// DEVOTIONAL PLAN
// ============================================

export const devotionalPlans = pgTable("devotional_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const devotionalDays = pgTable(
  "devotional_days",
  {
    id: serial("id").primaryKey(),
    planId: integer("planId").notNull(),
    dayNumber: integer("dayNumber").notNull(),
    date: date("date").notNull(),
    bibleReference: varchar("bibleReference", { length: 255 }).notNull(),
    devotionalText: text("devotionalText"),
    reflectionQuestion: text("reflectionQuestion"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    planDayIdx: uniqueIndex("devotional_days_plan_day_idx").on(table.planId, table.dayNumber),
    dateIdx: index("devotional_days_date_idx").on(table.date),
  })
);

// ============================================
// CHALLENGES
// ============================================

export const challenges = pgTable(
  "challenges",
  {
    id: serial("id").primaryKey(),
    devotionalDayId: integer("devotionalDayId").notNull(),
    type: challengeTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    baseXp: integer("baseXp").default(10).notNull(),
    baseDenario: integer("baseDenario").default(5).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    devotionalDayIdx: index("challenges_devotional_day_idx").on(table.devotionalDayId),
  })
);

export const userChallenges = pgTable(
  "user_challenges",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    challengeId: integer("challengeId").notNull(),
    completedAt: timestamp("completedAt"),
    responseText: text("responseText"),
    xpEarned: integer("xpEarned").default(0).notNull(),
    denarioEarned: integer("denarioEarned").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userChallengeIdx: uniqueIndex("user_challenges_user_challenge_idx").on(table.userId, table.challengeId),
    userIdx: index("user_challenges_user_idx").on(table.userId),
  })
);

// ============================================
// POINT TRANSACTIONS
// ============================================

export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    source: pointSourceEnum("source").notNull(),
    xp: integer("xp").default(0).notNull(),
    denario: integer("denario").default(0).notNull(),
    description: varchar("description", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("point_transactions_user_idx").on(table.userId),
    createdAtIdx: index("point_transactions_created_at_idx").on(table.createdAt),
  })
);

// ============================================
// SHOP & ITEMS
// ============================================

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: shopItemTypeEnum("type").notNull(),
  rarity: shopItemRarityEnum("rarity").default("COMMON").notNull(),
  imageUrl: varchar("imageUrl", { length: 512 }),
  avatarConfig: text("avatarConfig"),
  priceDenario: integer("priceDenario").notNull(),
  description: text("description"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userItems = pgTable(
  "user_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    itemId: integer("itemId").notNull(),
    purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
  },
  (table) => ({
    userItemIdx: uniqueIndex("user_items_user_item_idx").on(table.userId, table.itemId),
    userIdx: index("user_items_user_idx").on(table.userId),
  })
);

// ============================================
// RANKING / LEADERBOARD
// ============================================

export const rankingPeriods = pgTable(
  "ranking_periods",
  {
    id: serial("id").primaryKey(),
    periodType: rankingPeriodTypeEnum("periodType").notNull(),
    startDate: date("startDate").notNull(),
    endDate: date("endDate").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    periodTypeIdx: index("ranking_periods_period_type_idx").on(table.periodType),
    activeIdx: index("ranking_periods_active_idx").on(table.isActive),
  })
);

export const userRankingScores = pgTable(
  "user_ranking_scores",
  {
    id: serial("id").primaryKey(),
    rankingPeriodId: integer("rankingPeriodId").notNull(),
    userId: integer("userId").notNull(),
    xpTotal: integer("xpTotal").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    periodUserIdx: uniqueIndex("user_ranking_scores_period_user_idx").on(table.rankingPeriodId, table.userId),
    periodXpIdx: index("user_ranking_scores_period_xp_idx").on(table.rankingPeriodId, table.xpTotal),
  })
);

// ============================================
// TYPE EXPORTS
// ============================================

export type DevotionalPlan = typeof devotionalPlans.$inferSelect;
export type InsertDevotionalPlan = typeof devotionalPlans.$inferInsert;

export type DevotionalDay = typeof devotionalDays.$inferSelect;
export type InsertDevotionalDay = typeof devotionalDays.$inferInsert;

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;

export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = typeof userChallenges.$inferInsert;

export type PointTransaction = typeof pointTransactions.$inferSelect;
export type InsertPointTransaction = typeof pointTransactions.$inferInsert;

export type ShopItem = typeof shopItems.$inferSelect;
export type InsertShopItem = typeof shopItems.$inferInsert;

export type UserItem = typeof userItems.$inferSelect;
export type InsertUserItem = typeof userItems.$inferInsert;

export type RankingPeriod = typeof rankingPeriods.$inferSelect;
export type InsertRankingPeriod = typeof rankingPeriods.$inferInsert;

export type UserRankingScore = typeof userRankingScores.$inferSelect;
export type InsertUserRankingScore = typeof userRankingScores.$inferInsert;

// ============================================
// GROUPS / CELLS
// ============================================

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  leaderId: integer("leaderId").notNull(),
  memberCount: integer("memberCount").default(0).notNull(),
  totalPoints: integer("totalPoints").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("groupId").notNull(),
    userId: integer("userId").notNull(),
    status: groupMemberStatusEnum("status").default("pending").notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    approvedAt: timestamp("approvedAt"),
    approvedBy: integer("approvedBy"),
  },
  (table) => ({
    groupIdx: index("group_members_group_idx").on(table.groupId),
    userIdx: index("group_members_user_idx").on(table.userId),
  })
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

// ============================================
// MEDALS / BADGES SYSTEM
// ============================================

export const medals = pgTable(
  "medals",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull(),
    category: medalCategoryEnum("category").notNull(),
    iconUrl: varchar("iconUrl", { length: 512 }),
    iconUrlGray: varchar("iconUrlGray", { length: 512 }),
    iconEmoji: varchar("iconEmoji", { length: 10 }),
    requirement: text("requirement").notNull(), // JSON string with requirement details
    order: integer("order").default(0).notNull(), // Display order within category
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index("medals_category_idx").on(table.category),
    orderIdx: index("medals_order_idx").on(table.order),
  })
);

export type Medal = typeof medals.$inferSelect;
export type InsertMedal = typeof medals.$inferInsert;

export const userMedals = pgTable(
  "user_medals",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    medalId: integer("medalId").notNull(),
    earnedAt: timestamp("earnedAt").defaultNow().notNull(),
    progress: integer("progress").default(0).notNull(), // Current progress towards medal (if applicable)
  },
  (table) => ({
    userMedalIdx: uniqueIndex("user_medals_user_medal_idx").on(table.userId, table.medalId),
    userIdx: index("user_medals_user_idx").on(table.userId),
    medalIdx: index("user_medals_medal_idx").on(table.medalId),
  })
);

export type UserMedal = typeof userMedals.$inferSelect;
export type InsertUserMedal = typeof userMedals.$inferInsert;

// Track Bible book reading progress
export const bibleReadingProgress = pgTable(
  "bible_reading_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    bookName: varchar("bookName", { length: 50 }).notNull(), // e.g., "Mateus", "Joǜo"
    chaptersRead: integer("chaptersRead").default(0).notNull(),
    totalChapters: integer("totalChapters").notNull(),
    isCompleted: boolean("isCompleted").default(false).notNull(),
    completedAt: timestamp("completedAt"),
    lastReadAt: timestamp("lastReadAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userBookIdx: uniqueIndex("bible_reading_progress_user_book_idx").on(table.userId, table.bookName),
    userIdx: index("bible_reading_progress_user_idx").on(table.userId),
    completedIdx: index("bible_reading_progress_completed_idx").on(table.isCompleted),
  })
);

export type BibleReadingProgress = typeof bibleReadingProgress.$inferSelect;
export type InsertBibleReadingProgress = typeof bibleReadingProgress.$inferInsert;

export const bibleReadingSegments = pgTable(
  "bible_reading_segments",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    devotionalDayId: integer("devotionalDayId").notNull(),
    planId: integer("planId").notNull(),
    bookName: varchar("bookName", { length: 50 }).notNull(),
    chapter: integer("chapter").notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
  },
  (table) => ({
    userDayChapterIdx: uniqueIndex("bible_reading_segments_user_day_chapter_idx").on(
      table.userId,
      table.devotionalDayId,
      table.bookName,
      table.chapter
    ),
    userBookIdx: index("bible_reading_segments_user_book_idx").on(table.userId, table.bookName),
    bookChapterIdx: index("bible_reading_segments_book_chapter_idx").on(table.bookName, table.chapter),
  })
);

export type BibleReadingSegment = typeof bibleReadingSegments.$inferSelect;
export type InsertBibleReadingSegment = typeof bibleReadingSegments.$inferInsert;

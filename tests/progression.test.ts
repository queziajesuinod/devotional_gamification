import { describe, expect, it } from "vitest";
import {
  diffDateStrings,
  getLevelProgress,
  getLevelTitle,
  getStreakStatus,
  isTitleLevel,
  levelFromXp,
  levelUpDenarioReward,
  totalXpForLevel,
  weekKey,
  xpCostOfLevel,
} from "../shared/progression";
import { defaultMedalRewards } from "../shared/medal-rewards";

describe("level curve", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(totalXpForLevel(1)).toBe(0);
  });

  it("each level costs more than the previous one", () => {
    expect(xpCostOfLevel(1)).toBe(50);
    expect(xpCostOfLevel(2)).toBe(75);
    expect(totalXpForLevel(3)).toBe(125);
  });

  it("levelFromXp is consistent with totalXpForLevel at boundaries", () => {
    for (let level = 1; level <= 60; level += 1) {
      const xp = totalXpForLevel(level);
      expect(levelFromXp(xp)).toBe(level);
      if (xp > 0) expect(levelFromXp(xp - 1)).toBe(level - 1);
    }
  });

  it("reports progress inside the current level", () => {
    const progress = getLevelProgress(totalXpForLevel(5) + 30);
    expect(progress.level).toBe(5);
    expect(progress.xpIntoLevel).toBe(30);
    expect(progress.xpForNextLevel).toBe(xpCostOfLevel(5));
    expect(progress.title.title).toBe("Broto");
  });

  it("gives bigger rewards on title levels", () => {
    expect(isTitleLevel(1)).toBe(false);
    expect(isTitleLevel(10)).toBe(true);
    expect(levelUpDenarioReward(10)).toBe(100);
    expect(levelUpDenarioReward(11)).toBe(32);
    expect(getLevelTitle(12).title).toBe("Semeador");
  });
});

describe("streak helpers", () => {
  it("diffs date strings across months and DST-free", () => {
    expect(diffDateStrings("2027-01-31", "2027-02-01")).toBe(1);
    expect(diffDateStrings("2027-03-01", "2027-03-01")).toBe(0);
    expect(diffDateStrings("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("uses Monday-based week keys", () => {
    expect(weekKey("2027-01-04")).toBe("2027-01-04"); // Monday
    expect(weekKey("2027-01-10")).toBe("2027-01-04"); // Sunday
    expect(weekKey("2027-01-11")).toBe("2027-01-11");
  });

  it("derives streak status", () => {
    const base = { currentStreak: 5, freezes: 1, today: "2027-02-10" };
    expect(getStreakStatus({ ...base, lastActivityDate: "2027-02-10" })).toBe(
      "done_today",
    );
    expect(getStreakStatus({ ...base, lastActivityDate: "2027-02-09" })).toBe(
      "at_risk",
    );
    expect(getStreakStatus({ ...base, lastActivityDate: "2027-02-08" })).toBe(
      "protected",
    );
    expect(getStreakStatus({ ...base, lastActivityDate: "2027-02-07" })).toBe(
      "broken",
    );
    expect(
      getStreakStatus({ ...base, currentStreak: 0, lastActivityDate: null }),
    ).toBe("none");
  });
});

describe("medal reward defaults", () => {
  it("scales tier with difficulty", () => {
    expect(
      defaultMedalRewards(JSON.stringify({ type: "streak", days: 7 })).tier,
    ).toBe("BRONZE");
    expect(
      defaultMedalRewards(JSON.stringify({ type: "streak", days: 365 })).tier,
    ).toBe("DIAMOND");
    expect(
      defaultMedalRewards(
        JSON.stringify({ type: "book", bookName: "Salmos", chapters: 150 }),
      ).tier,
    ).toBe("DIAMOND");
    expect(defaultMedalRewards("not json").tier).toBe("BRONZE");
  });
});

import { describe, expect, it } from "vitest";
import {
  QUESTS_PER_WEEK,
  groupWeeklyGoal,
  leagueZones,
  previousWeekKey,
  questProgress,
  questsForWeek,
  resolveInactiveWeeks,
  resolveLeagueWeek,
  weekDays,
  weekRange,
  type WeeklyStats,
} from "../shared/engagement";

const emptyStats: WeeklyStats = {
  daysActive: 0,
  reflections: 0,
  readings: 0,
  fullDays: 0,
  xp: 0,
  encouragementsSent: 0,
};

describe("weeks", () => {
  it("lists Monday..Sunday", () => {
    expect(weekDays("2027-01-07")).toEqual([
      "2027-01-04",
      "2027-01-05",
      "2027-01-06",
      "2027-01-07",
      "2027-01-08",
      "2027-01-09",
      "2027-01-10",
    ]);
    expect(weekRange("2027-01-10")).toEqual({
      start: "2027-01-04",
      end: "2027-01-10",
    });
  });

  it("finds the previous week across years", () => {
    expect(previousWeekKey("2027-01-05")).toBe("2026-12-28");
  });
});

describe("weekly quests", () => {
  it("picks a stable set of distinct quests per week", () => {
    for (const week of [
      "2027-01-04",
      "2027-01-11",
      "2027-03-01",
      "2027-12-27",
    ]) {
      const quests = questsForWeek(week, true);
      expect(quests).toHaveLength(QUESTS_PER_WEEK);
      expect(new Set(quests.map((q) => q.metric)).size).toBe(QUESTS_PER_WEEK);
      expect(questsForWeek(week, true)).toEqual(quests);
    }
  });

  it("never gives group quests to users without a cell", () => {
    for (let i = 0; i < 52; i += 1) {
      const week = new Date(Date.UTC(2027, 0, 4 + i * 7))
        .toISOString()
        .slice(0, 10);
      expect(questsForWeek(week, false).some((q) => q.requiresGroup)).toBe(
        false,
      );
    }
  });

  it("measures and caps progress", () => {
    const quest = questsForWeek("2027-01-04", true)[0];
    expect(questProgress(quest, emptyStats).done).toBe(false);
    const full = questProgress(quest, {
      ...emptyStats,
      [quest.metric]: quest.target + 10,
    });
    expect(full).toEqual({
      current: quest.target,
      target: quest.target,
      done: true,
    });
  });
});

describe("cell goal", () => {
  it("scales with members", () => {
    expect(groupWeeklyGoal(0)).toBe(4);
    expect(groupWeeklyGoal(10)).toBe(40);
  });
});

describe("leagues", () => {
  it("computes zones", () => {
    expect(leagueZones(10)).toEqual({ promoteUntil: 2, demoteFrom: 9 });
    expect(leagueZones(3).demoteFrom).toBe(Infinity);
  });

  it("promotes the top and demotes the bottom", () => {
    expect(
      resolveLeagueWeek({ tier: "SILVER", rank: 1, size: 10, xp: 300 }),
    ).toEqual({
      tier: "GOLD",
      outcome: "promoted",
    });
    expect(
      resolveLeagueWeek({ tier: "SILVER", rank: 10, size: 10, xp: 20 }),
    ).toEqual({
      tier: "BRONZE",
      outcome: "demoted",
    });
    expect(
      resolveLeagueWeek({ tier: "SILVER", rank: 5, size: 10, xp: 100 }).outcome,
    ).toBe("stayed");
  });

  it("keeps the edges of the ladder", () => {
    expect(
      resolveLeagueWeek({ tier: "DIAMOND", rank: 1, size: 10, xp: 500 })
        .outcome,
    ).toBe("stayed");
    expect(
      resolveLeagueWeek({ tier: "BRONZE", rank: 10, size: 10, xp: 0 }).outcome,
    ).toBe("stayed");
  });

  it("demotes zero-XP weeks and inactive players", () => {
    expect(
      resolveLeagueWeek({ tier: "GOLD", rank: 1, size: 2, xp: 0 }).outcome,
    ).toBe("demoted");
    expect(resolveInactiveWeeks("GOLD")).toEqual({
      tier: "SILVER",
      outcome: "demoted",
    });
    expect(resolveInactiveWeeks("BRONZE").outcome).toBe("stayed");
  });
});

/**
 * Default tier and rewards for a medal, derived from its requirement.
 * Mirrors the UPDATE in drizzle/0009_gamification_foundation.sql — keep both in sync.
 */
export type MedalTier = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export type MedalRewardDefaults = {
  tier: MedalTier;
  xpReward: number;
  denarioReward: number;
};

const r = (
  tier: MedalTier,
  xpReward: number,
  denarioReward: number,
): MedalRewardDefaults => ({
  tier,
  xpReward,
  denarioReward,
});

export const defaultMedalRewards = (
  requirementJson: string,
): MedalRewardDefaults => {
  let req: Record<string, any> = {};
  try {
    req = JSON.parse(requirementJson) ?? {};
  } catch {
    return r("BRONZE", 10, 20);
  }

  switch (req.type) {
    case "streak": {
      const days = Number(req.days) || 0;
      if (days >= 365) return r("DIAMOND", 300, 1000);
      if (days >= 100) return r("GOLD", 100, 300);
      if (days >= 30) return r("SILVER", 50, 100);
      return r("BRONZE", 20, 30);
    }
    case "total_devotionals": {
      const count = Number(req.count) || 0;
      if (count >= 365) return r("DIAMOND", 200, 500);
      if (count >= 100) return r("GOLD", 80, 150);
      if (count >= 50) return r("SILVER", 40, 60);
      return r("BRONZE", 20, 20);
    }
    case "total_reflections": {
      const count = Number(req.count) || 0;
      if (count >= 200) return r("GOLD", 100, 250);
      return r("SILVER", 50, 80);
    }
    case "book": {
      const chapters = Number(req.chapters) || 0;
      if (chapters >= 100) return r("DIAMOND", 200, 400);
      if (chapters >= 50) return r("GOLD", 120, 250);
      if (chapters > 16) return r("SILVER", 60, 100);
      return r("BRONZE", 30, 50);
    }
    case "multiple_books":
      return r("GOLD", 150, 300);
    case "first_devotional":
      return r("BRONZE", 10, 20);
    default:
      return r("BRONZE", 10, 15);
  }
};

export const MEDAL_TIER_LABEL: Record<MedalTier, string> = {
  BRONZE: "Bronze",
  SILVER: "Prata",
  GOLD: "Ouro",
  DIAMOND: "Diamante",
};

export const MEDAL_TIER_COLOR: Record<MedalTier, string> = {
  BRONZE: "#B87333",
  SILVER: "#9CA3AF",
  GOLD: "#EAB308",
  DIAMOND: "#38BDF8",
};

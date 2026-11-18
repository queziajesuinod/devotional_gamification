import * as db from "./db";
import { getLevelTitle, isTitleLevel, levelFromXp, levelUpDenarioReward } from "../shared/progression";

export type LevelUpResult = {
  from: number;
  to: number;
  denarioReward: number;
  newTitle: { title: string; emoji: string } | null;
};

/**
 * Grants level-up rewards for every level gained since `levelBefore`.
 * Rewards are denários only, so they never trigger further level-ups.
 */
export async function applyLevelUpRewards(userId: number, levelBefore: number): Promise<LevelUpResult | null> {
  const user = await db.getUserById(userId);
  const levelAfter = levelFromXp(user?.xpTotal ?? 0);
  if (levelAfter <= levelBefore) return null;

  let reward = 0;
  let newTitle: LevelUpResult["newTitle"] = null;
  for (let level = levelBefore + 1; level <= levelAfter; level += 1) {
    reward += levelUpDenarioReward(level);
    if (isTitleLevel(level)) {
      const { title, emoji } = getLevelTitle(level);
      newTitle = { title, emoji };
    }
  }

  await db.updateUserXpAndDenario(userId, 0, reward);
  await db.createPointTransaction({
    userId,
    source: "LEVEL_UP",
    xp: 0,
    denario: reward,
    description: `Subiu para o nível ${levelAfter}`,
  });

  return { from: levelBefore, to: levelAfter, denarioReward: reward, newTitle };
}

/** Grants XP/denários with a transaction record and handles level-up rewards. */
export async function grantReward(
  userId: number,
  reward: { xp: number; denario: number },
  source: "QUEST" | "GROUP_CHEST",
  description: string
) {
  const user = await db.getUserById(userId);
  const levelBefore = levelFromXp(user?.xpTotal ?? 0);
  await db.updateUserXpAndDenario(userId, reward.xp, reward.denario);
  await db.createPointTransaction({ userId, source, xp: reward.xp, denario: reward.denario, description });
  const levelUp = await applyLevelUpRewards(userId, levelBefore);
  return { ...reward, levelUp };
}

import * as db from "./db";
import {
  getLevelTitle,
  isTitleLevel,
  levelFromXp,
  levelUpDenarioReward,
  type LevelTitle,
} from "../shared/progression";
import { DEFAULT_CHARACTER, isCharacterKey, looksUnlockedAt, type CharacterKey } from "../shared/character-catalog";

export type LevelUpResult = {
  from: number;
  to: number;
  denarioReward: number;
  newTitle: { title: string; emoji: string; icon: LevelTitle["icon"] } | null;
  /** Wardrobe looks unlocked by these levels (for the user's character) */
  newLooks: { id: string; name: string; character: CharacterKey; look: string; hair: string | null; accessory: string | null }[];
};

/**
 * Grants level-up rewards for every level gained since `levelBefore`.
 * Rewards are denários only, so they never trigger further level-ups.
 */
export async function applyLevelUpRewards(
  userId: number,
  levelBefore: number,
): Promise<LevelUpResult | null> {
  const user = await db.getUserById(userId);
  const levelAfter = levelFromXp(user?.xpTotal ?? 0);
  if (levelAfter <= levelBefore) return null;

  let reward = 0;
  let newTitle: LevelUpResult["newTitle"] = null;
  const character = isCharacterKey(user?.characterKey) ? user!.characterKey as CharacterKey : DEFAULT_CHARACTER;
  const newLooks: LevelUpResult["newLooks"] = [];
  for (let level = levelBefore + 1; level <= levelAfter; level += 1) {
    reward += levelUpDenarioReward(level);
    for (const w of looksUnlockedAt(character, level)) {
      newLooks.push({ id: w.id, name: w.name, character, look: w.look, hair: w.hair, accessory: w.accessory });
    }
    if (isTitleLevel(level)) {
      const { title, emoji, icon } = getLevelTitle(level);
      newTitle = { title, emoji, icon };
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

  return { from: levelBefore, to: levelAfter, denarioReward: reward, newTitle, newLooks };
}

/** Grants XP/denários with a transaction record and handles level-up rewards. */
export async function grantReward(
  userId: number,
  reward: { xp: number; denario: number },
  source: "QUEST" | "GROUP_CHEST" | "CHALLENGE",
  description: string,
) {
  const user = await db.getUserById(userId);
  const levelBefore = levelFromXp(user?.xpTotal ?? 0);
  await db.updateUserXpAndDenario(userId, reward.xp, reward.denario);
  await db.createPointTransaction({
    userId,
    source,
    xp: reward.xp,
    denario: reward.denario,
    description,
  });
  // A level-up must never undo the reward already paid (e.g. a point_source value
  // missing in the database makes its transaction insert fail)
  let levelUp: LevelUpResult | null = null;
  try {
    levelUp = await applyLevelUpRewards(userId, levelBefore);
  } catch (error) {
    console.error("[rewards] level-up rewards failed", error);
  }
  return { ...reward, levelUp };
}

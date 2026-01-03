export const SHOP_RARITY_RULES = {
  COMMON: {
    label: "Comum",
    defaultPrice: 0,
    minLevel: 1,
    medalsRequired: 0,
  },
  RARE: {
    label: "Raro",
    defaultPrice: 80,
    minLevel: 5,
    medalsRequired: 0,
  },
  EPIC: {
    label: "Epico",
    defaultPrice: 150,
    minLevel: 10,
    medalsRequired: 1,
  },
} as const;

export type ShopRarity = keyof typeof SHOP_RARITY_RULES;
export type ShopRarityRule = (typeof SHOP_RARITY_RULES)[ShopRarity];

export const getRarityRule = (rarity: ShopRarity): ShopRarityRule =>
  SHOP_RARITY_RULES[rarity] ?? SHOP_RARITY_RULES.COMMON;

export const applyRarityDefaultPrice = (rarity: ShopRarity, price: number) => {
  const normalized = Number.isFinite(price) ? price : 0;
  if (normalized > 0) return Math.trunc(normalized);
  return getRarityRule(rarity).defaultPrice;
};

export const getRarityLock = (
  rarity: ShopRarity,
  userLevel: number,
  medalCount: number
) => {
  const rule = getRarityRule(rarity);
  if (userLevel < rule.minLevel) {
    return {
      isLocked: true,
      reason: `Requer nivel ${rule.minLevel}`,
    };
  }
  if (rule.medalsRequired > 0 && medalCount < rule.medalsRequired) {
    return {
      isLocked: true,
      reason: `Requer ${rule.medalsRequired} medalha(s)`,
    };
  }
  return { isLocked: false, reason: "" };
};

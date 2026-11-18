/**
 * Game icon set (clay/toy style, generated with Meshy, sliced by scripts/slice-icon-sheet.py).
 * Use these instead of emojis or system icons for anything that is part of the game.
 */
import { Image, type ImageStyle, type StyleProp } from "react-native";

export const GAME_ICONS = {
  arch: require("@/assets/icons/game/arch.png"),
  banner: require("@/assets/icons/game/banner.png"),
  bell: require("@/assets/icons/game/bell.png"),
  bolt: require("@/assets/icons/game/bolt.png"),
  calendar: require("@/assets/icons/game/calendar.png"),
  "chest-open": require("@/assets/icons/game/chest-open.png"),
  chest: require("@/assets/icons/game/chest.png"),
  clap: require("@/assets/icons/game/clap.png"),
  coin: require("@/assets/icons/game/coin.png"),
  crown: require("@/assets/icons/game/crown.png"),
  devotional: require("@/assets/icons/game/devotional.png"),
  extra: require("@/assets/icons/game/extra.png"),
  gem: require("@/assets/icons/game/gem.png"),
  gift: require("@/assets/icons/game/gift.png"),
  grace: require("@/assets/icons/game/grace.png"),
  heart: require("@/assets/icons/game/heart.png"),
  hourglass: require("@/assets/icons/game/hourglass.png"),
  "level-shield": require("@/assets/icons/game/level-shield.png"),
  lock: require("@/assets/icons/game/lock.png"),
  "love-letter": require("@/assets/icons/game/love-letter.png"),
  map: require("@/assets/icons/game/map.png"),
  "medal-bronze": require("@/assets/icons/game/medal-bronze.png"),
  "medal-diamond": require("@/assets/icons/game/medal-diamond.png"),
  "medal-gold": require("@/assets/icons/game/medal-gold.png"),
  "medal-silver": require("@/assets/icons/game/medal-silver.png"),
  party: require("@/assets/icons/game/party.png"),
  pray: require("@/assets/icons/game/pray.png"),
  "quest-target": require("@/assets/icons/game/quest-target.png"),
  "reading-purple": require("@/assets/icons/game/reading-purple.png"),
  reading: require("@/assets/icons/game/reading.png"),
  reflection: require("@/assets/icons/game/reflection.png"),
  rocket: require("@/assets/icons/game/rocket.png"),
  scroll: require("@/assets/icons/game/scroll.png"),
  seal: require("@/assets/icons/game/seal.png"),
  settings: require("@/assets/icons/game/settings.png"),
  sprout: require("@/assets/icons/game/sprout.png"),
  streak: require("@/assets/icons/game/streak.png"),
  "tab-cells": require("@/assets/icons/game/tab-cells.png"),
  "tab-home": require("@/assets/icons/game/tab-home.png"),
  "tab-profile": require("@/assets/icons/game/tab-profile.png"),
  "tab-ranking": require("@/assets/icons/game/tab-ranking.png"),
  "tab-shop": require("@/assets/icons/game/tab-shop.png"),
  trophy: require("@/assets/icons/game/trophy.png"),
  xp: require("@/assets/icons/game/xp.png"),
} as const;

export type GameIconName = keyof typeof GAME_ICONS;

/** Standard sizes, so icons keep a consistent rhythm across screens. */
export const ICON_SIZE = { xs: 16, sm: 20, md: 28, lg: 40, xl: 64, hero: 96 } as const;

export function GameIcon({
  name,
  size = "md",
  label,
  style,
  dimmed = false,
}: {
  name: GameIconName;
  size?: keyof typeof ICON_SIZE | number;
  /** Accessibility label; leave empty for purely decorative icons next to text. */
  label?: string;
  style?: StyleProp<ImageStyle>;
  /** Locked / not yet earned look. */
  dimmed?: boolean;
}) {
  const px = typeof size === "number" ? size : ICON_SIZE[size];
  return (
    <Image
      source={GAME_ICONS[name]}
      style={[{ width: px, height: px, opacity: dimmed ? 0.35 : 1 }, style]}
      resizeMode="contain"
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
    />
  );
}

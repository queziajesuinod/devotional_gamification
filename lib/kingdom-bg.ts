import type { ImageSourcePropType } from "react-native";

/**
 * Illustrated "Reino da Palavra" backgrounds (geradas com Meshy, estilo 3D fofo).
 * Cada cena tem uma versão retrato (9:16, celular) e larga (16:9, tablet/PC/web).
 * O <ScreenContainer> escolhe a certa pelo tamanho/orientação da tela.
 */
export type KingdomScene =
  | "main"
  | "clean"
  | "night"
  | "shop"
  | "ranking"
  | "cells";

export type ResponsiveBackground = {
  portrait: ImageSourcePropType;
  wide: ImageSourcePropType;
};

export const KINGDOM_BG: Record<KingdomScene, ResponsiveBackground> = {
  main: {
    portrait: require("@/assets/images/reino-bg.png"),
    wide: require("@/assets/images/reino-bg-wide.png"),
  },
  clean: {
    portrait: require("@/assets/images/reino-bg-clean.png"),
    wide: require("@/assets/images/reino-bg-clean-wide.png"),
  },
  night: {
    portrait: require("@/assets/images/reino-bg-night.png"),
    wide: require("@/assets/images/reino-bg-night-wide.png"),
  },
  shop: {
    portrait: require("@/assets/images/reino-bg-shop.png"),
    wide: require("@/assets/images/reino-bg-shop-wide.png"),
  },
  ranking: {
    portrait: require("@/assets/images/reino-bg-ranking.png"),
    wide: require("@/assets/images/reino-bg-ranking-wide.png"),
  },
  cells: {
    portrait: require("@/assets/images/reino-bg-cells.png"),
    wide: require("@/assets/images/reino-bg-cells-wide.png"),
  },
};

/** Fundo noturno — usado no modo escuro pra combinar com os cards escuros. */
export const NIGHT_BG: ResponsiveBackground = {
  portrait: require("@/assets/images/reino-bg-night.png"),
  wide: require("@/assets/images/reino-bg-night-wide.png"),
};

/** True quando o par tem as chaves portrait/wide (vs. um source simples). */
export function isResponsiveBackground(
  value: unknown,
): value is ResponsiveBackground {
  return (
    typeof value === "object" &&
    value !== null &&
    "portrait" in value &&
    "wide" in value
  );
}

/**
 * Subtle royal fabric texture for hero headers (velvet + damask crosses / fleur-de-lis,
 * generated with Meshy). It is a white-only relief layer, so it works on any background
 * color (light and dark theme). Put it as the FIRST child of a hero with `overflow: hidden`
 * (or rounded corners) — it fills the parent and never blocks touches.
 */
import { Image, View, type ViewStyle } from "react-native";

const PATTERN = require("@/assets/ui/hero-pattern.webp");

export function HeroTexture({ intensity = 0.3, style }: { intensity?: number; style?: ViewStyle }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }, style]}
    >
      <Image source={PATTERN} style={{ width: "100%", height: "100%", opacity: intensity }} resizeMode="cover" />
    </View>
  );
}

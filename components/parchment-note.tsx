/**
 * Parchment scroll card (Meshy-generated, vertical 3-slice: top roll, stretchy paper,
 * bottom roll) that grows with its content. Optional wax seal "pin" and a slight tilt,
 * for the reflections board.
 */
import type { ReactNode } from "react";
import { Image, ImageBackground, View, type ViewStyle } from "react-native";
import { GameIcon } from "@/components/game-icon";

const TOP = require("@/assets/ui/scroll/top.png");
const MID = require("@/assets/ui/scroll/mid.png");
const BOTTOM = require("@/assets/ui/scroll/bottom.png");

// Measured on the sliced images (600 px wide): roll heights and paper side inset.
const TOP_RATIO = 99 / 600;
const BOTTOM_RATIO = 102 / 600;
const PAPER_INSET = 0.05;

/** Ink colors that read well on the parchment in light and dark theme. */
export const INK = { strong: "#3B2412", body: "#4A3220", soft: "#7A5A3C", accent: "#8E1B1F" };

export function ParchmentNote({
  width,
  children,
  tilt = 0,
  seal = true,
  style,
}: {
  width: number;
  children: ReactNode;
  /** degrees, small values look natural (-3..3) */
  tilt?: number;
  seal?: boolean;
  style?: ViewStyle;
}) {
  const topH = width * TOP_RATIO;
  const bottomH = width * BOTTOM_RATIO;
  const sidePad = width * PAPER_INSET + 16;

  return (
    <View style={[{ width, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      {/* drop shadow under the scroll */}
      <View
        style={{
          position: "absolute",
          top: topH * 0.6,
          bottom: bottomH * 0.4,
          left: width * 0.07,
          right: width * 0.07,
          borderRadius: 12,
          backgroundColor: "rgba(60,30,5,0.28)",
          transform: [{ translateY: 6 }],
        }}
      />
      <Image source={TOP} style={{ width, height: topH }} resizeMode="stretch" />
      <ImageBackground
        source={MID}
        resizeMode="stretch"
        style={{ width, marginTop: -1 }}
        imageStyle={{ width, height: "100%" }}
      >
        <View style={{ paddingHorizontal: sidePad, paddingVertical: 4 }}>{children}</View>
      </ImageBackground>
      <Image source={BOTTOM} style={{ width, height: bottomH, marginTop: -1 }} resizeMode="stretch" />

      {seal ? (
        <View style={{ position: "absolute", top: topH * 0.18, left: width / 2 - 20 }}>
          <GameIcon name="seal" size={40} />
        </View>
      ) : null}
    </View>
  );
}

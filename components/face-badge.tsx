/**
 * Round medallion with a player's figurine face (ranking rows, podium, league).
 * Falls back to the default character when the server sent no figurine.
 */
import { View, type ViewStyle } from "react-native";
import { Figurine } from "@/components/figurine";
import { DEFAULT_CHARACTER, type Figurine as FigurineData } from "@shared/character-catalog";

const FALLBACK: FigurineData = {
  character: DEFAULT_CHARACTER,
  chosen: false,
  look: "original",
  hair: null,
  accessory: null,
};

export function FaceBadge({
  figurine,
  size = 44,
  ring = "#D8C9A8",
  ringWidth = 3,
  label,
  style,
}: {
  figurine?: FigurineData | null;
  size?: number;
  ring?: string;
  ringWidth?: number;
  label?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ringWidth,
          borderColor: ring,
          backgroundColor: "#FFF9EC",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Figurine figurine={figurine ?? FALLBACK} height={size - ringWidth * 2} mode="head" label={label} />
    </View>
  );
}

/** Ring colors for the top 3 (gold, silver, bronze). */
export const PLACE_RING = ["#F2B50C", "#B9C2CC", "#C9824A"] as const;

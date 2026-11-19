/** A chest badge in the chest's color (set in the admin). */
import { View } from "react-native";
import { GameIcon } from "@/components/game-icon";

export function ChestArt({ color, size = 64, open = false }: { color: string; size?: number; open?: boolean }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: `${color}26`,
        borderWidth: 2,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <GameIcon name={open ? "chest-open" : "chest"} size={size * 0.72} />
    </View>
  );
}

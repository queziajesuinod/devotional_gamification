/**
 * Coat of arms for a Célula: a colored shield-like medallion with the cell's initial in
 * Cinzel. The color is stable per cell id, so each cell keeps "its" banner color.
 */
import { Text, View, type ViewStyle } from "react-native";

const CREST_COLORS = ["#C1272D", "#27509C", "#2E8B57", "#7B3FA0", "#C98F00", "#B5541E", "#1F7A8C", "#8E1B5A"];

export function crestColor(id: number) {
  return CREST_COLORS[Math.abs(id) % CREST_COLORS.length];
}

export function CellCrest({
  id,
  name,
  size = 52,
  ring = "#F2B50C",
  style,
}: {
  id: number;
  name: string;
  size?: number;
  ring?: string;
  style?: ViewStyle;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size * 1.12,
          borderTopLeftRadius: size * 0.22,
          borderTopRightRadius: size * 0.22,
          borderBottomLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.5,
          backgroundColor: crestColor(id),
          borderWidth: 3,
          borderColor: ring,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text className="font-display" style={{ color: "#FFFFFF", fontSize: size * 0.46, marginTop: -size * 0.06 }}>
        {initial}
      </Text>
    </View>
  );
}

/**
 * Medieval "Reino da Palavra" button: a 3-slice textured plate generated with Meshy
 * (assets/ui/buttons, sliced by scripts/slice-button-plates.py) that stretches to any width.
 *
 * Variants:
 *   royal  – azul real + ouro: ação principal (Concluir, Continuar, Equipar, Entrar)
 *   gold   – ouro: recompensa (Pegar, Abrir baú, Comprar)
 *   wood   – madeira: neutro (Fechar, Cancelar, Voltar)
 *   banner – estandarte vermelho: confirmação/destaque (Amém, Enviar)
 */
import { ActivityIndicator, Image, Pressable, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { haptic } from "@/components/juice";

export type GameButtonVariant = "royal" | "gold" | "wood" | "banner" | "success";

const PLATES: Record<GameButtonVariant, { left: number; mid: number; right: number; text: string; shadow: string }> = {
  royal: {
    left: require("@/assets/ui/buttons/royal-left.png"),
    mid: require("@/assets/ui/buttons/royal-mid.png"),
    right: require("@/assets/ui/buttons/royal-right.png"),
    text: "#FFFFFF",
    shadow: "rgba(10,25,70,0.75)",
  },
  gold: {
    left: require("@/assets/ui/buttons/gold-left.png"),
    mid: require("@/assets/ui/buttons/gold-mid.png"),
    right: require("@/assets/ui/buttons/gold-right.png"),
    text: "#3A2600",
    shadow: "rgba(255,240,180,0.8)",
  },
  wood: {
    left: require("@/assets/ui/buttons/wood-left.png"),
    mid: require("@/assets/ui/buttons/wood-mid.png"),
    right: require("@/assets/ui/buttons/wood-right.png"),
    text: "#FFF6E6",
    shadow: "rgba(60,30,5,0.8)",
  },
  banner: {
    left: require("@/assets/ui/buttons/banner-left.png"),
    mid: require("@/assets/ui/buttons/banner-mid.png"),
    right: require("@/assets/ui/buttons/banner-right.png"),
    text: "#FFFFFF",
    shadow: "rgba(70,5,10,0.8)",
  },
  success: {
    left: require("@/assets/ui/buttons/success-left.png"),
    mid: require("@/assets/ui/buttons/success-mid.png"),
    right: require("@/assets/ui/buttons/success-right.png"),
    text: "#FFFFFF",
    shadow: "rgba(5,45,20,0.8)",
  },
};

const CLOSE_MEDALLION = require("@/assets/ui/buttons/close-medallion.png");

/** Round wood + gold medallion with an ✕, for closing modals and cards. */
export function GameCloseButton({
  onPress,
  size = 40,
  style,
  label = "Fechar",
}: {
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Math.max(0, (48 - size) / 2)}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [{ width: size, height: size, transform: [{ scale: pressed ? 0.9 : 1 }] }, style]}
    >
      <Image source={CLOSE_MEDALLION} style={{ width: size, height: size }} resizeMode="contain" />
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            color: "#FFF6E6",
            fontSize: size * 0.42,
            fontWeight: "900",
            marginTop: -size * 0.04,
            textShadowColor: "rgba(60,30,5,0.9)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          ✕
        </Text>
      </View>
    </Pressable>
  );
}

const SIZES = { sm: { height: 44, font: 14, icon: 20 }, md: { height: 54, font: 17, icon: 24 }, lg: { height: 62, font: 19, icon: 28 } };
/** Cap width / plate height in the sliced images (see CAP_RATIO in the slicer). */
const CAP_RATIO = 0.62;

export function GameButton({
  title,
  onPress,
  variant = "royal",
  size = "md",
  icon,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  asLabel = false,
}: {
  /** Render as a non-interactive status plate (e.g. "Concluído!") */
  asLabel?: boolean;
  title: string;
  onPress?: () => void;
  variant?: GameButtonVariant;
  size?: keyof typeof SIZES;
  icon?: GameIconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const plate = PLATES[variant];
  const { height, font, icon: iconSize } = SIZES[size];
  const cap = Math.round(height * CAP_RATIO);
  const press = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 2 }, { scale: 1 - press.value * 0.04 }],
  }));
  const inactive = disabled || loading;

  if (asLabel) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel ?? title}
        style={[fullWidth ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }, { height, minWidth: cap * 2 + 24 }, style]}
      >
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, flexDirection: "row" }}>
          <Image source={plate.left} style={{ width: cap, height, zIndex: 1 }} resizeMode="stretch" />
          <Image source={plate.mid} style={{ flex: 1, height, marginHorizontal: -1 }} resizeMode="stretch" />
          <Image source={plate.right} style={{ width: cap, height, zIndex: 1 }} resizeMode="stretch" />
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingBottom: height * 0.06 }}>
          {icon ? <GameIcon name={icon} size={iconSize} style={{ marginRight: 6 }} /> : null}
          <Text
            style={{
              color: plate.text,
              fontSize: font,
              fontWeight: "900",
              textShadowColor: plate.shadow,
              textShadowOffset: { width: 0, height: 1.5 },
              textShadowRadius: 2,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={height < 48 ? { top: 4, bottom: 4 } : undefined}
      onPressIn={() => {
        press.value = withSpring(1, { damping: 15, stiffness: 420 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 8, stiffness: 300 });
      }}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={[fullWidth ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }, style]}
    >
      <Animated.View style={[{ height, minWidth: cap * 2 + 24, opacity: inactive ? 0.55 : 1 }, animated]}>
        {/* 3-slice plate */}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, flexDirection: "row" }}>
          <Image source={plate.left} style={{ width: cap, height, zIndex: 1 }} resizeMode="stretch" />
          <Image source={plate.mid} style={{ flex: 1, height, marginHorizontal: -1 }} resizeMode="stretch" />
          <Image source={plate.right} style={{ width: cap, height, zIndex: 1 }} resizeMode="stretch" />
        </View>
        {/* Label */}
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: cap * 0.55,
            paddingBottom: height * 0.06,
          }}
        >
          {loading ? (
            <ActivityIndicator color={plate.text} />
          ) : (
            <>
              {icon ? <GameIcon name={icon} size={iconSize} style={{ marginRight: 6 }} /> : null}
              <Text
                numberOfLines={1}
                style={{
                  color: plate.text,
                  fontSize: font,
                  fontWeight: "900",
                  letterSpacing: 0.3,
                  textShadowColor: plate.shadow,
                  textShadowOffset: { width: 0, height: 1.5 },
                  textShadowRadius: 2,
                }}
              >
                {title}
              </Text>
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

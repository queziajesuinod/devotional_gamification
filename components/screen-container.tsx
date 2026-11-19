import {
  Image,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type ViewProps,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";
import {
  isResponsiveBackground,
  NIGHT_BG,
  type ResponsiveBackground,
} from "@/lib/kingdom-bg";
import { useThemeContext } from "@/lib/theme-provider";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
  /**
   * Illustrated background image rendered behind the content (e.g. the kingdom
   * scene). When set, a light scrim is laid over it so text stays legible.
   *
   * Pass a responsive pair ({ portrait, wide }) — e.g. `KINGDOM_BG.main` — and
   * the container picks the portrait art on phones and the wide art on
   * tablet/desktop/landscape (web included). A single source is used as-is.
   */
  background?: ImageSourcePropType | ResponsiveBackground;
  /**
   * Scrim opacity over the background image (0–1). Defaults to 0.12.
   * Use a higher value on busier scenes or text-heavy screens.
   */
  scrimOpacity?: number;
  /**
   * Max width (px) for the content column on tablet/desktop/web. On wide
   * screens the content is centered at this width so cards don't stretch edge
   * to edge; on phones it fills the width. Defaults to 760 when an illustrated
   * `background` is set, otherwise unconstrained. Pass a number to opt in/tune.
   */
  contentMaxWidth?: number;
  /**
   * Draw the centered app window over the scene on wide screens (default true).
   * Pass false for full-bleed screens (e.g. login) that float their own card.
   */
  frame?: boolean;
}

/**
 * A container component that properly handles SafeArea and background colors.
 *
 * The outer View extends to full screen (including status bar area) with the background color,
 * while the inner SafeAreaView ensures content is within safe bounds.
 *
 * Pass `background` to render an illustrated scene behind the content (with a
 * legibility scrim); content scrolls on top.
 *
 * Usage:
 * ```tsx
 * <ScreenContainer background={require("@/assets/images/reino-bg.png")} className="p-4">
 *   <Text className="text-2xl font-bold text-foreground">Welcome</Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  background,
  scrimOpacity = 0.12,
  contentMaxWidth,
  frame = true,
  ...props
}: ScreenContainerProps) {
  const { width, height } = useWindowDimensions();
  const { colorScheme } = useThemeContext();
  // Tablet/desktop/landscape (web included) get the wide art; phones the portrait.
  const preferWide = width >= height || width >= 700;
  const themed = isResponsiveBackground(background);
  // Dark mode → night scene, so the bright day art doesn't fight the dark cards.
  const activeBackground = themed && colorScheme === "dark" ? NIGHT_BG : background;
  const backgroundSource = isResponsiveBackground(activeBackground)
    ? preferWide
      ? activeBackground.wide
      : activeBackground.portrait
    : activeBackground;

  // On wide screens, frame the content as a centered app window over the scene
  // (so it doesn't stretch edge-to-edge or float as a flush strip).
  const maxW = contentMaxWidth ?? (themed ? 760 : undefined);
  const constrain = frame && maxW != null && preferWide;

  return (
    <View
      className={cn("flex-1", !background && "bg-background", containerClassName)}
      {...props}
    >
      {backgroundSource ? (
        <>
          <Image
            source={backgroundSource}
            // Fixed to the full screen, behind everything.
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
            resizeMode="cover"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          {scrimOpacity > 0 ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: `rgba(255,255,255,${scrimOpacity})`,
              }}
            />
          ) : null}
        </>
      ) : null}
      <SafeAreaView
        edges={edges}
        className={cn("flex-1", safeAreaClassName)}
        style={style}
      >
        <View
          className={cn("flex-1", className, constrain && "bg-surface")}
          style={
            constrain
              ? {
                  width: "100%",
                  maxWidth: maxW,
                  alignSelf: "center",
                  marginVertical: 18,
                  borderRadius: 28,
                  overflow: "hidden",
                  shadowColor: "#0B1733",
                  shadowOpacity: 0.28,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                  elevation: 12,
                }
              : undefined
          }
        >
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

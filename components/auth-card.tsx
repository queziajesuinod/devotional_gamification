/**
 * Shared look of the login / sign-up screens: kingdom scene (full bleed), the three
 * heroes standing on a gold-framed card, a Cinzel title and parchment fields.
 * One-shot entrances only (PopIn), no looping motion.
 */
import type React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { Figurine } from "@/components/figurine";
import { PopIn } from "@/components/juice";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { SOFT_SHADOW } from "@/lib/ui";
import type { CharacterKey } from "@shared/character-catalog";

export const AUTH_PLACEHOLDER = "#9B8C74";
export const AUTH_INPUT = {
  fontSize: 16,
  paddingHorizontal: 14,
  paddingVertical: 13,
  borderRadius: 16,
  borderWidth: 2,
  borderColor: "#D8C9A8",
  backgroundColor: "#FFF9EC",
  color: "#241A12",
} as const;

function Hero({ character, height, delay }: { character: CharacterKey; height: number; delay: number }) {
  return (
    <PopIn delay={delay} gentle>
      <View style={{ marginHorizontal: -6 }}>
        <Figurine figurine={{ character, chosen: true, look: "original", hair: null, accessory: null }} height={height} />
      </View>
    </PopIn>
  );
}

export function AuthScreen({
  title,
  subtitle,
  subtitleIcon = "sprout",
  heroScale = 1,
  children,
}: {
  title: string;
  subtitle: string;
  subtitleIcon?: GameIconName;
  /** Shrink the heroes on long forms so the card fits better. */
  heroScale?: number;
  children: React.ReactNode;
}) {
  return (
    <ScreenContainer background={KINGDOM_BG.main} scrimOpacity={0.15} frame={false}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingVertical: 28,
            width: "100%",
            maxWidth: 440,
            alignSelf: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* The three heroes waiting for you */}
          <View className="flex-row items-end justify-center" style={{ marginBottom: -8, zIndex: 1 }}>
            <Hero character="lia" height={112 * heroScale} delay={120} />
            <Hero character="davi" height={136 * heroScale} delay={0} />
            <Hero character="theo" height={112 * heroScale} delay={240} />
          </View>

          <View
            className="bg-surface rounded-3xl px-5 pb-6"
            style={{ borderWidth: 3, borderColor: "#F2B50C", paddingTop: 26, ...SOFT_SHADOW }}
          >
            <View className="items-center">
              <Text className="font-display text-primary text-center" style={{ fontSize: 28, lineHeight: 34 }}>
                {title}
              </Text>
              <View className="flex-row items-center mt-1">
                <GameIcon name={subtitleIcon} size={18} style={{ marginRight: 6 }} />
                <Text className="text-muted text-center">{subtitle}</Text>
              </View>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export function AuthField({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: GameIconName;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View className="flex-row items-center mb-2">
        <GameIcon name={icon} size={20} style={{ marginRight: 6 }} />
        <Text className="text-foreground text-sm font-extrabold">{label}</Text>
      </View>
      {children}
      {hint ? <Text className="text-muted text-xs mt-1">{hint}</Text> : null}
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <PopIn gentle>
      <View
        accessibilityRole="alert"
        className="flex-row items-center p-3 rounded-2xl"
        style={{ backgroundColor: "rgba(193,39,45,0.10)" }}
      >
        <GameIcon name="lock" size={22} style={{ marginRight: 8 }} />
        <Text className="text-error text-sm font-bold flex-1">{message}</Text>
      </View>
    </PopIn>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center" style={{ marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(139,90,43,0.2)" }} />
      <Text className="text-muted text-xs font-bold mx-3">{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: "rgba(139,90,43,0.2)" }} />
    </View>
  );
}

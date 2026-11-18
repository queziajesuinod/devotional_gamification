import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { getLevelProgress, getLevelTitle } from "@shared/progression";
import { MEDAL_TIER_COLOR, MEDAL_TIER_LABEL, type MedalTier } from "@shared/medal-rewards";

export type ChallengeRewardResult = {
  xpEarned: number;
  denariosEarned: number;
  xpBefore: number;
  xpTotal: number;
  streak: {
    currentStreak: number;
    increased: boolean;
    wasReset: boolean;
    freezesUsed: number;
    freezesLeft: number;
    milestoneReached: number | null;
    bonusDenarios: number;
  } | null;
  levelUp: {
    from: number;
    to: number;
    denarioReward: number;
    newTitle: { title: string; emoji: string } | null;
  } | null;
  newMedals: {
    id: number;
    name: string;
    description: string;
    iconEmoji: string | null;
    tier: MedalTier;
    xpReward: number;
    denarioReward: number;
  }[];
  /** True when this completion finished every challenge of the day. */
  dayComplete?: boolean;
};

/** Only interrupt the user with a full-screen moment when something special happened. */
export const shouldCelebrate = (result: ChallengeRewardResult) =>
  !!result.streak?.increased || !!result.levelUp || result.newMedals.length > 0 || !!result.dayComplete;

type Moment =
  | { kind: "rewards" }
  | { kind: "streak" }
  | { kind: "level" }
  | { kind: "medal"; index: number };

export function CelebrationModal({
  result,
  onClose,
}: {
  result: ChallengeRewardResult | null;
  onClose: () => void;
}) {
  const moments = useMemo<Moment[]>(() => {
    if (!result) return [];
    const list: Moment[] = [{ kind: "rewards" }];
    if (result.streak?.increased) list.push({ kind: "streak" });
    if (result.levelUp) list.push({ kind: "level" });
    result.newMedals.forEach((_, index) => list.push({ kind: "medal", index }));
    return list;
  }, [result]);

  const [step, setStep] = useState(0);
  const pop = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setStep(0);
  }, [result]);

  const moment = moments[step];

  useEffect(() => {
    if (!result || !moment) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();

    if (Platform.OS !== "web") {
      const special = moment.kind === "level" || moment.kind === "medal";
      Haptics.notificationAsync(
        special ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
    }

    if (moment.kind === "rewards") {
      const before = getLevelProgress(result.xpBefore);
      const after = getLevelProgress(result.xpTotal);
      // On level-up the bar fills to 100% here; the level moment shows the new level
      bar.setValue(before.percent);
      Animated.timing(bar, {
        toValue: after.level > before.level ? 100 : after.percent,
        duration: 900,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [moment, result, pop, bar]);

  if (!result || !moment) return null;

  const isLast = step >= moments.length - 1;
  const next = () => (isLast ? onClose() : setStep((s) => s + 1));
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const after = getLevelProgress(result.xpTotal);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 items-center justify-center p-6">
        <Animated.View
          style={{ transform: [{ scale }], opacity: pop }}
          className="bg-background w-full max-w-sm rounded-3xl p-6 items-center"
        >
          {moment.kind === "rewards" && (
            <>
              <Text className="text-5xl mb-2">{result.dayComplete ? "🙌" : "✨"}</Text>
              <Text className="text-foreground text-2xl font-bold mb-1">
                {result.dayComplete ? "Dia completo!" : "Desafio concluído!"}
              </Text>
              <Text className="text-muted text-sm mb-4 text-center">
                {result.dayComplete ? "Você fez todos os desafios de hoje. Isso conta para suas missões!" : " "}
              </Text>
              <View className="flex-row gap-3 mb-5">
                <View className="bg-accent/20 px-4 py-2 rounded-full">
                  <Text className="text-foreground font-bold">+{result.xpEarned} XP</Text>
                </View>
                <View className="bg-secondary/20 px-4 py-2 rounded-full">
                  <Text className="text-foreground font-bold">+{result.denariosEarned} 💰</Text>
                </View>
              </View>
              <View className="w-full">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-muted text-xs">
                    {getLevelTitle(getLevelProgress(result.xpBefore).level).emoji} Nível{" "}
                    {getLevelProgress(result.xpBefore).level}
                  </Text>
                  <Text className="text-muted text-xs">
                    {result.levelUp ? "Subiu de nível!" : `${after.xpIntoLevel}/${after.xpForNextLevel} XP`}
                  </Text>
                </View>
                <View className="bg-surface h-3 rounded-full overflow-hidden border border-border">
                  <Animated.View
                    className="bg-primary h-3 rounded-full"
                    style={{ width: bar.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }}
                  />
                </View>
              </View>
            </>
          )}

          {moment.kind === "streak" && result.streak && (
            <>
              <Text className="text-6xl mb-2">{result.streak.wasReset ? "🌱" : "🔥"}</Text>
              <Text className="text-foreground text-3xl font-bold">
                {result.streak.currentStreak} {result.streak.currentStreak === 1 ? "dia" : "dias"}
              </Text>
              <Text className="text-muted text-center mt-2">
                {result.streak.wasReset
                  ? "Todo dia é um recomeço. Sua nova sequência começou hoje!"
                  : "Sua sequência continua firme!"}
              </Text>
              {result.streak.freezesUsed > 0 && (
                <View className="bg-accent/20 rounded-xl p-3 mt-4 w-full">
                  <Text className="text-foreground text-center text-sm">
                    🕊️ {result.streak.freezesUsed === 1 ? "Uma Graça protegeu" : `${result.streak.freezesUsed} Graças protegeram`}{" "}
                    sua sequência. Restam {result.streak.freezesLeft}.
                  </Text>
                </View>
              )}
              {result.streak.milestoneReached && (
                <View className="bg-secondary/20 rounded-xl p-3 mt-4 w-full">
                  <Text className="text-foreground text-center font-semibold">
                    🏆 Marco de {result.streak.milestoneReached} dias! +{result.streak.bonusDenarios} 💰
                  </Text>
                </View>
              )}
            </>
          )}

          {moment.kind === "level" && result.levelUp && (
            <>
              <Text className="text-6xl mb-2">{result.levelUp.newTitle?.emoji ?? "⭐"}</Text>
              <Text className="text-muted uppercase tracking-widest text-xs">Subiu de nível</Text>
              <Text className="text-foreground text-4xl font-bold my-1">Nível {result.levelUp.to}</Text>
              {result.levelUp.newTitle ? (
                <Text className="text-primary text-lg font-bold text-center">
                  Novo título: {result.levelUp.newTitle.title}
                </Text>
              ) : (
                <Text className="text-muted">{getLevelTitle(result.levelUp.to).title}</Text>
              )}
              <View className="bg-secondary/20 px-4 py-2 rounded-full mt-4">
                <Text className="text-foreground font-bold">+{result.levelUp.denarioReward} 💰</Text>
              </View>
            </>
          )}

          {moment.kind === "medal" && (() => {
            const medal = result.newMedals[moment.index];
            const color = MEDAL_TIER_COLOR[medal.tier] ?? MEDAL_TIER_COLOR.BRONZE;
            return (
              <>
                <Text className="text-muted uppercase tracking-widest text-xs mb-3">Nova medalha</Text>
                <View
                  className="w-24 h-24 rounded-full items-center justify-center mb-3"
                  style={{ borderWidth: 4, borderColor: color }}
                >
                  <Text className="text-5xl">{medal.iconEmoji || "🏅"}</Text>
                </View>
                <Text className="text-foreground text-2xl font-bold text-center">{medal.name}</Text>
                <Text className="text-xs font-bold mt-1" style={{ color }}>
                  {MEDAL_TIER_LABEL[medal.tier]}
                </Text>
                <Text className="text-muted text-center mt-2">{medal.description}</Text>
                {(medal.xpReward > 0 || medal.denarioReward > 0) && (
                  <View className="flex-row gap-3 mt-4">
                    {medal.xpReward > 0 && (
                      <View className="bg-accent/20 px-4 py-2 rounded-full">
                        <Text className="text-foreground font-bold">+{medal.xpReward} XP</Text>
                      </View>
                    )}
                    {medal.denarioReward > 0 && (
                      <View className="bg-secondary/20 px-4 py-2 rounded-full">
                        <Text className="text-foreground font-bold">+{medal.denarioReward} 💰</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            );
          })()}

          <TouchableOpacity className="bg-primary w-full py-3 rounded-full mt-6 active:opacity-70" onPress={next}>
            <Text className="text-white text-center font-bold">{isLast ? "Amém!" : "Continuar"}</Text>
          </TouchableOpacity>
          {moments.length > 1 && (
            <View className="flex-row gap-1 mt-3">
              {moments.map((_, i) => (
                <View key={i} className={`w-2 h-2 rounded-full ${i === step ? "bg-primary" : "bg-border"}`} />
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

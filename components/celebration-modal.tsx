import { useEffect, useMemo, useState } from "react";
import { Modal, Text, View } from "react-native";
import { getLevelProgress, getLevelTitle } from "@shared/progression";
import { MEDAL_TIER_COLOR, MEDAL_TIER_LABEL, type MedalTier } from "@shared/medal-rewards";
import {
  AnimatedBar,
  Confetti,
  CountUp,
  Flame,
  Float,
  PopIn,
  PressableScale,
  Pulse,
  haptic,
  randomCheer,
} from "@/components/juice";

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

const CONFETTI_BY_MOMENT = { rewards: 35, streak: 50, level: 110, medal: 90 } as const;

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
  const [cheer, setCheer] = useState(randomCheer);
  const [confettiKey, setConfettiKey] = useState<number | null>(null);

  useEffect(() => {
    setStep(0);
    setCheer(randomCheer());
  }, [result]);

  const moment = moments[step];

  // Confetti + haptics on every moment
  useEffect(() => {
    if (!result || !moment) return;
    const big = moment.kind === "level" || moment.kind === "medal" || !!result.streak?.milestoneReached;
    if (big) haptic.big();
    else haptic.success();
    const worthConfetti =
      moment.kind !== "rewards" || result.dayComplete || moments.length === 1;
    setConfettiKey(worthConfetti ? Date.now() : null);
  }, [moment, result, moments.length]);

  if (!result || !moment) return null;

  const isLast = step >= moments.length - 1;
  const next = () => (isLast ? onClose() : setStep((s) => s + 1));
  const before = getLevelProgress(result.xpBefore);
  const after = getLevelProgress(result.xpTotal);
  const leveled = after.level > before.level;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 items-center justify-center p-6">
        <PopIn trigger={step}>
          <View className="bg-background w-full rounded-3xl p-6 items-center border-4 border-primary" style={{ minWidth: 300, maxWidth: 380 }}>
            {moment.kind === "rewards" && (
              <>
                <Float>
                  <Text style={{ fontSize: 64 }}>{result.dayComplete ? "🙌" : "⭐"}</Text>
                </Float>
                <Text className="text-foreground text-3xl font-extrabold text-center mt-1">
                  {result.dayComplete ? "Dia completo!" : cheer}
                </Text>
                <Text className="text-muted text-sm text-center mt-1 mb-4">
                  {result.dayComplete ? "Todos os desafios de hoje feitos. Que orgulho! 🏆" : "Mais um passo na sua jornada!"}
                </Text>
                <View className="flex-row gap-3 mb-5">
                  <PopIn delay={150}>
                    <View className="bg-primary px-4 py-2 rounded-full">
                      <CountUp value={result.xpEarned} from={0} prefix="+" suffix=" XP" className="text-white text-lg font-extrabold" />
                    </View>
                  </PopIn>
                  <PopIn delay={300}>
                    <View className="bg-warning px-4 py-2 rounded-full">
                      <CountUp value={result.denariosEarned} from={0} prefix="+" suffix=" 💰" className="text-foreground text-lg font-extrabold" />
                    </View>
                  </PopIn>
                </View>
                <View className="w-full">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-foreground text-xs font-bold">
                      {before.title.emoji} Nível {before.level}
                    </Text>
                    <Text className="text-muted text-xs">
                      {leveled ? "Subiu de nível! 🚀" : `${after.xpIntoLevel}/${after.xpForNextLevel} XP`}
                    </Text>
                  </View>
                  <AnimatedBar percent={leveled ? 100 : after.percent} from={before.percent} height={14} />
                </View>
              </>
            )}

            {moment.kind === "streak" && result.streak && (
              <>
                {result.streak.wasReset ? (
                  <Float>
                    <Text style={{ fontSize: 72 }}>🌱</Text>
                  </Float>
                ) : (
                  <Flame size={80} streak={result.streak.currentStreak} />
                )}
                <View className="flex-row items-baseline mt-2">
                  <CountUp
                    value={result.streak.currentStreak}
                    from={Math.max(0, result.streak.currentStreak - 1)}
                    duration={600}
                    className="text-foreground text-5xl font-extrabold"
                  />
                  <Text className="text-foreground text-2xl font-extrabold ml-2">
                    {result.streak.currentStreak === 1 ? "dia" : "dias"}
                  </Text>
                </View>
                <Text className="text-muted text-center mt-2">
                  {result.streak.wasReset
                    ? "Todo dia é um recomeço. Bora de novo! 💪"
                    : "Sequência pegando fogo! Não deixa apagar 🔥"}
                </Text>
                {result.streak.freezesUsed > 0 && (
                  <PopIn delay={400}>
                    <View className="bg-accent/30 rounded-2xl p-3 mt-4">
                      <Text className="text-foreground text-center text-sm font-semibold">
                        🕊️ {result.streak.freezesUsed === 1 ? "Uma Graça salvou" : `${result.streak.freezesUsed} Graças salvaram`} sua
                        sequência! Restam {result.streak.freezesLeft}.
                      </Text>
                    </View>
                  </PopIn>
                )}
                {result.streak.milestoneReached && (
                  <PopIn delay={500} spin>
                    <View className="bg-warning rounded-2xl p-3 mt-4">
                      <Text className="text-foreground text-center font-extrabold">
                        🏆 MARCO DE {result.streak.milestoneReached} DIAS! +{result.streak.bonusDenarios} 💰
                      </Text>
                    </View>
                  </PopIn>
                )}
              </>
            )}

            {moment.kind === "level" && result.levelUp && (
              <>
                <Text className="text-primary uppercase tracking-widest text-sm font-extrabold">Level up!</Text>
                <PopIn delay={100} spin>
                  <View className="w-32 h-32 rounded-full bg-primary items-center justify-center my-3 border-4 border-warning">
                    <Text style={{ fontSize: 56 }}>{result.levelUp.newTitle?.emoji ?? getLevelTitle(result.levelUp.to).emoji}</Text>
                  </View>
                </PopIn>
                <View className="flex-row items-baseline">
                  <Text className="text-foreground text-3xl font-extrabold">Nível </Text>
                  <CountUp value={result.levelUp.to} from={result.levelUp.from} duration={700} className="text-foreground text-5xl font-extrabold" />
                </View>
                {result.levelUp.newTitle ? (
                  <PopIn delay={500}>
                    <Text className="text-primary text-xl font-extrabold text-center mt-1">
                      Novo título: {result.levelUp.newTitle.title}!
                    </Text>
                  </PopIn>
                ) : (
                  <Text className="text-muted mt-1">{getLevelTitle(result.levelUp.to).title}</Text>
                )}
                <PopIn delay={700}>
                  <View className="bg-warning px-4 py-2 rounded-full mt-4">
                    <CountUp value={result.levelUp.denarioReward} from={0} prefix="+" suffix=" 💰" className="text-foreground text-lg font-extrabold" />
                  </View>
                </PopIn>
              </>
            )}

            {moment.kind === "medal" &&
              (() => {
                const medal = result.newMedals[moment.index];
                const color = MEDAL_TIER_COLOR[medal.tier] ?? MEDAL_TIER_COLOR.BRONZE;
                return (
                  <>
                    <Text className="text-primary uppercase tracking-widest text-sm font-extrabold">Medalha nova!</Text>
                    <PopIn delay={100} spin>
                      <Pulse amount={0.05}>
                        <View
                          className="w-32 h-32 rounded-full items-center justify-center my-3"
                          style={{ borderWidth: 6, borderColor: color, backgroundColor: `${color}22` }}
                        >
                          <Text style={{ fontSize: 60 }}>{medal.iconEmoji || "🏅"}</Text>
                        </View>
                      </Pulse>
                    </PopIn>
                    <Text className="text-foreground text-2xl font-extrabold text-center">{medal.name}</Text>
                    <View className="px-3 py-1 rounded-full mt-2" style={{ backgroundColor: color }}>
                      <Text className="text-white text-xs font-extrabold uppercase">{MEDAL_TIER_LABEL[medal.tier]}</Text>
                    </View>
                    <Text className="text-muted text-center mt-2">{medal.description}</Text>
                    {(medal.xpReward > 0 || medal.denarioReward > 0) && (
                      <PopIn delay={500}>
                        <View className="flex-row gap-3 mt-4">
                          {medal.xpReward > 0 && (
                            <View className="bg-primary px-4 py-2 rounded-full">
                              <Text className="text-white font-extrabold">+{medal.xpReward} XP</Text>
                            </View>
                          )}
                          {medal.denarioReward > 0 && (
                            <View className="bg-warning px-4 py-2 rounded-full">
                              <Text className="text-foreground font-extrabold">+{medal.denarioReward} 💰</Text>
                            </View>
                          )}
                        </View>
                      </PopIn>
                    )}
                  </>
                );
              })()}

            <View className="w-full mt-6">
              <Pulse amount={0.04}>
                <PressableScale className="bg-primary w-full py-4 rounded-full" onPress={next}>
                  <Text className="text-white text-center text-lg font-extrabold">
                    {isLast ? "Amém! 🙏" : "Continuar ➜"}
                  </Text>
                </PressableScale>
              </Pulse>
            </View>
            {moments.length > 1 && (
              <View className="flex-row gap-1 mt-3">
                {moments.map((_, i) => (
                  <View key={i} className={`h-2 rounded-full ${i === step ? "bg-primary w-6" : "bg-border w-2"}`} />
                ))}
              </View>
            )}
          </View>
        </PopIn>
        <Confetti burstKey={confettiKey} count={CONFETTI_BY_MOMENT[moment.kind]} />
      </View>
    </Modal>
  );
}

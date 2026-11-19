import { useEffect, useMemo, useState } from "react";
import { Modal, Text, View } from "react-native";
import { getLevelProgress, getLevelTitle } from "@shared/progression";
import {
  MEDAL_TIER_COLOR,
  MEDAL_TIER_LABEL,
  type MedalTier,
} from "@shared/medal-rewards";
import {
  AnimatedBar,
  Confetti,
  CountUp,
  Flame,
  Float,
  PopIn,
  PressableScale,
  haptic,
  randomCheer,
} from "@/components/juice";
import { Mascot3D } from "@/components/mascot-3d";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { Figurine } from "@/components/figurine";
import { isCharacterKey } from "@shared/character-catalog";
import { GameButton } from "@/components/game-button";

const MEDAL_TIER_ICON: Record<string, GameIconName> = {
  BRONZE: "medal-bronze",
  SILVER: "medal-silver",
  GOLD: "medal-gold",
  DIAMOND: "medal-diamond",
};

export type ChallengeRewardResult = {
  xpEarned: number;
  denariosEarned: number;
  xpBefore: number;
  xpTotal: number;
  streak: {
    currentStreak: number;
    increased: boolean;
    wasReset: boolean;
    milestoneReached: number | null;
    bonusDenarios: number;
  } | null;
  levelUp: {
    from: number;
    to: number;
    denarioReward: number;
    newTitle: { title: string; emoji: string; icon?: GameIconName } | null;
    newLooks?: { id: string; name: string; character: string; look: string; hair: string | null; accessory: string | null }[];
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
  !!result.streak?.increased ||
  !!result.levelUp ||
  result.newMedals.length > 0 ||
  !!result.dayComplete;

type Moment =
  | { kind: "rewards" }
  | { kind: "streak" }
  | { kind: "level" }
  | { kind: "medal"; index: number };

const CONFETTI_BY_MOMENT = {
  rewards: 35,
  streak: 50,
  level: 110,
  medal: 90,
} as const;

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
    const big =
      moment.kind === "level" ||
      moment.kind === "medal" ||
      !!result.streak?.milestoneReached;
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
          <View
            className="bg-background w-full rounded-3xl p-6 items-center border-4 border-primary"
            style={{ minWidth: 300, maxWidth: 380 }}
          >
            {moment.kind === "rewards" && (
              <>
                <Float>
                  <Mascot3D
                    mood={result.dayComplete ? "jump" : "cheer"}
                    moodKey={step}
                    size={128}
                  />
                </Float>
                <Text className="text-foreground text-3xl font-extrabold text-center mt-1">
                  {result.dayComplete ? "Dia completo!" : cheer}
                </Text>
                <Text className="text-muted text-sm text-center mt-1 mb-4">
                  {result.dayComplete
                    ? "Todos os desafios de hoje feitos. Que orgulho!"
                    : "Mais um passo na sua jornada!"}
                </Text>
                <View className="flex-row gap-3 mb-5">
                  <PopIn delay={150}>
                    <View className="bg-primary px-4 py-2 rounded-full flex-row items-center">
                      <GameIcon name="xp" size="md" style={{ marginRight: 6 }} />
                      <CountUp
                        value={result.xpEarned}
                        from={0}
                        prefix="+"
                        suffix=" XP"
                        className="text-white text-lg font-extrabold"
                      />
                    </View>
                  </PopIn>
                  <PopIn delay={300}>
                    <View className="bg-warning px-4 py-2 rounded-full flex-row items-center">
                      <GameIcon name="coin" size="md" style={{ marginRight: 6 }} />
                      <CountUp
                        value={result.denariosEarned}
                        from={0}
                        prefix="+"
                        className="text-foreground text-lg font-extrabold"
                      />
                    </View>
                  </PopIn>
                </View>
                <View className="w-full">
                  <View className="flex-row justify-between mb-1">
                    <View className="flex-row items-center">
                      <GameIcon name={before.title.icon} size="sm" style={{ marginRight: 4 }} />
                      <Text className="text-foreground text-xs font-bold">Nível {before.level}</Text>
                    </View>
                    <Text className="text-muted text-xs">
                      {leveled
                        ? "Subiu de nível!"
                        : `${after.xpIntoLevel}/${after.xpForNextLevel} XP`}
                    </Text>
                  </View>
                  <AnimatedBar
                    percent={leveled ? 100 : after.percent}
                    from={before.percent}
                    height={14}
                  />
                </View>
              </>
            )}

            {moment.kind === "streak" && result.streak && (
              <>
                {result.streak.wasReset ? (
                  <Float>
                    <GameIcon name="sprout" size="hero" />
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
                    ? "Todo dia é um recomeço. Bora de novo!"
                    : "Sequência pegando fogo! Não deixa apagar!"}
                </Text>
                {result.streak.milestoneReached && (
                  <PopIn delay={500} spin>
                    <View className="bg-warning rounded-2xl p-3 mt-4 flex-row items-center">
                      <GameIcon name="trophy" size="lg" style={{ marginRight: 8 }} />
                      <Text className="text-foreground font-extrabold">
                        MARCO DE {result.streak.milestoneReached} DIAS! +
                        {result.streak.bonusDenarios}
                      </Text>
                      <GameIcon name="coin" size="md" style={{ marginLeft: 4 }} />
                    </View>
                  </PopIn>
                )}
              </>
            )}

            {moment.kind === "level" && result.levelUp && (
              <>
                <Text className="text-primary uppercase tracking-widest text-sm font-extrabold">
                  Level up!
                </Text>
                <PopIn delay={100} spin>
                  <View className="w-32 h-32 rounded-full bg-primary items-center justify-center my-3 border-4 border-warning">
                    <GameIcon
                      name={result.levelUp.newTitle?.icon ?? getLevelTitle(result.levelUp.to).icon}
                      size={84}
                    />
                  </View>
                </PopIn>
                <View className="flex-row items-baseline">
                  <Text className="text-foreground text-3xl font-extrabold">
                    Nível{" "}
                  </Text>
                  <CountUp
                    value={result.levelUp.to}
                    from={result.levelUp.from}
                    duration={700}
                    className="text-foreground text-5xl font-extrabold"
                  />
                </View>
                {result.levelUp.newTitle ? (
                  <PopIn delay={500}>
                    <Text className="text-primary text-xl font-extrabold text-center mt-1">
                      Novo título: {result.levelUp.newTitle.title}!
                    </Text>
                  </PopIn>
                ) : (
                  <Text className="text-muted mt-1">
                    {getLevelTitle(result.levelUp.to).title}
                  </Text>
                )}
                {result.levelUp.newLooks?.length && isCharacterKey(result.levelUp.newLooks[0].character) ? (
                  <PopIn delay={600}>
                    <View className="items-center mt-3">
                      <Figurine
                        figurine={{ ...result.levelUp.newLooks[0], character: result.levelUp.newLooks[0].character, chosen: true }}
                        height={120}
                      />
                      <Text className="text-primary text-base font-extrabold text-center">
                        Novo look liberado: {result.levelUp.newLooks.map((l) => l.name).join(", ")}!
                      </Text>
                      <Text className="text-muted text-xs text-center">Vista no Guarda-roupa</Text>
                    </View>
                  </PopIn>
                ) : null}
                <PopIn delay={700}>
                  <View className="bg-warning px-4 py-2 rounded-full mt-4 flex-row items-center">
                    <GameIcon name="coin" size="md" style={{ marginRight: 6 }} />
                    <CountUp
                      value={result.levelUp.denarioReward}
                      from={0}
                      prefix="+"
                      className="text-foreground text-lg font-extrabold"
                    />
                  </View>
                </PopIn>
              </>
            )}

            {moment.kind === "medal" &&
              (() => {
                const medal = result.newMedals[moment.index];
                const color =
                  MEDAL_TIER_COLOR[medal.tier] ?? MEDAL_TIER_COLOR.BRONZE;
                return (
                  <>
                    <Text className="text-primary uppercase tracking-widest text-sm font-extrabold">
                      Medalha nova!
                    </Text>
                    <PopIn delay={100} spin>
                      <View
                          className="w-32 h-32 rounded-full items-center justify-center my-3"
                          style={{
                            borderWidth: 6,
                            borderColor: color,
                            backgroundColor: `${color}22`,
                          }}
                        >
                          <GameIcon name={MEDAL_TIER_ICON[medal.tier] ?? "medal-bronze"} size={84} />
                        </View>
                    </PopIn>
                    <Text className="text-foreground text-2xl font-extrabold text-center">
                      {medal.name}
                    </Text>
                    <View
                      className="px-3 py-1 rounded-full mt-2"
                      style={{ backgroundColor: color }}
                    >
                      <Text className="text-white text-xs font-extrabold uppercase">
                        {MEDAL_TIER_LABEL[medal.tier]}
                      </Text>
                    </View>
                    <Text className="text-muted text-center mt-2">
                      {medal.description}
                    </Text>
                    {(medal.xpReward > 0 || medal.denarioReward > 0) && (
                      <PopIn delay={500}>
                        <View className="flex-row gap-3 mt-4">
                          {medal.xpReward > 0 && (
                            <View className="bg-primary px-4 py-2 rounded-full flex-row items-center">
                              <GameIcon name="xp" size="sm" style={{ marginRight: 4 }} />
                              <Text className="text-white font-extrabold">
                                +{medal.xpReward} XP
                              </Text>
                            </View>
                          )}
                          {medal.denarioReward > 0 && (
                            <View className="bg-warning px-4 py-2 rounded-full flex-row items-center">
                              <GameIcon name="coin" size="sm" style={{ marginRight: 4 }} />
                              <Text className="text-foreground font-extrabold">
                                +{medal.denarioReward}
                              </Text>
                            </View>
                          )}
                        </View>
                      </PopIn>
                    )}
                  </>
                );
              })()}

            <View className="w-full mt-6">
              <GameButton
                  fullWidth
                  size="lg"
                  variant={isLast ? "banner" : "royal"}
                  title={isLast ? "Amém!" : "Continuar"}
                  onPress={next}
                />
            </View>
            {moments.length > 1 && (
              <View className="flex-row gap-1 mt-3">
                {moments.map((_, i) => (
                  <View
                    key={i}
                    className={`h-2 rounded-full ${i === step ? "bg-primary w-6" : "bg-border w-2"}`}
                  />
                ))}
              </View>
            )}
          </View>
        </PopIn>
        <Confetti
          burstKey={confettiKey}
          count={CONFETTI_BY_MOMENT[moment.kind]}
        />
      </View>
    </Modal>
  );
}

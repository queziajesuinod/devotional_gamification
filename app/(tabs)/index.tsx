import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  formatCampoGrandeDate,
  getDelayToCampoGrandeNextMidnight,
} from "@shared/_core/time";
import { useNotifications } from "@/components/notification-provider";
import {
  CelebrationModal,
  shouldCelebrate,
  type ChallengeRewardResult,
} from "@/components/celebration-modal";
import { getLevelProgress, STREAK_MILESTONES } from "@shared/progression";
import { syncDailyReminders } from "@/lib/reminders";
import {
  EncouragementInbox,
  WeeklyQuestsCard,
} from "@/components/weekly-quests-card";
import {
  AnimatedBar,
  CountUp,
  Flame,
  PopIn,
} from "@/components/juice";
import { useJuice } from "@/components/juice-provider";
import { MascotCard, type MascotEvent } from "@/components/mascot-card";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { GameButton, GameCloseButton } from "@/components/game-button";
import { SOFT_SHADOW } from "@/lib/ui";
import { HeroTexture } from "@/components/hero-texture";

const CHALLENGE_ICON: Record<string, GameIconName> = {
  READING: "reading",
  DEVOTIONAL: "devotional",
  REFLECTION: "reflection",
  EXTRA: "extra",
};

const STREAK_STATUS_UI: Record<string, { icon: GameIconName; text: string }> = {
  done_today: { icon: "calendar", text: "Sequência garantida hoje. Volte amanhã!" },
  at_risk: { icon: "hourglass", text: "Complete um desafio hoje para manter sua sequência!" },
  broken: { icon: "sprout", text: "Todo dia é um recomeço. Complete um desafio para iniciar uma nova sequência." },
  none: { icon: "sprout", text: "Complete um desafio para começar sua sequência!" },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotifications();
  const [reflectionModalVisible, setReflectionModalVisible] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(
    null,
  );
  const [celebration, setCelebration] = useState<ChallengeRewardResult | null>(
    null,
  );
  const juice = useJuice();
  const [mascotEvent, setMascotEvent] = useState<MascotEvent | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: userData,
    isLoading: userLoading,
    refetch: refetchUser,
  } = trpc.user.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const {
    data: todayData,
    isLoading: todayLoading,
    refetch: refetchToday,
  } = trpc.devotional.today.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();
  const completeChallengeMutation =
    trpc.devotional.completeChallenge.useMutation({
      onSuccess: () => {
        refetchToday();
        refetchUser();
        utils.engagement.weeklyQuests.invalidate();
        utils.engagement.league.invalidate();
      },
    });

  // Keep local reminders in sync with today's progress
  const doneToday = userData?.streakStatus === "done_today";
  const currentStreak = userData?.currentStreak;
  useEffect(() => {
    if (currentStreak === undefined) return;
    syncDailyReminders({ doneToday, streak: currentStreak }).catch(() => {});
  }, [doneToday, currentStreak]);

  const showRewards = (
    result: ChallengeRewardResult,
    fallbackMessage: string,
  ) => {
    // The mascot reacts to every completion; big moments get a jump
    const big = !!result.levelUp || result.newMedals.length > 0 || !!result.dayComplete;
    setMascotEvent((prev) => ({
      mood: big ? "jump" : "cheer",
      line: result.levelUp
        ? `NÍVEL ${result.levelUp.to}! Eu sabia que você conseguia!`
        : result.newMedals.length > 0
          ? `Medalha nova! Que orgulho!`
          : result.dayComplete
            ? "Dia completo! Você é demais!"
            : `+${result.xpEarned} XP! Continua assim!`,
      key: (prev?.key ?? 0) + 1,
    }));
    if (shouldCelebrate(result)) {
      setCelebration(result);
    } else {
      juice.burst({
        subtitle: fallbackMessage,
        xp: result.xpEarned,
        denario: result.denariosEarned,
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchToday()]);
    setRefreshing(false);
  };

  const handleCompleteChallenge = async (
    challengeId: number,
    challengeType: string,
  ) => {
    // If it's a reflection challenge, show modal first
    if (challengeType === "REFLECTION") {
      setSelectedChallengeId(challengeId);
      setReflectionText("");
      setReflectionModalVisible(true);
      return;
    }

    // For other challenges, complete directly
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const result = await completeChallengeMutation.mutateAsync({
        challengeId,
      });
      showRewards(result, "Desafio concluído!");
    } catch (error: any) {
      console.error("Error completing challenge:", error);
      notifications.error(error.message || "Erro ao completar desafio");
    }
  };

  const handleSubmitReflection = async () => {
    if (!selectedChallengeId) return;

    if (!reflectionText.trim()) {
      notifications.error(
        "Por favor, escreva sua reflexão antes de continuar.",
      );
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await completeChallengeMutation.mutateAsync({
        challengeId: selectedChallengeId,
        responseText: reflectionText,
      });
      setReflectionModalVisible(false);
      setReflectionText("");
      setSelectedChallengeId(null);
      showRewards(result, "Reflexão salva!");
    } catch (error: any) {
      console.error("Error completing reflection:", error);
      notifications.error(error.message || "Erro ao completar reflexão");
    }
  };

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando...</Text>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <View className="items-center max-w-md">
          <GameIcon name="reading" size="hero" style={{ marginBottom: 24 }} />
          <Text className="text-foreground text-3xl font-bold text-center mb-3">
            Devocional Quest
          </Text>
          <Text className="text-muted text-center text-base leading-relaxed">
            Cresça na fé através de leituras bíblicas diárias, desafios e
            recompensas!
          </Text>
          <View className="mt-8 bg-accent/10 p-4 rounded-xl">
            <Text className="text-foreground text-center text-sm">
              Este app requer autenticação Manus.
            </Text>
            <Text className="text-muted text-center text-xs mt-2">
              Faça login na plataforma Manus para acessar o conteúdo.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (userLoading || todayLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando devocional...</Text>
      </ScreenContainer>
    );
  }

  const levelProgress = getLevelProgress(userData?.xpTotal || 0);
  const streak = userData?.currentStreak || 0;
  const streakStatus = userData?.streakStatus ?? "none";
  const effectiveStreak = streakStatus === "broken" ? 0 : streak;
  const nextMilestone =
    STREAK_MILESTONES.find((m) => m.days > effectiveStreak) ?? null;
  const todayChallenges = todayData?.challenges ?? [];
  const totalChallenges = todayChallenges.length;
  const doneCount = todayChallenges.filter((c) => c.completed).length;
  const nextChallengeId = todayChallenges.find((c) => !c.completed)?.id ?? null;

  return (
    <ScreenContainer background={KINGDOM_BG.main}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-primary p-6 rounded-b-3xl">
          <HeroTexture style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
          <Text
            style={{ color: "#FFFFFF" }}
            className="text-xl font-extrabold mb-3"
          >
            Olá, {userData?.nickname || "Usuário"}!
          </Text>

          {/* Avatar do jogador (construído na loja) + incentivo da Lã-Lã */}
          <View className="mb-3">
            <MascotCard
              name={userData?.nickname || "amigo"}
              streakStatus={streakStatus}
              streak={effectiveStreak}
              event={mascotEvent}
              figurine={userData?.figurine}
            />
          </View>

          <View className="flex-row items-center gap-4">
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-sm font-semibold">
                {levelProgress.title.emoji} Nível {levelProgress.level}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white/80 text-xs">
                {levelProgress.title.title} · {levelProgress.xpIntoLevel}/
                {levelProgress.xpForNextLevel} XP
              </Text>
              <View className="mt-1">
                <AnimatedBar
                  percent={levelProgress.percent}
                  height={8}
                  fillClassName="bg-warning"
                  trackClassName="bg-white/20"
                />
              </View>
            </View>
            <View className="bg-warning px-3 py-1 rounded-full flex-row items-center">
              <GameIcon name="coin" size="sm" style={{ marginRight: 4 }} />
              <CountUp
                value={userData?.denarioBalance || 0}
                className="text-foreground text-sm font-extrabold"
              />
            </View>
          </View>

          {/* Streak Badge */}
          <View className="mt-4 bg-white/10 rounded-2xl p-4 border-2 border-white/20">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {effectiveStreak === 0 ? (
                  <GameIcon name="sprout" size="lg" />
                ) : (
                  <Flame size={40} streak={effectiveStreak} />
                )}
                <View>
                  <View className="flex-row items-baseline">
                    <CountUp
                      value={effectiveStreak}
                      style={{ color: "#FFFFFF" }}
                      className="text-3xl font-extrabold"
                    />
                    <Text
                      style={{ color: "#FFFFFF" }}
                      className="text-xl font-extrabold ml-1"
                    >
                      {effectiveStreak === 1 ? "dia" : "dias"}
                    </Text>
                  </View>
                  <Text className="text-white/90 text-xs">Sequência atual</Text>
                </View>
              </View>
              <View className="items-end">
                <Text style={{ color: "#FFFFFF" }} className="text-xs opacity-90">
                  Recorde
                </Text>
                <Text style={{ color: "#FFFFFF" }} className="text-lg font-semibold">
                  {userData?.longestStreak || 0} dias
                </Text>
              </View>
            </View>

            {/* Status line */}
            <View
              className={`mt-3 rounded-xl px-3 py-2 ${streakStatus === "at_risk" ? "bg-warning/30" : "bg-black/10"}`}
            >
              <View className="flex-row items-center">
                <GameIcon name={(STREAK_STATUS_UI[streakStatus] ?? STREAK_STATUS_UI.none).icon} size="md" style={{ marginRight: 8 }} />
                <Text className="text-white text-xs font-semibold flex-1">
                  {(STREAK_STATUS_UI[streakStatus] ?? STREAK_STATUS_UI.none).text}
                </Text>
              </View>
            </View>

            {/* Milestone Progress */}
            <View className="mt-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white/85 text-xs">Próximo marco:</Text>
                <Text className="text-white text-xs font-semibold">
                  {nextMilestone
                    ? `${nextMilestone.days} dias (faltam ${nextMilestone.days - effectiveStreak}) · +${nextMilestone.denarios} denários`
                    : "Todos os marcos alcançados!"}
                </Text>
              </View>
              <View className="flex-row gap-2">
                {STREAK_MILESTONES.map((m) => (
                  <View
                    key={m.days}
                    className={`flex-1 h-2 rounded-full ${effectiveStreak >= m.days ? "bg-accent" : "bg-white/20"}`}
                  />
                ))}
              </View>
              <View className="flex-row justify-between mt-1">
                {STREAK_MILESTONES.map((m) => (
                  <Text key={m.days} className="text-white/85 text-xs">
                    {m.days}d
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Devotional Content */}
        <View className="p-6">
          <EncouragementInbox />
          {todayData?.bibleReference ? (
            <>
              <View
                className="rounded-2xl mb-4 overflow-hidden"
                style={SOFT_SHADOW}
              >
                {/* Capa ilustrada do reino + versículo por cima */}
                <View style={{ height: 120 }}>
                  <Image
                    source={KINGDOM_BG.main.wide}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: "100%",
                      height: "100%",
                    }}
                    resizeMode="cover"
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(0,0,0,0.38)",
                    }}
                  />
                  {/* Data no canto superior direito */}
                  <View style={{ position: "absolute", top: 10, right: 12 }}>
                    <Text
                      style={{ color: "#FFFFFF" }}
                      className="text-xs font-semibold opacity-90"
                    >
                      {formatCampoGrandeDate(todayData.date)}
                    </Text>
                  </View>
                  <View className="flex-1 justify-end p-4">
                    <View className="flex-row items-center">
                      <GameIcon name="scroll" size="sm" style={{ marginRight: 8 }} />
                      <Text
                        style={{
                          color: "#FFFFFF",
                          textShadowColor: "rgba(0,0,0,0.5)",
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 3,
                        }}
                        className="font-display text-xl font-extrabold flex-1"
                      >
                        {todayData.bibleReference}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Corpo limpo (sem pergaminho), leitura ampliada */}
                <View className="bg-surface p-5">
                  {todayData.devotionalText && (
                    <Text className="font-body text-foreground text-lg leading-relaxed mb-4">
                      {todayData.devotionalText}
                    </Text>
                  )}
                  {todayData.reflectionQuestion && (
                    <View
                      className="rounded-2xl p-5"
                      style={{
                        backgroundColor: "#FDF8EC",
                        shadowColor: "#6B451F",
                        shadowOpacity: 0.14,
                        shadowRadius: 7,
                        shadowOffset: { width: 0, height: 3 },
                        elevation: 2,
                      }}
                    >
                      <View className="flex-row items-center mb-2">
                        <GameIcon name="reflection" size="sm" style={{ marginRight: 6 }} />
                        <Text className="font-display text-wood font-extrabold">
                          Reflexão do Dia
                        </Text>
                      </View>
                      <Text className="font-body text-foreground text-base leading-relaxed">
                        {todayData.reflectionQuestion}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Challenges */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center bg-surface rounded-full pl-2 pr-3 py-1.5 border border-border">
                  <GameIcon name="banner" size="sm" style={{ marginRight: 6 }} />
                  <Text className="text-foreground font-extrabold">
                    Desafios do Dia
                  </Text>
                </View>
                <View className="flex-row items-center bg-surface rounded-full px-3 py-1.5 border border-border">
                  <Text className="text-primary font-extrabold">
                    {doneCount}/{totalChallenges}
                  </Text>
                  {doneCount === totalChallenges && totalChallenges > 0 ? (
                    <PopIn>
                      <GameIcon name="trophy" size="sm" style={{ marginLeft: 4 }} />
                    </PopIn>
                  ) : null}
                </View>
              </View>
              <View className="mb-4">
                <AnimatedBar
                  percent={
                    totalChallenges ? (doneCount / totalChallenges) * 100 : 0
                  }
                  height={12}
                />
              </View>
              {todayData.challenges?.map((challenge) => (
                <View
                  key={challenge.id}
                  className={`rounded-2xl mb-3 overflow-hidden bg-surface ${challenge.completed ? "border border-secondary" : challenge.id === nextChallengeId ? "border border-accent" : ""}`}
                  style={SOFT_SHADOW}
                >
                  <Image
                    source={require("@/assets/images/paper-texture.png")}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0.35,
                    }}
                    resizeMode="cover"
                  />
                  <View className="p-4">
                  <View className="flex-row items-center">
                    <GameIcon
                      name={CHALLENGE_ICON[challenge.type] ?? "extra"}
                      size="lg"
                      dimmed={challenge.completed}
                      style={{ marginRight: 12 }}
                    />
                    <View className="flex-1">
                      <Text className="text-foreground text-base font-bold mb-1">
                        {challenge.title}
                      </Text>
                      {challenge.description && (
                        <Text className="text-muted text-sm">
                          {challenge.description}
                        </Text>
                      )}
                    </View>
                    {/* Pontuação à direita (empilhada) */}
                    <View className="items-end ml-2" style={{ gap: 6 }}>
                      <View className="bg-accent/15 px-2.5 py-1 rounded-full flex-row items-center">
                        <GameIcon name="xp" size="xs" style={{ marginRight: 4 }} />
                        <Text className="text-accent text-xs font-extrabold">
                          +{challenge.baseXp} XP
                        </Text>
                      </View>
                      <View className="bg-warning/30 px-2.5 py-1 rounded-full flex-row items-center">
                        <GameIcon name="coin" size="xs" style={{ marginRight: 4 }} />
                        <Text className="text-foreground text-xs font-extrabold">
                          +{challenge.baseDenario}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Ação clara: botão largo embaixo pra marcar o desafio */}
                  {challenge.completed ? (
                    <PopIn trigger={challenge.completed}>
                      <GameButton
                        asLabel
                        fullWidth
                        variant="success"
                        icon="seal"
                        title="Concluído!"
                        style={{ marginTop: 12 }}
                        accessibilityLabel="Desafio concluído"
                      />
                    </PopIn>
                  ) : (
                    <GameButton
                      style={{ marginTop: 12 }}
                      fullWidth
                      variant="royal"
                      icon={challenge.type === "REFLECTION" ? "reflection" : "xp"}
                      title={challenge.type === "REFLECTION" ? "Escrever reflexão" : "Marcar como feito"}
                      onPress={() => handleCompleteChallenge(challenge.id, challenge.type)}
                      disabled={completeChallengeMutation.isPending}
                      accessibilityLabel={
                        challenge.type === "REFLECTION"
                          ? "Escrever reflexão e concluir"
                          : "Marcar desafio como feito"
                      }
                    />
                  )}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <Text className="text-muted text-center">
                Nenhum devocional disponível para hoje.
              </Text>
            </View>
          )}

          {/* Weekly quests */}
          <View className="mt-4">
            <WeeklyQuestsCard onRewardClaimed={() => refetchUser()} />
          </View>
        </View>
      </ScrollView>

      <CelebrationModal
        result={celebration}
        onClose={() => setCelebration(null)}
      />

      {/* Reflection Modal */}
      <Modal
        visible={reflectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReflectionModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="bg-background rounded-t-3xl p-6"
            style={{ maxHeight: "80%" }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-foreground text-xl font-bold">
                Sua Reflexão
              </Text>
              <GameCloseButton onPress={() => setReflectionModalVisible(false)} label="Fechar reflexão" />
            </View>

            <Text className="text-muted text-sm mb-3">
              Escreva sua reflexão sobre a pergunta do devocional de hoje:
            </Text>

            <TextInput
              className="bg-surface border border-border rounded-xl p-4 text-foreground min-h-[150px]"
              placeholder="Digite sua reflexão aqui..."
              placeholderTextColor="#9BA1A6"
              value={reflectionText}
              onChangeText={setReflectionText}
              multiline
              textAlignVertical="top"
              style={{ fontSize: 16 }}
            />

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <GameButton
                  fullWidth
                  variant="wood"
                  title="Cancelar"
                  onPress={() => setReflectionModalVisible(false)}
                />
              </View>

              <View className="flex-1">
                <GameButton
                  fullWidth
                  variant="banner"
                  title="Enviar"
                  onPress={handleSubmitReflection}
                  loading={completeChallengeMutation.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

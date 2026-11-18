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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { NiceAvatar, type NiceAvatarConfig } from "@/components/nice-avatar";
import { formatCampoGrandeDate, getDelayToCampoGrandeNextMidnight } from "@shared/_core/time";
import { useNotifications } from "@/components/notification-provider";
import { CelebrationModal, shouldCelebrate, type ChallengeRewardResult } from "@/components/celebration-modal";
import { getLevelProgress, STREAK_MILESTONES } from "@shared/progression";
import { syncDailyReminders } from "@/lib/reminders";
import { EncouragementInbox, WeeklyQuestsCard } from "@/components/weekly-quests-card";

const DEFAULT_AVATAR_CONFIG: NiceAvatarConfig = {
  sex: "man",
  faceColor: "#F9C9B6",
  earSize: "small",
  eyeStyle: "oval",
  mouthStyle: "peace",
  noseStyle: "short",
  eyeBrowStyle: "up",
  glassesStyle: "none",
  hatStyle: "none",
  shirtStyle: "short",
  shirtColor: "#FFFFFF",
  hairStyle: "normal",
  hairColor: "#000000",
  bgColor: "#9CA3AF",
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotifications();
  const [reflectionModalVisible, setReflectionModalVisible] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<ChallengeRewardResult | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: userData, isLoading: userLoading, refetch: refetchUser } = trpc.user.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = trpc.devotional.today.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();
  const completeChallengeMutation = trpc.devotional.completeChallenge.useMutation({
    onSuccess: () => {
      refetchToday();
      refetchUser();
      utils.engagement.weeklyQuests.invalidate();
      utils.engagement.league.invalidate();
    },
  });

  const buyFreezeMutation = trpc.user.buyStreakFreeze.useMutation({
    onSuccess: () => {
      refetchUser();
      notifications.success("Graça adquirida! 🕊️");
    },
    onError: (error) => notifications.error(error.message),
  });

  // Keep local reminders in sync with today's progress
  const doneToday = userData?.streakStatus === "done_today";
  const currentStreak = userData?.currentStreak;
  useEffect(() => {
    if (currentStreak === undefined) return;
    syncDailyReminders({ doneToday, streak: currentStreak }).catch(() => {});
  }, [doneToday, currentStreak]);

  const showRewards = (result: ChallengeRewardResult, fallbackMessage: string) => {
    if (shouldCelebrate(result)) {
      setCelebration(result);
    } else {
      notifications.success(`${fallbackMessage} +${result.xpEarned} XP · +${result.denariosEarned} 💰`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchToday()]);
    setRefreshing(false);
  };

  const handleCompleteChallenge = async (challengeId: number, challengeType: string) => {
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
      const result = await completeChallengeMutation.mutateAsync({ challengeId });
      showRewards(result, "Desafio concluído!");
    } catch (error: any) {
      console.error("Error completing challenge:", error);
      notifications.error(error.message || "Erro ao completar desafio");
    }
  };

  const handleSubmitReflection = async () => {
    if (!selectedChallengeId) return;

    if (!reflectionText.trim()) {
      notifications.error("Por favor, escreva sua reflexão antes de continuar.");
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
          <Text className="text-6xl mb-6">📖</Text>
          <Text className="text-foreground text-3xl font-bold text-center mb-3">Devocional Quest</Text>
          <Text className="text-muted text-center text-base leading-relaxed">
            Cresça na fé através de leituras bíblicas diárias, desafios e recompensas!
          </Text>
          <View className="mt-8 bg-accent/10 p-4 rounded-xl">
            <Text className="text-foreground text-center text-sm">
              🔒 Este app requer autenticação Manus.
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

  const avatarConfig =
    userData?.avatarConfig && typeof userData.avatarConfig === "object" && !Array.isArray(userData.avatarConfig)
      ? (userData.avatarConfig as NiceAvatarConfig)
      : null;
  const headerAvatarConfig = avatarConfig ?? DEFAULT_AVATAR_CONFIG;
  const showNiceAvatar = !!avatarConfig || !userData?.avatarUrl;
  const levelProgress = getLevelProgress(userData?.xpTotal || 0);
  const streak = userData?.currentStreak || 0;
  const streakStatus = userData?.streakStatus ?? "none";
  const effectiveStreak = streakStatus === "broken" ? 0 : streak;
  const nextMilestone = STREAK_MILESTONES.find((m) => m.days > effectiveStreak) ?? null;
  const freezes = userData?.streakFreezes ?? 0;
  const maxFreezes = userData?.maxStreakFreezes ?? 2;
  const freezePrice = userData?.streakFreezePrice ?? 60;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View className="bg-primary p-6">
          <View className="flex-row items-center gap-3 mb-3">
            {showNiceAvatar ? (
              <NiceAvatar config={headerAvatarConfig} size={48} />
            ) : (
              <Image
                source={{ uri: userData.avatarUrl }}
                className="w-12 h-12 rounded-full"
                resizeMode="cover"
              />
            )}
            <Text className="text-white text-lg font-semibold">Olá, {userData?.nickname || "Usuário"}!</Text>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="bg-white/20 px-3 py-1 rounded-full">
              <Text className="text-white text-sm font-semibold">
                {levelProgress.title.emoji} Nível {levelProgress.level}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white/80 text-xs">
                {levelProgress.title.title} · {levelProgress.xpIntoLevel}/{levelProgress.xpForNextLevel} XP
              </Text>
              <View className="bg-white/20 h-2 rounded-full mt-1">
                <View
                  className="bg-accent h-2 rounded-full"
                  style={{ width: `${levelProgress.percent}%` }}
                />
              </View>
            </View>
            <View className="bg-secondary  px-3 py-1 rounded-full">
              <Text className="text-primary text-sm font-bold">💰 {userData?.denarioBalance || 0}</Text>
            </View>
          </View>
          
          {/* Streak Badge */}
          <View className="mt-4 bg-white/10 rounded-2xl p-4 border-2 border-white/20">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Text className="text-4xl">{effectiveStreak === 0 ? "🌱" : "🔥"}</Text>
                <View>
                  <Text className="text-white text-2xl font-bold">
                    {effectiveStreak} {effectiveStreak === 1 ? "dia" : "dias"}
                  </Text>
                  <Text className="text-white/70 text-xs">Sequência atual</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-white/70 text-xs">Recorde</Text>
                <Text className="text-white text-lg font-semibold">{userData?.longestStreak || 0} dias</Text>
              </View>
            </View>

            {/* Status line */}
            <View className="mt-3 bg-black/10 rounded-xl px-3 py-2">
              <Text className="text-white text-xs">
                {streakStatus === "done_today" && "✅ Sequência garantida hoje. Volte amanhã!"}
                {streakStatus === "at_risk" && "⏳ Complete um desafio hoje para manter sua sequência!"}
                {streakStatus === "protected" &&
                  "🕊️ Você perdeu um dia, mas uma Graça protege sua sequência se fizer um desafio hoje."}
                {streakStatus === "broken" &&
                  "🌱 Todo dia é um recomeço. Complete um desafio para iniciar uma nova sequência."}
                {streakStatus === "none" && "🌱 Complete um desafio para começar sua sequência!"}
              </Text>
            </View>

            {/* Graças (streak freezes) */}
            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                {Array.from({ length: maxFreezes }).map((_, i) => (
                  <Text key={i} className="text-lg" style={{ opacity: i < freezes ? 1 : 0.3 }}>
                    🕊️
                  </Text>
                ))}
                <Text className="text-white/80 text-xs ml-2 flex-1">
                  {freezes} {freezes === 1 ? "Graça" : "Graças"}: protegem um dia perdido
                </Text>
              </View>
              {freezes < maxFreezes && (
                <TouchableOpacity
                  className="bg-white/20 px-3 py-1 rounded-full active:opacity-70"
                  disabled={buyFreezeMutation.isPending || (userData?.denarioBalance ?? 0) < freezePrice}
                  style={{ opacity: (userData?.denarioBalance ?? 0) < freezePrice ? 0.5 : 1 }}
                  onPress={() => buyFreezeMutation.mutate()}
                >
                  <Text className="text-white text-xs font-bold">+1 por {freezePrice} 💰</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Milestone Progress */}
            <View className="mt-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white/60 text-xs">Próximo marco:</Text>
                <Text className="text-white text-xs font-semibold">
                  {nextMilestone
                    ? `${nextMilestone.days} dias (faltam ${nextMilestone.days - effectiveStreak}) · +${nextMilestone.denarios} 💰`
                    : "Todos os marcos alcançados! 🎉"}
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
                  <Text key={m.days} className="text-white/60 text-xs">
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
              <View className="bg-surface rounded-2xl p-5 mb-4 border border-border">
                <Text className="text-muted text-sm mb-2">
                  {formatCampoGrandeDate(todayData.date)}
                </Text>
                <Text className="text-foreground text-xl font-bold mb-3">{todayData.bibleReference}</Text>
                {todayData.devotionalText && (
                  <Text className="text-foreground text-base leading-relaxed mb-3">{todayData.devotionalText}</Text>
                )}
                {todayData.reflectionQuestion && (
                  <View className="bg-accent/10 p-4 rounded-xl mt-2">
                    <Text className="text-accent font-semibold mb-1">💭 Reflexão do Dia</Text>
                    <Text className="text-foreground text-sm leading-relaxed">{todayData.reflectionQuestion}</Text>
                  </View>
                )}
              </View>

              {/* Challenges */}
              <Text className="text-foreground text-lg font-bold mb-3">Desafios do Dia</Text>
              {todayData.challenges?.map((challenge) => (
                <View key={challenge.id} className="bg-surface rounded-2xl p-4 mb-3 border border-border">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-foreground text-base font-semibold mb-1">{challenge.title}</Text>
                      {challenge.description && (
                        <Text className="text-muted text-sm mb-2">{challenge.description}</Text>
                      )}
                      <View className="flex-row items-center gap-3 mt-2">
                        <View className="bg-accent/10 px-2 py-1 rounded">
                          <Text className="text-accent text-xs font-semibold">+{challenge.baseXp} XP</Text>
                        </View>
                        <View className="bg-secondary/20 px-2 py-1 rounded">
                          <Text className="text-primary text-xs font-semibold">+{challenge.baseDenario} 💰</Text>
                        </View>
                      </View>
                    </View>
                    {challenge.completed ? (
                      <View className="bg-success/20 px-3 py-2 rounded-full">
                        <Text className="text-success text-xs font-bold">✓ Completo</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        className="bg-primary px-4 py-2 rounded-full active:opacity-70"
                        onPress={() => handleCompleteChallenge(challenge.id, challenge.type)}
                        disabled={completeChallengeMutation.isPending}
                      >
                        <Text className="text-white text-xs font-bold">
                          {challenge.type === "REFLECTION" ? "Refletir" : "Concluir"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <Text className="text-muted text-center">Nenhum devocional disponível para hoje.</Text>
            </View>
          )}

          {/* Weekly quests */}
          <View className="mt-4">
            <WeeklyQuestsCard onRewardClaimed={() => refetchUser()} />
          </View>
        </View>
      </ScrollView>

      <CelebrationModal result={celebration} onClose={() => setCelebration(null)} />

      {/* Reflection Modal */}
      <Modal
        visible={reflectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReflectionModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-background rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-foreground text-xl font-bold">Sua Reflexão</Text>
              <TouchableOpacity onPress={() => setReflectionModalVisible(false)}>
                <Text className="text-muted text-2xl">×</Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                className="flex-1 bg-surface border border-border py-3 rounded-full active:opacity-70"
                onPress={() => setReflectionModalVisible(false)}
              >
                <Text className="text-foreground text-center font-semibold">Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-primary py-3 rounded-full active:opacity-70"
                onPress={handleSubmitReflection}
                disabled={completeChallengeMutation.isPending}
              >
                <Text className="text-white text-center font-bold">
                  {completeChallengeMutation.isPending ? "Enviando..." : "Enviar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

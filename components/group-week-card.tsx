import { useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/components/notification-provider";
import { ENCOURAGEMENT_INFO, ENCOURAGEMENT_TYPES, GROUP_DAYS_PER_MEMBER } from "@shared/engagement";

const WEEKDAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg..Dom

/**
 * Cell weekly goal: shared progress bar, chest, and each member's week.
 * `readOnly` hides the chest and encouragement actions (leader panel).
 */
export function GroupWeekCard({ groupId, readOnly = false }: { groupId: number; readOnly?: boolean }) {
  const { user } = useAuth();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const [openMemberId, setOpenMemberId] = useState<number | null>(null);
  const { data, isLoading, refetch } = trpc.engagement.groupWeek.useQuery({ groupId });

  const claimChest = trpc.engagement.claimGroupChest.useMutation({
    onSuccess: (result) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      notifications.success(`Baú aberto! +${result.xp} XP · +${result.denario} 💰`);
      refetch();
      utils.user.me.invalidate();
    },
    onError: (error) => notifications.error(error.message),
  });

  const encourage = trpc.engagement.encourage.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      notifications.success("Encorajamento enviado 💌");
      setOpenMemberId(null);
      refetch();
      utils.engagement.weeklyQuests.invalidate();
    },
    onError: (error) => notifications.error(error.message),
  });

  if (isLoading) {
    return (
      <View className="bg-surface rounded-2xl p-4 border border-border items-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (!data) return null;

  const percent = Math.min(100, Math.round((data.progress / data.goal) * 100));
  const todayIndex = data.weekDays.indexOf(data.today);

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border">
      <Text className="text-foreground text-lg font-bold">Meta da semana</Text>
      <Text className="text-muted text-xs mt-1">
        Juntos: cada membro presente em {GROUP_DAYS_PER_MEMBER} dias. Cada dia de cada membro conta!
      </Text>

      <View className="flex-row items-center gap-3 mt-3">
        <View className="flex-1 bg-border h-3 rounded-full overflow-hidden">
          <View className="bg-primary h-3 rounded-full" style={{ width: `${percent}%` }} />
        </View>
        <Text className="text-foreground text-sm font-bold">
          {data.progress}/{data.goal}
        </Text>
      </View>

      {/* Chest */}
      {!readOnly && data.isMember && (
        <View className="mt-3">
          {data.chest.canClaimPrevious && (
            <TouchableOpacity
              className="bg-secondary py-3 rounded-full mb-2 active:opacity-70"
              disabled={claimChest.isPending}
              onPress={() => claimChest.mutate({ weekKey: data.chest.previousWeekKey })}
            >
              <Text className="text-white text-center font-bold">🎁 Abrir baú da semana passada</Text>
            </TouchableOpacity>
          )}
          {data.chest.canClaimCurrent ? (
            <TouchableOpacity
              className="bg-primary py-3 rounded-full active:opacity-70"
              disabled={claimChest.isPending}
              onPress={() => claimChest.mutate({ weekKey: data.weekKey })}
            >
              <Text className="text-white text-center font-bold">
                🎁 Abrir baú · +{data.chestReward.xp} XP · +{data.chestReward.denario} 💰
              </Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-muted text-xs text-center">
              {data.chest.claimedCurrent
                ? "✓ Baú desta semana aberto"
                : data.reached
                  ? "Meta batida! Faça um desafio esta semana para abrir o baú."
                  : `🎁 Baú: +${data.chestReward.xp} XP e +${data.chestReward.denario} 💰 para quem participar`}
            </Text>
          )}
        </View>
      )}

      {/* Members */}
      <View className="mt-4 gap-3">
        {data.members.map((member) => {
          const isMe = member.userId === user?.id;
          const canEncourage = !readOnly && data.isMember && !isMe && !member.encouragedToday;
          return (
            <View key={member.userId}>
              <View className="flex-row items-center gap-3">
                <Text className="text-foreground text-sm font-semibold flex-1" numberOfLines={1}>
                  {member.nickname}
                  {isMe ? " (você)" : ""}
                </Text>
                <View className="flex-row gap-1">
                  {data.weekDays.map((day, i) => {
                    const active = member.activeDays.includes(day);
                    return (
                      <View
                        key={day}
                        className={`w-5 h-5 rounded-full items-center justify-center ${
                          active ? "bg-primary" : i > todayIndex ? "bg-background border border-border" : "bg-border"
                        }`}
                      >
                        <Text className={`text-[9px] font-bold ${active ? "text-white" : "text-muted"}`}>
                          {WEEKDAY_LETTERS[i]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {!readOnly && data.isMember && !isMe && (
                  <TouchableOpacity
                    className="w-8 items-center"
                    disabled={!canEncourage}
                    onPress={() => setOpenMemberId(openMemberId === member.userId ? null : member.userId)}
                  >
                    <Text className="text-lg" style={{ opacity: canEncourage ? 1 : 0.35 }}>
                      {member.encouragedToday ? "💌" : "🙏"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {openMemberId === member.userId && (
                <View className="flex-row flex-wrap gap-2 mt-2 justify-end">
                  {ENCOURAGEMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      className="bg-accent/20 px-3 py-2 rounded-full active:opacity-70"
                      disabled={encourage.isPending}
                      onPress={() => encourage.mutate({ toUserId: member.userId, type })}
                    >
                      <Text className="text-foreground text-xs font-semibold">
                        {ENCOURAGEMENT_INFO[type].emoji} {ENCOURAGEMENT_INFO[type].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {data.members.length === 0 && <Text className="text-muted text-sm">Nenhum membro aprovado ainda.</Text>}
      </View>
    </View>
  );
}

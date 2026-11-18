import { Platform, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";

/** Dashboard card with this week's quests and a claim button for finished ones. */
export function WeeklyQuestsCard({ onRewardClaimed }: { onRewardClaimed?: () => void }) {
  const notifications = useNotifications();
  const { data, refetch } = trpc.engagement.weeklyQuests.useQuery();
  const claim = trpc.engagement.claimQuest.useMutation({
    onSuccess: (result) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      const levelText = result.levelUp ? ` · Nível ${result.levelUp.to}! 🎉` : "";
      notifications.success(`Missão concluída! +${result.xp} XP · +${result.denario} 💰${levelText}`);
      refetch();
      onRewardClaimed?.();
    },
    onError: (error) => notifications.error(error.message),
  });

  if (!data) return null;
  const completed = data.quests.filter((q) => q.claimed).length;

  return (
    <View className="bg-surface rounded-2xl p-4 mb-4 border border-border">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-foreground text-lg font-bold">Missões da semana</Text>
        <Text className="text-muted text-xs">
          {completed}/{data.quests.length} · {data.daysLeft === 0 ? "último dia!" : `${data.daysLeft} dias restantes`}
        </Text>
      </View>

      {data.quests.map((quest) => {
        const percent = Math.round((quest.current / quest.target) * 100);
        return (
          <View key={quest.id} className="mb-3">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">{quest.emoji}</Text>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${quest.claimed ? "text-muted line-through" : "text-foreground"}`}
                >
                  {quest.title}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="flex-1 bg-border h-2 rounded-full overflow-hidden">
                    <View className="bg-primary h-2 rounded-full" style={{ width: `${percent}%` }} />
                  </View>
                  <Text className="text-muted text-xs">
                    {quest.current}/{quest.target}
                  </Text>
                </View>
              </View>
              {quest.claimed ? (
                <Text className="text-success text-xs font-bold">✓</Text>
              ) : quest.done ? (
                <TouchableOpacity
                  className="bg-primary px-3 py-2 rounded-full active:opacity-70"
                  disabled={claim.isPending}
                  onPress={() => claim.mutate({ questId: quest.id })}
                >
                  <Text className="text-white text-xs font-bold">Resgatar</Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-muted text-xs">
                  +{quest.xpReward} XP{"\n"}+{quest.denarioReward} 💰
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Banner with encouragements received from the cell in the last days. */
export function EncouragementInbox() {
  const { data, refetch } = trpc.engagement.inbox.useQuery();
  const markSeen = trpc.engagement.markInboxSeen.useMutation({ onSuccess: () => refetch() });

  if (!data || data.unseen === 0) return null;
  const unseen = data.items.filter((item) => !item.seenAt).slice(0, 3);

  return (
    <View className="bg-accent/20 rounded-2xl p-4 mb-4 border border-accent">
      <Text className="text-foreground font-bold mb-2">
        💌 {data.unseen === 1 ? "Alguém lembrou de você" : `${data.unseen} pessoas lembraram de você`}
      </Text>
      {unseen.map((item) => (
        <Text key={item.id} className="text-foreground text-sm mb-1">
          {item.emoji} {item.text}
        </Text>
      ))}
      <TouchableOpacity className="self-end mt-2" onPress={() => markSeen.mutate()} disabled={markSeen.isPending}>
        <Text className="text-primary font-semibold text-sm">Amém, obrigado!</Text>
      </TouchableOpacity>
    </View>
  );
}

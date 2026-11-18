import { Text, TouchableOpacity, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { useJuice } from "@/components/juice-provider";
import { GameIcon } from "@/components/game-icon";
import { ENCOURAGEMENT_INFO } from "@shared/engagement";
import {
  AnimatedBar,
  PopIn,
  PressableScale,
  Pulse,
  Wiggle,
} from "@/components/juice";

/** Dashboard card with this week's quests and a claim button for finished ones. */
export function WeeklyQuestsCard({
  onRewardClaimed,
}: {
  onRewardClaimed?: () => void;
}) {
  const notifications = useNotifications();
  const juice = useJuice();
  const { data, refetch } = trpc.engagement.weeklyQuests.useQuery();
  const claim = trpc.engagement.claimQuest.useMutation({
    onSuccess: (result) => {
      juice.burst({
        title: result.levelUp
          ? `Nível ${result.levelUp.to}!`
          : "Missão cumprida!",
        xp: result.xp,
        denario: result.denario + (result.levelUp?.denarioReward ?? 0),
      });
      refetch();
      onRewardClaimed?.();
    },
    onError: (error) => notifications.error(error.message),
  });

  if (!data) return null;
  const completed = data.quests.filter((q) => q.claimed).length;

  return (
    <View className="bg-surface rounded-2xl p-4 mb-4 border-2 border-primary/40">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <GameIcon name="quest-target" size="md" style={{ marginRight: 6 }} />
          <Text className="text-foreground text-lg font-extrabold">Missões da semana</Text>
        </View>
        <Text className="text-muted text-xs">
          {completed}/{data.quests.length} ·{" "}
          {data.daysLeft === 0
            ? "último dia!"
            : `${data.daysLeft} dias restantes`}
        </Text>
      </View>

      {data.quests.map((quest) => {
        const percent = Math.round((quest.current / quest.target) * 100);
        return (
          <View key={quest.id} className="mb-3">
            <View className="flex-row items-center gap-3">
              {quest.done && !quest.claimed ? (
                <Wiggle>
                  <GameIcon name={quest.icon} size="lg" />
                </Wiggle>
              ) : (
                <GameIcon name={quest.icon} size="lg" dimmed={quest.claimed} />
              )}
              <View className="flex-1">
                <Text
                  className={`text-sm font-bold ${quest.claimed ? "text-muted line-through" : "text-foreground"}`}
                >
                  {quest.title}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="flex-1">
                    <AnimatedBar
                      percent={percent}
                      height={8}
                      shine={quest.done && !quest.claimed}
                    />
                  </View>
                  <Text className="text-muted text-xs font-semibold">
                    {quest.current}/{quest.target}
                  </Text>
                </View>
              </View>
              {quest.claimed ? (
                <PopIn spin>
                  <View className="bg-primary w-8 h-8 rounded-full items-center justify-center">
                    <Text className="text-white font-extrabold">✓</Text>
                  </View>
                </PopIn>
              ) : quest.done ? (
                <Pulse>
                  <PressableScale
                    className="bg-warning px-3 py-2 rounded-full border-2 border-primary"
                    disabled={claim.isPending}
                    onPress={() => claim.mutate({ questId: quest.id })}
                  >
                    <View className="flex-row items-center">
                      <GameIcon name="gift" size="sm" style={{ marginRight: 4 }} />
                      <Text className="text-foreground text-xs font-extrabold">Pegar!</Text>
                    </View>
                  </PressableScale>
                </Pulse>
              ) : (
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Text className="text-muted text-xs font-bold">+{quest.xpReward}</Text>
                    <GameIcon name="xp" size="xs" style={{ marginLeft: 2 }} />
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-muted text-xs font-bold">+{quest.denarioReward}</Text>
                    <GameIcon name="coin" size="xs" style={{ marginLeft: 2 }} />
                  </View>
                </View>
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
  const markSeen = trpc.engagement.markInboxSeen.useMutation({
    onSuccess: () => refetch(),
  });

  if (!data || data.unseen === 0) return null;
  const unseen = data.items.filter((item) => !item.seenAt).slice(0, 3);

  return (
    <PopIn>
      <View className="bg-accent/20 rounded-2xl p-4 mb-4 border-2 border-accent">
        <View className="flex-row items-center mb-2">
        <GameIcon name="love-letter" size="md" style={{ marginRight: 6 }} />
        <Text className="text-foreground font-extrabold flex-1">
          {data.unseen === 1
            ? "Alguém lembrou de você"
            : `${data.unseen} pessoas lembraram de você`}
        </Text>
        </View>
        {unseen.map((item) => (
          <View key={item.id} className="flex-row items-center mb-1">
            <GameIcon name={ENCOURAGEMENT_INFO[item.type].icon} size="sm" style={{ marginRight: 6 }} />
            <Text className="text-foreground text-sm flex-1">{item.text}</Text>
          </View>
        ))}
        <TouchableOpacity
          className="self-end mt-2"
          onPress={() => markSeen.mutate()}
          disabled={markSeen.isPending}
        >
          <Text className="text-primary font-semibold text-sm">
            Amém, obrigado!
          </Text>
        </TouchableOpacity>
      </View>
    </PopIn>
  );
}

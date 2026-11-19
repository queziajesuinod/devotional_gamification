import { useState } from "react";
import { Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { useJuice } from "@/components/juice-provider";
import { GameIcon } from "@/components/game-icon";
import { GameButton } from "@/components/game-button";
import {
  AnimatedBar,
  PopIn,
  Wiggle,
} from "@/components/juice";
import { SOFT_SHADOW } from "@/lib/ui";
import { ParchmentNote, INK } from "@/components/parchment-note";
import { FaceBadge } from "@/components/face-badge";

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
    onError: (error) => {
      notifications.error(error.message);
      // The claim may have been saved even if something after it failed: show the real state
      refetch();
    },
  });

  if (!data) return null;
  const completed = data.quests.filter((q) => q.claimed).length;

  return (
    <View className="bg-surface rounded-2xl p-4 mb-4" style={SOFT_SHADOW}>
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
                <GameButton
                    variant="gold"
                    size="sm"
                    icon="gift"
                    title="Pegar!"
                    loading={claim.isPending}
                    onPress={() => claim.mutate({ questId: quest.id })}
                    accessibilityLabel={`Pegar recompensa: ${quest.title}`}
                  />
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

/**
 * "Cartinhas da sua célula": unread messages from cell members, shown on Início as a
 * parchment letter with the sender's face. "Amém, obrigado!" marks them as read.
 */
export function EncouragementInbox() {
  const { data, refetch } = trpc.engagement.inbox.useQuery();
  const markSeen = trpc.engagement.markInboxSeen.useMutation({
    onSuccess: () => refetch(),
  });
  const [width, setWidth] = useState(0);

  if (!data || data.unseen === 0) return null;
  const unseen = data.items.filter((item) => !item.seenAt).slice(0, 4);
  const more = data.unseen - unseen.length;
  const letterWidth = Math.min(width, 460);

  return (
    <View className="mb-5 items-center" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {letterWidth > 0 ? (
        <PopIn>
          <ParchmentNote width={letterWidth} tilt={-1}>
            <View className="flex-row items-center justify-center mb-3">
              <GameIcon name="love-letter" size={30} style={{ marginRight: 8 }} />
              <Text className="font-display text-center" style={{ color: INK.strong, fontSize: 18 }}>
                {data.unseen === 1 ? "Uma cartinha para você!" : `${data.unseen} cartinhas para você!`}
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              {unseen.map((item) => (
                <View key={item.id} className="flex-row items-center">
                  <FaceBadge figurine={item.figurine} size={44} ring="#C9A24A" label={item.fromNickname ?? "Amigo"} />
                  <View className="flex-1 ml-3">
                    <Text className="font-body" style={{ color: INK.strong, fontSize: 15, fontWeight: "700" }}>
                      {item.fromNickname ?? "Alguém da célula"}
                    </Text>
                    <Text className="font-body" style={{ color: INK.body, fontSize: 14 }}>
                      “{item.label}”
                    </Text>
                  </View>
                  <GameIcon name={item.icon} size={30} />
                </View>
              ))}
            </View>
            {more > 0 ? (
              <Text className="font-body text-center mt-2" style={{ color: INK.soft, fontSize: 13 }}>
                e mais {more} {more === 1 ? "cartinha" : "cartinhas"}...
              </Text>
            ) : null}
            <View className="mt-4 items-center">
              <GameButton
                size="sm"
                variant="gold"
                icon="pray"
                title="Amém, obrigado!"
                loading={markSeen.isPending}
                onPress={() => markSeen.mutate()}
              />
            </View>
          </ParchmentNote>
        </PopIn>
      ) : null}
    </View>
  );
}

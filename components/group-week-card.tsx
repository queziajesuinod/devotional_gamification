import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { useJuice } from "@/components/juice-provider";
import { GameIcon } from "@/components/game-icon";
import {
  AnimatedBar,
  PopIn,
  PressableScale,
  Pulse,
  Wiggle,
} from "@/components/juice";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/components/notification-provider";
import {
  ENCOURAGEMENT_INFO,
  ENCOURAGEMENT_TYPES,
  GROUP_DAYS_PER_MEMBER,
} from "@shared/engagement";

const WEEKDAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg..Dom

/**
 * Cell weekly goal: shared progress bar, chest, and each member's week.
 * `readOnly` hides the chest and encouragement actions (leader panel).
 */
export function GroupWeekCard({
  groupId,
  readOnly = false,
}: {
  groupId: number;
  readOnly?: boolean;
}) {
  const { user } = useAuth();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const [openMemberId, setOpenMemberId] = useState<number | null>(null);
  const { data, isLoading, refetch } = trpc.engagement.groupWeek.useQuery({
    groupId,
  });

  const juice = useJuice();

  const claimChest = trpc.engagement.claimGroupChest.useMutation({
    onSuccess: (result) => {
      juice.burst({
        title: "Baú aberto!",
        subtitle: "Trabalho em equipe!",
        xp: result.xp,
        denario: result.denario + (result.levelUp?.denarioReward ?? 0),
      });
      juice.confetti(120);
      refetch();
      utils.user.me.invalidate();
    },
    onError: (error) => notifications.error(error.message),
  });

  const encourage = trpc.engagement.encourage.useMutation({
    onSuccess: () => {
      juice.burst({
        title: "Enviado!",
        subtitle: "Você alegrou o dia de alguém",
        confetti: false,
      });
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
      <View className="flex-row items-center">
        <GameIcon name="tab-cells" size="lg" style={{ marginRight: 6 }} />
        <Text className="text-foreground text-lg font-extrabold">Missão da célula</Text>
      </View>
      <Text className="text-muted text-xs mt-1">
        Juntos: cada membro presente em {GROUP_DAYS_PER_MEMBER} dias. Cada dia
        de cada um conta!
      </Text>

      <View className="flex-row items-center gap-3 mt-3">
        <View className="flex-1">
          <AnimatedBar percent={percent} height={16} />
        </View>
        {data.reached ? (
          <GameIcon name="trophy" size="md" label="Meta batida" />
        ) : (
          <Text className="text-foreground text-sm font-extrabold">
            {data.progress}/{data.goal}
          </Text>
        )}
      </View>

      {/* Chest */}
      {!readOnly && data.isMember && (
        <View className="mt-3">
          {data.chest.canClaimPrevious && (
            <View className="mb-2">
              <Pulse>
                <PressableScale
                  className="bg-secondary py-3 rounded-full flex-row items-center justify-center gap-2"
                  disabled={claimChest.isPending}
                  onPress={() =>
                    claimChest.mutate({ weekKey: data.chest.previousWeekKey })
                  }
                >
                  <Wiggle>
                    <GameIcon name="gift" size={32} />
                  </Wiggle>
                  <Text className="text-white text-center font-extrabold">
                    Abrir baú da semana passada
                  </Text>
                </PressableScale>
              </Pulse>
            </View>
          )}
          {data.chest.canClaimCurrent ? (
            <Pulse>
              <PressableScale
                className="bg-warning py-3 rounded-full border-2 border-primary flex-row items-center justify-center gap-2"
                disabled={claimChest.isPending}
                onPress={() => claimChest.mutate({ weekKey: data.weekKey })}
              >
                <Wiggle>
                  <GameIcon name="gift" size={32} />
                </Wiggle>
                <Text className="text-foreground text-center font-extrabold">
                  Abrir baú! +{data.chestReward.xp} XP · +{data.chestReward.denario}
                </Text>
                <GameIcon name="coin" size="sm" />
              </PressableScale>
            </Pulse>
          ) : (
            <Text className="text-muted text-xs text-center">
              {data.chest.claimedCurrent
                ? "Baú desta semana aberto"
                : data.reached
                  ? "Meta batida! Faça um desafio esta semana para abrir o baú."
                  : `Baú: +${data.chestReward.xp} XP e +${data.chestReward.denario} denários para quem participar`}
            </Text>
          )}
        </View>
      )}

      {/* Members */}
      <View className="mt-4 gap-3">
        {data.members.map((member) => {
          const isMe = member.userId === user?.id;
          const canEncourage =
            !readOnly && data.isMember && !isMe && !member.encouragedToday;
          return (
            <View key={member.userId}>
              <View className="flex-row items-center gap-3">
                <Text
                  className="text-foreground text-sm font-semibold flex-1"
                  numberOfLines={1}
                >
                  {member.nickname}
                  {isMe ? " (você)" : ""}
                </Text>
                <View className="flex-row gap-1">
                  {data.weekDays.map((day, i) => {
                    const active = member.activeDays.includes(day);
                    const dot = (
                      <View
                        className={`w-5 h-5 rounded-full items-center justify-center ${
                          active
                            ? "bg-primary"
                            : i > todayIndex
                              ? "bg-background border border-border"
                              : "bg-border"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold ${active ? "text-white" : "text-muted"}`}
                        >
                          {active ? "✓" : WEEKDAY_LETTERS[i]}
                        </Text>
                      </View>
                    );
                    return active ? (
                      <PopIn key={day} delay={i * 60}>
                        {dot}
                      </PopIn>
                    ) : (
                      <View key={day}>{dot}</View>
                    );
                  })}
                </View>
                {!readOnly && data.isMember && !isMe && (
                  <TouchableOpacity
                    className="w-8 items-center"
                    disabled={!canEncourage}
                    onPress={() =>
                      setOpenMemberId(
                        openMemberId === member.userId ? null : member.userId,
                      )
                    }
                  >
                    <GameIcon
                      name={member.encouragedToday ? "love-letter" : "pray"}
                      size="md"
                      dimmed={!canEncourage}
                      label={member.encouragedToday ? "Já encorajado hoje" : `Encorajar ${member.nickname}`}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {openMemberId === member.userId && (
                <View className="flex-row flex-wrap gap-2 mt-2 justify-end">
                  {ENCOURAGEMENT_TYPES.map((type, i) => (
                    <PopIn key={type} delay={i * 70}>
                      <PressableScale
                        className="bg-accent/30 px-3 py-2 rounded-full border border-accent"
                        disabled={encourage.isPending}
                        onPress={() =>
                          encourage.mutate({ toUserId: member.userId, type })
                        }
                      >
                        <View className="flex-row items-center">
                          <GameIcon name={ENCOURAGEMENT_INFO[type].icon} size="sm" style={{ marginRight: 4 }} />
                          <Text className="text-foreground text-xs font-bold">{ENCOURAGEMENT_INFO[type].label}</Text>
                        </View>
                      </PressableScale>
                    </PopIn>
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {data.members.length === 0 && (
          <Text className="text-muted text-sm">
            Nenhum membro aprovado ainda.
          </Text>
        )}
      </View>
    </View>
  );
}

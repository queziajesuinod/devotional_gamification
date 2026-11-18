import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { LEAGUE_INFO, LEAGUE_TIERS } from "@shared/engagement";
import { CountUp, Float, PopIn, Pulse } from "@/components/juice";
import { useJuice } from "@/components/juice-provider";
import { GameIcon } from "@/components/game-icon";

const OUTCOME_TEXT = {
  promoted: " Você subiu de liga! Parabéns pela dedicação.",
  demoted: " Você desceu de liga. Uma nova semana, uma nova chance!",
  stayed: "Você continua na mesma liga. Bora subir esta semana?",
} as const;

/** Weekly league: same-tier standings with promotion and demotion zones. */
export function LeagueBoard() {
  const { data, isLoading } = trpc.engagement.league.useQuery();
  const juice = useJuice();
  const celebrated = useRef<string | null>(null);

  // Celebrate a promotion once per week when the board opens
  useEffect(() => {
    if (
      data?.previousOutcome === "promoted" &&
      celebrated.current !== data.weekKey
    ) {
      celebrated.current = data.weekKey;
      juice.burst({
        title: "Subiu de liga!",
        subtitle: LEAGUE_INFO[data.tier].label,
      });
      juice.confetti(120);
    }
  }, [data?.previousOutcome, data?.weekKey, data?.tier, juice]);

  if (isLoading || !data) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const info = LEAGUE_INFO[data.tier];
  const tierIndex = LEAGUE_TIERS.indexOf(data.tier);

  return (
    <View className="gap-3">
      {/* League header */}
      <View
        className="rounded-2xl p-4 border-2"
        style={{ borderColor: info.color }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Float>
              <GameIcon name={info.icon} size={60} label={info.label} />
            </Float>
            <View>
              <Text className="text-foreground text-xl font-bold">
                {info.label}
              </Text>
              <Text className="text-muted text-xs">
                {data.daysLeft === 0
                  ? "Termina hoje à meia-noite"
                  : `Termina em ${data.daysLeft} dias`}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-muted text-xs">Sua posição</Text>
            {data.myRank ? (
              <CountUp
                value={data.myRank}
                from={data.size || data.myRank}
                suffix="º"
                className="text-foreground text-3xl font-extrabold"
              />
            ) : (
              <Text className="text-foreground text-3xl font-extrabold">-</Text>
            )}
          </View>
        </View>

        {/* Tier ladder */}
        <View className="flex-row gap-1 mt-3">
          {LEAGUE_TIERS.map((tier, i) => (
            <View
              key={tier}
              className="flex-1 h-2 rounded-full"
              style={{
                backgroundColor:
                  i <= tierIndex ? LEAGUE_INFO[tier].color : "#D0D8D5",
              }}
            />
          ))}
        </View>

        {data.previousOutcome && (
          <Text className="text-foreground text-sm mt-3">
            {OUTCOME_TEXT[data.previousOutcome]}
          </Text>
        )}
        <Text className="text-muted text-xs mt-2">
          {data.promoteUntil > 0
            ? `Os ${data.promoteUntil} primeiros sobem de liga. `
            : ""}
          {data.demoteFrom ? `A partir do ${data.demoteFrom}º desce. ` : ""}
          Só conta o XP desta semana.
        </Text>
      </View>

      {/* Standings */}
      {data.standings.map((row, index) => {
        const promote = row.position <= data.promoteUntil && row.xp > 0;
        const demote =
          data.demoteFrom !== null &&
          (row.position >= data.demoteFrom || row.xp === 0);
        const card = (
          <View
            className={`rounded-2xl p-3 flex-row items-center justify-between ${
              row.isMe
                ? "bg-accent/30 border-2 border-primary"
                : "bg-surface border border-border"
            }`}
          >
            <View className="flex-row items-center gap-3 flex-1">
              {row.position <= 3 && row.xp > 0 ? (
                <View className="w-9 items-center">
                  <GameIcon
                    name={(["medal-gold", "medal-silver", "medal-bronze"] as const)[row.position - 1]}
                    size="md"
                    label={`${row.position}º lugar`}
                  />
                </View>
              ) : (
                <Text
                  className={`w-9 text-center font-extrabold ${promote ? "text-success" : demote ? "text-error" : "text-muted"}`}
                >
                  {row.position}º
                </Text>
              )}
              <Text
                className="text-foreground font-bold flex-1"
                numberOfLines={1}
              >
                {row.isMe ? "Você" : row.nickname}
              </Text>
            </View>
            <Text className="text-foreground font-extrabold">{row.xp} XP</Text>
          </View>
        );
        return (
          <PopIn key={row.userId} delay={Math.min(index, 12) * 45}>
            {data.demoteFrom !== null && row.position === data.demoteFrom && (
              <Text className="text-error text-xs font-semibold mb-1 mt-1">
                ▼ Zona de descida
              </Text>
            )}
            {row.isMe ? <Pulse amount={0.03}>{card}</Pulse> : card}
            {data.promoteUntil > 0 && row.position === data.promoteUntil && (
              <Text className="text-success text-xs font-extrabold mt-1">
                ▲ Zona de subida
              </Text>
            )}
          </PopIn>
        );
      })}

      {data.standings.length <= 1 && (
        <Text className="text-muted text-center text-sm mt-2">
          Complete desafios para disputar com outras pessoas da sua liga!
        </Text>
      )}
    </View>
  );
}

import { ActivityIndicator, Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { LEAGUE_INFO, LEAGUE_TIERS } from "@shared/engagement";

const OUTCOME_TEXT = {
  promoted: "🎉 Você subiu de liga! Parabéns pela dedicação.",
  demoted: "🌱 Você desceu de liga. Uma nova semana, uma nova chance!",
  stayed: "Você continua na mesma liga. Bora subir esta semana?",
} as const;

/** Weekly league: same-tier standings with promotion and demotion zones. */
export function LeagueBoard() {
  const { data, isLoading } = trpc.engagement.league.useQuery();

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
      <View className="rounded-2xl p-4 border-2" style={{ borderColor: info.color }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Text className="text-4xl">{info.emoji}</Text>
            <View>
              <Text className="text-foreground text-xl font-bold">{info.label}</Text>
              <Text className="text-muted text-xs">
                {data.daysLeft === 0 ? "Termina hoje à meia-noite" : `Termina em ${data.daysLeft} dias`}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-muted text-xs">Sua posição</Text>
            <Text className="text-foreground text-2xl font-bold">
              {data.myRank ? `${data.myRank}º` : "-"}
            </Text>
          </View>
        </View>

        {/* Tier ladder */}
        <View className="flex-row gap-1 mt-3">
          {LEAGUE_TIERS.map((tier, i) => (
            <View
              key={tier}
              className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: i <= tierIndex ? LEAGUE_INFO[tier].color : "#D0D8D5" }}
            />
          ))}
        </View>

        {data.previousOutcome && (
          <Text className="text-foreground text-sm mt-3">{OUTCOME_TEXT[data.previousOutcome]}</Text>
        )}
        <Text className="text-muted text-xs mt-2">
          {data.promoteUntil > 0 ? `Os ${data.promoteUntil} primeiros sobem de liga. ` : ""}
          {data.demoteFrom ? `A partir do ${data.demoteFrom}º desce. ` : ""}
          Só conta o XP desta semana.
        </Text>
      </View>

      {/* Standings */}
      {data.standings.map((row) => {
        const promote = row.position <= data.promoteUntil && row.xp > 0;
        const demote = data.demoteFrom !== null && (row.position >= data.demoteFrom || row.xp === 0);
        return (
          <View key={row.userId}>
            {data.demoteFrom !== null && row.position === data.demoteFrom && (
              <Text className="text-error text-xs font-semibold mb-1 mt-1">▼ Zona de descida</Text>
            )}
            <View
              className={`rounded-2xl p-3 flex-row items-center justify-between ${
                row.isMe ? "bg-accent/20 border-2 border-accent" : "bg-surface border border-border"
              }`}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Text
                  className={`w-8 text-center font-bold ${promote ? "text-success" : demote ? "text-error" : "text-muted"}`}
                >
                  {row.position}º
                </Text>
                <Text className="text-foreground font-semibold flex-1" numberOfLines={1}>
                  {row.isMe ? "Você" : row.nickname}
                </Text>
              </View>
              <Text className="text-foreground font-bold">{row.xp} XP</Text>
            </View>
            {data.promoteUntil > 0 && row.position === data.promoteUntil && (
              <Text className="text-success text-xs font-semibold mt-1">▲ Zona de subida</Text>
            )}
          </View>
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

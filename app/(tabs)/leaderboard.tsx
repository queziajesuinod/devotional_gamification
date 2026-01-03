import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type Period = "monthly" | "yearly" | "groups";

export default function LeaderboardScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("monthly");

  const { data: monthlyData, isLoading: monthlyLoading, refetch: refetchMonthly } = trpc.leaderboard.monthly.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "monthly",
  });

  const { data: yearlyData, isLoading: yearlyLoading, refetch: refetchYearly } = trpc.leaderboard.yearly.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "yearly",
  });

  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = trpc.groups.ranking.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "groups",
  });

  const currentData = selectedPeriod === "groups" ? null : (selectedPeriod === "monthly" ? monthlyData : yearlyData);
  const isLoading = selectedPeriod === "groups" ? groupsLoading : (selectedPeriod === "monthly" ? monthlyLoading : yearlyLoading);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedPeriod === "monthly") {
      await refetchMonthly();
    } else if (selectedPeriod === "yearly") {
      await refetchYearly();
    } else {
      await refetchGroups();
    }
    setRefreshing(false);
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
        <Text className="text-muted text-center">Faça login para ver o ranking</Text>
      </ScreenContainer>
    );
  }

  const getMedalEmoji = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return `${position}º`;
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View className="bg-primary p-6">
          <Text className="text-white text-2xl font-bold">Ranking</Text>
          <Text className="text-white/80 text-sm mt-1">Veja os melhores jogadores</Text>
        </View>

        {/* Period Tabs */}
        <View className="p-4">
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-full ${selectedPeriod === "monthly" ? "bg-primary" : "bg-surface border border-border"}`}
              onPress={() => setSelectedPeriod("monthly")}
            >
              <Text className={`text-center font-bold ${selectedPeriod === "monthly" ? "text-white" : "text-foreground"}`}>
                Mensal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-full ${selectedPeriod === "yearly" ? "bg-primary" : "bg-surface border border-border"}`}
              onPress={() => setSelectedPeriod("yearly")}
            >
              <Text className={`text-center font-bold ${selectedPeriod === "yearly" ? "text-white" : "text-foreground"}`}>
                Anual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-full ${selectedPeriod === "groups" ? "bg-primary" : "bg-surface border border-border"}`}
              onPress={() => setSelectedPeriod("groups")}
            >
              <Text className={`text-center font-bold ${selectedPeriod === "groups" ? "text-white" : "text-foreground"}`}>
                Grupos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Position */}
        {currentData?.userPosition && (
          <View className="px-4 mb-4">
            <View className="bg-accent/10 rounded-2xl p-4 border-2 border-accent">
              <Text className="text-accent font-bold mb-2">Sua Posição</Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{getMedalEmoji(currentData.userPosition.position)}</Text>
                  <View>
                    <Text className="text-foreground font-bold">Você</Text>
                    <Text className="text-muted text-xs">Posição {currentData.userPosition.position}</Text>
                  </View>
                </View>
                <Text className="text-accent text-lg font-bold">{currentData.userPosition.xpTotal} XP</Text>
              </View>
            </View>
          </View>
        )}

        {/* Rankings List */}
        <View className="px-4">
          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" />
            </View>
          ) : selectedPeriod === "groups" ? (
            groupsData && groupsData.length > 0 ? (
              <View className="gap-2">
                {groupsData.map((group, index) => (
                  <View
                    key={group.id}
                    className={`rounded-2xl p-4 ${index < 3 ? "bg-secondary/10 border-2 border-secondary" : "bg-surface border border-border"}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3 flex-1">
                        <Text className="text-2xl w-12">{getMedalEmoji(index + 1)}</Text>
                        <View className="flex-1">
                          <Text className="text-foreground font-bold">{group.name}</Text>
                          <Text className="text-muted text-xs">👥 {group.memberCount} membros · Líder: {group.leaderName}</Text>
                        </View>
                      </View>
                      <Text className="text-accent text-lg font-bold">{group.totalPoints} pts</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-surface rounded-2xl p-6 items-center border border-border">
                <Text className="text-muted text-center">Nenhum grupo disponível ainda.</Text>
              </View>
            )
          ) : currentData?.rankings && currentData.rankings.length > 0 ? (
            <View className="gap-2">
              {currentData.rankings.map((ranking) => (
                <View
                  key={ranking.userId}
                  className={`rounded-2xl p-4 ${ranking.position <= 3 ? "bg-secondary/10 border-2 border-secondary" : "bg-surface border border-border"}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Text className="text-2xl w-12">{getMedalEmoji(ranking.position)}</Text>
                      <View className="flex-1">
                        <Text className="text-foreground font-bold">{ranking.nickname}</Text>
                        <Text className="text-muted text-xs">Nível {ranking.level}</Text>
                      </View>
                    </View>
                    <Text className="text-accent text-lg font-bold">{ranking.xpTotal} XP</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 items-center border border-border">
              <Text className="text-muted text-center">Nenhum ranking disponível ainda.</Text>
              <Text className="text-muted text-center text-sm mt-2">
                Complete desafios para aparecer no ranking!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

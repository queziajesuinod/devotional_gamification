import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useNotifications } from "@/components/notification-provider";
import { GameIcon } from "@/components/game-icon";

export default function GroupsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotifications();

  const { data: groupsData, isLoading, refetch } = trpc.groups.list.useQuery();
  const { data: myGroup } = trpc.groups.myGroup.useQuery();
  const requestJoinMutation = trpc.groups.requestJoin.useMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleJoinGroup = async (groupId: number, groupName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await requestJoinMutation.mutateAsync({ groupId });
      refetch();
      notifications.success(`Solicitação enviada para ${groupName}!`);
    } catch (error: any) {
      notifications.error(error.message || "Erro ao solicitar entrada");
    }
  };

  const handleViewGroup = (groupId: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/group-details?id=${groupId}` as any);
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando células...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer background={KINGDOM_BG.cells}>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-primary p-6 rounded-b-3xl">
          <View className="flex-row items-center">
            <GameIcon name="tab-cells" size="lg" style={{ marginRight: 10 }} />
            <Text className="text-white text-2xl font-extrabold">Células</Text>
          </View>
          <Text className="text-white/80 text-sm mt-1">
            Junte-se a uma Célula e compita com outras!
          </Text>
        </View>

        {/* My Group Card */}
        {myGroup && (
          <View className="p-4 bg-surface m-4 rounded-2xl border border-border">
            <Text className="text-sm text-muted mb-2">Minha Célula</Text>
            <Text className="text-xl font-bold text-foreground">
              {myGroup.groupName}
            </Text>
            <View className="flex-row items-center gap-4 mt-3">
              <View className="flex-row items-center gap-1">
                <GameIcon name="tab-cells" size={32} />
                <Text className="text-muted text-sm">
                  {myGroup.memberCount} membros
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <GameIcon name="xp" size={32} />
                <Text className="text-muted text-sm">
                  {myGroup.totalPoints} pontos
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleViewGroup(myGroup.groupId)}
              className="mt-3 bg-primary py-2 rounded-lg active:opacity-80"
            >
              <Text className="text-white text-center font-semibold">
                Ver Detalhes
              </Text>
            </Pressable>
          </View>
        )}

        {/* Groups List */}
        <View className="flex-1 px-4">
          <View className="self-start flex-row items-center bg-surface rounded-full px-3 py-1.5 border border-border mb-3">
            <GameIcon name="banner" size="sm" style={{ marginRight: 6 }} />
            <Text className="font-extrabold text-foreground">
              {myGroup ? "Outras Células" : "Células Disponíveis"}
            </Text>
          </View>

          <FlatList
            data={groupsData || []}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            renderItem={({ item }) => {
              const isMyGroup = myGroup?.groupId === item.id;

              return (
                <View className="bg-surface p-4 rounded-xl mb-3 border border-border">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-foreground">
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text
                          className="text-sm text-muted mt-1"
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-4 mt-3">
                        <View className="flex-row items-center gap-1">
                          <GameIcon name="tab-cells" size={24} />
                          <Text className="text-muted text-xs">
                            {item.memberCount}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <GameIcon name="xp" size={24} />
                          <Text className="text-muted text-xs">
                            {item.totalPoints}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {!myGroup && !isMyGroup && (
                    <Pressable
                      onPress={() => handleJoinGroup(item.id, item.name)}
                      className="mt-3 bg-primary py-2 rounded-lg active:opacity-80"
                    >
                      <Text className="text-white text-center font-semibold">
                        Solicitar Entrada
                      </Text>
                    </Pressable>
                  )}

                  {isMyGroup && (
                    <View className="mt-3 bg-accent/20 py-2 rounded-lg">
                      <Text className="text-accent text-center font-semibold">
                        Sua Célula
                      </Text>
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <GameIcon name="love-letter" size={48} style={{ marginBottom: 16 }} />
                <Text className="text-muted text-center">
                  Nenhuma Célula disponível no momento
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

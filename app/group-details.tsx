import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/use-auth";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0");

  const { data, isLoading } = trpc.groups.details.useQuery({ groupId });
  const { user } = useAuth();

  const isLeader = !!(data?.group && user && data.group.leaderId === user.id);

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando detalhes...</Text>
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">Grupo não encontrado</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1">
        {/* Header */}
        <View className="bg-primary p-6">
          <Pressable onPress={handleBack} className="mb-4">
            <Text className="text-white text-lg">← Voltar</Text>
          </Pressable>
          <Text className="text-white text-2xl font-bold">{data.group.name}</Text>
          {data.group.description && (
            <Text className="text-white/80 text-sm mt-2">{data.group.description}</Text>
          )}
          <View className="flex-row items-center gap-6 mt-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl">👥</Text>
              <Text className="text-white font-semibold">{data.group.memberCount} membros</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl">⭐</Text>
              <Text className="text-white font-semibold">{data.group.totalPoints} pontos</Text>
            </View>
          </View>
        </View>

        {/* Admin Button */}
        {isLeader && (
          <View className="p-4">
            <Pressable
              onPress={() => router.push(`/group-admin?id=${groupId}` as any)}
              className="bg-accent py-3 rounded-lg active:opacity-80"
            >
              <Text className="text-white text-center font-semibold">⚙️ Gerenciar Solicitações</Text>
            </Pressable>
          </View>
        )}

        {/* Members List */}
        <View className="flex-1 px-4">
          <Text className="text-lg font-bold text-foreground mb-3">Membros</Text>
          
          <FlatList
            data={data.members || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View className="bg-surface p-4 rounded-xl mb-3 border border-border">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">
                      {item.userNickname || item.userName}
                    </Text>
                    <View className="flex-row items-center gap-4 mt-2">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm text-muted">Nível {item.userLevel}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm text-muted">{item.userXp} XP</Text>
                      </View>
                    </View>
                  </View>
                  {data.group.leaderId === item.userId && (
                    <View className="bg-accent/20 px-3 py-1 rounded-full">
                      <Text className="text-accent text-xs font-semibold">Líder</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-4xl mb-4">👥</Text>
                <Text className="text-muted text-center">Nenhum membro ainda</Text>
              </View>
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

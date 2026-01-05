import { ActivityIndicator, Alert, FlatList, Platform, Pressable, RefreshControl, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useNotifications } from "@/components/notification-provider";

export default function GroupAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0");
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotifications();

  const { data: requests, isLoading, refetch } = trpc.groups.pendingRequests.useQuery({ groupId });
  const approveMutation = trpc.groups.approveRequest.useMutation();
  const rejectMutation = trpc.groups.rejectRequest.useMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleApprove = async (requestId: number, userName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await approveMutation.mutateAsync({ requestId });
      refetch();
      notifications.success(`${userName} foi aprovado!`);
    } catch (error: any) {
      notifications.error(error.message || "Erro ao aprovar");
    }
  };

  const handleReject = async (requestId: number, userName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const confirmed = Platform.OS === "web" 
      ? confirm(`Rejeitar solicitação de ${userName}?`)
      : await new Promise((resolve) => {
          Alert.alert(
            "Confirmar",
            `Rejeitar solicitação de ${userName}?`,
            [
              { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
              { text: "Rejeitar", style: "destructive", onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await rejectMutation.mutateAsync({ requestId });
      refetch();
      notifications.success(`${userName} rejeitado(a).`);
    } catch (error: any) {
      notifications.error(error.message || "Erro ao rejeitar");
    }
  };

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
        <Text className="mt-4 text-muted">Carregando solicitações...</Text>
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
          <Text className="text-white text-2xl font-bold">Gerenciar Solicitações</Text>
          <Text className="text-white/80 text-sm mt-1">
            Aprove ou rejeite pedidos de entrada
          </Text>
        </View>

        {/* Requests List */}
        <View className="flex-1 px-4 pt-4">
          <FlatList
            data={requests || []}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => (
              <View className="bg-surface p-4 rounded-xl mb-3 border border-border">
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">
                      {item.userNickname || item.userName}
                    </Text>
                    <Text className="text-sm text-muted mt-1">Nível {item.userLevel}</Text>
                    <Text className="text-xs text-muted mt-1">
                      Solicitado em {new Date(item.requestedAt).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleApprove(item.id, item.userNickname || item.userName || "Usuário")}
                    className="flex-1 bg-success py-2 rounded-lg active:opacity-80"
                  >
                    <Text className="text-white text-center font-semibold">✓ Aprovar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(item.id, item.userNickname || item.userName || "Usuário")}
                    className="flex-1 bg-error py-2 rounded-lg active:opacity-80"
                  >
                    <Text className="text-white text-center font-semibold">✗ Rejeitar</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Text className="text-4xl mb-4">✅</Text>
                <Text className="text-muted text-center">Nenhuma solicitação pendente</Text>
                <Text className="text-muted text-center text-sm mt-2">
                  Quando alguém solicitar entrada, aparecerá aqui
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

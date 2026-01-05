import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

export default function LeaderDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotifications();
  const { logout } = useAuth();
  const router = useRouter();
  const dashboardQuery = trpc.leader.dashboard.useQuery();
  const approveMutation = trpc.leader.approveRequest.useMutation({
    onSuccess: () => dashboardQuery.refetch(),
  });
  const rejectMutation = trpc.leader.rejectRequest.useMutation({
    onSuccess: () => dashboardQuery.refetch(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await dashboardQuery.refetch();
    setRefreshing(false);
  };

  const handleLeaderLogout = async () => {
    const confirmed =
      Platform.OS === "web"
        ? confirm("Tem certeza que deseja sair?")
        : await new Promise<boolean>((resolve) => {
            Alert.alert("Sair", "Deseja sair do sistema?", [
              { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
              { text: "Sair", style: "destructive", onPress: () => resolve(true) },
            ]);
          });
    if (!confirmed) return;

    logout();
    router.replace("/login" as any);
  };

  const handleApprove = async (requestId: number, userName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await approveMutation.mutateAsync({ requestId });
      notifications.success(`${userName} aprovado`);
    } catch (error: any) {
      const message = error?.message || "Failed to approve";
      notifications.error(message);
    }
  };

  const handleReject = async (requestId: number, userName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const confirmed =
      Platform.OS === "web"
        ? confirm(`Reject request from ${userName}?`)
        : await new Promise((resolve) => {
            Alert.alert("Confirm", `Reject request from ${userName}?`, [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Reject", style: "destructive", onPress: () => resolve(true) },
            ]);
          });
    if (!confirmed) return;

    try {
      await rejectMutation.mutateAsync({ requestId });
      notifications.success(`${userName} rejeitado`);
    } catch (error: any) {
      const message = error?.message || "Failed to reject";
      notifications.error(message);
    }
  };

  if (dashboardQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Loading leader dashboard...</Text>
      </ScreenContainer>
    );
  }

  const group = dashboardQuery.data?.group;
  const members = dashboardQuery.data?.members || [];
  const pendingRequests = dashboardQuery.data?.pendingRequests || [];

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="bg-primary p-6">
          <Text className="text-white text-2xl font-bold">Dashboard da Célula</Text>
          <Text className="text-white/80 mt-2">
            {group ? group.name : "No group assigned"}
          </Text>
        </View>

        <View className="px-6 pt-4">
          <TouchableOpacity
            className="bg-error py-3 rounded-full active:opacity-80"
            onPress={handleLeaderLogout}
          >
            <Text className="text-white text-center font-semibold">Sair</Text>
          </TouchableOpacity>
        </View>

        <View className="p-6 gap-6" style={{ width: "100%", maxWidth: 1100, alignSelf: "center" }}>
          {group ? (
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-lg font-bold text-foreground">Informação da Célula</Text>
              {group.description ? (
                <Text className="text-sm text-muted mt-2">{group.description}</Text>
              ) : null}
              <View className="flex-row gap-6 mt-3">
                <Text className="text-foreground">Memebros: {group.memberCount}</Text>
                <Text className="text-foreground">Pontos: {group.totalPoints}</Text>
              </View>
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-muted">You do not lead a group yet.</Text>
            </View>
          )}

          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-foreground">Ranking do Time</Text>
              <Text className="text-xs text-muted">{members.length} Membros</Text>
            </View>
            {members.length === 0 ? (
              <Text className="text-muted">Não Tem Membros na sua célula.</Text>
            ) : (
              <View className="gap-2">
                {members.map((member, index) => (
                  <View
                    key={member.id}
                    className="border border-border rounded-xl p-3 bg-background/40"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-foreground font-semibold">
                          {index + 1}. {member.userNickname || member.userName}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          Level {member.userLevel} | XP {member.userXp}
                        </Text>
                        <Text className="text-xs text-muted mt-1">
                          Desafios {member.currentStreak} | Best {member.longestStreak} | última atividade{" "}
                          {formatDate(member.lastActivityDate)}
                        </Text>
                      </View>
                      {group?.leaderId === member.userId && (
                        <View className="bg-accent/20 px-3 py-1 rounded-full">
                          <Text className="text-accent text-xs font-semibold">Líder</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className="bg-surface rounded-2xl p-4 border border-border">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-foreground">Requisições pendentes</Text>
              <Text className="text-xs text-muted">{pendingRequests.length} Pendências</Text>
            </View>
            {pendingRequests.length === 0 ? (
              <Text className="text-muted">Sem requisições.</Text>
            ) : (
              <View className="gap-2">
                {pendingRequests.map((request) => (
                  <View key={request.id} className="border border-border rounded-xl p-3">
                    <Text className="text-foreground font-semibold">
                      {request.userNickname || request.userName}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      Level {request.userLevel} | Requested {formatDate(request.requestedAt)}
                    </Text>
                    <View className="flex-row gap-2 mt-3">
                      <Pressable
                        className="flex-1 bg-success py-2 rounded-lg"
                        onPress={() =>
                          handleApprove(request.id, request.userNickname || request.userName || "User")
                        }
                      >
                        <Text className="text-green text-center font-semibold">Aprovado</Text>
                      </Pressable>
                      <Pressable
                        className="flex-1 bg-error py-2 rounded-lg"
                        onPress={() =>
                          handleReject(request.id, request.userNickname || request.userName || "User")
                        }
                      >
                        <Text className="text-red text-center font-semibold">Rejeitado</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

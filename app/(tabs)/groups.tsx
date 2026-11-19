import {
  ActivityIndicator,
  FlatList,
  Platform,
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
import { SOFT_SHADOW } from "@/lib/ui";
import { HeroTexture } from "@/components/hero-texture";
import { GameButton } from "@/components/game-button";
import { CellCrest, crestColor } from "@/components/cell-crest";
import { PopIn } from "@/components/juice";

export default function GroupsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const notifications = useNotifications();

  const { data: groupsData, isLoading, refetch } = trpc.groups.list.useQuery();
  const { data: myGroup, refetch: refetchMyGroup } = trpc.groups.myGroup.useQuery();
  const { data: myRequests, refetch: refetchRequests } = trpc.groups.myRequests.useQuery();
  const requestJoinMutation = trpc.groups.requestJoin.useMutation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchMyGroup(), refetchRequests()]);
    setRefreshing(false);
  };

  const handleJoinGroup = async (groupId: number, groupName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setJoiningId(groupId);
    try {
      await requestJoinMutation.mutateAsync({ groupId });
      refetch();
      refetchMyGroup();
      refetchRequests();
      notifications.success(`Solicitação enviada para ${groupName}!`);
    } catch (error: any) {
      notifications.error(error.message || "Erro ao solicitar entrada");
    } finally {
      setJoiningId(null);
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

  const all = groupsData ?? [];
  // getAllGroups comes ordered by points, so the index is the cell's place in the Reino
  const placeOf = (id: number) => all.findIndex((g) => g.id === id) + 1;
  const pending = myGroup?.status === "pending";
  const others = myGroup && !pending ? all.filter((g) => g.id !== myGroup.groupId) : all;
  const myPlace = myGroup ? placeOf(myGroup.groupId) : 0;
  const requestOf = (id: number) => myRequests?.find((r) => r.groupId === id)?.status;

  const header = (
    <View>
      {/* Hero */}
      <View className="bg-primary rounded-b-3xl px-5 pt-6 pb-6" style={SOFT_SHADOW}>
        <HeroTexture style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
        <View className="flex-row items-center justify-center">
          <GameIcon name="tab-cells" size={44} style={{ marginRight: 8 }} />
          <Text className="font-display" style={{ color: "#FFFFFF", fontSize: 26 }}>
            Células
          </Text>
        </View>
        <Text className="text-center text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
          Sozinho a gente vai rápido. Juntos a gente vai longe!
        </Text>

        <View className="flex-row justify-center gap-2 mt-4">
          <HeroChip icon="banner" value={`${all.length}`} label={all.length === 1 ? "célula no Reino" : "células no Reino"} />
          {myGroup && !pending && myPlace > 0 ? (
            <HeroChip icon="trophy" value={`${myPlace}º`} label="lugar da sua" />
          ) : null}
        </View>
      </View>

      <View className="px-4 pt-5 w-full self-center" style={{ maxWidth: 720 }}>
        {/* My cell: the castle banner */}
        {myGroup ? (
          <PopIn gentle>
            <View
              className="rounded-3xl overflow-hidden mb-5"
              style={{ borderWidth: 3, borderColor: "#F2B50C", ...SOFT_SHADOW }}
            >
              <View className="px-4 py-2 flex-row items-center" style={{ backgroundColor: "#F2B50C" }}>
                <GameIcon name="crown" size={22} style={{ marginRight: 6 }} />
                <Text className="font-extrabold flex-1" style={{ color: "#3B2412" }}>
                  {pending ? "Pedido enviado" : "Minha Célula"}
                </Text>
                {pending ? <GameIcon name="hourglass" size={22} /> : null}
              </View>
              <View className="bg-surface p-4">
                <View className="flex-row items-center">
                  <CellCrest id={myGroup.groupId} name={myGroup.groupName} size={60} />
                  <View className="flex-1 ml-3">
                    <Text className="font-display text-foreground" style={{ fontSize: 20 }} numberOfLines={2}>
                      {myGroup.groupName}
                    </Text>
                    {myGroup.groupDescription ? (
                      <Text className="text-muted text-sm mt-0.5" numberOfLines={2}>
                        {myGroup.groupDescription}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row gap-2 mt-4">
                  <StatTile icon="tab-cells" value={myGroup.memberCount} label="membros" />
                  <StatTile icon="xp" value={myGroup.totalPoints} label="pontos" />
                  {!pending && myPlace > 0 ? <StatTile icon="trophy" value={`${myPlace}º`} label="no Reino" /> : null}
                </View>

                {pending ? (
                  <Text className="text-muted text-sm text-center mt-4">
                    O líder vai aprovar sua entrada em breve. Fica de olho!
                  </Text>
                ) : (
                  <View className="mt-4">
                    <GameButton
                      fullWidth
                      variant="gold"
                      icon="banner"
                      title="Entrar na minha célula"
                      onPress={() => handleViewGroup(myGroup.groupId)}
                    />
                  </View>
                )}
              </View>
            </View>
          </PopIn>
        ) : (
          <View className="bg-surface rounded-3xl p-4 mb-5 flex-row items-center" style={SOFT_SHADOW}>
            <GameIcon name="map" size={52} style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="font-display text-foreground" style={{ fontSize: 17 }}>
                Escolha sua célula
              </Text>
              <Text className="text-muted text-sm mt-0.5">
                Entre numa célula para fazer missões em grupo e abrir o baú da semana.
              </Text>
            </View>
          </View>
        )}

        {others.length > 0 ? (
          <View className="flex-row items-center mb-3">
            <GameIcon name="banner" size={26} style={{ marginRight: 6 }} />
            <Text className="font-display text-foreground" style={{ fontSize: 18 }}>
              {myGroup && !pending ? "Outras células" : "Células do Reino"}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScreenContainer background={KINGDOM_BG.cells}>
      <FlatList
        data={others}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item, index }) => {
          const place = placeOf(item.id);
          const request = requestOf(item.id);
          const canJoin = !myGroup && (!request || request === "rejected");
          return (
            <View className="px-4 w-full self-center" style={{ maxWidth: 720 }}>
              <PopIn delay={Math.min(index, 10) * 45} gentle>
                <View className="bg-surface rounded-3xl mb-3 overflow-hidden flex-row" style={SOFT_SHADOW}>
                  {/* Banner stripe in the cell's color */}
                  <View style={{ width: 8, backgroundColor: crestColor(item.id) }} />
                  <View className="flex-1 p-4">
                    <View className="flex-row items-center">
                      <CellCrest id={item.id} name={item.name} size={48} ring={place <= 3 ? "#F2B50C" : "#D8C9A8"} />
                      <View className="flex-1 ml-3">
                        <Text className="text-foreground text-lg font-extrabold" numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.description ? (
                          <Text className="text-muted text-sm" numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      {place > 0 && place <= 3 ? (
                        <GameIcon
                          name={(["medal-gold", "medal-silver", "medal-bronze"] as const)[place - 1]}
                          size={36}
                          label={`${place}º lugar`}
                        />
                      ) : place > 0 ? (
                        <View className="rounded-full px-2 py-1 bg-parchment/70">
                          <Text className="font-extrabold text-xs" style={{ color: "#3B2412" }}>
                            {place}º
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View className="flex-row items-center gap-4 mt-3">
                      <View className="flex-row items-center">
                        <GameIcon name="tab-cells" size={22} style={{ marginRight: 4 }} />
                        <Text className="text-muted text-sm font-bold">{item.memberCount} membros</Text>
                      </View>
                      <View className="flex-row items-center">
                        <GameIcon name="xp" size={22} style={{ marginRight: 4 }} />
                        <Text className="text-muted text-sm font-bold">{item.totalPoints} pts</Text>
                      </View>
                    </View>

                    {!myGroup && request === "pending" ? (
                      <View className="mt-3 flex-row items-center justify-center rounded-2xl py-2 bg-parchment/60">
                        <GameIcon name="hourglass" size={22} style={{ marginRight: 6 }} />
                        <Text className="font-extrabold" style={{ color: "#3B2412" }}>
                          Pedido enviado! Aguardando o líder
                        </Text>
                      </View>
                    ) : null}
                    {!myGroup && request === "rejected" ? (
                      <View className="mt-3 flex-row items-center rounded-2xl p-3 bg-parchment/60">
                        <GameIcon name="love-letter" size={22} style={{ marginRight: 8 }} />
                        <Text className="text-sm flex-1" style={{ color: "#4A3220" }}>
                          O líder não aprovou o pedido da última vez. Você pode pedir de novo!
                        </Text>
                      </View>
                    ) : null}
                    {canJoin ? (
                      <View className="mt-3">
                        <GameButton
                          fullWidth
                          size="sm"
                          variant="royal"
                          title={request === "rejected" ? "Pedir de novo" : "Pedir para entrar"}
                          loading={joiningId === item.id}
                          disabled={joiningId !== null && joiningId !== item.id}
                          onPress={() => handleJoinGroup(item.id, item.name)}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              </PopIn>
            </View>
          );
        }}
        ListEmptyComponent={
          myGroup && !pending ? null : (
            <View className="items-center justify-center py-12 px-6">
              <GameIcon name="love-letter" size={56} style={{ marginBottom: 12 }} />
              <Text className="text-muted text-center">Nenhuma célula disponível no momento</Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}

function HeroChip({ icon, value, label }: { icon: "banner" | "trophy"; value: string; label: string }) {
  return (
    <View className="flex-row items-center rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.16)" }}>
      <GameIcon name={icon} size={22} style={{ marginRight: 6 }} />
      <Text className="font-extrabold" style={{ color: "#FFFFFF" }}>
        {value}
      </Text>
      <Text className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.85)" }}>
        {label}
      </Text>
    </View>
  );
}

function StatTile({ icon, value, label }: { icon: "tab-cells" | "xp" | "trophy"; value: number | string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl py-2 items-center bg-parchment/50">
      <GameIcon name={icon} size={26} />
      <Text className="text-foreground font-extrabold text-lg">{value}</Text>
      <Text className="text-muted text-[11px] font-bold">{label}</Text>
    </View>
  );
}

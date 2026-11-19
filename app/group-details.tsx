import { useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/hooks/use-auth";
import { GroupWeekCard } from "@/components/group-week-card";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { HeroTexture } from "@/components/hero-texture";
import { GameButton } from "@/components/game-button";
import { CellCrest } from "@/components/cell-crest";
import { FaceBadge } from "@/components/face-badge";
import { Podium, type PodiumEntry } from "@/components/podium";
import { PopIn } from "@/components/juice";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { SOFT_SHADOW } from "@/lib/ui";
import { MessageSheet, type MessageTarget } from "@/components/message-sheet";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0");

  const { data, isLoading } = trpc.groups.details.useQuery({ groupId });
  const { data: myGroup } = trpc.groups.myGroup.useQuery();
  const { data: allGroups } = trpc.groups.list.useQuery();
  const { user } = useAuth();

  const isLeader = !!(data?.group && user && data.group.leaderId === user.id);
  const isMember = myGroup?.groupId === groupId;
  // The weekly goal is private to the cell (members and leader)
  const canSeeWeek = isLeader || isMember;
  // Who I already messaged today (one message per person per day)
  const { data: week } = trpc.engagement.groupWeek.useQuery({ groupId }, { enabled: isMember });
  const [target, setTarget] = useState<MessageTarget | null>(null);

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/groups" as any);
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando a célula...</Text>
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <GameIcon name="map" size={64} />
        <Text className="font-display text-foreground text-center mt-3" style={{ fontSize: 20 }}>
          Célula não encontrada
        </Text>
        <View className="mt-4">
          <GameButton variant="wood" title="Voltar" onPress={handleBack} />
        </View>
      </ScreenContainer>
    );
  }

  const { group } = data;
  // getAllGroups is ordered by points, so the index is the cell's place in the Reino
  const place = (allGroups ?? []).findIndex((g) => g.id === group.id) + 1;
  const members = [...(data.members ?? [])].sort((a, b) => (b.userXp ?? 0) - (a.userXp ?? 0));
  const name = (m: (typeof members)[number]) => m.userNickname || m.userName || "Membro";

  const podium: PodiumEntry[] = members.slice(0, 3).map((m) => ({
    key: m.userId,
    name: name(m),
    score: `${m.userXp} XP`,
    isMe: m.userId === user?.id,
    avatar: (ring, size) => <FaceBadge figurine={m.figurine} size={size} ring={ring} label={name(m)} />,
  }));
  const rest = members.slice(3);
  const sentToday = new Set((week?.members ?? []).filter((m) => m.encouragedToday).map((m) => m.userId));
  const canMessage = isMember && !!week?.isMember;
  const others = members.filter((m) => m.userId !== user?.id);
  const openMessage = (m: (typeof members)[number]) =>
    setTarget({ userId: m.userId, name: name(m), figurine: m.figurine, sentToday: sentToday.has(m.userId) });

  const header = (
    <View>
      {/* Hero: the cell's banner */}
      <View className="bg-primary rounded-b-3xl px-5 pt-5 pb-6" style={SOFT_SHADOW}>
        <HeroTexture style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
        <View className="flex-row items-center justify-between">
          <GameButton variant="wood" size="sm" title="Voltar" onPress={handleBack} />
          {isMember || isLeader ? (
            <View className="flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: "#F2B50C" }}>
              <GameIcon name="crown" size={18} style={{ marginRight: 4 }} />
              <Text className="font-extrabold text-xs" style={{ color: "#3B2412" }}>
                {isLeader ? "Você é o líder" : "Sua célula"}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="items-center mt-3">
          <PopIn gentle>
            <CellCrest id={group.id} name={group.name} size={84} />
          </PopIn>
          <Text className="font-display text-center mt-3" style={{ color: "#FFFFFF", fontSize: 26, lineHeight: 32 }}>
            {group.name}
          </Text>
          {group.description ? (
            <Text className="text-center text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)", maxWidth: 520 }}>
              {group.description}
            </Text>
          ) : null}
        </View>

        <View className="flex-row gap-2 mt-5 w-full self-center" style={{ maxWidth: 520 }}>
          <HeroStat icon="tab-cells" value={`${group.memberCount}`} label="membros" />
          <HeroStat icon="xp" value={`${group.totalPoints}`} label="pontos" />
          <HeroStat icon="trophy" value={place > 0 ? `${place}º` : "-"} label="no Reino" />
        </View>
      </View>

      <View className="px-4 pt-5 gap-4 w-full self-center" style={{ maxWidth: 720 }}>
        {isLeader ? (
          <GameButton
            fullWidth
            variant="gold"
            icon="love-letter"
            title="Gerenciar pedidos de entrada"
            onPress={() => router.push(`/group-admin?id=${groupId}` as any)}
          />
        ) : null}

        {canMessage && others.length > 0 ? (
          <View className="bg-surface rounded-3xl p-4" style={{ borderWidth: 2, borderColor: "#F2B50C", ...SOFT_SHADOW }}>
            <View className="flex-row items-center mb-1">
              <GameIcon name="love-letter" size={30} style={{ marginRight: 8 }} />
              <Text className="font-display text-foreground flex-1" style={{ fontSize: 18 }}>
                Mande uma mensagem
              </Text>
            </View>
            <Text className="text-muted text-sm mb-3">
              {"Toque em alguém do time: “Estou orando por você”, “Você me inspira”... A mensagem chega como cartinha no Início."}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {others.map((m) => {
                const done = sentToday.has(m.userId);
                return (
                  <Pressable
                    key={m.userId}
                    accessibilityRole="button"
                    accessibilityLabel={done ? `Mensagem já enviada hoje para ${name(m)}` : `Mandar mensagem para ${name(m)}`}
                    onPress={() => openMessage(m)}
                    style={({ pressed }) => ({ width: 84, alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}
                  >
                    <View>
                      <FaceBadge figurine={m.figurine} size={60} ring={done ? "#2E8B57" : "#F2B50C"} label={name(m)} />
                      <View
                        style={{
                          position: "absolute",
                          right: -4,
                          bottom: -4,
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: done ? "#2E8B57" : "#FFF9EC",
                          borderWidth: 2,
                          borderColor: done ? "#2E8B57" : "#F2B50C",
                        }}
                      >
                        {done ? (
                          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13 }}>✓</Text>
                        ) : (
                          <GameIcon name="love-letter" size={16} />
                        )}
                      </View>
                    </View>
                    <Text className="text-foreground text-xs font-extrabold text-center mt-2" numberOfLines={1}>
                      {name(m)}
                    </Text>
                    <Text className="text-[10px] font-bold text-center" style={{ color: done ? "#2E6B47" : "#7A5A3C" }}>
                      {done ? "Enviado hoje" : "Mandar"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {canSeeWeek ? <GroupWeekCard groupId={groupId} /> : null}

        {/* Team podium (top 3 by XP) */}
        {members.length > 0 ? (
          <View className="bg-surface rounded-3xl px-3 pt-4 overflow-hidden" style={SOFT_SHADOW}>
            <View className="flex-row items-center justify-center mb-2">
              <GameIcon name="crown" size={24} style={{ marginRight: 6 }} />
              <Text className="font-display text-foreground" style={{ fontSize: 17 }}>
                Destaques do time
              </Text>
            </View>
            <Podium entries={podium} />
          </View>
        ) : null}

        {rest.length > 0 ? (
          <View className="flex-row items-center">
            <GameIcon name="banner" size={26} style={{ marginRight: 6 }} />
            <Text className="font-display text-foreground flex-1" style={{ fontSize: 18 }}>
              Todo o time
            </Text>
            <Text className="text-muted text-xs font-bold">{members.length} no total</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScreenContainer background={KINGDOM_BG.cells}>
      <FlatList
        data={rest}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item, index }) => {
          const me = item.userId === user?.id;
          const leader = group.leaderId === item.userId;
          return (
            <View className="px-4 w-full self-center" style={{ maxWidth: 720 }}>
              <PopIn delay={Math.min(index, 10) * 40} gentle>
                <View
                  className={`flex-row items-center rounded-2xl p-3 mb-2 ${me ? "bg-primary/10" : "bg-surface"}`}
                  style={[SOFT_SHADOW, me ? { borderWidth: 2, borderColor: "#27509C" } : null]}
                >
                  <View
                    className="items-center justify-center rounded-full mr-3"
                    style={{ width: 32, height: 32, backgroundColor: me ? "#27509C" : "#F4E4C1" }}
                  >
                    <Text className="font-extrabold" style={{ color: me ? "#FFFFFF" : "#3B2412", fontSize: 13 }}>
                      {index + 4}
                    </Text>
                  </View>
                  <FaceBadge figurine={item.figurine} size={46} ring={leader ? "#F2B50C" : "#D8C9A8"} label={name(item)} />
                  <View className="flex-1 ml-3">
                    <Text className="text-foreground font-extrabold" numberOfLines={1}>
                      {me ? `${name(item)} (você)` : name(item)}
                    </Text>
                    <Text className="text-muted text-xs">Nível {item.userLevel}</Text>
                  </View>
                  {leader ? (
                    <View className="flex-row items-center rounded-full px-2 py-1 mr-2" style={{ backgroundColor: "rgba(242,181,12,0.2)" }}>
                      <GameIcon name="crown" size={16} style={{ marginRight: 3 }} />
                      <Text className="text-xs font-extrabold" style={{ color: "#7A5A00" }}>
                        Líder
                      </Text>
                    </View>
                  ) : null}
                  <Text className="font-extrabold text-accent">{item.userXp} XP</Text>
                  {canMessage && !me ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Mandar mensagem para ${name(item)}`}
                      onPress={() => openMessage(item)}
                      hitSlop={6}
                      style={{ marginLeft: 10 }}
                    >
                      <GameIcon name={sentToday.has(item.userId) ? "seal" : "love-letter"} size={28} />
                    </Pressable>
                  ) : null}
                </View>
              </PopIn>
            </View>
          );
        }}
        ListEmptyComponent={
          members.length === 0 ? (
            <View className="items-center py-10 px-6">
              <GameIcon name="tab-cells" size={56} style={{ marginBottom: 10 }} />
              <Text className="text-muted text-center">Nenhum membro ainda. Chame seus amigos!</Text>
            </View>
          ) : null
        }
      />
      <MessageSheet target={target} groupId={groupId} onClose={() => setTarget(null)} />
    </ScreenContainer>
  );
}

function HeroStat({ icon, value, label }: { icon: GameIconName; value: string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl py-2 items-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
      <GameIcon name={icon} size={26} />
      <Text style={{ color: "#FFFFFF" }} className="text-lg font-extrabold mt-1">
        {value}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.8)" }} className="text-[11px] font-bold">
        {label}
      </Text>
    </View>
  );
}

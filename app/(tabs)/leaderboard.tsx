import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import type React from "react";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { SOFT_SHADOW } from "@/lib/ui";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { LeagueBoard } from "@/components/league-board";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { HeroTexture } from "@/components/hero-texture";
import { FaceBadge } from "@/components/face-badge";
import { CellCrest } from "@/components/cell-crest";
import { Podium, type PodiumEntry } from "@/components/podium";
import { PopIn } from "@/components/juice";
import type { Figurine as FigurineData } from "@shared/character-catalog";

type Period = "league" | "monthly" | "yearly" | "groups";

const TABS: { key: Period; label: string; icon: GameIconName }[] = [
  { key: "league", label: "Liga", icon: "crown" },
  { key: "monthly", label: "Mês", icon: "calendar" },
  { key: "yearly", label: "Ano", icon: "trophy" },
  { key: "groups", label: "Células", icon: "banner" },
];

const SUBTITLE: Record<Period, string> = {
  league: "Dispute com sua liga nesta semana",
  monthly: "Quem mais brilhou neste mês",
  yearly: "As lendas do ano no Reino",
  groups: "As células mais unidas do Reino",
};

type Row = {
  key: string | number;
  position: number;
  name: string;
  detail: string;
  score: string;
  isMe?: boolean;
  avatar: (ring: string, size: number) => React.ReactNode;
};

export default function LeaderboardScreen() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("league");
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    refetch: refetchMonthly,
  } = trpc.leaderboard.monthly.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "monthly",
  });

  const {
    data: yearlyData,
    isLoading: yearlyLoading,
    refetch: refetchYearly,
  } = trpc.leaderboard.yearly.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "yearly",
  });

  const {
    data: groupsData,
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = trpc.groups.ranking.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "groups",
  });

  const { data: myGroup } = trpc.groups.myGroup.useQuery(undefined, {
    enabled: isAuthenticated && selectedPeriod === "groups",
  });

  const currentData =
    selectedPeriod === "monthly"
      ? monthlyData
      : selectedPeriod === "yearly"
        ? yearlyData
        : null;
  const isLoading =
    selectedPeriod === "league"
      ? false
      : selectedPeriod === "groups"
        ? groupsLoading
        : selectedPeriod === "monthly"
          ? monthlyLoading
          : yearlyLoading;

  const handleRefresh = async () => {
    setRefreshing(true);
    if (selectedPeriod === "league") {
      await utils.engagement.league.invalidate();
    } else if (selectedPeriod === "monthly") {
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
        <Text className="text-muted text-center">
          Faça login para ver o ranking
        </Text>
      </ScreenContainer>
    );
  }

  const face = (figurine: FigurineData | null | undefined, name: string) =>
    function renderFace(ring: string, size: number) {
      return (
        <FaceBadge figurine={figurine} size={size} ring={ring} label={name} />
      );
    };

  // Rows for the active board (players or cells), in rank order
  const rows: Row[] =
    selectedPeriod === "groups"
      ? (groupsData ?? []).map((g, i) => ({
          key: g.id,
          position: i + 1,
          name: g.name,
          detail: `${g.memberCount} membros${g.leaderName ? ` · Líder: ${g.leaderName}` : ""}`,
          score: `${g.totalPoints} pts`,
          isMe: myGroup?.groupId === g.id && myGroup?.status === "approved",
          avatar: (ring, size) => (
            <CellCrest id={g.id} name={g.name} size={size * 0.86} ring={ring} />
          ),
        }))
      : (currentData?.rankings ?? []).map((r) => ({
          key: r.userId,
          position: r.position,
          name: r.nickname ?? "Jogador",
          detail: `Nível ${r.level}`,
          score: `${r.xpTotal} XP`,
          isMe: user?.id === r.userId,
          avatar: face(r.figurine, r.nickname ?? "Jogador"),
        }));

  const podium: PodiumEntry[] = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myPosition = currentData?.userPosition;

  return (
    <ScreenContainer background={KINGDOM_BG.ranking}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Hero + tabs + podium */}
        <View
          className="bg-primary rounded-b-3xl px-4 pt-5 pb-4"
          style={SOFT_SHADOW}
        >
          <HeroTexture
            style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
          />
          <View className="flex-row items-center justify-center">
            <GameIcon name="trophy" size={44} style={{ marginRight: 8 }} />
            <Text
              className="font-display"
              style={{ color: "#FFFFFF", fontSize: 26 }}
            >
              Ranking
            </Text>
          </View>
          <Text
            className="text-center text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {SUBTITLE[selectedPeriod]}
          </Text>

          {/* Tabs: wooden shelf with a gold plate on the active one */}
          <View
            className="flex-row mt-4 p-1 rounded-2xl w-full self-center"
            style={{ maxWidth: 520, backgroundColor: "rgba(10,25,60,0.35)" }}
            accessibilityRole="tablist"
          >
            {TABS.map((tab) => {
              const active = selectedPeriod === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSelectedPeriod(tab.key)}
                  style={[
                    {
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 8,
                      borderRadius: 12,
                    },
                    active
                      ? {
                          backgroundColor: "#F2B50C",
                          borderBottomWidth: 3,
                          borderBottomColor: "#C98F00",
                        }
                      : null,
                  ]}
                >
                  <GameIcon name={tab.icon} size={26} />
                  <Text
                    className="text-xs font-extrabold mt-0.5"
                    style={{
                      color: active ? "#3B2412" : "rgba(255,255,255,0.9)",
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          className="px-4 pt-4 w-full self-center"
          style={{ maxWidth: 720 }}
        >
          {/* My position (players) */}
          {myPosition &&
          selectedPeriod !== "league" &&
          selectedPeriod !== "groups" ? (
            <View
              className="flex-row items-center rounded-3xl p-3 mb-4"
              style={{
                backgroundColor: "#FFF4D6",
                borderWidth: 2,
                borderColor: "#F2B50C",
                ...SOFT_SHADOW,
              }}
            >
              <FaceBadge
                figurine={me?.figurine}
                size={52}
                ring="#F2B50C"
                label="Você"
              />
              <View className="flex-1 ml-3">
                <Text
                  className="text-xs font-bold"
                  style={{ color: "#7A5A3C" }}
                >
                  Sua posição
                </Text>
                <Text
                  className="font-display"
                  style={{ color: "#3B2412", fontSize: 22 }}
                >
                  {myPosition.position}º lugar
                </Text>
              </View>
              <View className="items-end">
                <GameIcon name="xp" size={26} />
                <Text className="font-extrabold" style={{ color: "#3B2412" }}>
                  {myPosition.xpTotal} XP
                </Text>
              </View>
            </View>
          ) : null}

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" />
            </View>
          ) : selectedPeriod === "league" ? (
            <LeagueBoard />
          ) : rows.length === 0 ? (
            <View
              className="bg-surface rounded-3xl p-6 items-center"
              style={SOFT_SHADOW}
            >
              <GameIcon
                name={selectedPeriod === "groups" ? "banner" : "quest-target"}
                size={64}
              />
              <Text
                className="font-display text-foreground text-center mt-3"
                style={{ fontSize: 18 }}
              >
                O pódio está vazio!
              </Text>
              <Text className="text-muted text-center text-sm mt-1">
                {selectedPeriod === "groups"
                  ? "Nenhuma célula pontuou ainda. Bora ser a primeira?"
                  : "Complete desafios e seja o primeiro a subir no pódio!"}
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {/* Podium card (top 3) */}
              <View
                className="bg-surface rounded-3xl px-3 pt-4 pb-0 overflow-hidden mb-2"
                style={SOFT_SHADOW}
              >
                <View className="flex-row items-center justify-center mb-2">
                  <GameIcon name="crown" size={24} style={{ marginRight: 6 }} />
                  <Text
                    className="font-display text-foreground"
                    style={{ fontSize: 17 }}
                  >
                    {selectedPeriod === "groups"
                      ? "Pódio das células"
                      : "Pódio do Reino"}
                  </Text>
                </View>
                <Podium key={selectedPeriod} entries={podium} />
              </View>
              <RestList rows={rest} period={selectedPeriod} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function RestList({ rows: rest, period }: { rows: Row[]; period: Period }) {
  return rest.length > 0 ? (
    <View className="gap-2">
      {rest.map((row, index) => (
        <PopIn
          key={`${period}-${row.key}`}
          delay={Math.min(index, 12) * 40}
          gentle
        >
          <RankRow row={row} />
        </PopIn>
      ))}
    </View>
  ) : (
    <Text className="text-muted text-center text-sm mt-1">
      {period === "groups"
        ? "Mais células aparecem aqui quando pontuarem."
        : "Ainda dá tempo de entrar no pódio. Bora!"}
    </Text>
  );
}

function RankRow({ row }: { row: Row }) {
  return (
    <View
      className={`flex-row items-center rounded-2xl p-3 ${row.isMe ? "bg-primary/10" : "bg-surface"}`}
      style={[
        SOFT_SHADOW,
        row.isMe ? { borderWidth: 2, borderColor: "#27509C" } : null,
      ]}
    >
      <View
        className="items-center justify-center rounded-full mr-3"
        style={{
          width: 34,
          height: 34,
          backgroundColor: row.isMe ? "#27509C" : "#F4E4C1",
        }}
      >
        <Text
          className="font-extrabold"
          style={{ color: row.isMe ? "#FFFFFF" : "#3B2412", fontSize: 14 }}
        >
          {row.position}
        </Text>
      </View>
      {row.avatar(row.isMe ? "#27509C" : "#D8C9A8", 46)}
      <View className="flex-1 ml-3">
        <Text className="text-foreground font-extrabold" numberOfLines={1}>
          {row.isMe ? `${row.name} (você)` : row.name}
        </Text>
        <Text className="text-muted text-xs" numberOfLines={1}>
          {row.detail}
        </Text>
      </View>
      <Text className="font-extrabold text-accent ml-2">{row.score}</Text>
    </View>
  );
}

import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import {
  MEDAL_TIER_COLOR,
  MEDAL_TIER_LABEL,
  type MedalTier,
} from "@shared/medal-rewards";
import { AnimatedBar } from "@/components/juice";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { GameCloseButton } from "@/components/game-button";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { SOFT_SHADOW } from "@/lib/ui";
import { HeroTexture } from "@/components/hero-texture";

const MEDAL_TIER_ICON: Record<string, GameIconName> = {
  BRONZE: "medal-bronze",
  SILVER: "medal-silver",
  GOLD: "medal-gold",
  DIAMOND: "medal-diamond",
};

type TabType = "all" | "earned" | "available";

const TABS: { key: TabType; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "earned", label: "Conquistadas" },
  { key: "available", label: "A conquistar" },
];

type MedalItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  tier: string;
  isEarned: boolean;
  earnedAt: string | Date | null;
  progressCurrent: number | null;
  progressTarget: number | null;
  xpReward: number;
  denarioReward: number;
};

const tierColorOf = (tier: string) =>
  MEDAL_TIER_COLOR[tier as MedalTier] ?? MEDAL_TIER_COLOR.BRONZE;
const tierIconOf = (tier: string) => MEDAL_TIER_ICON[tier] ?? "medal-bronze";
const hasProgressOf = (m: MedalItem) =>
  m.progressTarget != null && m.progressTarget > 0 && m.progressCurrent != null;

/** Perguntados-style achievement badge: tier medal in a ring, name, progress/earned. */
function MedalBadge({
  medal,
  width,
  onPress,
}: {
  medal: MedalItem;
  width: number;
  onPress: (m: MedalItem) => void;
}) {
  const earned = medal.isEarned;
  const tierColor = tierColorOf(medal.tier);
  const hasProgress = hasProgressOf(medal);
  const pct = hasProgress
    ? (medal.progressCurrent! / medal.progressTarget!) * 100
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(medal)}
      className="bg-surface rounded-2xl p-3 items-center"
      style={[SOFT_SHADOW, { width }]}
      accessibilityLabel={`Medalha ${medal.name}`}
    >
      <View
        className="w-[70px] h-[70px] rounded-full items-center justify-center"
        style={{
          borderWidth: earned ? 3 : 2,
          borderColor: earned ? tierColor : "#D8C9A8",
          backgroundColor: earned ? tierColor + "22" : "#0000000A",
        }}
      >
        <GameIcon name={tierIconOf(medal.tier)} size={46} dimmed={!earned} />
      </View>

      <Text
        numberOfLines={2}
        className={`text-center text-xs font-bold mt-2 ${earned ? "text-foreground" : "text-muted"}`}
      >
        {medal.name}
      </Text>

      {earned ? (
        <Text
          className="text-[10px] font-extrabold mt-1"
          style={{ color: tierColor }}
        >
          {MEDAL_TIER_LABEL[medal.tier as MedalTier] ?? "Bronze"}
        </Text>
      ) : hasProgress ? (
        <View className="w-full mt-2">
          <AnimatedBar percent={pct} height={6} shine={false} />
          <Text className="text-[10px] text-muted text-center mt-1">
            {medal.progressCurrent}/{medal.progressTarget}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center mt-1">
          <GameIcon name="lock" size="xs" style={{ marginRight: 3 }} />
          <Text className="text-[10px] text-muted">Bloqueada</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MedalsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selected, setSelected] = useState<MedalItem | null>(null);

  const { data: medals, isLoading } = trpc.medals.list.useQuery();

  const earnedMedals = medals?.filter((m) => m.isEarned) || [];
  const availableMedals = medals?.filter((m) => !m.isEarned) || [];
  const total = medals?.length || 0;

  const recentEarned = earnedMedals
    .filter((m) => m.earnedAt)
    .sort(
      (a, b) =>
        new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime(),
    )
    .slice(0, 6);

  const displayedMedals =
    activeTab === "all"
      ? medals || []
      : activeTab === "earned"
        ? earnedMedals
        : availableMedals;

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      BIBLE_BOOK: "Livros Bíblicos",
      STREAK: "Sequências",
      MILESTONE: "Marcos",
      SPECIAL: "Especiais",
    };
    return names[category] || category;
  };

  const groupedMedals = displayedMedals.reduce(
    (acc, medal) => {
      (acc[medal.category] ||= []).push(medal);
      return acc;
    },
    {} as Record<string, typeof displayedMedals>,
  );

  // Grade responsiva: 2 colunas no celular (tiles largos, nome não quebra feio),
  // 3 em telas maiores. Respeita a coluna de conteúdo.
  const shellW = Math.min(width, 760);
  const gap = 12;
  const cols = shellW >= 560 ? 3 : 2;
  const tileW = (shellW - 40 - gap * (cols - 1)) / cols; // px-5 (40) + gaps

  return (
    <ScreenContainer
      background={KINGDOM_BG.clean}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header banner */}
        <View
          className="bg-primary px-5 pt-5 pb-4 rounded-b-3xl"
          style={SOFT_SHADOW}
        >
          <HeroTexture style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-2"
              accessibilityLabel="Voltar"
            >
              <Text style={{ color: "#FFFFFF" }} className="text-2xl font-bold">
                ‹
              </Text>
            </TouchableOpacity>
            <GameIcon name="trophy" size="md" style={{ marginRight: 8 }} />
            <Text
              style={{ color: "#FFFFFF" }}
              className="font-display text-2xl font-extrabold flex-1"
            >
              Medalhas
            </Text>
          </View>

          {/* Resumo + progresso */}
          <View className="mt-3">
            <View className="flex-row justify-between mb-1">
              <Text
                style={{ color: "#FFFFFF" }}
                className="text-sm font-semibold opacity-90"
              >
                {earnedMedals.length} de {total} conquistadas
              </Text>
              <Text
                style={{ color: "#FFFFFF" }}
                className="text-sm font-extrabold"
              >
                {total ? Math.round((earnedMedals.length / total) * 100) : 0}%
              </Text>
            </View>
            <AnimatedBar
              percent={total ? (earnedMedals.length / total) * 100 : 0}
              height={10}
              fillClassName="bg-warning"
              trackClassName="bg-white/20"
            />
          </View>
        </View>

        {/* Conquistadas recentemente */}
        {activeTab === "all" && recentEarned.length > 0 ? (
          <View className="mt-5">
            <Text className="font-display text-foreground text-base font-extrabold mb-3 px-5">
              Conquistadas recentemente
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {recentEarned.map((medal) => (
                <MedalBadge
                  key={`recent-${medal.id}`}
                  medal={medal}
                  width={tileW}
                  onPress={setSelected}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Abas segmentadas */}
        <View
          className="mx-5 mt-5 flex-row rounded-full bg-surface p-1"
          style={SOFT_SHADOW}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.8}
                className={`flex-1 items-center justify-center rounded-full px-1 py-2 ${active ? "bg-warning" : ""}`}
                onPress={() => setActiveTab(t.key)}
              >
                <Text
                  numberOfLines={1}
                  className={`text-[11px] font-extrabold ${active ? "text-foreground" : "text-muted"}`}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Conteúdo */}
        {isLoading ? (
          <View className="justify-center items-center py-20">
            <ActivityIndicator size="large" />
          </View>
        ) : displayedMedals.length === 0 ? (
          <View className="justify-center items-center py-16 px-6">
            <GameIcon
              name={activeTab === "earned" ? "medal-gold" : "quest-target"}
              size="hero"
              style={{ marginBottom: 16 }}
            />
            <Text className="text-foreground text-lg font-bold text-center mb-2">
              {activeTab === "earned"
                ? "Nenhuma medalha conquistada ainda"
                : "Nenhuma medalha aqui"}
            </Text>
            <Text className="text-muted text-center">
              {activeTab === "earned"
                ? "Complete desafios para conquistar suas primeiras medalhas!"
                : "Todas as medalhas foram conquistadas!"}
            </Text>
          </View>
        ) : (
          Object.entries(groupedMedals).map(([category, catMedals]) => (
            <View key={category} className="px-5 mt-5">
              <Text className="font-display text-foreground text-base font-extrabold mb-3">
                {getCategoryName(category)}
              </Text>
              <View className="flex-row flex-wrap" style={{ gap }}>
                {catMedals.map((medal) => (
                  <MedalBadge
                    key={medal.id}
                    medal={medal}
                    width={tileW}
                    onPress={setSelected}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Detalhe da medalha */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable
          onPress={() => setSelected(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: "100%", maxWidth: 360 }}
          >
            <View
              className="bg-surface rounded-3xl p-6 items-center"
              style={SOFT_SHADOW}
            >
            {selected ? (
              <>
                <GameCloseButton
                  onPress={() => setSelected(null)}
                  size={38}
                  style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}
                />
                <View
                  className="w-[104px] h-[104px] rounded-full items-center justify-center"
                  style={{
                    borderWidth: selected.isEarned ? 4 : 2,
                    borderColor: selected.isEarned
                      ? tierColorOf(selected.tier)
                      : "#D8C9A8",
                    backgroundColor: selected.isEarned
                      ? tierColorOf(selected.tier) + "22"
                      : "#0000000A",
                  }}
                >
                  <GameIcon
                    name={tierIconOf(selected.tier)}
                    size={72}
                    dimmed={!selected.isEarned}
                  />
                </View>

                <Text
                  className="text-[11px] font-extrabold mt-2 tracking-wide"
                  style={{ color: tierColorOf(selected.tier) }}
                >
                  {(
                    MEDAL_TIER_LABEL[selected.tier as MedalTier] ?? "Bronze"
                  ).toUpperCase()}
                </Text>
                <Text className="font-display text-foreground text-xl font-extrabold text-center mt-1">
                  {selected.name}
                </Text>
                <Text className="font-body text-muted text-sm text-center mt-2">
                  {selected.description}
                </Text>

                {/* Recompensa */}
                {selected.xpReward > 0 || selected.denarioReward > 0 ? (
                  <View className="flex-row gap-2 mt-4">
                    {selected.xpReward > 0 ? (
                      <View className="bg-accent/15 px-3 py-1.5 rounded-full flex-row items-center">
                        <GameIcon name="xp" size="xs" style={{ marginRight: 4 }} />
                        <Text className="text-accent text-xs font-extrabold">
                          +{selected.xpReward} XP
                        </Text>
                      </View>
                    ) : null}
                    {selected.denarioReward > 0 ? (
                      <View className="bg-warning/30 px-3 py-1.5 rounded-full flex-row items-center">
                        <GameIcon name="coin" size="xs" style={{ marginRight: 4 }} />
                        <Text className="text-foreground text-xs font-extrabold">
                          +{selected.denarioReward}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Estado */}
                {selected.isEarned ? (
                  <Text className="text-xs text-secondary font-bold mt-4">
                    {selected.earnedAt
                      ? `Conquistada em ${new Date(
                          selected.earnedAt,
                        ).toLocaleDateString("pt-BR")}`
                      : "Conquistada!"}
                  </Text>
                ) : hasProgressOf(selected) ? (
                  <View className="w-full mt-4">
                    <AnimatedBar
                      percent={
                        (selected.progressCurrent! / selected.progressTarget!) *
                        100
                      }
                      height={8}
                      shine={false}
                    />
                    <Text className="text-xs text-muted text-center mt-1">
                      {selected.progressCurrent}/{selected.progressTarget} ·
                      faltam{" "}
                      {selected.progressTarget! - selected.progressCurrent!}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center mt-4">
                    <GameIcon name="lock" size="sm" style={{ marginRight: 4 }} />
                    <Text className="text-xs text-muted">Ainda bloqueada</Text>
                  </View>
                )}

              </>
            ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

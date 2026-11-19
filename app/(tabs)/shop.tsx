/**
 * Reino: the player's kingdom hub, with three big buttons on top.
 * - Guarda-roupa: looks unlocked by level (components/reino/wardrobe-section)
 * - Mercado: where denários are spent (components/reino/market-section)
 * - Tesouro: everything the player owns (components/reino/treasure-section)
 * Open a section directly with /shop?aba=mercado | tesouro.
 */
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { HeroTexture } from "@/components/hero-texture";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { CountUp } from "@/components/juice";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { WardrobeSection } from "@/components/reino/wardrobe-section";
import { MarketSection } from "@/components/reino/market-section";
import { TreasureSection } from "@/components/reino/treasure-section";

type Section = "guarda-roupa" | "mercado" | "tesouro";

const SECTIONS: { key: Section; label: string; icon: GameIconName }[] = [
  { key: "guarda-roupa", label: "Guarda-roupa", icon: "tab-shop" },
  { key: "mercado", label: "Mercado", icon: "coin" },
  { key: "tesouro", label: "Tesouro", icon: "chest" },
];

const GOLD = "#F2B50C";

export default function ReinoScreen() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const params = useLocalSearchParams<{ aba?: string }>();
  const initial = SECTIONS.some((s) => s.key === params.aba) ? (params.aba as Section) : "guarda-roupa";
  const [section, setSection] = useState<Section>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const { data: me } = trpc.user.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: chests } = trpc.chests.list.useQuery(undefined, { enabled: isAuthenticated });
  const readyChests = (chests ?? []).filter((c) => c.status === "READY").length;

  return (
    <ScreenContainer background={KINGDOM_BG.shop}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([utils.user.me.invalidate(), utils.chests.list.invalidate()]);
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Cabeçalho do Reino + os 3 botões grandes */}
        <View className="bg-primary px-4 pt-5 pb-4">
          <HeroTexture />
          <View className="flex-row items-center justify-between px-1">
            <View className="flex-row items-center">
              <GameIcon name="crown" size="lg" style={{ marginRight: 8 }} />
              <Text className="text-white text-2xl font-extrabold">Reino</Text>
            </View>
            <View className="bg-warning px-3 py-1 rounded-full flex-row items-center">
              <GameIcon name="coin" size="sm" style={{ marginRight: 4 }} />
              <CountUp value={me?.denarioBalance ?? 0} className="text-foreground font-extrabold" />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {SECTIONS.map((s) => {
              const active = section === s.key;
              const badge = s.key === "tesouro" && readyChests > 0 ? readyChests : 0;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setSection(s.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={badge ? `${s.label}, ${badge} baú pronto para abrir` : s.label}
                  style={({ pressed }) => ({
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 10,
                    borderRadius: 18,
                    backgroundColor: active ? GOLD : "rgba(255,255,255,0.12)",
                    borderWidth: 2,
                    borderColor: active ? "#FFE08A" : "rgba(255,255,255,0.18)",
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <GameIcon name={s.icon} size={34} />
                  <Text
                    style={{ color: active ? "#3B2A06" : "#FFFFFF", fontWeight: "800", fontSize: 12, marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                  {badge ? (
                    <View
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -4,
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "#C1272D",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 5,
                        borderWidth: 2,
                        borderColor: "#FFFFFF",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {section === "guarda-roupa" ? (
          <WardrobeSection />
        ) : section === "mercado" ? (
          <MarketSection onBought={() => setSection("tesouro")} />
        ) : (
          <TreasureSection onGoToMarket={() => setSection("mercado")} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

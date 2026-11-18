/**
 * Guarda-roupa: pick a character, try on looks / hair / accessories on the big figurine,
 * then equip or buy. Catalog: shared/character-catalog.ts (synced with `pnpm catalog:sync`).
 */
import { useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/components/notification-provider";
import { useJuice } from "@/components/juice-provider";
import { CountUp, PopIn, PressableScale, Pulse } from "@/components/juice";
import { GameIcon } from "@/components/game-icon";
import { Figurine } from "@/components/figurine";
import {
  CHARACTERS,
  CHARACTER_KEYS,
  DEFAULT_CHARACTER,
  accessoryPath,
  type CharacterKey,
  type Figurine as FigurineData,
} from "@shared/character-catalog";
import { getApiBaseUrl } from "@/constants/api";

type Tab = "personagem" | "looks" | "cabelo" | "acessorios";
type ShopItem = {
  id: number;
  slug: string | null;
  name: string;
  type: string;
  rarity: "COMMON" | "RARE" | "EPIC";
  priceDenario: number;
  description: string | null;
  characterKey: string | null;
  assetKey: string | null;
  owned: boolean;
  isLocked: boolean;
  lockReason: string;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "personagem", label: "Personagem" },
  { key: "looks", label: "Looks" },
  { key: "cabelo", label: "Cabelo" },
  { key: "acessorios", label: "Acessórios" },
];

const RARITY = {
  COMMON: { label: "Comum", color: "#9CA3AF" },
  RARE: { label: "Raro", color: "#3D6FD6" }, // Azul real
  EPIC: { label: "Épico", color: "#7B3FA0" }, // Roxo realeza
} as const;

const TYPE_FOR_TAB: Partial<Record<Tab, string>> = { looks: "CLOTHES", cabelo: "HAIR_COLOR", acessorios: "ACCESSORY" };

export default function ShopScreen() {
  const { isAuthenticated } = useAuth();
  const notifications = useNotifications();
  const juice = useJuice();
  const utils = trpc.useUtils();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("looks");
  const [selected, setSelected] = useState<ShopItem | null>(null);

  const { data: me, refetch: refetchMe } = trpc.user.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: items, isLoading, refetch: refetchItems } = trpc.shop.items.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const refresh = async () => {
    await Promise.all([refetchMe(), refetchItems()]);
  };

  const onError = (error: { message: string }) => notifications.error(error.message);
  const buy = trpc.shop.buy.useMutation({ onError });
  const equip = trpc.shop.equipItem.useMutation({ onError });
  const unequip = trpc.shop.unequipItem.useMutation({ onError });
  const setCharacter = trpc.user.setCharacter.useMutation({ onError });

  const current: FigurineData = me?.figurine ?? {
    character: DEFAULT_CHARACTER,
    chosen: false,
    look: "original",
    hair: null,
    accessory: null,
  };

  const catalog = useMemo(
    () => ((items ?? []) as ShopItem[]).filter((i) => i.slug && i.assetKey),
    [items]
  );

  /** What the big figurine shows: current outfit + the item being tried on. */
  const preview: FigurineData = useMemo(() => {
    if (!selected?.assetKey) return current;
    if (selected.type === "CLOTHES") return { ...current, look: selected.assetKey };
    if (selected.type === "HAIR_COLOR") {
      return { ...current, hair: selected.assetKey, look: ["original", "esporte"].includes(current.look) ? current.look : "original" };
    }
    if (selected.type === "ACCESSORY") {
      return CHARACTERS[current.character].cannotWear.includes(selected.assetKey) ? current : { ...current, accessory: selected.assetKey };
    }
    return current;
  }, [selected, current]);

  const isEquipped = (item: ShopItem) =>
    (item.type === "CLOTHES" && item.assetKey === current.look) ||
    (item.type === "HAIR_COLOR" && item.assetKey === current.hair) ||
    (item.type === "ACCESSORY" && item.assetKey === current.accessory);

  const afterChange = async () => {
    setSelected(null);
    await refresh();
    utils.user.me.invalidate();
  };

  const doEquip = async (item: ShopItem) => {
    await equip.mutateAsync({ itemId: item.id });
    juice.burst({ title: "Visual novo!", subtitle: item.name.split(" · ")[0], confetti: false });
    await afterChange();
  };

  const doBuy = async (item: ShopItem) => {
    await buy.mutateAsync({ itemId: item.id });
    await equip.mutateAsync({ itemId: item.id });
    juice.burst({ title: "Comprado!", subtitle: `${item.name.split(" · ")[0]} já está com você` });
    juice.confetti(item.rarity === "EPIC" ? 140 : 60);
    await afterChange();
  };

  const doUnequip = async (type: "HAIR_COLOR" | "ACCESSORY") => {
    await unequip.mutateAsync({ itemType: type });
    await afterChange();
  };

  const pickCharacter = async (key: CharacterKey) => {
    if (key === current.character && current.chosen) return;
    await setCharacter.mutateAsync({ characterKey: key });
    juice.burst({ title: `Oi, eu sou ${CHARACTERS[key].name}!`, subtitle: CHARACTERS[key].tagline });
    setTab("looks");
    await afterChange();
  };

  const busy = buy.isPending || equip.isPending || unequip.isPending || setCharacter.isPending;
  const balance = me?.denarioBalance ?? 0;
  const tabItems = catalog.filter((i) => i.type === TYPE_FOR_TAB[tab]);
  const columns = width >= 768 ? 5 : 3;
  const cardWidth = (Math.min(width, 900) - 32 - (columns - 1) * 10) / columns;

  // ---------------- action under the preview ----------------
  let action: ReactNode = null;
  if (selected) {
    const equipped = isEquipped(selected);
    const cannotWear =
      selected.type === "ACCESSORY" && CHARACTERS[current.character].cannotWear.includes(selected.assetKey ?? "");
    if (cannotWear) {
      action = <Text className="text-muted text-sm font-bold">{CHARACTERS[current.character].name} já usa óculos!</Text>;
    } else if (equipped) {
      action = <Text className="text-primary text-sm font-extrabold">Você já está usando</Text>;
    } else if (selected.owned) {
      action = (
        <PressableScale className="bg-primary px-6 py-3 rounded-full" onPress={() => doEquip(selected)} disabled={busy}>
          <Text className="text-white font-extrabold">Equipar</Text>
        </PressableScale>
      );
    } else if (selected.isLocked) {
      action = (
        <View className="flex-row items-center bg-surface px-4 py-3 rounded-full border border-border">
          <GameIcon name="lock" size="sm" style={{ marginRight: 6 }} />
          <Text className="text-foreground font-bold">{selected.lockReason}</Text>
        </View>
      );
    } else {
      const canAfford = balance >= selected.priceDenario;
      action = (
        <Pulse active={canAfford}>
          <PressableScale
            className={`px-6 py-3 rounded-full flex-row items-center ${canAfford ? "bg-warning border-2 border-primary" : "bg-surface border border-border"}`}
            onPress={() => (canAfford ? doBuy(selected) : notifications.error("Faltam denários! Complete desafios para ganhar mais."))}
            disabled={busy}
          >
            <Text className="text-foreground font-extrabold mr-2">Comprar por {selected.priceDenario}</Text>
            <GameIcon name="coin" size="sm" />
          </PressableScale>
        </Pulse>
      );
    }
  }

  return (
    <ScreenContainer background={KINGDOM_BG.shop}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Header */}
        <View className="bg-primary px-5 pt-5 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <GameIcon name="tab-shop" size="lg" style={{ marginRight: 8 }} />
            <Text className="text-white text-2xl font-extrabold">Guarda-roupa</Text>
          </View>
          <View className="bg-warning px-3 py-1 rounded-full flex-row items-center">
            <GameIcon name="coin" size="sm" style={{ marginRight: 4 }} />
            <CountUp value={balance} className="text-foreground font-extrabold" />
          </View>
        </View>

        {/* Big preview */}
        <View className="bg-primary items-center pb-5 rounded-b-3xl">
          <PopIn trigger={`${preview.character}-${preview.look}-${preview.hair}-${preview.accessory}`}>
            <Figurine figurine={preview} height={300} />
          </PopIn>
          <View className="items-center mt-2 min-h-[56px] justify-center px-4">
            {selected ? (
              <>
                <Text className="text-white text-lg font-extrabold text-center">{selected.name.split(" · ")[0]}</Text>
                <View className="mt-2">{action}</View>
              </>
            ) : (
              <Text className="text-white/90 text-sm font-semibold text-center">
                {current.chosen
                  ? "Toque em um item para experimentar"
                  : "Escolha seu personagem para começar!"}
              </Text>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row gap-2 px-4 mt-4">
          {TABS.map((t) => (
            <PressableScale
              key={t.key}
              className={`flex-1 py-2 rounded-full items-center ${tab === t.key ? "bg-primary" : "bg-surface border border-border"}`}
              onPress={() => {
                setTab(t.key);
                setSelected(null);
              }}
            >
              <Text className={`text-xs font-extrabold ${tab === t.key ? "text-white" : "text-foreground"}`}>{t.label}</Text>
            </PressableScale>
          ))}
        </View>

        <View className="px-4 mt-4">
          {tab === "personagem" ? (
            <View className="gap-3">
              {CHARACTER_KEYS.map((key) => {
                const active = current.chosen && current.character === key;
                return (
                  <PressableScale
                    key={key}
                    className={`flex-row items-center rounded-2xl p-3 border-2 ${active ? "bg-primary/10 border-primary" : "bg-surface border-border"}`}
                    onPress={() => pickCharacter(key)}
                    disabled={busy}
                  >
                    <Figurine figurine={{ character: key, chosen: true, look: "original", hair: null, accessory: null }} height={72} mode="head" />
                    <View className="flex-1 ml-3">
                      <Text className="text-foreground text-lg font-extrabold">{CHARACTERS[key].name}</Text>
                      <Text className="text-muted text-sm">{CHARACTERS[key].tagline}</Text>
                    </View>
                    {active ? (
                      <GameIcon name="level-shield" size="md" label="Seu personagem" />
                    ) : (
                      <Text className="text-primary font-extrabold">Escolher</Text>
                    )}
                  </PressableScale>
                );
              })}
              <Text className="text-muted text-xs text-center mt-1">
                Trocar de personagem é grátis. Looks e cabelos são de cada personagem.
              </Text>
            </View>
          ) : isLoading ? (
            <ActivityIndicator size="large" />
          ) : (
            <>
              {tab === "cabelo" && (
                <Text className="text-muted text-xs mb-3 text-center">A cor do cabelo aparece nos looks Original e Esporte.</Text>
              )}
              <View className="flex-row flex-wrap gap-[10px]">
                {(tab === "cabelo" || tab === "acessorios") && (
                  <PressableScale
                    className="rounded-2xl p-2 items-center justify-center border-2 border-border bg-surface"
                    style={{ width: cardWidth, height: cardWidth + 44 }}
                    onPress={() => doUnequip(tab === "cabelo" ? "HAIR_COLOR" : "ACCESSORY")}
                    disabled={busy}
                  >
                    <GameIcon name="sprout" size="lg" />
                    <Text className="text-foreground text-xs font-bold mt-2 text-center">
                      {tab === "cabelo" ? "Cor natural" : "Sem acessório"}
                    </Text>
                  </PressableScale>
                )}
                {tabItems.map((item, index) => {
                  const equipped = isEquipped(item);
                  const isSelected = selected?.id === item.id;
                  const rarity = RARITY[item.rarity] ?? RARITY.COMMON;
                  return (
                    <PopIn key={item.id} delay={Math.min(index, 12) * 35}>
                      <PressableScale
                        className={`rounded-2xl p-2 items-center ${isSelected ? "bg-warning/30" : "bg-surface"}`}
                        style={{
                          width: cardWidth,
                          borderWidth: 3,
                          borderColor: isSelected ? "#F2B50C" : rarity.color,
                          opacity: item.isLocked && !item.owned ? 0.75 : 1,
                        }}
                        onPress={() => setSelected(item)}
                      >
                        <View style={{ height: cardWidth - 16, alignItems: "center", justifyContent: "center" }}>
                          {item.type === "ACCESSORY" ? (
                            <Image
                              source={{ uri: `${getApiBaseUrl()}${accessoryPath(item.assetKey!)}` }}
                              style={{ width: cardWidth * 0.75, height: cardWidth * 0.75 }}
                              resizeMode="contain"
                            />
                          ) : (
                            <Figurine
                              figurine={{
                                ...current,
                                look: item.type === "CLOTHES" ? item.assetKey! : "original",
                                hair: item.type === "HAIR_COLOR" ? item.assetKey : null,
                                accessory: null,
                              }}
                              height={cardWidth - 16}
                              mode={item.type === "HAIR_COLOR" ? "head" : "full"}
                            />
                          )}
                          {item.rarity !== "COMMON" ? (
                            <View
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                backgroundColor: rarity.color,
                                borderRadius: 8,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              }}
                            >
                              <Text className="text-white text-[9px] font-extrabold">
                                {rarity.label}
                              </Text>
                            </View>
                          ) : null}
                          {item.isLocked && !item.owned ? (
                            <View style={{ position: "absolute", top: 0, right: 0 }}>
                              <GameIcon name="lock" size="md" label={item.lockReason} />
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-foreground text-[11px] font-bold text-center mt-1" numberOfLines={1}>
                          {item.name.split(" · ")[0]}
                        </Text>
                        <View className="mt-1 flex-row items-center">
                          {equipped ? (
                            <Text className="text-primary text-[11px] font-extrabold">Usando</Text>
                          ) : item.owned ? (
                            <Text className="text-success text-[11px] font-extrabold">{item.priceDenario === 0 ? "Grátis" : "É seu"}</Text>
                          ) : (
                            <>
                              <GameIcon name="coin" size="xs" style={{ marginRight: 2 }} />
                              <Text className="text-foreground text-[11px] font-extrabold">{item.priceDenario}</Text>
                            </>
                          )}
                        </View>
                      </PressableScale>
                    </PopIn>
                  );
                })}
              </View>
              {tabItems.length === 0 && (
                <Text className="text-muted text-center mt-6">
                  Nenhum item ainda. Peça para a liderança sincronizar o catálogo.
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

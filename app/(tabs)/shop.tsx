import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";
import { NiceAvatar } from "@/components/nice-avatar";

type ItemType = "BACKGROUND" | "CLOTHES" | "ACCESSORY" | "HAIR_STYLE" | "HAIR_COLOR";
type Rarity = "COMMON" | "RARE" | "EPIC";
type TabType = "buy" | "myItems";

const RARITY_COLORS = {
  COMMON: { bg: "bg-muted/20", text: "text-muted", label: "Comum" },
  RARE: { bg: "bg-accent/20", text: "text-accent", label: "Raro" },
  EPIC: { bg: "bg-warning/20", text: "text-warning", label: "Epico" },
};

const TYPE_LABELS = {
  BACKGROUND: "Fundo",
  HAIR_STYLE: "Cabelo estilo",
  HAIR_COLOR: "Cabelo cor",
  CLOTHES: "Roupas",
  ACCESSORY: "Acessorios",
};

const TYPE_ICONS = {
  BACKGROUND: "BG",
  HAIR_STYLE: "HS",
  HAIR_COLOR: "HC",
  CLOTHES: "CL",
  ACCESSORY: "AC",
};

export default function ShopScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>("buy");
  const [selectedType, setSelectedType] = useState<ItemType | "ALL">("ALL");

  const { data: userData, refetch: refetchUser } = trpc.user.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: shopItems, isLoading: itemsLoading, refetch: refetchItems } = trpc.shop.items.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: userItems, isLoading: userItemsLoading, refetch: refetchUserItems } = trpc.shop.userItems.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const buyItemMutation = trpc.shop.buy.useMutation({
    onSuccess: () => {
      refetchUser();
      refetchItems();
      refetchUserItems();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchItems(), refetchUserItems()]);
    setRefreshing(false);
  };

  const handleBuyItem = async (itemId: number, itemName: string, price: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if ((userData?.denarioBalance || 0) < price) {
      alert("Denários insuficientes!");
      return;
    }

    try {
      await buyItemMutation.mutateAsync({ itemId });
      if (price === 0) {
        alert(`${itemName} adicionado ao inventário!`);
      } else {
        alert(`${itemName} comprado com sucesso!`);
      }
    } catch (error: any) {
      console.error("Error buying item:", error);
      alert(error.message || "Erro ao comprar item");
    }
  };


  const baseAvatarConfig = useMemo(() => {
    const config = userData?.avatarConfig;
    if (config && typeof config === "object" && !Array.isArray(config)) {
      return config as Record<string, unknown>;
    }
    return {};
  }, [userData?.avatarConfig]);

  const parsePatch = (value?: string | null) => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getPreviewConfig = (patchValue?: string | null) => {
    const patch = parsePatch(patchValue);
    if (!patch) return null;
    return { ...baseAvatarConfig, ...patch };
  };

  const renderOwnedItemCard = (ui: any) => {
    const previewConfig = getPreviewConfig(ui.item.avatarConfig);

    return (
      <View
        key={ui.id}
        className="bg-surface rounded-2xl p-4 border border-border"
        style={{ width: "48%" }}
      >
        <View className="bg-background rounded-xl h-24 items-center justify-center mb-3">
          {previewConfig ? (
            <NiceAvatar config={previewConfig} size={64} />
          ) : (
            <Text className="text-3xl">{TYPE_ICONS[ui.item.type as ItemType]}</Text>
          )}
        </View>
        <Text className="text-foreground text-sm font-bold mb-1">{ui.item.name}</Text>
        <Text className="text-muted text-xs mb-3">{TYPE_LABELS[ui.item.type as ItemType]}</Text>
        <View className="bg-secondary/20 py-2 rounded-lg">
          <Text className="text-primary text-center text-xs font-bold">Gerenciar no Perfil</Text>
        </View>
      </View>
    );
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
        <Text className="text-muted text-center">Faça login para acessar a loja</Text>
      </ScreenContainer>
    );
  }

  const filteredShopItems = shopItems?.filter((item) => selectedType === "ALL" || item.type === selectedType) || [];
  const filteredUserItems = userItems?.filter((ui) => selectedType === "ALL" || ui.item.type === selectedType) || [];

  // Group user items by type
  const groupedUserItems = {
    BACKGROUND: filteredUserItems.filter((ui) => ui.item.type === "BACKGROUND"),
    HAIR_STYLE: filteredUserItems.filter((ui) => ui.item.type === "HAIR_STYLE"),
    HAIR_COLOR: filteredUserItems.filter((ui) => ui.item.type === "HAIR_COLOR"),
    CLOTHES: filteredUserItems.filter((ui) => ui.item.type === "CLOTHES"),
    ACCESSORY: filteredUserItems.filter((ui) => ui.item.type === "ACCESSORY"),
  };

  const groupedSections = [
    { key: "BACKGROUND", label: "Fundos" },
    { key: "HAIR_STYLE", label: "Cabelo estilo" },
    { key: "HAIR_COLOR", label: "Cabelo cor" },
    { key: "CLOTHES", label: "Roupas" },
    { key: "ACCESSORY", label: "Acessorios" },
  ] as const;


  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View className="bg-primary p-6">
          <Text className="text-white text-2xl font-bold">Loja</Text>
          <View className="bg-secondary px-4 py-2 rounded-full mt-3 self-start">
            <Text className="text-primary text-lg font-bold">{userData?.denarioBalance || 0} Denários</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row p-4 gap-2">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-full ${selectedTab === "buy" ? "bg-primary" : "bg-surface border border-border"}`}
            onPress={() => setSelectedTab("buy")}
          >
            <Text className={`text-center font-bold ${selectedTab === "buy" ? "text-white" : "text-foreground"}`}>
              Comprar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-full ${selectedTab === "myItems" ? "bg-primary" : "bg-surface border border-border"}`}
            onPress={() => setSelectedTab("myItems")}
          >
            <Text className={`text-center font-bold ${selectedTab === "myItems" ? "text-white" : "text-foreground"}`}>
              Meus Itens
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <View className="px-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${selectedType === "ALL" ? "bg-primary" : "bg-surface border border-border"}`}
                onPress={() => setSelectedType("ALL")}
              >
                <Text className={`font-semibold ${selectedType === "ALL" ? "text-white" : "text-foreground"}`}>
                  Todos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${selectedType === "BACKGROUND" ? "bg-primary" : "bg-surface border border-border"}`}
                onPress={() => setSelectedType("BACKGROUND")}
              >
                <Text className={`font-semibold ${selectedType === "BACKGROUND" ? "text-white" : "text-foreground"}`}>
                  Fundos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${selectedType === "HAIR_STYLE" ? "bg-primary" : "bg-surface border border-border"}`}
                onPress={() => setSelectedType("HAIR_STYLE")}
              >
                <Text className={`font-semibold ${selectedType === "HAIR_STYLE" ? "text-white" : "text-foreground"}`}>
                  Cabelo estilo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${selectedType === "HAIR_COLOR" ? "bg-primary" : "bg-surface border border-border"}`}
                onPress={() => setSelectedType("HAIR_COLOR")}
              >
                <Text className={`font-semibold ${selectedType === "HAIR_COLOR" ? "text-white" : "text-foreground"}`}>
                  Cabelo cor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${selectedType === "CLOTHES" ? "bg-primary" : "bg-surface border border-border"}`}
                onPress={() => setSelectedType("CLOTHES")}
              >
                <Text className={`font-semibold ${selectedType === "CLOTHES" ? "text-white" : "text-foreground"}`}>
                  Roupas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-4 py-2 rounded-full ${selectedType === "ACCESSORY" ? "bg-primary" : "bg-surface border border-border"}`}
                onPress={() => setSelectedType("ACCESSORY")}
              >
                <Text className={`font-semibold ${selectedType === "ACCESSORY" ? "text-white" : "text-foreground"}`}>
                  Acessorios
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <View className="px-4 mt-4">
          {selectedTab === "buy" ? (
            // Buy Tab - Show shop items
            itemsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {filteredShopItems.map((item) => {
                  const rarityStyle = RARITY_COLORS[item.rarity as Rarity];
                  const canAfford = (userData?.denarioBalance || 0) >= item.priceDenario;
                  const isFree = item.priceDenario === 0;
                  const isLocked = item.isLocked;
                  const lockReason = item.lockReason as string | undefined;
                  const previewConfig = getPreviewConfig(item.avatarConfig);
                  const descriptionText = item.description?.trim() ? item.description : TYPE_LABELS[item.type as ItemType];

                  return (
                    <View
                      key={item.id}
                      className="bg-surface rounded-2xl p-4 border border-border"
                      style={{ width: "48%" }}
                    >
                      {/* Item Icon */}
                      <View className="bg-background rounded-xl h-24 items-center justify-center mb-3">
                        {previewConfig ? (
                          <NiceAvatar config={previewConfig} size={64} />
                        ) : (
                          <Text className="text-4xl">{TYPE_ICONS[item.type as ItemType]}</Text>
                        )}
                      </View>

                      {/* Rarity Badge */}
                      <View className={`${rarityStyle.bg} px-2 py-1 rounded self-start mb-2`}>
                        <Text className={`${rarityStyle.text} text-xs font-semibold`}>{rarityStyle.label}</Text>
                      </View>

                      {/* Item Name */}
                      <Text className="text-foreground text-sm font-bold mb-1">{item.name}</Text>
                      <Text className="text-muted text-xs mb-3">{descriptionText}</Text>

                      {/* Price and Buy Button */}
                      {item.owned ? (
                        <View className="bg-success/20 py-2 rounded-lg">
                          <Text className="text-success text-center text-xs font-bold">Possui</Text>
                        </View>
                      ) : (
                        <>
                          {!isFree && (
                            <View className="bg-secondary/20 px-2 py-1 rounded mb-2">
                              <Text className="text-primary text-center text-sm font-bold">
                                {item.priceDenario} Denários
                              </Text>
                            </View>
                          )}
                          {isLocked ? (
                            <View className="bg-muted/30 px-2 py-1 rounded mb-2">
                              <Text className="text-muted text-center text-xs font-semibold">
                                {lockReason || "Bloqueado"}
                              </Text>
                            </View>
                          ) : null}
                          <TouchableOpacity
                            className={`py-2 rounded-lg ${
                              isLocked ? "bg-muted/30" : isFree ? "bg-success" : canAfford ? "bg-primary" : "bg-muted/30"
                            }`}
                            onPress={() => handleBuyItem(item.id, item.name, item.priceDenario)}
                            disabled={isLocked || (!canAfford && !isFree) || buyItemMutation.isPending}
                          >
                            <Text
                              className={`text-center text-xs font-bold ${
                                isLocked ? "text-muted" : isFree || canAfford ? "text-white" : "text-muted"
                              }`}
                            >
                              {isLocked ? "Bloqueado" : isFree ? "Grátis" : canAfford ? "Comprar" : "Sem Denários"}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )
          ) : (
            // My Items Tab - Show owned items
            userItemsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" />
              </View>
            ) : filteredUserItems.length === 0 ? (
              <View className="bg-surface rounded-2xl p-6 items-center border border-border">
                <Text className="text-muted text-center">Você ainda não possui itens nesta categoria.</Text>
                <TouchableOpacity
                  className="bg-primary px-6 py-2 rounded-full mt-4"
                  onPress={() => setSelectedTab("buy")}
                >
                  <Text className="text-white font-bold">Ir para Loja</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="gap-4">
                {selectedType === "ALL" ? (
                  <View className="gap-6">
                    {groupedSections.map((section) => {
                      const items = groupedUserItems[section.key];
                      if (!items.length) return null;

                      return (
                        <View key={section.key}>
                          <Text className="text-foreground text-lg font-bold mb-3">
                            {section.label} ({items.length})
                          </Text>
                          <View className="flex-row flex-wrap gap-3">
                            {items.map(renderOwnedItemCard)}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  // Show filtered items
                  <View className="flex-row flex-wrap gap-3">
                    {filteredUserItems.map(renderOwnedItemCard)}
                  </View>
                )}
              </View>
            )
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

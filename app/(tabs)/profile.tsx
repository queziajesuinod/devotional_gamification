import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from "react-native";
import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { NiceAvatar } from "@/components/nice-avatar";
import { useNotifications } from "@/components/notification-provider";
import { Figurine } from "@/components/figurine";
import { GameIcon } from "@/components/game-icon";
import { PressableScale } from "@/components/juice";

type ItemType =
  | "BACKGROUND"
  | "CLOTHES"
  | "ACCESSORY"
  | "HAIR_STYLE"
  | "HAIR_COLOR"
  | "BASE_FEATURE";

type AvatarConfig = Record<string, string | number | boolean | null>;

type UserItem = {
  id: number;
  item: {
    id: number;
    name: string;
    type: ItemType;
    avatarConfig?: string | null;
  };
};

const TYPE_LABELS: Record<ItemType, string> = {
  BACKGROUND: "Fundo",
  HAIR_STYLE: "Cabelo estilo",
  HAIR_COLOR: "Cabelo cor",
  CLOTHES: "Roupas",
  ACCESSORY: "Acessorios",
  BASE_FEATURE: "Base do avatar",
};

const TYPE_ICONS: Record<ItemType, string> = {
  BACKGROUND: "BG",
  HAIR_STYLE: "HS",
  HAIR_COLOR: "HC",
  CLOTHES: "CL",
  ACCESSORY: "AC",
  BASE_FEATURE: "BA",
};

const GROUP_SECTIONS = [
  { key: "BACKGROUND", label: "Fundos" },
  { key: "HAIR_STYLE", label: "Cabelo estilo" },
  { key: "HAIR_COLOR", label: "Cabelo cor" },
  { key: "CLOTHES", label: "Roupas" },
  { key: "ACCESSORY", label: "Acessorios" },
] as const;

const BASE_AVATAR_HAIR_COLORS = ["#000", "#77311D"];
const BASE_AVATAR_SKIN_TONES = ["#F9C9B6", "#AC6651"];
const BASE_AVATAR_SHARED = {
  earSize: "small",
  eyeStyle: "oval",
  mouthStyle: "peace",
  noseStyle: "short",
  eyeBrowStyle: "up",
  glassesStyle: "none",
  hatStyle: "none",
  shirtStyle: "short",
  shirtColor: "#FFFFFF",
  bgColor: "#9CA3AF",
};

const BASE_AVATAR_PRESETS = [
  {
    id: "boy-light",
    label: "Menino 1",
    config: {
      ...BASE_AVATAR_SHARED,
      sex: "man",
      faceColor: BASE_AVATAR_SKIN_TONES[0],
      hairStyle: "normal",
      hairColor: BASE_AVATAR_HAIR_COLORS[0],
    },
  },
  {
    id: "boy-dark",
    label: "Menino 2",
    config: {
      ...BASE_AVATAR_SHARED,
      sex: "man",
      faceColor: BASE_AVATAR_SKIN_TONES[1],
      hairStyle: "normal",
      hairColor: BASE_AVATAR_HAIR_COLORS[1],
    },
  },
  {
    id: "girl-light",
    label: "Menina 1",
    config: {
      ...BASE_AVATAR_SHARED,
      sex: "woman",
      faceColor: BASE_AVATAR_SKIN_TONES[0],
      hairStyle: "womanLong",
      hairColor: BASE_AVATAR_HAIR_COLORS[0],
    },
  },
  {
    id: "girl-dark",
    label: "Menina 2",
    config: {
      ...BASE_AVATAR_SHARED,
      sex: "woman",
      faceColor: BASE_AVATAR_SKIN_TONES[1],
      hairStyle: "womanLong",
      hairColor: BASE_AVATAR_HAIR_COLORS[1],
    },
  },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const notifications = useNotifications();

  const {
    data: userData,
    isLoading: userLoading,
    refetch: refetchUser,
  } = trpc.user.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: userItems, refetch: refetchItems } =
    trpc.shop.userItems.useQuery(undefined, {
      enabled: isAuthenticated,
    });

  const equipItemMutation = trpc.shop.equipItem.useMutation({
    onSuccess: () => {
      refetchUser();
      refetchItems();
    },
  });

  const unequipItemMutation = trpc.shop.unequipItem.useMutation({
    onSuccess: () => {
      refetchUser();
      refetchItems();
    },
  });

  const updateAvatarMutation = trpc.user.updateAvatar.useMutation({
    onSuccess: () => {
      refetchUser();
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUser(), refetchItems()]);
    setRefreshing(false);
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    logout();
  };

  const baseAvatarConfig = useMemo(() => {
    const config = userData?.avatarConfig;
    if (config && typeof config === "object" && !Array.isArray(config)) {
      return config as Record<string, unknown>;
    }
    return null;
  }, [userData?.avatarConfig]);

  const isPresetActive = (preset: (typeof BASE_AVATAR_PRESETS)[number]) => {
    if (!baseAvatarConfig) return false;
    return Object.entries(preset.config).every(
      ([key, value]) => baseAvatarConfig[key] === value,
    );
  };

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
    if (!patch) return baseAvatarConfig ?? null;
    return { ...(baseAvatarConfig ?? {}), ...patch } as Record<string, unknown>;
  };

  const getEquippedId = (type: ItemType) => {
    if (!userData) return null;
    switch (type) {
      case "BACKGROUND":
        return userData.equippedBackgroundId;
      case "CLOTHES":
        return userData.equippedClothesId;
      case "ACCESSORY":
        return userData.equippedAccessoryId;
      case "HAIR_STYLE":
        return userData.equippedHairStyleId;
      case "HAIR_COLOR":
        return userData.equippedHairColorId;
      default:
        return null;
    }
  };

  const handleEquipItem = async (itemId: number, itemName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await equipItemMutation.mutateAsync({ itemId });
      notifications.success(`${itemName} equipado com sucesso!`);
    } catch (error: any) {
      console.error("Error equipping item:", error);
      notifications.error(error.message || "Erro ao equipar item");
    }
  };

  const handleUnequipItem = async (itemType: ItemType, itemName: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await unequipItemMutation.mutateAsync({ itemType });
      notifications.success(`${itemName} removido do avatar.`);
    } catch (error: any) {
      console.error("Error unequipping item:", error);
      notifications.error(error.message || "Erro ao remover item");
    }
  };

  const handleSelectBaseAvatar = async (config: AvatarConfig) => {
    if (!userData) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await updateAvatarMutation.mutateAsync({
        avatarConfig: config,
        equippedBackgroundId: userData.equippedBackgroundId ?? null,
        equippedClothesId: userData.equippedClothesId ?? null,
        equippedAccessoryId: userData.equippedAccessoryId ?? null,
        equippedHairStyleId: userData.equippedHairStyleId ?? null,
        equippedHairColorId: userData.equippedHairColorId ?? null,
      });
      notifications.success("Avatar base atualizado!");
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      notifications.error(error.message || "Erro ao atualizar avatar");
    }
  };

  const groupedItems: Record<ItemType, UserItem[]> = {
    BACKGROUND: userItems?.filter((ui) => ui.item.type === "BACKGROUND") || [],
    HAIR_STYLE: userItems?.filter((ui) => ui.item.type === "HAIR_STYLE") || [],
    HAIR_COLOR: userItems?.filter((ui) => ui.item.type === "HAIR_COLOR") || [],
    CLOTHES: userItems?.filter((ui) => ui.item.type === "CLOTHES") || [],
    ACCESSORY: userItems?.filter((ui) => ui.item.type === "ACCESSORY") || [],
    BASE_FEATURE:
      userItems?.filter((ui) => ui.item.type === "BASE_FEATURE") || [],
  };

  const renderAvatarItemCard = (ui: UserItem) => {
    const equipped = getEquippedId(ui.item.type) === ui.item.id;
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
            <Text className="text-3xl">{TYPE_ICONS[ui.item.type]}</Text>
          )}
        </View>
        <Text className="text-foreground text-sm font-bold mb-1">
          {ui.item.name}
        </Text>
        <Text className="text-muted text-xs mb-3">
          {TYPE_LABELS[ui.item.type]}
        </Text>
        {equipped ? (
          <TouchableOpacity
            className="bg-secondary/20 py-2 rounded-lg"
            onPress={() => handleUnequipItem(ui.item.type, ui.item.name)}
            disabled={
              equipItemMutation.isPending || unequipItemMutation.isPending
            }
          >
            <Text className="text-primary text-center text-xs font-bold">
              Remover
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-primary py-2 rounded-lg"
            onPress={() => handleEquipItem(ui.item.id, ui.item.name)}
            disabled={
              equipItemMutation.isPending || unequipItemMutation.isPending
            }
          >
            <Text className="text-white text-center text-xs font-bold">
              Equipar
            </Text>
          </TouchableOpacity>
        )}
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
        <Text className="text-muted text-center">
          Faca login para acessar seu perfil
        </Text>
      </ScreenContainer>
    );
  }

  if (userLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando perfil...</Text>
      </ScreenContainer>
    );
  }

  const fallbackInitial =
    userData?.nickname?.trim()?.slice(0, 1)?.toUpperCase() || "?";
  const hasItems = (userItems?.length ?? 0) > 0;

  return (
    <ScreenContainer background={KINGDOM_BG.clean}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-primary p-6 items-center rounded-b-3xl">
          {userData?.figurine ? (
            <Figurine figurine={userData.figurine} height={240} />
          ) : (
            <View className="bg-white rounded-full w-24 h-24 items-center justify-center mb-4">
              <Text className="text-3xl">{fallbackInitial}</Text>
            </View>
          )}

          <Text className="text-white text-2xl font-bold">
            {userData?.nickname || "Usuario"}
          </Text>
          {userData?.name && (
            <Text className="text-white/80 text-sm mt-1">{userData.name}</Text>
          )}
          {userData?.email && (
            <Text className="text-white/60 text-xs mt-1">{userData.email}</Text>
          )}

          <PressableScale
            className="bg-warning mt-4 px-6 py-3 rounded-full flex-row items-center border-2 border-white"
            onPress={() => router.push("/shop" as any)}
          >
            <GameIcon name="tab-shop" size="md" style={{ marginRight: 8 }} />
            <Text className="text-foreground font-extrabold">
              {userData?.figurine?.chosen ? "Abrir guarda-roupa" : "Escolher meu personagem"}
            </Text>
          </PressableScale>
        </View>

        {/* Stats */}
        <View className="p-6">
          <View className="bg-surface rounded-2xl p-5 border border-border">
            <Text className="text-foreground text-lg font-bold mb-4">
              Estatísticas
            </Text>
            <View className="gap-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <GameIcon name="level-shield" size="sm" style={{ marginRight: 8 }} />
                  <Text className="text-muted">Nível</Text>
                </View>
                <Text className="text-foreground text-lg font-bold">
                  {userData?.level || 1}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <GameIcon name="xp" size="sm" style={{ marginRight: 8 }} />
                  <Text className="text-muted">XP Total</Text>
                </View>
                <Text className="text-accent text-lg font-bold">
                  {userData?.xpTotal || 0}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <GameIcon name="coin" size="sm" style={{ marginRight: 8 }} />
                  <Text className="text-muted">Denários</Text>
                </View>
                <Text className="text-warning text-lg font-bold">
                  {userData?.denarioBalance || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Medals Button */}
          <TouchableOpacity
            className="bg-primary mt-6 py-3 rounded-full active:opacity-70 flex-row items-center justify-center"
            onPress={() => router.push("/medals" as any)}
          >
            <GameIcon name="medal-gold" size="sm" style={{ marginRight: 8 }} />
            <Text className="text-white text-center font-bold">
              Minhas Medalhas
            </Text>
          </TouchableOpacity>

          {/* Reflections Button */}
          <TouchableOpacity
            className="bg-accent mt-4 py-3 rounded-full active:opacity-70 flex-row items-center justify-center"
            onPress={() => router.push("/reflections" as any)}
          >
            <GameIcon name="reflection" size="sm" style={{ marginRight: 8 }} />
            <Text className="text-white text-center font-bold">
              Minhas Reflexões
            </Text>
          </TouchableOpacity>

          {/* Settings Button */}
          <TouchableOpacity
            className="bg-primary mt-4 py-3 rounded-full active:opacity-70 flex-row items-center justify-center"
            onPress={() => router.push("/settings" as any)}
          >
            <GameIcon name="settings" size="sm" style={{ marginRight: 8 }} />
            <Text className="text-white text-center font-bold">
              Configurações
            </Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            className="bg-error mt-4 py-3 rounded-full active:opacity-70"
            onPress={handleLogout}
          >
            <Text className="text-white text-center font-bold">Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

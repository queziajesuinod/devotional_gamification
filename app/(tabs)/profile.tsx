import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { GameButton } from "@/components/game-button";
import { KINGDOM_BG } from "@/lib/kingdom-bg";
import { SOFT_SHADOW } from "@/lib/ui";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Figurine } from "@/components/figurine";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { AnimatedBar, PressableScale } from "@/components/juice";
import { getLevelProgress } from "@shared/progression";
import { HeroTexture } from "@/components/hero-texture";

/** Small stat tile: big number + label with an icon. */
function StatTile({
  icon,
  label,
  value,
  valueClassName = "text-foreground",
}: {
  icon: GameIconName;
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <View
      className="flex-1 bg-surface rounded-2xl p-3 items-center"
      style={SOFT_SHADOW}
    >
      <GameIcon name={icon} size="md" />
      <Text className={`text-xl font-extrabold mt-1 ${valueClassName}`}>
        {value}
      </Text>
      <Text className="text-muted text-[11px] font-semibold">{label}</Text>
    </View>
  );
}

/** A tappable menu row with an icon, label and chevron. */
function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: GameIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl p-4 flex-row items-center active:opacity-80"
      style={SOFT_SHADOW}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <GameIcon name={icon} size="md" style={{ marginRight: 12 }} />
      <Text className="flex-1 text-foreground font-bold">{label}</Text>
      <Text className="text-muted text-xl font-bold">›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: userData,
    isLoading: userLoading,
    refetch: refetchUser,
  } = trpc.user.me.useQuery(undefined, { enabled: isAuthenticated });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchUser();
    setRefreshing(false);
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    logout();
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
          Faça login para acessar seu perfil
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
  const hasChosen = !!userData?.figurine?.chosen;
  const levelProgress = getLevelProgress(userData?.xpTotal || 0);

  return (
    <ScreenContainer background={KINGDOM_BG.clean}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cartão de jogador */}
        <View
          className="bg-primary items-center px-6 pt-5 pb-6 rounded-b-3xl"
          style={SOFT_SHADOW}
        >
          <HeroTexture
            style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
          />
          {/* Badge de nível */}
          <View className="flex-row items-center bg-white/15 rounded-full px-3 py-1">
            <GameIcon name="level-shield" size="sm" style={{ marginRight: 6 }} />
            <Text style={{ color: "#FFFFFF" }} className="font-extrabold">
              Nível {userData?.level || 1}
            </Text>
          </View>

          {/* Avatar */}
          <View className="my-1">
            {userData?.figurine ? (
              <Figurine figurine={userData.figurine} height={180} />
            ) : (
              <View className="bg-white/90 rounded-full w-28 h-28 items-center justify-center my-2">
                <Text className="text-4xl font-extrabold text-primary">
                  {fallbackInitial}
                </Text>
              </View>
            )}
          </View>

          {/* Nome */}
          <Text
            style={{ color: "#FFFFFF" }}
            className="font-display text-2xl font-extrabold text-center"
          >
            {userData?.nickname || "Usuário"}
          </Text>
          {userData?.name ? (
            <Text
              style={{ color: "#FFFFFF" }}
              className="text-sm opacity-90 text-center"
            >
              {userData.name}
            </Text>
          ) : null}

          {/* Barra de XP */}
          <View className="w-full mt-3">
            <View className="flex-row justify-between mb-1">
              <Text
                style={{ color: "#FFFFFF" }}
                className="text-xs opacity-90 font-semibold"
              >
                {levelProgress.title.title}
              </Text>
              <Text
                style={{ color: "#FFFFFF" }}
                className="text-xs opacity-90 font-semibold"
              >
                {levelProgress.xpIntoLevel}/{levelProgress.xpForNextLevel} XP
              </Text>
            </View>
            <AnimatedBar
              percent={levelProgress.percent}
              height={10}
              fillClassName="bg-warning"
              trackClassName="bg-white/20"
            />
          </View>

          {/* Guarda-roupa */}
          <GameButton
            style={{ marginTop: 16, alignSelf: "center" }}
            variant="gold"
            icon="tab-shop"
            title={hasChosen ? "Abrir guarda-roupa" : "Escolher meu personagem"}
            onPress={() => router.push("/shop" as any)}
          />
        </View>

        {/* Stat tiles */}
        <View className="flex-row gap-3 px-5 mt-5">
          <StatTile
            icon="level-shield"
            label="Nível"
            value={userData?.level || 1}
          />
          <StatTile
            icon="xp"
            label="XP Total"
            value={userData?.xpTotal || 0}
            valueClassName="text-accent"
          />
          <StatTile
            icon="coin"
            label="Denários"
            value={userData?.denarioBalance || 0}
            valueClassName="text-warning"
          />
        </View>

        {/* Menu */}
        <View className="px-5 mt-5 gap-4">
          <MenuRow
            icon="medal-gold"
            label="Minhas Medalhas"
            onPress={() => router.push("/medals" as any)}
          />
          <MenuRow
            icon="reflection"
            label="Minhas Reflexões"
            onPress={() => router.push("/reflections" as any)}
          />
          <MenuRow
            icon="settings"
            label="Configurações"
            onPress={() => router.push("/settings" as any)}
          />
        </View>

        {/* Sair (perigo, separado) */}
        <View className="px-5 mt-5">
          <GameButton fullWidth variant="wood" title="Sair" onPress={handleLogout} accessibilityLabel="Sair da conta" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

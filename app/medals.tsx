import { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

type TabType = "all" | "earned" | "available";

export default function MedalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  
  const { data: medals, isLoading } = trpc.medals.list.useQuery();

  const earnedMedals = medals?.filter((m) => m.isEarned) || [];
  const availableMedals = medals?.filter((m) => !m.isEarned) || [];

  const displayedMedals =
    activeTab === "all"
      ? medals || []
      : activeTab === "earned"
      ? earnedMedals
      : availableMedals;

  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      BIBLE_BOOK: "📖 Livros Bíblicos",
      STREAK: "🔥 Sequências",
      MILESTONE: "🏆 Marcos",
      SPECIAL: "⭐ Especiais",
    };
    return names[category] || category;
  };

  const groupedMedals = displayedMedals.reduce((acc, medal) => {
    const category = medal.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(medal);
    return acc;
  }, {} as Record<string, typeof displayedMedals>);

  return (
    <ScreenContainer>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="p-6 pb-4">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3"
            >
              <Text className="text-primary text-2xl">←</Text>
            </TouchableOpacity>
            <Text className="text-foreground text-2xl font-bold flex-1">
              Medalhas
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-4 mb-4">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-muted text-xs mb-1">Conquistadas</Text>
              <Text className="text-foreground text-2xl font-bold">
                {earnedMedals.length}
              </Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-muted text-xs mb-1">Disponíveis</Text>
              <Text className="text-foreground text-2xl font-bold">
                {availableMedals.length}
              </Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-muted text-xs mb-1">Total</Text>
              <Text className="text-foreground text-2xl font-bold">
                {medals?.length || 0}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-surface rounded-xl p-1 border border-border">
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg ${
                activeTab === "all" ? "bg-primary" : ""
              }`}
              onPress={() => setActiveTab("all")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "all" ? "text-white" : "text-muted"
                }`}
              >
                Todas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg ${
                activeTab === "earned" ? "bg-primary" : ""
              }`}
              onPress={() => setActiveTab("earned")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "earned" ? "text-white" : "text-muted"
                }`}
              >
                Conquistadas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg ${
                activeTab === "available" ? "bg-primary" : ""
              }`}
              onPress={() => setActiveTab("available")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "available" ? "text-white" : "text-muted"
                }`}
              >
                Disponíveis
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#8B4513" />
          </View>
        ) : displayedMedals.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-6">
            <Text className="text-6xl mb-4">
              {activeTab === "earned" ? "🏅" : "🎯"}
            </Text>
            <Text className="text-foreground text-lg font-bold text-center mb-2">
              {activeTab === "earned"
                ? "Nenhuma medalha conquistada ainda"
                : "Nenhuma medalha disponível"}
            </Text>
            <Text className="text-muted text-center">
              {activeTab === "earned"
                ? "Complete desafios para conquistar suas primeiras medalhas!"
                : "Todas as medalhas foram conquistadas! 🎉"}
            </Text>
          </View>
        ) : (
          <View className="px-6">
            {Object.entries(groupedMedals).map(([category, categoryMedals]) => (
              <View key={category} className="mb-6">
                {/* Category Header */}
                <Text className="text-foreground text-lg font-bold mb-3">
                  {getCategoryName(category)}
                </Text>

                {/* Medal Cards */}
                {categoryMedals.map((medal) => {
                  const iconUrl = medal.isEarned
                    ? medal.iconUrl
                    : medal.iconUrlGray || medal.iconUrl;
                  return (
                    <View
                      key={medal.id}
                      className={`mb-3 rounded-xl p-4 border ${
                        medal.isEarned
                          ? "bg-surface border-primary"
                          : "bg-surface border-border opacity-60"
                      }`}
                    >
                      <View className="flex-row items-start">
                        {/* Icon */}
                        <View
                          className={`w-16 h-16 rounded-full items-center justify-center mr-4 ${
                            medal.isEarned ? "bg-primary" : "bg-muted/20"
                          }`}
                        >
                          {iconUrl ? (
                            <Image
                              source={{ uri: iconUrl }}
                              className="w-10 h-10"
                              resizeMode="contain"
                            />
                          ) : (
                            <Text className="text-4xl">{medal.iconEmoji || "🏅"}</Text>
                          )}
                        </View>

                        {/* Info */}
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <Text
                              className={`text-lg font-bold flex-1 ${
                                medal.isEarned ? "text-foreground" : "text-muted"
                              }`}
                            >
                              {medal.name}
                            </Text>
                            {medal.isEarned && (
                              <View className="bg-primary rounded-full px-3 py-1">
                                  <Text className="text-white text-xs font-bold">
                                    ?o&rdquo; Conquistada
                                  </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            className={`text-sm ${
                              medal.isEarned ? "text-muted" : "text-muted/60"
                            }`}
                          >
                            {medal.description}
                          </Text>
                          {medal.isEarned && medal.earnedAt && (
                            <Text className="text-xs text-primary mt-2">
                              Conquistada em{" "}
                              {new Date(medal.earnedAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

import { ScrollView, Text, View, ActivityIndicator, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";

export default function ReflectionsScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login" as any);
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: reflections, isLoading } = trpc.devotional.getReflectionHistory.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading || isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#8B4513" />
        <Text className="text-muted mt-4">Carregando reflexões...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="bg-primary p-6">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <Text className="text-white text-2xl">←</Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Minhas Reflexões</Text>
          <Text className="text-white/80 text-sm mt-1">
            Acompanhe seu crescimento espiritual
          </Text>
        </View>

        {/* Reflections List */}
        <View className="p-6">
          {reflections && reflections.length > 0 ? (
            reflections.map((reflection) => (
              <View
                key={reflection.id}
                className="bg-surface rounded-2xl p-5 mb-4 border border-border"
              >
                {/* Date and Bible Reference */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-muted text-xs">
                    {new Date(reflection.devotionalDate).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text className="text-primary text-xs font-semibold">
                      {reflection.bibleReference}
                    </Text>
                  </View>
                </View>

                {/* Challenge Question */}
                <Text className="text-foreground font-semibold mb-2">
                  {reflection.challengeDescription || reflection.challengeTitle}
                </Text>

                {/* User's Response */}
                <View className="bg-background rounded-xl p-4 mt-2">
                  <Text className="text-muted text-xs mb-2">Sua reflexão:</Text>
                  <Text className="text-foreground leading-relaxed">
                    {reflection.responseText}
                  </Text>
                </View>

                {/* Completed Date */}
                <Text className="text-muted text-xs mt-3 text-right">
                  Respondido em{" "}
                  {reflection.completedAt
                    ? new Date(reflection.completedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "N/A"}
                </Text>
              </View>
            ))
          ) : (
            <View className="bg-surface rounded-2xl p-8 items-center">
              <Text className="text-6xl mb-4">📖</Text>
              <Text className="text-foreground font-semibold text-lg mb-2">
                Nenhuma reflexão ainda
              </Text>
              <Text className="text-muted text-center">
                Complete desafios de reflexão no devocional diário para ver suas respostas aqui.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

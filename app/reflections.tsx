/**
 * Mural das Reflexões: each reflection is a parchment scroll pinned with a wax seal on a
 * cork board with a wooden frame. 1 column on phones, 2 on wider screens.
 */
import { ActivityIndicator, ImageBackground, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { GameIcon } from "@/components/game-icon";
import { GameButton } from "@/components/game-button";
import { HeroTexture } from "@/components/hero-texture";
import { ParchmentNote, INK } from "@/components/parchment-note";
import { PopIn } from "@/components/juice";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

const CORK = require("@/assets/ui/cork.webp");
const FRAME = 10; // wooden frame thickness
const GAP = 14;

/** "2026-11-18" (or a Date) -> "18 de novembro de 2026", without timezone shifts. */
const formatDay = (value: string | Date | null | undefined, month: "long" | "short" = "long") => {
  if (!value) return "";
  const date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00Z`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month,
    ...(month === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
};

/** Small, stable tilt per note so the board looks hand-pinned. */
const tiltFor = (id: number) => (((id * 37) % 7) - 3) * 0.7;

type Reflection = {
  id: number;
  responseText: string | null;
  completedAt: string | Date | null;
  challengeTitle: string | null;
  challengeDescription?: string | null;
  devotionalDate: string | Date | null;
  bibleReference: string | null;
};

function ReflectionScroll({ reflection, width, index }: { reflection: Reflection; width: number; index: number }) {
  return (
    <PopIn delay={Math.min(index, 8) * 70}>
      <ParchmentNote width={width} tilt={tiltFor(reflection.id)} style={{ marginBottom: GAP }}>
        <View style={{ paddingTop: 6 }}>
          <Text style={{ color: INK.soft, fontSize: 12, textAlign: "center" }} className="font-body">
            {formatDay(reflection.devotionalDate)}
          </Text>
          {reflection.bibleReference ? (
            <Text
              className="font-display"
              style={{ color: INK.accent, fontSize: 18, textAlign: "center", marginTop: 4 }}
            >
              {reflection.bibleReference}
            </Text>
          ) : null}
          <View style={{ height: 1, backgroundColor: "rgba(120,80,40,0.25)", marginVertical: 10 }} />
          <Text style={{ color: INK.strong, fontSize: 14, fontWeight: "800" }}>
            {reflection.challengeDescription || reflection.challengeTitle}
          </Text>
          <Text className="font-body" style={{ color: INK.body, fontSize: 17, lineHeight: 26, marginTop: 8 }}>
            “{reflection.responseText}”
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 10 }}>
            <GameIcon name="reflection" size={18} style={{ marginRight: 4 }} />
            <Text className="font-body" style={{ color: INK.soft, fontSize: 12 }}>
              escrito em {formatDay(reflection.completedAt, "short")}
            </Text>
          </View>
        </View>
      </ParchmentNote>
    </PopIn>
  );
}

export default function ReflectionsScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/login" as any);
  }, [authLoading, isAuthenticated, router]);

  const { data, isLoading } = trpc.devotional.getReflectionHistory.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const reflections = (data ?? []) as Reflection[];

  // Board geometry: screen gutter 16, frame, inner padding
  const boardWidth = Math.min(screenWidth, 960) - 32;
  const inner = boardWidth - FRAME * 2 - 24;
  const columns = inner >= 640 && reflections.length > 1 ? 2 : 1;
  // A single column stays a comfortable reading width instead of spanning a wide board
  const noteWidth = Math.min((inner - GAP * (columns - 1)) / columns, columns === 1 ? 460 : 9999);
  const cols: Reflection[][] = Array.from({ length: columns }, () => []);
  reflections.forEach((r, i) => cols[i % columns].push(r));

  if (authLoading || isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color="#8B4513" />
        <Text className="text-muted mt-4">Desenrolando seus pergaminhos...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, alignItems: "center" }}>
        {/* Hero */}
        <View className="bg-primary rounded-b-3xl overflow-hidden w-full px-6 pt-5 pb-6">
          <HeroTexture />
          <GameButton variant="wood" size="sm" title="Voltar" onPress={() => router.back()} />
          <View className="flex-row items-center mt-4">
            <GameIcon name="reflection" size={52} style={{ marginRight: 10 }} />
            <View className="flex-1">
              <Text className="font-display" style={{ color: "#FFFFFF", fontSize: 24 }}>
                Mural das Reflexões
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 }}>
                Cada pergaminho é um passo da sua jornada com Deus
              </Text>
            </View>
          </View>
          {reflections.length > 0 ? (
            <View className="self-start bg-warning px-3 py-1 rounded-full flex-row items-center mt-4">
              <GameIcon name="reading" size={18} style={{ marginRight: 4 }} />
              <Text className="text-foreground font-extrabold text-xs">
                {reflections.length} {reflections.length === 1 ? "pergaminho" : "pergaminhos"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Cork board with wooden frame */}
        <View
          style={{
            width: boardWidth,
            marginTop: 18,
            borderWidth: FRAME,
            borderColor: "#8B5A2B",
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: "#C8894E",
            shadowColor: "#3C1E05",
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <ImageBackground
            source={CORK}
            resizeMode="cover"
            style={{ padding: 12, paddingTop: 18, width: "100%" }}
            imageStyle={{ width: "100%", height: "100%" }}
          >
            {reflections.length > 0 ? (
              <View style={{ flexDirection: "row", gap: GAP, alignItems: "flex-start", justifyContent: "center" }}>
                {cols.map((column, c) => (
                  <View key={c} style={{ width: noteWidth, marginTop: c === 1 ? 28 : 0 }}>
                    {column.map((r, i) => (
                      <ReflectionScroll key={r.id} reflection={r} width={noteWidth} index={i * columns + c} />
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <ParchmentNote width={Math.min(noteWidth, 360)} tilt={-1.5}>
                  <View style={{ alignItems: "center", paddingVertical: 8 }}>
                    <GameIcon name="reflection" size={64} />
                    <Text className="font-display" style={{ color: INK.accent, fontSize: 18, textAlign: "center", marginTop: 8 }}>
                      Seu mural está esperando
                    </Text>
                    <Text className="font-body" style={{ color: INK.body, fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 22 }}>
                      Escreva a reflexão do devocional de hoje e o seu primeiro pergaminho aparece aqui!
                    </Text>
                    <GameButton style={{ marginTop: 14, alignSelf: "center" }} variant="royal" icon="reading" title="Ir para o devocional" onPress={() => router.push("/" as any)} />
                  </View>
                </ParchmentNote>
              </View>
            )}
          </ImageBackground>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import type { MascotMood } from "@/components/mascot-3d";
import { Figurine } from "@/components/figurine";
import { GameIcon } from "@/components/game-icon";
import { PopIn, PressableScale } from "@/components/juice";
import type { Figurine as FigurineData } from "@shared/character-catalog";

export type MascotEvent = { mood: MascotMood; line: string; key: number };

type StreakStatus = "none" | "done_today" | "at_risk" | "protected" | "broken";

/** Encouragement shown when the dashboard opens, based on the streak. */
const greetingFor = (name: string, status: StreakStatus, streak: number): MascotEvent => {
  switch (status) {
    case "done_today":
      return { mood: "sway", line: `Você já brilhou hoje, ${name}! Volta amanhã?`, key: 0 };
    case "at_risk":
      return { mood: "wave", line: `${name}, sua chama de ${streak} dias tá esperando!`, key: 0 };
    case "broken":
      return { mood: "wave", line: `Que bom te ver, ${name}! Hoje é dia de recomeçar`, key: 0 };
    default:
      return { mood: "wave", line: `Oi, ${name}! Bora conquistar o dia?`, key: 0 };
  }
};

/**
 * Dashboard hero: the player's **avatar** (built in the shop; 3D in the future) with an
 * encouragement bubble. Tapping the avatar opens the wardrobe. The lamb Lã-Lã now lives in
 * the celebration modal (she shows up to cheer when rewards are earned).
 */
export function MascotCard({
  name,
  streakStatus,
  streak,
  event,
  figurine,
}: {
  name: string;
  streakStatus: StreakStatus;
  streak: number;
  event: MascotEvent | null;
  figurine?: FigurineData | null;
}) {
  const [state, setState] = useState<MascotEvent>(() => greetingFor(name, streakStatus, streak));

  useEffect(() => {
    setState((prev) => ({ ...greetingFor(name, streakStatus, streak), key: prev.key + 1 }));
  }, [name, streakStatus, streak]);

  useEffect(() => {
    if (event) setState(event);
  }, [event]);

  const hasAvatar = !!figurine?.chosen;

  return (
    <View className="flex-row items-center">
      {/* Avatar do jogador — construído na loja (futuramente 3D). Toque abre o guarda-roupa. */}
      <PressableScale
        onPress={() => router.push("/shop" as any)}
        accessibilityLabel={hasAvatar ? "Abrir guarda-roupa" : "Montar meu avatar"}
      >
        {hasAvatar ? (
          <Figurine figurine={figurine!} height={150} />
        ) : (
          <View className="w-[112px] h-[150px] items-center justify-center rounded-2xl bg-white/15 border-2 border-white/40">
            <GameIcon name="tab-shop" size="xl" />
            <Text style={{ color: "#FFFFFF" }} className="text-[11px] font-extrabold mt-1 text-center px-2">
              Monte seu avatar
            </Text>
          </View>
        )}
      </PressableScale>

      <View className="flex-1 ml-2">
        <PopIn trigger={state.key} gentle>
          <View className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
            <Text className="text-gray-800 text-sm font-bold">{state.line}</Text>
          </View>
        </PopIn>
        <Text style={{ color: "#FFFFFF" }} className="text-[11px] mt-1 ml-1 font-semibold opacity-90">
          Toque no seu personagem pra trocar o visual
        </Text>
      </View>
    </View>
  );
}

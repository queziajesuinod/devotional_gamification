import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Mascot3D, type MascotMood } from "@/components/mascot-3d";
import { PopIn, haptic } from "@/components/juice";

export type MascotEvent = { mood: MascotMood; line: string; key: number };

type StreakStatus = "none" | "done_today" | "at_risk" | "protected" | "broken";

const TAP_REACTIONS: { mood: MascotMood; line: string }[] = [
  { mood: "jump", line: "Béééé! Que alegria te ver!" },
  { mood: "cheer", line: "Bora juntos hoje?" },
  { mood: "sway", line: "Deus cuida de você, sabia?" },
  { mood: "wave", line: "Oi oi! Tô aqui torcendo por você!" },
  { mood: "cheer", line: "Cada dia com Deus conta!" },
];

/** What the lamb says when the dashboard opens, based on the streak. */
const greetingFor = (name: string, status: StreakStatus, streak: number): MascotEvent => {
  switch (status) {
    case "done_today":
      return { mood: "sway", line: `Você já brilhou hoje, ${name}! Volta amanhã?`, key: 0 };
    case "at_risk":
      return { mood: "wave", line: `${name}, sua chama de ${streak} dias tá esperando!`, key: 0 };
    case "protected":
      return { mood: "wave", line: `Uma Graça guardou sua sequência! Bora fazer um desafio?`, key: 0 };
    case "broken":
      return { mood: "wave", line: `Que bom te ver, ${name}! Hoje é dia de recomeçar`, key: 0 };
    default:
      return { mood: "wave", line: `Oi, ${name}! Eu sou a Lã-Lã! Vamos começar?`, key: 0 };
  }
};

/**
 * Dashboard mascot: 3D lamb + speech bubble. Greets on open, reacts to taps and to
 * `event` (challenge done, level up, …) sent by the screen.
 */
export function MascotCard({
  name,
  streakStatus,
  streak,
  event,
}: {
  name: string;
  streakStatus: StreakStatus;
  streak: number;
  event: MascotEvent | null;
}) {
  const [state, setState] = useState<MascotEvent>(() => greetingFor(name, streakStatus, streak));

  // Greeting follows the streak state (e.g. after the first challenge of the day)
  useEffect(() => {
    setState((prev) => ({ ...greetingFor(name, streakStatus, streak), key: prev.key + 1 }));
  }, [name, streakStatus, streak]);

  // Reactions pushed by the screen win over the greeting
  useEffect(() => {
    if (event) setState(event);
  }, [event]);

  const onTap = () => {
    haptic.pop();
    const reaction = TAP_REACTIONS[Math.floor(Math.random() * TAP_REACTIONS.length)];
    setState((prev) => ({ ...reaction, key: prev.key + 1 }));
  };

  return (
    <View className="flex-row items-center">
      <Mascot3D mood={state.mood} moodKey={state.key} size={150} onTap={onTap} />
      <View className="flex-1 ml-1">
        <PopIn trigger={state.key}>
          <View className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
            <Text className="text-gray-800 text-sm font-bold">{state.line}</Text>
          </View>
        </PopIn>
        <Text className="text-white/70 text-[10px] mt-1 ml-1">Toque na Lã-Lã</Text>
      </View>
    </View>
  );
}

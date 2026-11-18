import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { MascotCard, type MascotEvent } from "@/components/mascot-card";
import { Mascot3D, type MascotMood, MASCOT_MODEL_URL } from "@/components/mascot-3d";

const MOODS: MascotMood[] = ["idle", "wave", "cheer", "jump", "sway"];

/** Dev-only playground to check the 3D mascot and its animations (public route). */
export default function MascotLab() {
  const [mood, setMood] = useState<MascotMood>("idle");
  const [key, setKey] = useState(0);
  const [event, setEvent] = useState<MascotEvent | null>(null);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text className="text-foreground text-2xl font-extrabold">Mascote 3D · laboratório</Text>
        <Text className="text-muted text-xs">{MASCOT_MODEL_URL}</Text>

        <View className="items-center bg-surface rounded-2xl border border-border">
          <Mascot3D mood={mood} moodKey={key} size={300} />
        </View>

        <View className="flex-row flex-wrap gap-2">
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m}
              className={`px-4 py-2 rounded-full ${m === mood ? "bg-primary" : "bg-surface border border-border"}`}
              onPress={() => {
                setMood(m);
                setKey((k) => k + 1);
              }}
            >
              <Text className={m === mood ? "text-white font-bold" : "text-foreground"}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="bg-primary rounded-2xl p-4">
          <MascotCard name="Ana" streakStatus="at_risk" streak={12} event={event} />
        </View>
        <TouchableOpacity
          className="bg-surface border border-border px-4 py-2 rounded-full self-start"
          onPress={() =>
            setEvent((prev) => ({ mood: "jump", line: "NÍVEL 10! Eu sabia! 🚀", key: (prev?.key ?? 0) + 1 }))
          }
        >
          <Text className="text-foreground">Simular level-up no card</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

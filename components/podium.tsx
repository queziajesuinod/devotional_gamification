/**
 * Top-3 podium: 2nd · 1st · 3rd on stone/wood steps, with a medal on each step and a
 * crown over the winner. Entries come in rank order; any of them may be missing.
 * One-shot entrances only (PopIn), no looping motion.
 */
import type React from "react";
import { Text, View } from "react-native";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { PopIn } from "@/components/juice";
import { PLACE_RING } from "@/components/face-badge";

export type PodiumEntry = {
  key: string | number;
  name: string;
  score: string;
  /** Face, banner, crest… drawn above the step. */
  avatar: (ring: string, size: number) => React.ReactNode;
  isMe?: boolean;
};

const STEP = [
  { height: 92, color: "#F2B50C", dark: "#C98F00", medal: "medal-gold" as GameIconName, size: 76 },
  { height: 68, color: "#C7CFD8", dark: "#97A1AD", medal: "medal-silver" as GameIconName, size: 62 },
  { height: 52, color: "#D9935A", dark: "#A86532", medal: "medal-bronze" as GameIconName, size: 62 },
];

function Spot({ entry, place }: { entry?: PodiumEntry; place: 0 | 1 | 2 }) {
  const step = STEP[place];
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
      {entry ? (
        <PopIn delay={place === 0 ? 260 : place === 1 ? 120 : 0} gentle>
          <View style={{ alignItems: "center", marginBottom: 6 }}>
            {place === 0 ? <GameIcon name="crown" size={34} style={{ marginBottom: -6, zIndex: 1 }} /> : null}
            {entry.avatar(PLACE_RING[place], step.size)}
            <Text
              numberOfLines={2}
              className="text-foreground font-extrabold mt-1 text-center"
              style={{ fontSize: 13, lineHeight: 16, maxWidth: 120 }}
            >
              {entry.isMe ? "Você" : entry.name}
            </Text>
            <Text className="text-accent font-extrabold text-center" style={{ fontSize: 12 }}>
              {entry.score}
            </Text>
          </View>
        </PopIn>
      ) : null}
      <View
        style={{
          width: "100%",
          height: step.height,
          backgroundColor: step.color,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          borderBottomWidth: 6,
          borderBottomColor: step.dark,
          alignItems: "center",
          paddingTop: 6,
          opacity: entry ? 1 : 0.35,
        }}
      >
        <GameIcon name={step.medal} size={place === 0 ? 40 : 32} label={`${place + 1}º lugar`} />
      </View>
    </View>
  );
}

export function Podium({ entries }: { entries: PodiumEntry[] }) {
  const [first, second, third] = entries;
  return (
    <View
      className="flex-row items-end w-full self-center"
      style={{ maxWidth: 420, gap: 6, paddingHorizontal: 4 }}
    >
      <Spot entry={second} place={1} />
      <Spot entry={first} place={0} />
      <Spot entry={third} place={2} />
    </View>
  );
}

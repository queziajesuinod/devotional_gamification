/**
 * Reino → Guarda-roupa: a showcase of every look of the chosen character. Nothing is bought — each
 * look unlocks at a level (shared/character-catalog wardrobeFor) and is then equipped for
 * free. The same outfit with another hair color, or holding the harp/Bible, is its own look.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { GameButton } from "@/components/game-button";
import { SOFT_SHADOW } from "@/lib/ui";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/components/notification-provider";
import { useJuice } from "@/components/juice-provider";
import { PopIn, PressableScale } from "@/components/juice";
import { GameIcon } from "@/components/game-icon";
import { Figurine } from "@/components/figurine";
import {
  CHARACTERS,
  CHARACTER_KEYS,
  DEFAULT_CHARACTER,
  wardrobeFor,
  wardrobeLookOf,
  type CharacterKey,
  type Figurine as FigurineData,
  type WardrobeLook,
} from "@shared/character-catalog";
import { getLevelProgress } from "@shared/progression";
import { HeroTexture } from "@/components/hero-texture";

type Tab = "looks" | "personagem";

const TABS: { key: Tab; label: string }[] = [
  { key: "looks", label: "Looks" },
  { key: "personagem", label: "Personagem" },
];

const RARITY = {
  COMMON: { label: "Comum", color: "#9CA3AF" },
  RARE: { label: "Raro", color: "#3D6FD6" }, // Azul real
  EPIC: { label: "Épico", color: "#7B3FA0" }, // Roxo realeza
} as const;

const GOLD = "#F2B50C";

/** Força do look: 1–5 raios. */
function PowerMeter({ power, size = 12, dim = false }: { power: number; size?: number; dim?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 1 }} accessibilityLabel={`Força ${power} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, opacity: i <= power ? (dim ? 0.6 : 1) : 0.22 }}>
          ⚡
        </Text>
      ))}
    </View>
  );
}

const asFigurine = (character: CharacterKey, w: WardrobeLook): FigurineData => ({
  character,
  chosen: true,
  look: w.look,
  hair: w.hair,
  accessory: w.accessory,
});

export function WardrobeSection() {
  const { isAuthenticated } = useAuth();
  const notifications = useNotifications();
  const juice = useJuice();
  const utils = trpc.useUtils();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("looks");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: me } = trpc.user.me.useQuery(undefined, { enabled: isAuthenticated });

  const onError = (error: { message: string }) => notifications.error(error.message);
  const equip = trpc.wardrobe.equip.useMutation({ onError });
  const setCharacter = trpc.user.setCharacter.useMutation({ onError });

  const current: FigurineData = me?.figurine ?? {
    character: DEFAULT_CHARACTER,
    chosen: false,
    look: "original",
    hair: null,
    accessory: null,
  };
  const level = me?.level ?? 1;
  const progress = getLevelProgress(me?.xpTotal ?? 0);
  const looks = useMemo(() => wardrobeFor(current.character), [current.character]);
  const wearing = wardrobeLookOf(current);
  const unlockedCount = looks.filter((w) => w.minLevel <= level).length;
  const nextLook = looks.find((w) => w.minLevel > level) ?? null;
  const selected = looks.find((w) => w.id === selectedId) ?? null;
  const preview = selected ? asFigurine(current.character, selected) : current;

  const busy = equip.isPending || setCharacter.isPending;
  // Measured width of the content column (the screen frame can be narrower than the window)
  const [measuredW, setMeasuredW] = useState(0);
  const gridW = measuredW || Math.min(width, 760) - 32;
  // Each row is one look in its 4 hair colors
  const columns = gridW >= 340 ? 4 : 2;
  const cardWidth = (gridW - (columns - 1) * 8) / columns;
  const groups = useMemo(() => {
    const list: { key: string; name: string; minLevel: number; power: number; rarity: WardrobeLook["rarity"]; items: WardrobeLook[] }[] = [];
    for (const w of looks) {
      let g = list.find((x) => x.key === w.group);
      if (!g) {
        g = { key: w.group, name: w.groupName, minLevel: w.minLevel, power: w.power, rarity: w.rarity, items: [] };
        list.push(g);
      }
      g.items.push(w);
    }
    return list;
  }, [looks]);
  const hairLabel = (w: WardrobeLook) =>
    w.hair ? (CHARACTERS[current.character].hair.find((h) => h.key === w.hair)?.name.replace("Cabelo ", "") ?? w.hair).replace(/^./, (ch) => ch.toUpperCase()) : "Natural";

  const wear = async (w: WardrobeLook) => {
    await equip.mutateAsync({ lookId: w.id });
    juice.burst({ title: "Visual novo!", subtitle: w.name, confetti: w.rarity === "EPIC" });
    setSelectedId(null);
    await utils.user.me.invalidate();
  };

  const pickCharacter = async (key: CharacterKey) => {
    if (key === current.character && current.chosen) return;
    await setCharacter.mutateAsync({ characterKey: key });
    juice.burst({ title: `Oi, eu sou ${CHARACTERS[key].name}!`, subtitle: CHARACTERS[key].tagline });
    setTab("looks");
    setSelectedId(null);
    await utils.user.me.invalidate();
  };

  // ---------------- action under the preview ----------------
  let action: ReactNode = null;
  if (selected) {
    const isWearing = wearing?.id === selected.id;
    if (isWearing) {
      action = <Text className="text-white text-sm font-extrabold">✓ Você está usando</Text>;
    } else if (selected.minLevel <= level) {
      action = <GameButton variant="gold" title="Vestir" onPress={() => wear(selected)} loading={busy} />;
    } else {
      const missing = selected.minLevel - level;
      action = (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.16)",
            borderColor: "rgba(255,215,120,0.6)",
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <GameIcon name="lock" size="sm" style={{ marginRight: 6 }} />
          <Text className="text-white font-extrabold">
            Libera no nível {selected.minLevel} · falta{missing > 1 ? "m" : ""} {missing} nív{missing > 1 ? "eis" : "el"}
          </Text>
        </View>
      );
    }
  }

  const shown = selected ?? wearing;

  return (
    <>
    {/* Vitrine: o personagem com o look escolhido */}
    <View className="bg-primary items-center pb-5 rounded-b-3xl">
      <HeroTexture style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
      <View className="items-center justify-center" style={{ width: "100%" }}>
        <View
          pointerEvents="none"
          style={{ position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "#FFD64E", opacity: 0.18 }}
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: GOLD, opacity: 0.22 }}
        />
        <PopIn trigger={`${preview.character}-${preview.look}-${preview.hair}-${preview.accessory}`}>
          <View style={{ opacity: selected && selected.minLevel > level ? 0.55 : 1 }}>
            <Figurine figurine={preview} height={300} />
          </View>
        </PopIn>
      </View>
      <View className="items-center mt-1 min-h-[76px] justify-center px-4">
        {current.chosen && shown ? (
          <>
            {shown.rarity !== "COMMON" ? (
              <View
                style={{
                  backgroundColor: RARITY[shown.rarity].color,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 2,
                  marginBottom: 4,
                }}
              >
                <Text className="text-white text-[10px] font-extrabold">{RARITY[shown.rarity].label.toUpperCase()}</Text>
              </View>
            ) : null}
            <Text className="text-white text-2xl font-extrabold text-center">{shown.name}</Text>
            <Text className="text-white/80 text-xs font-semibold text-center">{shown.description}</Text>
            <View
              style={{
                marginTop: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(11,23,51,0.35)",
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 3,
              }}
            >
              <Text className="text-white text-[11px] font-extrabold tracking-widest">FORÇA</Text>
              <PowerMeter power={shown.power} size={13} />
            </View>
            <View className="mt-3">{action}</View>
          </>
        ) : (
          <Text className="text-white/90 text-sm font-semibold text-center">
            {current.chosen ? "Toque em um look para experimentar" : "Escolha seu personagem para começar!"}
          </Text>
        )}
      </View>
    </View>

    {/* Abas */}
    <View className="mx-4 mt-4 flex-row rounded-full bg-surface p-1" style={SOFT_SHADOW}>
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.8}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              paddingVertical: 8,
              backgroundColor: active ? GOLD : "transparent",
            }}
            onPress={() => {
              setTab(t.key);
              setSelectedId(null);
            }}
          >
            <Text numberOfLines={1} className={`text-xs font-extrabold ${active ? "text-foreground" : "text-muted"}`}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <View className="px-4 mt-4">
      <View onLayout={(e) => setMeasuredW(e.nativeEvent.layout.width)} style={{ width: "100%", height: 0 }} />
      {tab === "personagem" ? (
        <View className="gap-3">
          {CHARACTER_KEYS.map((key) => {
            const active = current.chosen && current.character === key;
            return (
              <PressableScale
                key={key}
                className={`flex-row items-center rounded-2xl p-3 bg-surface ${active ? "border border-primary" : ""}`}
                style={SOFT_SHADOW}
                onPress={() => pickCharacter(key)}
                disabled={busy}
              >
                <Figurine figurine={{ character: key, chosen: true, look: "original", hair: null, accessory: null }} height={72} mode="head" />
                <View className="flex-1 ml-3">
                  <Text className="text-foreground text-lg font-extrabold">{CHARACTERS[key].name}</Text>
                  <Text className="text-muted text-sm">{CHARACTERS[key].tagline}</Text>
                </View>
                {active ? (
                  <GameIcon name="level-shield" size="md" label="Seu personagem" />
                ) : (
                  <Text className="text-primary font-extrabold">Escolher</Text>
                )}
              </PressableScale>
            );
          })}
          <Text className="text-muted text-xs text-center mt-1">
            Trocar de personagem é grátis. Cada personagem tem os seus looks, liberados pelo seu nível.
          </Text>
        </View>
      ) : (
        <>
          {/* Progresso: quantos looks liberados e o próximo */}
          <View className="bg-surface rounded-2xl p-3 mb-4" style={SOFT_SHADOW}>
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground font-extrabold">
                Nível {level} · {unlockedCount} de {looks.length} looks
              </Text>
              <Text className="text-muted text-xs font-bold">
                {progress.xpIntoLevel}/{progress.xpForNextLevel} XP
              </Text>
            </View>
            <View className="h-2.5 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: "rgba(39,80,156,0.14)" }}>
              <View style={{ width: `${progress.percent}%`, height: "100%", backgroundColor: GOLD, borderRadius: 999 }} />
            </View>
            {nextLook ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedId(nextLook.id)}
                style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
              >
                <Figurine figurine={asFigurine(current.character, nextLook)} height={34} mode="head" />
                <Text className="text-muted text-xs ml-2 flex-1">
                  Próximo look: <Text className="text-foreground font-extrabold">{nextLook.name}</Text> no nível {nextLook.minLevel}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-success text-xs font-extrabold mt-2">Você liberou todos os looks! 👑</Text>
            )}
          </View>

          {groups.map((g) => {
            const unlocked = g.minLevel <= level;
            const rarity = RARITY[g.rarity];
            return (
              <View key={g.key} className="mb-4">
                {/* Cabeçalho do look: nível, nome, força */}
                <View className="flex-row items-center mb-2">
                  <View
                    style={{
                      backgroundColor: unlocked ? rarity.color : "#6B7280",
                      borderRadius: 8,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      marginRight: 8,
                    }}
                  >
                    <Text className="text-white text-[11px] font-extrabold">Nv {g.minLevel}</Text>
                  </View>
                  <Text className="text-foreground font-extrabold flex-1" numberOfLines={1}>
                    {g.name}
                  </Text>
                  {unlocked ? (
                    <PowerMeter power={g.power} size={11} />
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <GameIcon name="lock" size="sm" style={{ marginRight: 4 }} />
                      <Text className="text-muted text-xs font-bold">Nível {g.minLevel}</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {g.items.map((w) => {
                    const isWearing = wearing?.id === w.id;
                    const isSelected = selectedId === w.id;
                    const frame = isSelected ? GOLD : isWearing ? "#27509C" : unlocked ? rarity.color : "#C7CDD9";
                    return (
                      <PressableScale
                        key={w.id}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          width: cardWidth,
                          borderWidth: isSelected || isWearing ? 3 : 2,
                          borderColor: frame,
                          backgroundColor: "#FFFFFF",
                          shadowColor: "#0B1733",
                          shadowOpacity: 0.14,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 3,
                        }}
                        onPress={() => setSelectedId(w.id)}
                        accessibilityLabel={`${w.name}, ${unlocked ? "liberado" : `libera no nível ${w.minLevel}`}`}
                      >
                        <View
                          style={{
                            height: cardWidth * 1.2,
                            alignItems: "center",
                            justifyContent: "flex-end",
                            backgroundColor: unlocked ? "#F2F5FB" : "#E6E9F0",
                          }}
                        >
                          <View style={{ opacity: unlocked ? 1 : 0.45 }}>
                            <Figurine figurine={asFigurine(current.character, w)} height={cardWidth * 1.15} />
                          </View>
                          {!unlocked ? (
                            <View style={{ position: "absolute", top: 3, right: 3 }}>
                              <GameIcon name="lock" size="sm" label={`Libera no nível ${w.minLevel}`} />
                            </View>
                          ) : null}
                          {isWearing ? (
                            <View
                              style={{
                                position: "absolute",
                                top: 4,
                                left: 4,
                                backgroundColor: "#27509C",
                                borderRadius: 8,
                                paddingHorizontal: 5,
                                paddingVertical: 1,
                              }}
                            >
                              <Text className="text-white text-[9px] font-extrabold">Usando</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={{ backgroundColor: frame, paddingVertical: 4, paddingHorizontal: 4, alignItems: "center" }}>
                          <Text className="text-white text-[10px] font-extrabold text-center" numberOfLines={1}>
                            {hairLabel(w)}
                          </Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
    </>
  );
}

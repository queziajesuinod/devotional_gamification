/**
 * Reino → Meu Tesouro: everything the player owns. Phase 1: Baús (in progress, ready to
 * open, history). Album / frames / scenery come later.
 */
import { Text, TouchableOpacity, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { SOFT_SHADOW } from "@/lib/ui";
import { GameButton } from "@/components/game-button";
import { GameIcon } from "@/components/game-icon";
import { useJuice } from "@/components/juice-provider";
import { PopIn } from "@/components/juice";
import { useNotifications } from "@/components/notification-provider";
import { type ChestView } from "@shared/chests";
import { ChestArt } from "./chest-art";

const GOLD = "#F2B50C";

/** "faltam 2 dias", "termina hoje às 18h", "acabou" */
function deadlineText(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "o prazo acabou";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `faltam ${days} dias`;
  }
  if (hours >= 1) return `faltam ${hours}h`;
  return `faltam ${Math.max(1, Math.floor(ms / 60_000))} min`;
}

export function TreasureSection({ onGoToMarket }: { onGoToMarket: () => void }) {
  const { data: chests, isLoading } = trpc.chests.list.useQuery();

  const open = (chests ?? []).filter((c) => c.status === "READY" || c.status === "ACTIVE");
  const history = (chests ?? []).filter((c) => c.status === "CLAIMED" || c.status === "EXPIRED").slice(0, 8);

  return (
    <View className="px-4 mt-4" style={{ gap: 14 }}>
      {isLoading ? (
        <Text className="text-muted text-center mt-4">Abrindo o tesouro...</Text>
      ) : open.length === 0 && history.length === 0 ? (
        <View className="bg-surface rounded-3xl p-6 items-center" style={SOFT_SHADOW}>
          <GameIcon name="chest" size={72} />
          <Text className="text-foreground text-lg font-extrabold mt-2 text-center">Seu tesouro está vazio</Text>
          <Text className="text-muted text-sm text-center mt-1">
            Compre um Baú de Desafio no Mercado, cumpra as missões e ganhe mais do que gastou!
          </Text>
          <View style={{ marginTop: 14 }}>
            <GameButton variant="gold" icon="coin" title="Ir ao Mercado" onPress={onGoToMarket} />
          </View>
        </View>
      ) : (
        <>
          <Text className="text-foreground text-lg font-extrabold">Seus baús</Text>
          {open.map((c) => (
            <ChestCard key={c.id} chest={c} />
          ))}
          {open.length === 0 ? (
            <View className="bg-surface rounded-2xl p-4 flex-row items-center" style={SOFT_SHADOW}>
              <Text className="text-muted text-sm flex-1">Nenhum baú em andamento.</Text>
              <GameButton variant="gold" title="Mercado" onPress={onGoToMarket} />
            </View>
          ) : null}
          {history.length > 0 ? (
            <View>
              <Text className="text-foreground font-extrabold mb-2">Histórico</Text>
              <View className="bg-surface rounded-2xl" style={SOFT_SHADOW}>
                {history.map((c, i) => (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                      borderBottomWidth: i === history.length - 1 ? 0 : 1,
                      borderBottomColor: "rgba(139,90,43,0.14)",
                    }}
                  >
                    <View style={{ opacity: c.status === "EXPIRED" ? 0.45 : 1 }}>
                      <ChestArt color={c.color} size={36} open={c.status === "CLAIMED"} />
                    </View>
                    <Text className="text-foreground text-sm font-bold flex-1">{c.name}</Text>
                    <Text className={`text-xs font-extrabold ${c.status === "CLAIMED" ? "text-success" : "text-muted"}`}>
                      {c.status === "CLAIMED" ? `+${c.reward.denario} denários` : "Prazo acabou"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

export function ChestCard({ chest }: { chest: ChestView }) {
  const utils = trpc.useUtils();
  const juice = useJuice();
  const notifications = useNotifications();
  const color = chest.color;
  const ready = chest.status === "READY";

  const claim = trpc.chests.claim.useMutation({ onError: (e) => notifications.error(e.message) });
  const markHonor = trpc.chests.markHonor.useMutation({
    onSuccess: () => utils.chests.list.invalidate(),
    onError: (e) => notifications.error(e.message),
  });

  const doneCount = chest.challenges.filter((c) => c.complete).length;

  const openChest = async () => {
    const r = await claim.mutateAsync({ chestId: chest.id });
    juice.burst({
      title: "Baú aberto!",
      denario: r.denario,
      xp: r.xp,
      subtitle: r.levelUp ? `Você subiu para o nível ${r.levelUp.to}!` : chest.name,
    });
    juice.confetti(chest.reward.denario >= 300 ? 140 : 70);
    await Promise.all([utils.chests.list.invalidate(), utils.user.me.invalidate()]);
  };

  return (
    <PopIn trigger={`${chest.id}-${chest.status}`}>
      <View
        className="bg-surface rounded-3xl p-4"
        style={[SOFT_SHADOW, { borderWidth: ready ? 3 : 2, borderColor: ready ? GOLD : `${color}66` }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ChestArt color={color} size={60} open={ready} />
          <View style={{ flex: 1 }}>
            <Text className="text-foreground text-lg font-extrabold">{chest.name}</Text>
            <Text className="text-muted text-xs font-bold">
              {ready ? "Tudo pronto! Abra seu baú 🎉" : `${doneCount} de ${chest.challenges.length} desafios · ${deadlineText(chest.expiresAt)}`}
            </Text>
          </View>
        </View>

        <View style={{ gap: 10, marginTop: 12 }}>
          {chest.challenges.map((c) => {
            const pct = Math.min(1, c.progress / Math.max(1, c.target));
            return (
              <View key={c.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{c.complete ? "✅" : c.emoji}</Text>
                  <Text
                    className={`text-sm font-bold flex-1 ${c.complete ? "text-muted" : "text-foreground"}`}
                    style={c.complete ? { textDecorationLine: "line-through" } : undefined}
                  >
                    {c.text}
                  </Text>
                  {c.kind !== "HONOR" ? (
                    <Text className="text-muted text-xs font-extrabold">
                      {c.progress}/{c.target}
                    </Text>
                  ) : null}
                </View>
                {c.kind === "HONOR" ? (
                  !c.complete ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={markHonor.isPending}
                      onPress={() => markHonor.mutate({ chestId: chest.id, challengeId: c.id })}
                      accessibilityLabel={`Marcar como feito: ${c.text}`}
                      style={{
                        alignSelf: "flex-start",
                        marginLeft: 26,
                        marginTop: 6,
                        backgroundColor: "rgba(39,80,156,0.12)",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                      }}
                    >
                      <Text className="text-primary text-xs font-extrabold">Eu fiz! ✓</Text>
                    </TouchableOpacity>
                  ) : null
                ) : (
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: "rgba(39,80,156,0.12)", marginLeft: 26, marginTop: 6, overflow: "hidden" }}>
                    <View style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 999, backgroundColor: c.complete ? "#2E8B57" : color }} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 14 }}>
          {ready ? (
            <GameButton variant="gold" icon="chest-open" title="Abrir baú!" loading={claim.isPending} onPress={openChest} />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Text className="text-muted text-xs font-bold">Prêmio:</Text>
              <GameIcon name="coin" size="xs" />
              <Text className="text-foreground text-xs font-extrabold">+{chest.reward.denario}</Text>
              <GameIcon name="xp" size="xs" />
              <Text className="text-foreground text-xs font-extrabold">+{chest.reward.xp} XP</Text>
            </View>
          )}
        </View>
      </View>
    </PopIn>
  );
}

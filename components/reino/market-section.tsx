/**
 * Reino → Mercado: where denários are spent. The chests come from the admin
 * (Admin → Baús).
 * Frames, scenery and cards are teased as "em breve".
 */
import { Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { SOFT_SHADOW } from "@/lib/ui";
import { GameButton } from "@/components/game-button";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { useJuice } from "@/components/juice-provider";
import { useNotifications } from "@/components/notification-provider";
import { MAX_ACTIVE_CHESTS, deadlineLabel, type ChestTypeView } from "@shared/chests";
import { ChestArt } from "./chest-art";

export function MarketSection({ onBought }: { onBought: () => void }) {
  const utils = trpc.useUtils();
  const juice = useJuice();
  const notifications = useNotifications();
  const { data: me } = trpc.user.me.useQuery();
  const { data: catalog, isLoading } = trpc.chests.catalog.useQuery();
  const { data: chests } = trpc.chests.list.useQuery();

  const buy = trpc.chests.buy.useMutation({ onError: (e) => notifications.error(e.message) });

  const balance = me?.denarioBalance ?? 0;
  const inProgress = (chests ?? []).filter((c) => c.status === "ACTIVE" || c.status === "READY");
  const full = inProgress.length >= MAX_ACTIVE_CHESTS;

  const buyChest = async (t: ChestTypeView) => {
    await buy.mutateAsync({ chestTypeId: t.id });
    juice.burst({ title: `${t.name}!`, subtitle: "Seus desafios estão no Tesouro", confetti: t.price >= 200 });
    await Promise.all([utils.chests.list.invalidate(), utils.user.me.invalidate()]);
    onBought();
  };

  return (
    <View className="px-4 mt-4" style={{ gap: 16 }}>
      <View>
        <Text className="text-foreground text-lg font-extrabold">Baús de Desafio</Text>
        <Text className="text-muted text-xs mt-0.5">
          Compre, cumpra os desafios no prazo e abra o baú: o prêmio vale mais do que ele custou!
        </Text>
      </View>

      {isLoading ? (
        <Text className="text-muted text-center">Abrindo o mercado...</Text>
      ) : (catalog ?? []).length === 0 ? (
        <View className="bg-surface rounded-3xl p-6 items-center" style={SOFT_SHADOW}>
          <GameIcon name="chest" size={64} />
          <Text className="text-foreground font-extrabold mt-2 text-center">Nenhum baú à venda agora</Text>
          <Text className="text-muted text-sm text-center mt-1">Volte daqui a pouco: novos baús estão chegando!</Text>
        </View>
      ) : (
        (catalog ?? []).map((t) => {
          const running = inProgress.some((c) => c.chestTypeId === t.id);
          const canAfford = balance >= t.price;
          return (
            <View
              key={t.id}
              className="bg-surface rounded-3xl p-4"
              style={[SOFT_SHADOW, { borderWidth: 2, borderColor: `${t.color}66` }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <ChestArt color={t.color} size={72} />
                <View style={{ flex: 1 }}>
                  <Text className="text-foreground text-lg font-extrabold">{t.name}</Text>
                  <Text className="text-muted text-sm">
                    {t.description || `${t.challengeCount} ${t.challengeCount === 1 ? "desafio" : "desafios"} em ${deadlineLabel(t.days)}`}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                    <Text className="text-foreground text-xs font-extrabold">Prêmio:</Text>
                    <Reward icon="coin" value={`+${t.reward.denario}`} />
                    <Reward icon="xp" value={`+${t.reward.xp} XP`} />
                  </View>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                {running ? (
                  <Text className="text-primary text-sm font-extrabold text-center">Em andamento · veja no Tesouro</Text>
                ) : full ? (
                  <Text className="text-muted text-sm font-bold text-center">
                    Você já tem {MAX_ACTIVE_CHESTS} baús abertos. Termine um primeiro!
                  </Text>
                ) : (
                  <GameButton
                    variant={canAfford ? "gold" : "wood"}
                    icon="coin"
                    title={`Comprar por ${t.price}`}
                    loading={buy.isPending && buy.variables?.chestTypeId === t.id}
                    disabled={buy.isPending}
                    onPress={() =>
                      canAfford
                        ? buyChest(t)
                        : notifications.error(`Faltam ${t.price - balance} denários! Complete desafios para ganhar mais.`)
                    }
                  />
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Em breve */}
      <View>
        <Text className="text-foreground text-lg font-extrabold">Em breve no Mercado</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Soon icon="scroll" label="Cartas bíblicas" />
          <Soon icon="seal" label="Molduras" />
          <Soon icon="map" label="Cenários" />
        </View>
      </View>
    </View>
  );
}

function Reward({ icon, value }: { icon: GameIconName; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <GameIcon name={icon} size="xs" />
      <Text className="text-foreground text-xs font-extrabold">{value}</Text>
    </View>
  );
}

function Soon({ icon, label }: { icon: GameIconName; label: string }) {
  return (
    <View
      className="bg-surface rounded-2xl"
      style={[SOFT_SHADOW, { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 6, opacity: 0.85 }]}
    >
      <View>
        <GameIcon name={icon} size={40} />
        <View style={{ position: "absolute", right: -8, bottom: -4 }}>
          <GameIcon name="lock" size={18} />
        </View>
      </View>
      <Text className="text-foreground text-xs font-extrabold text-center mt-2">{label}</Text>
    </View>
  );
}

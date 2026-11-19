/**
 * Admin · Baús de Desafio: the chests sold in the Mercado. Each one has a price, a deadline,
 * a reward and a pool of challenges (some are drawn when a player buys it).
 */
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { ChestArt } from "@/components/reino/chest-art";
import { Badge, Btn, Card, DataRow, EmptyState, Grid, KpiCard, Loading, PageHeader } from "@/components/panel/ui";
import { deadlineLabel } from "@shared/chests";

const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : "—");

export default function AdminChestList() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const list = trpc.admin.chestTypes.list.useQuery();
  const rows = useMemo(() => list.data ?? [], [list.data]);

  const kpis = useMemo(() => {
    let bought = 0;
    let claimed = 0;
    let expired = 0;
    let spent = 0;
    for (const r of rows) {
      bought += r.bought;
      claimed += r.claimed;
      expired += r.expired;
      spent += r.spent;
    }
    return { bought, claimed, expired, spent, active: rows.filter((r) => r.isActive).length };
  }, [rows]);

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Baús de Desafio"
        subtitle="Os baús vendidos no Mercado. O jogador compra com denários, cumpre os desafios sorteados no prazo e ganha o prêmio."
        actions={
          <>
            <Btn
              variant="secondary"
              size="sm"
              title="Atualizar"
              onPress={() => utils.admin.chestTypes.invalidate()}
              loading={list.isFetching && !list.isLoading}
            />
            <Btn size="sm" title="+ Novo baú" onPress={() => router.push("/admin/chests/new" as any)} />
          </>
        }
      />

      {list.isLoading ? (
        <Loading label="Carregando baús..." />
      ) : list.error ? (
        <EmptyState
          icon="lock"
          title="Não foi possível carregar os baús"
          text={list.error.message}
          action={<Btn title="Tentar de novo" onPress={() => list.refetch()} />}
        />
      ) : (
        <>
          <Grid min={200}>
            <KpiCard icon="chest" label="Baús à venda" value={kpis.active} hint={`${rows.length} cadastrados`} />
            <KpiCard icon="coin" label="Comprados" value={kpis.bought} hint={`${kpis.spent.toLocaleString("pt-BR")} denários gastos`} />
            <KpiCard icon="chest-open" label="Abertos (completos)" value={kpis.claimed} hint={`${pct(kpis.claimed, kpis.bought)} das compras`} />
            <KpiCard icon="hourglass" label="Prazo perdido" value={kpis.expired} hint={`${pct(kpis.expired, kpis.bought)} das compras`} />
          </Grid>

          <Card title={`${rows.length} ${rows.length === 1 ? "baú" : "baús"}`} subtitle="Na ordem em que aparecem no Mercado" padded={false}>
            {rows.length === 0 ? (
              <EmptyState
                icon="chest"
                title="Nenhum baú ainda"
                text="Crie o primeiro baú para ele aparecer no Mercado."
                action={<Btn title="+ Novo baú" onPress={() => router.push("/admin/chests/new" as any)} />}
              />
            ) : (
              rows.map((r, idx) => {
                const profit = r.rewardDenario - r.price;
                return (
                  <DataRow
                    key={r.id}
                    title={r.name}
                    subtitle={`${r.price} denários · ${r.challengeCount} de ${r.poolSize} desafios em ${deadlineLabel(r.days)} · prêmio +${r.rewardDenario} denários e +${r.rewardXp} XP`}
                    leading={<ChestArt color={r.color} size={44} />}
                    meta={
                      <>
                        <Badge label={r.isActive ? "À venda" : "Fora do Mercado"} tone={r.isActive ? "good" : "neutral"} />
                        <Badge label={profit >= 0 ? `Lucro +${profit}` : `Prejuízo ${profit}`} tone={profit > 0 ? "brand" : "bad"} />
                        {r.bought ? <Badge label={`${r.bought} compras · ${pct(r.claimed, r.bought)} abertos`} /> : null}
                      </>
                    }
                    right={
                      <Btn
                        size="sm"
                        variant="ghost"
                        title="Editar"
                        accessibilityLabel={`Editar ${r.name}`}
                        onPress={() => router.push(`/admin/chests/${r.id}` as any)}
                      />
                    }
                    onPress={() => router.push(`/admin/chests/${r.id}` as any)}
                    last={idx === rows.length - 1}
                  />
                );
              })
            )}
          </Card>

          <Text className="text-muted text-xs">
            Lucro = prêmio em denários − preço. Com lucro positivo, completar o baú sempre compensa; se o prazo acabar, o jogador perde o que pagou.
          </Text>
        </>
      )}
    </View>
  );
}

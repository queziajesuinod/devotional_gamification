/**
 * Admin · Mensagens de encorajamento: what players can send each other in the cell.
 * Each message has a category (Oração / Ânimo / Orgulho); "Oração" ones count for
 * prayer challenges in the chests.
 */
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { GameIcon } from "@/components/game-icon";
import { Badge, Btn, Card, DataRow, EmptyState, Grid, KpiCard, Loading, PageHeader } from "@/components/panel/ui";
import { ENCOURAGEMENT_CATEGORIES, ENCOURAGEMENT_INFO, isEncouragementType } from "@shared/engagement";

const categoryLabel = (c: string) => ENCOURAGEMENT_CATEGORIES.find((x) => x.value === c)?.label.split(" (")[0] ?? c;

export default function AdminMessageList() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const list = trpc.admin.encouragementMessages.list.useQuery();
  const rows = useMemo(() => list.data ?? [], [list.data]);

  const kpis = useMemo(() => {
    let total = 0;
    let last30 = 0;
    let top: (typeof rows)[number] | null = null;
    for (const r of rows) {
      total += r.sent;
      last30 += r.sent30;
      if (!top || r.sent30 > top.sent30) top = r;
    }
    return { total, last30, top: top && top.sent30 > 0 ? top : null, active: rows.filter((r) => r.isActive).length };
  }, [rows]);

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Mensagens de encorajamento"
        subtitle="O que os jogadores podem mandar uns para os outros na célula. Quem recebe vê numa cartinha no Início."
        actions={
          <>
            <Btn
              variant="secondary"
              size="sm"
              title="Atualizar"
              onPress={() => utils.admin.encouragementMessages.invalidate()}
              loading={list.isFetching && !list.isLoading}
            />
            <Btn size="sm" title="+ Nova mensagem" onPress={() => router.push("/admin/messages/new" as any)} />
          </>
        }
      />

      {list.isLoading ? (
        <Loading label="Carregando mensagens..." />
      ) : list.error ? (
        <EmptyState
          icon="lock"
          title="Não foi possível carregar as mensagens"
          text={list.error.message}
          action={<Btn title="Tentar de novo" onPress={() => list.refetch()} />}
        />
      ) : (
        <>
          <Grid min={200}>
            <KpiCard icon="love-letter" label="Mensagens ativas" value={kpis.active} hint={`${rows.length} cadastradas`} />
            <KpiCard icon="heart" label="Enviadas (30 dias)" value={kpis.last30} hint={`${kpis.total.toLocaleString("pt-BR")} no total`} />
            <KpiCard icon="crown" label="Mais enviada (30 dias)" value={kpis.top ? kpis.top.sent30 : "—"} hint={kpis.top?.label ?? "nenhuma ainda"} />
          </Grid>

          <Card title={`${rows.length} ${rows.length === 1 ? "mensagem" : "mensagens"}`} subtitle="Na ordem em que aparecem para o jogador" padded={false}>
            {rows.length === 0 ? (
              <EmptyState
                icon="love-letter"
                title="Nenhuma mensagem"
                text="Crie mensagens para os jogadores se encorajarem."
                action={<Btn title="+ Nova mensagem" onPress={() => router.push("/admin/messages/new" as any)} />}
              />
            ) : (
              rows.map((r, idx) => (
                <DataRow
                  key={r.id}
                  title={`${r.emoji ? `${r.emoji} ` : ""}“${r.label}”`}
                  subtitle={`Quem recebe vê: “Fulano ${r.receivedText}”`}
                  leading={<GameIcon name={ENCOURAGEMENT_INFO[isEncouragementType(r.category) ? r.category : "CHEER"].icon} size={36} />}
                  meta={
                    <>
                      <Badge label={r.isActive ? "Ativa" : "Desativada"} tone={r.isActive ? "good" : "neutral"} />
                      <Badge label={categoryLabel(r.category)} tone={r.category === "PRAYED" ? "brand" : "neutral"} />
                      <Badge label={`${r.sent30} em 30 dias`} />
                    </>
                  }
                  right={
                    <Btn
                      size="sm"
                      variant="ghost"
                      title="Editar"
                      accessibilityLabel={`Editar ${r.label}`}
                      onPress={() => router.push(`/admin/messages/${r.id}` as any)}
                    />
                  }
                  onPress={() => router.push(`/admin/messages/${r.id}` as any)}
                  last={idx === rows.length - 1}
                />
              ))
            )}
          </Card>

          <Text className="text-muted text-xs">
            Mensagens da categoria Oração contam nos desafios “Mande Estou orando por você” dos baús. Todas contam em “Encoraje pessoas”.
          </Text>
        </>
      )}
    </View>
  );
}

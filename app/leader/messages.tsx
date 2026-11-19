import { Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { FaceBadge } from "@/components/face-badge";
import { GameIcon } from "@/components/game-icon";
import { Badge, Btn, Card, DataRow, EmptyState, Loading, PageHeader } from "@/components/panel/ui";

function when(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** Messages the leader received from cell members (last 7 days). */
export default function LeaderMessages() {
  const utils = trpc.useUtils();
  const inbox = trpc.engagement.inbox.useQuery();
  const markSeen = trpc.engagement.markInboxSeen.useMutation({
    onSuccess: () => utils.engagement.inbox.invalidate(),
  });

  if (inbox.isLoading) return <Loading label="Carregando mensagens..." />;

  const items = inbox.data?.items ?? [];
  const unseen = inbox.data?.unseen ?? 0;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Mensagens recebidas"
        subtitle="O que sua célula mandou para você nos últimos 7 dias"
        actions={
          unseen > 0 ? (
            <Btn title="Amém, marcar como lidas" icon="pray" loading={markSeen.isPending} onPress={() => markSeen.mutate()} />
          ) : null
        }
      />
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState
            icon="love-letter"
            title="Nenhuma mensagem ainda"
            text="Quando alguém da célula mandar “Estou orando por você” ou “Você me inspira”, aparece aqui."
          />
        ) : (
          items.map((item, i) => {
            const isNew = !item.seenAt;
            return (
              <DataRow
                key={item.id}
                last={i === items.length - 1}
                leading={<FaceBadge figurine={item.figurine} size={44} ring={isNew ? "#F2B50C" : "#D8C9A8"} />}
                title={item.fromNickname ?? "Alguém da célula"}
                subtitle={`“${item.label}” · ${when(item.createdAt)}`}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {isNew ? <Badge label="Nova" tone="warn" /> : null}
                    <GameIcon name={item.icon} size={28} />
                  </View>
                }
              />
            );
          })
        )}
      </Card>
      {items.length > 0 ? (
        <Text className="text-muted text-xs text-center">Mensagens com mais de 7 dias deixam de aparecer.</Text>
      ) : null}
    </View>
  );
}

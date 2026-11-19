import { useState } from "react";
import { Platform, View } from "react-native";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { Btn, Card, DataRow, EmptyState, Loading, PageHeader, confirmAction } from "@/components/panel/ui";
import { formatDate } from "@/lib/leader";
import { FaceBadge } from "@/components/face-badge";

export default function LeaderRequests() {
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const dashboard = trpc.leader.dashboard.useQuery(undefined, { staleTime: 15_000 });
  const approve = trpc.leader.approveRequest.useMutation();
  const reject = trpc.leader.rejectRequest.useMutation();
  const [busyId, setBusyId] = useState<number | null>(null);

  const pending = dashboard.data?.pendingRequests ?? [];

  const act = async (kind: "approve" | "reject", requestId: number, name: string) => {
    if (kind === "reject" && !(await confirmAction(`Recusar o pedido de ${name}?`, "Recusar"))) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(kind === "approve" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    }
    setBusyId(requestId);
    try {
      if (kind === "approve") await approve.mutateAsync({ requestId });
      else await reject.mutateAsync({ requestId });
      notifications.success(kind === "approve" ? `${name} entrou na célula!` : `Pedido de ${name} recusado`);
      await utils.leader.dashboard.invalidate();
    } catch (error: any) {
      notifications.error(error?.message || "Não foi possível responder o pedido");
    } finally {
      setBusyId(null);
    }
  };

  if (dashboard.isLoading) return <Loading label="Carregando pedidos..." />;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Pedidos para entrar"
        subtitle={pending.length ? `${pending.length} esperando sua resposta` : "Nenhum pedido pendente"}
      />
      <Card padded={false}>
        {pending.length === 0 ? (
          <EmptyState icon="seal" title="Tudo respondido!" text="Quando alguém pedir para entrar, aparece aqui." />
        ) : (
          pending.map((r, i) => {
            const name = r.userNickname || r.userName || "Usuário";
            return (
              <DataRow
                key={r.id}
                last={i === pending.length - 1}
                leading={<FaceBadge size={42} figurine={r.figurine} />}
                title={name}
                subtitle={`Nível ${r.userLevel}${r.userEmail ? ` · ${r.userEmail}` : ""} · pediu em ${formatDate(r.requestedAt)}`}
                right={
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Btn
                      size="sm"
                      variant="secondary"
                      title="Recusar"
                      disabled={busyId !== null && busyId !== r.id}
                      onPress={() => act("reject", r.id, name)}
                    />
                    <Btn
                      size="sm"
                      variant="success"
                      title="Aprovar"
                      loading={busyId === r.id}
                      disabled={busyId !== null && busyId !== r.id}
                      onPress={() => act("approve", r.id, name)}
                    />
                  </View>
                }
              />
            );
          })
        )}
      </Card>
    </View>
  );
}

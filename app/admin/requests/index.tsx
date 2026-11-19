import { useEffect, useState } from "react";
import { View } from "react-native";
import { useNotifications } from "@/components/notification-provider";
import {
  Badge,
  Btn,
  Card,
  DataRow,
  EmptyState,
  Loading,
  PageHeader,
  Pagination,
  confirmAction,
} from "@/components/panel/ui";
import { trpc } from "@/lib/trpc";

const PAGE_LIMIT = 20;

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function AdminRequestsPage() {
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<{ id: number; action: "approve" | "reject" } | null>(null);

  const requestsQuery = trpc.admin.groupRequests.pending.useQuery({ page, limit: PAGE_LIMIT });
  const approve = trpc.admin.groupRequests.approve.useMutation();
  const reject = trpc.admin.groupRequests.reject.useMutation();

  const items = requestsQuery.data?.items ?? [];
  const total = requestsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  // after approving/rejecting the last item of a page, step back to a page that exists
  useEffect(() => {
    if (requestsQuery.data && page > totalPages) setPage(totalPages);
  }, [requestsQuery.data, page, totalPages]);

  const refresh = () =>
    Promise.all([
      utils.admin.groupRequests.invalidate(),
      utils.admin.groups.invalidate(),
      utils.admin.stats.invalidate(),
    ]);

  const onApprove = async (r: (typeof items)[number]) => {
    setBusy({ id: r.requestId, action: "approve" });
    try {
      await approve.mutateAsync({ requestId: r.requestId });
      await refresh();
      notifications.success(`${r.userNickname || "Usuário"} entrou na célula ${r.groupName}!`);
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Não foi possível aprovar o pedido.");
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (r: (typeof items)[number]) => {
    const ok = await confirmAction(
      `Recusar o pedido de ${r.userNickname || "usuário"} para entrar na célula ${r.groupName}?`,
      "Recusar",
    );
    if (!ok) return;
    setBusy({ id: r.requestId, action: "reject" });
    try {
      await reject.mutateAsync({ requestId: r.requestId });
      await refresh();
      notifications.success("Pedido recusado.");
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Não foi possível recusar o pedido.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Pedidos"
        subtitle="Pedidos pendentes para entrar em células"
        actions={
          <Btn
            variant="secondary"
            size="sm"
            title="Atualizar"
            onPress={() => requestsQuery.refetch()}
            loading={requestsQuery.isFetching}
          />
        }
      />

      <Card
        title="Aguardando aprovação"
        subtitle={total ? `${total} ${total === 1 ? "pedido pendente" : "pedidos pendentes"}` : undefined}
        padded={false}
      >
        {requestsQuery.isLoading ? (
          <Loading label="Carregando pedidos..." />
        ) : requestsQuery.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar os pedidos"
            text={requestsQuery.error.message}
            action={<Btn title="Tentar de novo" onPress={() => requestsQuery.refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="love-letter" title="Nenhum pedido pendente" text="Tudo em dia por aqui." />
        ) : (
          <View className="border-t border-border">
            {items.map((r, i) => {
              const rowBusy = busy?.id === r.requestId;
              return (
                <DataRow
                  key={r.requestId}
                  last={i === items.length - 1}
                  title={`${r.userNickname || "Usuário"} → ${r.groupName}`}
                  subtitle={r.userEmail || "sem e-mail"}
                  meta={<Badge label={`Pedido em ${formatDateTime(r.requestedAt)}`} />}
                  right={
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                      <Btn
                        size="sm"
                        variant="success"
                        title="Aprovar"
                        accessibilityLabel={`Aprovar ${r.userNickname || "usuário"} na célula ${r.groupName}`}
                        loading={rowBusy && busy?.action === "approve"}
                        disabled={busy !== null && !rowBusy}
                        onPress={() => onApprove(r)}
                      />
                      <Btn
                        size="sm"
                        variant="danger"
                        title="Recusar"
                        accessibilityLabel={`Recusar ${r.userNickname || "usuário"} na célula ${r.groupName}`}
                        loading={rowBusy && busy?.action === "reject"}
                        disabled={busy !== null && !rowBusy}
                        onPress={() => onReject(r)}
                      />
                    </View>
                  }
                />
              );
            })}
          </View>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </Card>
    </View>
  );
}

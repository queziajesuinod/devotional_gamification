import { useState } from "react";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
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
import { GameIcon } from "@/components/game-icon";
import { medalCategoryLabel } from "@/lib/admin/medals";

const PAGE_LIMIT = 20;

function MedalThumb({ emoji, url }: { emoji?: string | null; url?: string | null }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(39,80,156,0.08)",
      }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : emoji ? (
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      ) : (
        <GameIcon name="medal-gold" size={28} />
      )}
    </View>
  );
}

export default function AdminMedals() {
  const router = useRouter();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const list = trpc.admin.medals.list.useQuery({ page, limit: PAGE_LIMIT });
  const recalculate = trpc.admin.medals.recalculateAll.useMutation();

  const handleRecalculate = async () => {
    const ok = await confirmAction(
      "Recalcular as medalhas de TODOS os usuários? Quem já cumpriu os requisitos ganha a medalha agora. Nenhuma medalha é removida.",
      "Recalcular",
    );
    if (!ok) return;
    try {
      const result = await recalculate.mutateAsync();
      await utils.admin.medals.invalidate();
      notifications.success(
        `${result.users} usuários verificados · ${result.awarded} medalhas novas${result.failed ? ` · ${result.failed} com erro` : ""}`,
      );
    } catch (error) {
      console.error("Failed to recalculate medals", error);
      notifications.error(error instanceof Error ? error.message : "Erro ao recalcular medalhas");
    }
  };

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Medalhas"
        subtitle="Conquistas que os jogadores desbloqueiam"
        actions={
          <>
            <Btn
              variant="secondary"
              title="Recalcular medalhas"
              icon="hourglass"
              loading={recalculate.isPending}
              onPress={handleRecalculate}
            />
            <Btn title="Nova medalha" icon="medal-gold" onPress={() => router.push("/admin/medals/new" as any)} />
          </>
        }
      />

      <Card padded={false}>
        {list.isLoading ? (
          <Loading label="Carregando medalhas..." />
        ) : list.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar as medalhas"
            text={list.error.message}
            action={<Btn title="Tentar de novo" onPress={() => list.refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="medal-gold"
            title="Nenhuma medalha ainda"
            text="Crie a primeira conquista do Reino."
            action={<Btn title="Nova medalha" onPress={() => router.push("/admin/medals/new" as any)} />}
          />
        ) : (
          <>
            {items.map((m, i) => (
              <DataRow
                key={m.id}
                last={i === items.length - 1}
                title={m.name}
                subtitle={m.description}
                leading={<MedalThumb emoji={m.iconEmoji} url={m.iconUrl} />}
                meta={
                  <>
                    <Badge tone="brand" label={medalCategoryLabel(m.category)} />
                    <Badge tone={m.isActive ? "good" : "neutral"} label={m.isActive ? "Ativa" : "Inativa"} />
                    <Badge label={`Ordem ${m.order}`} />
                  </>
                }
                onPress={() => router.push(`/admin/medals/${m.id}` as any)}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </View>
  );
}

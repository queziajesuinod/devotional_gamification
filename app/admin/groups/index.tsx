import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Btn, Card, DataRow, EmptyState, Loading, PageHeader, Pagination } from "@/components/panel/ui";
import { trpc } from "@/lib/trpc";

const PAGE_LIMIT = 20;

export default function AdminGroupsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const groupsQuery = trpc.admin.groups.list.useQuery({ page, limit: PAGE_LIMIT });

  const items = groupsQuery.data?.items ?? [];
  const total = groupsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const openNew = () => router.push("/admin/groups/new" as any);

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Células"
        subtitle="Grupos, líderes e pontuação"
        actions={<Btn title="Nova célula" icon="tab-cells" onPress={openNew} />}
      />

      <Card title="Todas as células" subtitle={`${total} no total`} padded={false}>
        {groupsQuery.isLoading ? (
          <Loading label="Carregando células..." />
        ) : groupsQuery.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar as células"
            text={groupsQuery.error.message}
            action={<Btn title="Tentar de novo" onPress={() => groupsQuery.refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="tab-cells"
            title="Nenhuma célula ainda"
            text="Crie a primeira célula e escolha um líder."
            action={<Btn title="Nova célula" onPress={openNew} />}
          />
        ) : (
          <View className="border-t border-border">
            {items.map((group, i) => (
              <DataRow
                key={group.id}
                last={i === items.length - 1}
                title={group.name}
                subtitle={group.description || undefined}
                onPress={() => router.push(`/admin/groups/${group.id}` as any)}
                meta={
                  <>
                    <Badge label={`Líder: ${group.leaderName || "—"}`} tone="brand" />
                    <Badge label={`${group.memberCount} ${group.memberCount === 1 ? "membro" : "membros"}`} />
                    <Badge label={`${(group.totalPoints ?? 0).toLocaleString("pt-BR")} pontos`} tone="warn" />
                  </>
                }
                right={<Badge label="Editar ›" />}
              />
            ))}
          </View>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </Card>
    </View>
  );
}

import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Badge, Btn, Card, DataRow, EmptyState, Loading, PageHeader, Pagination } from "@/components/panel/ui";

const PAGE_LIMIT = 20;

export default function AdminPlansList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const plans = trpc.admin.devotionalPlans.list.useQuery({ page, limit: PAGE_LIMIT });

  const items = plans.data?.items ?? [];
  const total = plans.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Planos devocionais"
        subtitle="Ciclos de leitura do ano"
        actions={<Btn title="Novo plano" size="sm" onPress={() => router.push("/admin/plans/new" as any)} />}
      />
      <Card padded={false}>
        {plans.isLoading ? (
          <Loading />
        ) : plans.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar os planos"
            text={plans.error.message}
            action={<Btn title="Tentar de novo" onPress={() => plans.refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="map"
            title="Nenhum plano ainda"
            text="Crie o primeiro plano para começar a cadastrar os dias."
            action={<Btn title="Novo plano" onPress={() => router.push("/admin/plans/new" as any)} />}
          />
        ) : (
          <>
            {items.map((plan, i) => (
              <DataRow
                key={plan.id}
                title={plan.name}
                subtitle={plan.description || undefined}
                meta={
                  <>
                    <Badge label={String(plan.year)} tone="brand" />
                    <Badge label={plan.isActive ? "Ativo" : "Inativo"} tone={plan.isActive ? "good" : "neutral"} />
                  </>
                }
                onPress={() => router.push(`/admin/plans/${plan.id}` as any)}
                last={i === items.length - 1}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </View>
  );
}

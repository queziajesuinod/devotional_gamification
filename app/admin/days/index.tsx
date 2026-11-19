import { useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import {
  Badge,
  Btn,
  Card,
  DataRow,
  EmptyState,
  Loading,
  PageHeader,
  Pagination,
  SelectField,
} from "@/components/panel/ui";

const PAGE_LIMIT = 20;

/** YYYY-MM-DD → DD/MM/AAAA (no timezone math). */
const isoToBr = (value?: string | Date | null) => {
  if (!value) return "-";
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export default function AdminDaysList() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const parsedPlan = Number(params.planId);
  const planFilter = Number.isInteger(parsedPlan) && parsedPlan > 0 ? parsedPlan : 0;
  const [page, setPage] = useState(1);

  const plansQuery = trpc.admin.devotionalPlans.list.useQuery({ page: 1, limit: 100 });
  const daysQuery = trpc.admin.devotionalDays.list.useQuery({
    page,
    limit: PAGE_LIMIT,
    planId: planFilter || undefined,
  });

  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data]);
  const planName = useMemo(() => new Map(plans.map((p) => [p.id, `${p.name} (${p.year})`])), [plans]);
  const planOptions = useMemo(
    () => [{ value: 0, label: "Todos" }, ...plans.map((p) => ({ value: p.id, label: `${p.name} (${p.year})` }))],
    [plans],
  );

  const items = daysQuery.data?.items ?? [];
  const total = daysQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const setPlanFilter = (value: number) => {
    setPage(1);
    router.setParams({ planId: value ? String(value) : undefined } as any);
  };

  const newHref = planFilter ? `/admin/days/new?planId=${planFilter}` : "/admin/days/new";

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Dias devocionais"
        subtitle="Leitura, texto e pergunta de cada dia"
        actions={<Btn title="Novo dia" size="sm" onPress={() => router.push(newHref as any)} />}
      />

      <Card>
        {plansQuery.isLoading ? (
          <Loading label="Carregando planos..." />
        ) : (
          <SelectField label="Plano" options={planOptions} value={planFilter} onChange={setPlanFilter} />
        )}
      </Card>

      <Card padded={false}>
        {daysQuery.isLoading ? (
          <Loading />
        ) : daysQuery.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar os dias"
            text={daysQuery.error.message}
            action={<Btn title="Tentar de novo" onPress={() => daysQuery.refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Nenhum dia encontrado"
            text={planFilter ? "Este plano ainda não tem dias cadastrados." : "Cadastre o primeiro dia devocional."}
            action={<Btn title="Novo dia" onPress={() => router.push(newHref as any)} />}
          />
        ) : (
          <>
            {items.map((day, i) => (
              <DataRow
                key={day.id}
                title={`Dia ${day.dayNumber} · ${day.bibleReference}`}
                subtitle={planName.get(day.planId) ?? `Plano #${day.planId}`}
                meta={<Badge label={isoToBr(day.date as string | Date | null)} tone="brand" />}
                onPress={() => router.push(`/admin/days/${day.id}` as any)}
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

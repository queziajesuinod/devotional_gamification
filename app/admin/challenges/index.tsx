import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Badge, Btn, Card, DataRow, EmptyState, Loading, PageHeader, Pagination } from "@/components/panel/ui";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { challengeTypeLabel, devotionalDayLabel } from "@/lib/admin/medals";

const PAGE_LIMIT = 20;

const TYPE_ICON: Record<string, GameIconName> = {
  READING: "reading",
  DEVOTIONAL: "devotional",
  REFLECTION: "reflection",
  EXTRA: "extra",
};

export default function AdminChallenges() {
  const router = useRouter();
  const params = useLocalSearchParams<{ devotionalDayId?: string }>();
  const dayFilter = params.devotionalDayId ? Number(params.devotionalDayId) : undefined;
  const validFilter = dayFilter && Number.isInteger(dayFilter) && dayFilter > 0 ? dayFilter : undefined;
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [validFilter]);

  const list = trpc.admin.challenges.list.useQuery({ page, limit: PAGE_LIMIT, devotionalDayId: validFilter });
  const days = trpc.admin.devotionalDays.list.useQuery({ page: 1, limit: 100 }, { staleTime: 60_000 });

  const dayLabels = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of days.data?.items ?? []) map.set(d.id, devotionalDayLabel(d));
    return map;
  }, [days.data]);

  const dayName = (id: number) => dayLabels.get(id) ?? `Dia #${id}`;
  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const newHref = validFilter ? `/admin/challenges/new?devotionalDayId=${validFilter}` : "/admin/challenges/new";

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Desafios"
        subtitle="Missões ligadas a cada dia devocional"
        actions={<Btn title="Novo desafio" icon="quest-target" onPress={() => router.push(newHref as any)} />}
      />

      {validFilter ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <Text className="text-muted text-sm">Filtrando por:</Text>
          <Badge tone="brand" label={dayName(validFilter)} />
          <Btn
            size="sm"
            variant="ghost"
            title="Limpar filtro"
            accessibilityLabel="Limpar filtro de dia devocional"
            onPress={() => router.replace("/admin/challenges" as any)}
          />
        </View>
      ) : null}

      <Card padded={false}>
        {list.isLoading ? (
          <Loading label="Carregando desafios..." />
        ) : list.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar os desafios"
            text={list.error.message}
            action={<Btn title="Tentar de novo" onPress={() => list.refetch()} />}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="quest-target"
            title={validFilter ? "Nenhum desafio neste dia" : "Nenhum desafio ainda"}
            text="Crie o primeiro desafio para os jogadores."
            action={<Btn title="Novo desafio" onPress={() => router.push(newHref as any)} />}
          />
        ) : (
          <>
            {items.map((c, i) => (
              <DataRow
                key={c.id}
                last={i === items.length - 1}
                title={c.title}
                subtitle={validFilter ? c.description || undefined : dayName(c.devotionalDayId)}
                leading={<GameIcon name={TYPE_ICON[c.type] ?? "quest-target"} size={32} />}
                meta={
                  <>
                    <Badge tone="brand" label={challengeTypeLabel(c.type)} />
                    <Badge tone="good" label={`${c.baseXp} XP`} />
                    <Badge tone="warn" label={`${c.baseDenario} denários`} />
                  </>
                }
                onPress={() => router.push(`/admin/challenges/${c.id}` as any)}
              />
            ))}
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </View>
  );
}

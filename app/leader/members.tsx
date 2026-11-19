import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { FaceBadge } from "@/components/face-badge";
import { Badge, Card, DataRow, EmptyState, Loading, PageHeader, SelectField, TextField } from "@/components/panel/ui";
import { activityStatus, lastActivityText, STATUS_LABEL, STATUS_TONE, type ActivityStatus } from "@/lib/leader";

type Filter = "all" | "active" | "idle";

export default function LeaderMembers() {
  const dashboard = trpc.leader.dashboard.useQuery(undefined, { staleTime: 15_000 });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const members = useMemo(() => dashboard.data?.members ?? [], [dashboard.data?.members]);
  const leaderId = dashboard.data?.group?.leaderId;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .map((m, index) => ({ ...m, rank: index + 1, status: activityStatus(m.lastActivityDate) as ActivityStatus }))
      .filter((m) => {
        if (q && !`${m.userNickname ?? ""} ${m.userName ?? ""}`.toLowerCase().includes(q)) return false;
        if (filter === "active") return m.status === "today" || m.status === "week";
        if (filter === "idle") return m.status === "idle" || m.status === "never";
        return true;
      });
  }, [members, query, filter]);

  if (dashboard.isLoading) return <Loading label="Carregando membros..." />;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader title="Membros" subtitle={`${members.length} na célula · ordenados por XP`} />

      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <View style={{ flexGrow: 1, flexBasis: 240 }}>
            <TextField label="Buscar" value={query} onChangeText={setQuery} placeholder="Nome ou apelido" />
          </View>
          <View style={{ flexGrow: 1, flexBasis: 280 }}>
            <SelectField<Filter>
              label="Mostrar"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Ativos na semana" },
                { value: "idle", label: "Sumidos" },
              ]}
            />
          </View>
        </View>
      </Card>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon="tab-cells"
            title={members.length ? "Ninguém com esse filtro" : "Nenhum membro ainda"}
            text={members.length ? "Tente outro filtro ou busca." : "Aprove pedidos para montar sua célula."}
          />
        ) : (
          rows.map((m, i) => (
            <DataRow
              key={m.id}
              last={i === rows.length - 1}
              leading={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text className="text-muted font-extrabold" style={{ width: 24, textAlign: "right" }}>
                    {m.rank}
                  </Text>
                  <FaceBadge size={42} figurine={m.figurine} />
                </View>
              }
              title={m.userNickname || m.userName || "Membro"}
              subtitle={`Nível ${m.userLevel} · ${m.userXp} XP · ${lastActivityText(m.lastActivityDate)}`}
              meta={
                <>
                  <Badge label={STATUS_LABEL[m.status]} tone={STATUS_TONE[m.status]} />
                  <Badge label={`Sequência ${m.currentStreak} (recorde ${m.longestStreak})`} />
                  {leaderId === m.userId ? <Badge label="Líder" tone="brand" /> : null}
                </>
              }
            />
          ))
        )}
      </Card>
    </View>
  );
}

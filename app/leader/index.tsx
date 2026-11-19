import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { GroupWeekCard } from "@/components/group-week-card";
import { FaceBadge } from "@/components/face-badge";
import { Badge, Btn, Card, DataRow, EmptyState, Grid, KpiCard, Loading, PageHeader } from "@/components/panel/ui";
import { activityStatus, lastActivityText, STATUS_LABEL, STATUS_TONE } from "@/lib/leader";

export default function LeaderDashboard() {
  const router = useRouter();
  const dashboard = trpc.leader.dashboard.useQuery(undefined, { staleTime: 15_000 });
  const inbox = trpc.engagement.inbox.useQuery(undefined, { staleTime: 30_000 });

  if (dashboard.isLoading) return <Loading label="Carregando sua célula..." />;
  if (dashboard.error) {
    return (
      <EmptyState
        icon="lock"
        title="Não foi possível carregar o painel"
        text={dashboard.error.message}
        action={<Btn title="Tentar de novo" onPress={() => dashboard.refetch()} />}
      />
    );
  }

  const group = dashboard.data?.group;
  const members = dashboard.data?.members ?? [];
  const pending = dashboard.data?.pendingRequests ?? [];

  if (!group) {
    return (
      <View style={{ gap: 16 }}>
        <PageHeader title="Visão geral" />
        <Card>
          <EmptyState
            icon="tab-cells"
            title="Você ainda não lidera uma célula"
            text="Peça a um administrador para criar a sua célula e definir você como líder."
          />
        </Card>
      </View>
    );
  }

  const statuses = members.map((m) => activityStatus(m.lastActivityDate));
  const activeToday = statuses.filter((s) => s === "today").length;
  const activeWeek = statuses.filter((s) => s === "today" || s === "week").length;
  const idle = members.filter((m) => {
    const s = activityStatus(m.lastActivityDate);
    return s === "idle" || s === "never";
  });
  const avgStreak = members.length
    ? Math.round((members.reduce((sum, m) => sum + (m.currentStreak ?? 0), 0) / members.length) * 10) / 10
    : 0;
  const top = members.slice(0, 5);
  const unseenMessages = (inbox.data?.items ?? []).filter((m) => !m.seenAt);

  return (
    <View style={{ gap: 20 }}>
      <PageHeader
        title={group.name}
        subtitle={group.description || "Acompanhe sua célula nesta semana"}
        actions={
          <Btn variant="secondary" size="sm" title="Atualizar" onPress={() => dashboard.refetch()} loading={dashboard.isFetching} />
        }
      />

      <Grid min={220}>
        <KpiCard icon="tab-cells" label="Membros" value={members.length} hint={`${group.totalPoints} pontos da célula`} />
        <KpiCard
          icon="bolt"
          label="Ativos na semana"
          value={`${activeWeek}/${members.length}`}
          hint={`${activeToday} jogaram hoje`}
        />
        <KpiCard icon="streak" label="Sequência média" value={`${avgStreak} dias`} hint="Entre os membros" />
        <KpiCard
          icon="love-letter"
          label="Pedidos pendentes"
          value={pending.length}
          hint={pending.length ? "Esperando sua resposta" : "Tudo em dia"}
          tone={pending.length ? "attention" : "default"}
          onPress={() => router.push("/leader/requests" as any)}
        />
      </Grid>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexGrow: 2, flexBasis: 420, gap: 12 }}>
          <GroupWeekCard groupId={group.id} readOnly />
          <Card
            title="Destaques da célula"
            subtitle="Quem mais somou XP"
            action={<Btn variant="ghost" size="sm" title="Ver todos" onPress={() => router.push("/leader/members" as any)} />}
            padded={false}
          >
            {top.length === 0 ? (
              <EmptyState icon="tab-cells" title="Nenhum membro ainda" text="Aprove pedidos para montar sua célula." />
            ) : (
              top.map((m, i) => (
                <DataRow
                  key={m.id}
                  last={i === top.length - 1}
                  leading={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text className="text-muted font-extrabold" style={{ width: 20, textAlign: "right" }}>
                        {i + 1}
                      </Text>
                      <FaceBadge size={40} figurine={m.figurine} />
                    </View>
                  }
                  title={m.userNickname || m.userName || "Membro"}
                  subtitle={`Nível ${m.userLevel} · ${m.userXp} XP · sequência ${m.currentStreak}`}
                  right={
                    <Badge
                      label={STATUS_LABEL[activityStatus(m.lastActivityDate)]}
                      tone={STATUS_TONE[activityStatus(m.lastActivityDate)]}
                    />
                  }
                />
              ))
            )}
          </Card>
        </View>

        <View style={{ flexGrow: 1, flexBasis: 300, gap: 12 }}>
          {unseenMessages.length > 0 ? (
            <Card
              title={unseenMessages.length === 1 ? "Uma mensagem para você" : `${unseenMessages.length} mensagens para você`}
              subtitle="Sua célula está lembrando de você"
              action={<Btn variant="ghost" size="sm" title="Ler" onPress={() => router.push("/leader/messages" as any)} />}
              padded={false}
              style={{ borderColor: "#F2B50C", borderWidth: 2 }}
            >
              {unseenMessages.slice(0, 3).map((m, i, arr) => (
                <DataRow
                  key={m.id}
                  last={i === arr.length - 1}
                  leading={<FaceBadge size={40} figurine={m.figurine} />}
                  title={m.fromNickname ?? "Alguém da célula"}
                  subtitle={`“${m.label}”`}
                />
              ))}
            </Card>
          ) : null}

          <Card title="Precisam de um incentivo" subtitle="Sem atividade nos últimos 7 dias" padded={false}>
            {idle.length === 0 ? (
              <EmptyState icon="party" title="Todo mundo está jogando!" text="Ninguém sumido nesta semana." />
            ) : (
              idle.slice(0, 6).map((m, i, arr) => (
                <DataRow
                  key={m.id}
                  last={i === arr.length - 1}
                  title={m.userNickname || m.userName || "Membro"}
                  subtitle={lastActivityText(m.lastActivityDate)}
                />
              ))
            )}
          </Card>

          <Card
            title="Pedidos para entrar"
            action={
              pending.length ? (
                <Btn variant="ghost" size="sm" title="Responder" onPress={() => router.push("/leader/requests" as any)} />
              ) : null
            }
            padded={false}
          >
            {pending.length === 0 ? (
              <EmptyState icon="seal" title="Nenhum pedido" text="Novos pedidos aparecem aqui." />
            ) : (
              pending.slice(0, 4).map((r, i, arr) => (
                <DataRow
                  key={r.id}
                  last={i === arr.length - 1}
                  title={r.userNickname || r.userName || "Usuário"}
                  subtitle={`Nível ${r.userLevel}`}
                />
              ))
            )}
          </Card>
        </View>
      </View>
    </View>
  );
}

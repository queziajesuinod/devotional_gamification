import { wardrobeFor } from "@shared/character-catalog";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { BarChart, Btn, Card, Grid, KpiCard, Loading, PageHeader, EmptyState } from "@/components/panel/ui";

const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function dayLabels(iso: string) {
  // iso = YYYY-MM-DD (Campo Grande day); parse as UTC to avoid timezone shifts
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return {
    short: WEEKDAY[date.getUTCDay()],
    full: date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" }),
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const stats = trpc.admin.stats.useQuery(undefined, { staleTime: 30_000 });

  if (stats.isLoading) return <Loading label="Calculando indicadores..." />;
  if (stats.error || !stats.data) {
    return (
      <EmptyState
        icon="lock"
        title="Não foi possível carregar os indicadores"
        text={stats.error?.message}
        action={<Btn title="Tentar de novo" onPress={() => stats.refetch()} />}
      />
    );
  }

  const s = stats.data;
  const activeShare = s.users.total ? Math.round((s.users.active7d / s.users.total) * 100) : 0;
  const weekPlayers = s.week.map((d) => {
    const l = dayLabels(d.day);
    return { label: l.short, full: l.full, value: d.players };
  });
  const weekChallenges = s.week.reduce((sum, d) => sum + d.challenges, 0);
  const weekFullDays = s.week.reduce((sum, d) => sum + d.fullDays, 0);

  return (
    <View style={{ gap: 20 }}>
      <PageHeader
        title="Visão geral"
        subtitle="Como o Reino está hoje"
        actions={<Btn variant="secondary" size="sm" title="Atualizar" onPress={() => stats.refetch()} loading={stats.isFetching} />}
      />

      <Grid min={230}>
        <KpiCard
          icon="tab-profile"
          label="Usuários"
          value={s.users.total}
          hint={`+${s.users.new7d} nos últimos 7 dias`}
          onPress={() => router.push("/admin/users" as any)}
        />
        <KpiCard icon="bolt" label="Ativos (7 dias)" value={s.users.active7d} hint={`${activeShare}% da base`} />
        <KpiCard
          icon="devotional"
          label="Jogando hoje"
          value={s.today.players}
          hint={`${s.today.challenges} desafios concluídos`}
        />
        <KpiCard
          icon="love-letter"
          label="Pedidos pendentes"
          value={s.groups.pendingRequests}
          hint={s.groups.pendingRequests ? "Aguardando aprovação" : "Tudo em dia"}
          tone={s.groups.pendingRequests ? "attention" : "default"}
          onPress={() => router.push("/admin/requests" as any)}
        />
      </Grid>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexGrow: 2, flexBasis: 420 }}>
          <Card title="Jogadores ativos por dia" subtitle="Últimos 7 dias · toque numa barra para ver o valor">
            <BarChart data={weekPlayers} unit=" jogadores" />
            <View style={{ flexDirection: "row", gap: 24, marginTop: 14, flexWrap: "wrap" }}>
              <Mini label="Desafios na semana" value={weekChallenges} />
              <Mini label="Dias completos" value={weekFullDays} />
              <Mini label="Com sequência ativa" value={s.users.onStreak} />
              <Mini label="Maior sequência" value={`${s.users.bestStreak} ${s.users.bestStreak === 1 ? "dia" : "dias"}`} />
            </View>
          </Card>
        </View>
        <View style={{ flexGrow: 1, flexBasis: 280, gap: 12 }}>
          <Card title="Comunidade">
            <Line label="Células" value={s.groups.total} onPress={() => router.push("/admin/groups" as any)} />
            <Line label="Líderes" value={s.users.leaders} />
            <Line label="Denários em circulação" value={s.users.denarios} last />
          </Card>
          <Card title="Conteúdo">
            <Line
              label="Planos (ativos)"
              value={`${s.content.plans} (${s.content.activePlans})`}
              onPress={() => router.push("/admin/plans" as any)}
            />
            <Line label="Dias devocionais" value={s.content.days} onPress={() => router.push("/admin/days" as any)} />
            <Line label="Medalhas" value={s.content.medals} onPress={() => router.push("/admin/medals" as any)} />
            <Line
              label="Guarda-roupa (looks por personagem)"
              value={wardrobeFor("lia").length}
              onPress={() => router.push("/admin/shop" as any)}
              last
            />
          </Card>
        </View>
      </View>
    </View>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <View>
      <Text className="text-muted text-xs font-bold">{label}</Text>
      <Text className="text-foreground text-lg font-extrabold">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </Text>
    </View>
  );
}

function Line({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value: number | string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: "rgba(139,90,43,0.14)",
      }}
    >
      <Text className="text-foreground text-sm flex-1">{label}</Text>
      <Text className="text-foreground font-extrabold mr-2">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </Text>
      {onPress ? <Btn variant="ghost" size="sm" title="Abrir" onPress={onPress} /> : null}
    </View>
  );
}

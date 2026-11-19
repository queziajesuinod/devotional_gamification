import { useMemo, useState } from "react";
import { View } from "react-native";
import { useNotifications } from "@/components/notification-provider";
import {
  Badge,
  Btn,
  Card,
  DataRow,
  EmptyState,
  Grid,
  KpiCard,
  Loading,
  PageHeader,
  Pagination,
  ToggleField,
  confirmAction,
} from "@/components/panel/ui";
import { trpc } from "@/lib/trpc";

const PAGE_LIMIT = 20;
const ACTIVE_DAYS = 7;

type Role = "user" | "leader" | "admin";
const ROLES: { value: Role; label: string }[] = [
  { value: "user", label: "Jogador" },
  { value: "leader", label: "Líder" },
  { value: "admin", label: "Admin" },
];
const ROLE_TONE: Record<Role, "neutral" | "good" | "brand"> = { user: "neutral", leader: "good", admin: "brand" };
const roleLabel = (role: string) => ROLES.find((r) => r.value === role)?.label ?? role;

const formatShortDate = (value?: string | Date | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

export default function AdminUsersPage() {
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(false);
  const [changingId, setChangingId] = useState<number | null>(null);

  const stats = trpc.admin.stats.useQuery(undefined, { staleTime: 30_000 });
  const usersQuery = trpc.admin.users.list.useQuery({ page, limit: PAGE_LIMIT });
  const updateRole = trpc.admin.users.updateRole.useMutation();

  const activeCutoff = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);
    return cutoff;
  }, []);

  const rows = useMemo(() => {
    const items = usersQuery.data?.items ?? [];
    const withStatus = items.map((u) => {
      const last = u.lastSignedIn ? new Date(u.lastSignedIn) : null;
      return { ...u, isActive: !!last && last >= activeCutoff };
    });
    return activeOnly ? withStatus.filter((u) => u.isActive) : withStatus;
  }, [usersQuery.data, activeOnly, activeCutoff]);

  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const changeRole = async (user: { id: number; nickname: string | null; role: string }, role: Role) => {
    if (user.role === role) return;
    const ok = await confirmAction(
      `Alterar o papel de ${user.nickname || "usuário"} para "${roleLabel(role)}"?`,
      "Alterar",
    );
    if (!ok) return;
    setChangingId(user.id);
    try {
      await updateRole.mutateAsync({ userId: user.id, role });
      await Promise.all([utils.admin.users.invalidate(), utils.admin.stats.invalidate()]);
      notifications.success(`${user.nickname || "Usuário"} agora é ${roleLabel(role)}.`);
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Não foi possível alterar o papel.");
    } finally {
      setChangingId(null);
    }
  };

  const s = stats.data?.users;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title="Usuários"
        subtitle="Jogadores, líderes e administradores"
        actions={
          <Btn
            variant="secondary"
            size="sm"
            title="Atualizar"
            onPress={() => usersQuery.refetch()}
            loading={usersQuery.isFetching}
          />
        }
      />

      {s ? (
        <Grid min={200}>
          <KpiCard icon="tab-profile" label="Usuários" value={s.total} hint={`+${s.new7d} nos últimos 7 dias`} />
          <KpiCard icon="bolt" label={`Ativos (${ACTIVE_DAYS} dias)`} value={s.active7d} />
          <KpiCard icon="crown" label="Líderes" value={s.leaders} />
        </Grid>
      ) : null}

      <Card
        title="Lista de usuários"
        subtitle={activeOnly ? `Mostrando os ativos desta página (últimos ${ACTIVE_DAYS} dias)` : `${total} no total`}
        padded={false}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <ToggleField
            label="Somente ativos"
            hint={`Filtra a página atual por login nos últimos ${ACTIVE_DAYS} dias`}
            value={activeOnly}
            onChange={setActiveOnly}
          />
        </View>

        {usersQuery.isLoading ? (
          <Loading label="Carregando usuários..." />
        ) : usersQuery.error ? (
          <EmptyState
            icon="lock"
            title="Não foi possível carregar os usuários"
            text={usersQuery.error.message}
            action={<Btn title="Tentar de novo" onPress={() => usersQuery.refetch()} />}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="tab-profile"
            title={activeOnly ? "Nenhum usuário ativo nesta página" : "Nenhum usuário ainda"}
            text={activeOnly ? "Desligue o filtro ou veja outra página." : undefined}
          />
        ) : (
          <View className="border-t border-border">
            {rows.map((user, i) => (
              <DataRow
                key={user.id}
                last={i === rows.length - 1}
                title={`${user.nickname || "Sem apelido"}  #${user.id}`}
                subtitle={user.email || "sem e-mail"}
                meta={
                  <>
                    <Badge label={roleLabel(user.role)} tone={ROLE_TONE[user.role as Role] ?? "neutral"} />
                    {user.isActive ? <Badge label="Ativo" tone="good" /> : null}
                    <Badge label={`${(user.xpTotal ?? 0).toLocaleString("pt-BR")} XP`} />
                    <Badge label={`${(user.denarioBalance ?? 0).toLocaleString("pt-BR")} denários`} tone="warn" />
                    <Badge label={`Último login: ${formatShortDate(user.lastSignedIn)}`} />
                  </>
                }
                right={
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 260 }}>
                    {ROLES.map((r) => (
                      <Btn
                        key={r.value}
                        size="sm"
                        variant={user.role === r.value ? "primary" : "secondary"}
                        title={r.label}
                        accessibilityLabel={`Definir ${user.nickname || "usuário"} como ${r.label}`}
                        disabled={changingId !== null && changingId !== user.id}
                        loading={changingId === user.id && updateRole.variables?.role === r.value}
                        onPress={() => changeRole(user, r.value)}
                      />
                    ))}
                  </View>
                }
              />
            ))}
          </View>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
      </Card>
    </View>
  );
}

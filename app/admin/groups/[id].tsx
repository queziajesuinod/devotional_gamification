import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNotifications } from "@/components/notification-provider";
import {
  Btn,
  Card,
  EmptyState,
  FormActions,
  FormError,
  FormSection,
  Loading,
  PageHeader,
  SelectField,
  TextField,
  confirmAction,
} from "@/components/panel/ui";
import { trpc } from "@/lib/trpc";

const MAX_LEADER_OPTIONS = 12;

export default function AdminGroupFormPage() {
  const router = useRouter();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const groupId = isNew ? 0 : Number(id);
  const validId = isNew || (Number.isInteger(groupId) && groupId > 0);

  const groupQuery = trpc.admin.groups.byId.useQuery({ id: groupId }, { enabled: !isNew && validId });
  const usersQuery = trpc.admin.users.list.useQuery({ page: 1, limit: 100 });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [leaderName, setLeaderName] = useState<string | null>(null);
  const [leaderFilter, setLeaderFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (loaded || !groupQuery.data) return;
    const g = groupQuery.data;
    setName(g.name ?? "");
    setDescription(g.description ?? "");
    setLeaderId(g.leaderId);
    setLeaderName(g.leaderName ?? null);
    setLoaded(true);
  }, [groupQuery.data, loaded]);

  const create = trpc.admin.groups.create.useMutation();
  const update = trpc.admin.groups.update.useMutation();
  const remove = trpc.admin.groups.delete.useMutation();
  const saving = create.isPending || update.isPending;

  const users = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data]);
  const leaderOptions = useMemo(() => {
    const q = leaderFilter.trim().toLowerCase();
    const matches = q
      ? users.filter(
          (u) =>
            (u.nickname ?? "").toLowerCase().includes(q) ||
            (u.email ?? "").toLowerCase().includes(q) ||
            String(u.id) === q,
        )
      : users;
    const list = matches.slice(0, MAX_LEADER_OPTIONS);
    // keep the current leader visible even when the filter hides them
    if (leaderId && !list.some((u) => u.id === leaderId)) {
      const current = users.find((u) => u.id === leaderId);
      list.unshift(current ?? { id: leaderId, nickname: leaderName, role: "leader" } as (typeof users)[number]);
    }
    return list.map((u) => ({
      value: u.id,
      label: `${u.nickname || "Sem apelido"}${u.role === "leader" ? " · líder" : u.role === "admin" ? " · admin" : ""}`,
    }));
  }, [users, leaderFilter, leaderId, leaderName]);

  const goBack = () => router.replace("/admin/groups" as any);

  const invalidate = () =>
    Promise.all([
      utils.admin.groups.invalidate(),
      utils.admin.groupRequests.invalidate(),
      utils.admin.stats.invalidate(),
    ]);

  const onSave = async () => {
    setError(null);
    if (!name.trim()) return setError("Dê um nome para a célula.");
    if (!leaderId) return setError("Escolha um líder para a célula.");
    const payload = { name: name.trim(), description: description.trim() || null, leaderId };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ id: groupId, ...payload });
      await invalidate();
      notifications.success(isNew ? "Célula criada!" : "Célula atualizada!");
      goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a célula.");
    }
  };

  const onDelete = async () => {
    const ok = await confirmAction(
      `Excluir a célula "${name || groupQuery.data?.name}"? Todos os membros e pedidos dela serão removidos.`,
      "Excluir",
    );
    if (!ok) return;
    setError(null);
    try {
      await remove.mutateAsync({ id: groupId });
      await invalidate();
      notifications.success("Célula excluída.");
      goBack();
    } catch (err) {
      notifications.error(err instanceof Error ? err.message : "Não foi possível excluir a célula.");
    }
  };

  const title = isNew ? "Nova célula" : "Editar célula";

  if (!validId) {
    return (
      <View style={{ gap: 16 }}>
        <PageHeader title={title} onBack={goBack} />
        <EmptyState icon="lock" title="Célula inválida" action={<Btn title="Voltar às células" onPress={goBack} />} />
      </View>
    );
  }

  if (!isNew && (groupQuery.isLoading || (!loaded && groupQuery.data))) {
    return (
      <View style={{ gap: 16 }}>
        <PageHeader title={title} onBack={goBack} />
        <Loading label="Carregando célula..." />
      </View>
    );
  }

  if (!isNew && groupQuery.error) {
    return (
      <View style={{ gap: 16 }}>
        <PageHeader title={title} onBack={goBack} />
        <EmptyState
          icon="lock"
          title="Não foi possível carregar a célula"
          text={groupQuery.error.message}
          action={<Btn title="Tentar de novo" onPress={() => groupQuery.refetch()} />}
        />
      </View>
    );
  }

  const selectedLabel = leaderOptions.find((o) => o.value === leaderId)?.label ?? leaderName;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title={title}
        subtitle={
          isNew
            ? "O líder entra automaticamente como membro"
            : `${groupQuery.data?.memberCount ?? 0} membros · ${(groupQuery.data?.totalPoints ?? 0).toLocaleString("pt-BR")} pontos`
        }
        onBack={goBack}
      />

      <Card>
        <View style={{ gap: 24 }}>
          <FormSection title="Dados da célula">
            <TextField label="Nome" required value={name} onChangeText={setName} placeholder="Ex.: Célula Leões de Judá" />
            <TextField
              label="Descrição"
              value={description}
              onChangeText={setDescription}
              placeholder="Onde e quando se encontram, quem participa..."
              multiline
            />
          </FormSection>

          <FormSection
            title="Líder"
            description="Busque por apelido, e-mail ou ID entre os 100 usuários mais recentes."
          >
            <TextField
              label="Buscar usuário"
              value={leaderFilter}
              onChangeText={setLeaderFilter}
              placeholder="Digite para filtrar"
              autoCapitalize="none"
            />
            {usersQuery.isLoading ? (
              <Loading label="Carregando usuários..." />
            ) : leaderOptions.length === 0 ? (
              <Text className="text-muted text-sm">Nenhum usuário encontrado com esse filtro.</Text>
            ) : (
              <SelectField
                label="Líder da célula"
                required
                options={leaderOptions}
                value={leaderId}
                onChange={(v) => {
                  setLeaderId(v);
                  setLeaderName(null);
                }}
                hint={selectedLabel ? `Selecionado: ${selectedLabel}` : "Nenhum líder selecionado"}
              />
            )}
          </FormSection>

          <FormError message={error} />

          <FormActions
            onCancel={goBack}
            onSave={onSave}
            saving={saving}
            saveLabel={isNew ? "Criar célula" : "Salvar"}
            onDelete={isNew ? undefined : onDelete}
            deleting={remove.isPending}
          />
        </View>
      </Card>
    </View>
  );
}

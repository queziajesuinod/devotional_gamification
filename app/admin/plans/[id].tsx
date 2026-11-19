import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import {
  Badge,
  Btn,
  Card,
  DataRow,
  EmptyState,
  FormActions,
  FormError,
  FormSection,
  Loading,
  PageHeader,
  TextField,
  ToggleField,
  confirmAction,
} from "@/components/panel/ui";

const toInt = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

/** YYYY-MM-DD → DD/MM/AAAA (no timezone math). */
const isoToBr = (value?: string | Date | null) => {
  if (!value) return "-";
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const DAYS_PREVIEW_LIMIT = 10;

export default function AdminPlanForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === "new";
  const planId = isNew ? null : toInt(String(params.id), 0) || null;
  const utils = trpc.useUtils();
  const notifications = useNotifications();

  const planQuery = trpc.admin.devotionalPlans.byId.useQuery({ id: planId ?? 0 }, { enabled: !!planId });
  const daysQuery = trpc.admin.devotionalDays.list.useQuery(
    { page: 1, limit: DAYS_PREVIEW_LIMIT, planId: planId ?? undefined },
    { enabled: !!planId },
  );

  const [form, setForm] = useState({
    name: "",
    year: `${new Date().getFullYear()}`,
    description: "",
    isActive: true,
  });
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const plan = planQuery.data;
    if (!plan || loaded) return;
    setForm({
      name: plan.name,
      year: `${plan.year}`,
      description: plan.description || "",
      isActive: plan.isActive,
    });
    setLoaded(true);
  }, [planQuery.data, loaded]);

  const createMut = trpc.admin.devotionalPlans.create.useMutation();
  const updateMut = trpc.admin.devotionalPlans.update.useMutation();
  const deleteMut = trpc.admin.devotionalPlans.delete.useMutation();

  const goBack = () => router.replace("/admin/plans" as any);

  const invalidate = async () => {
    await Promise.all([
      utils.admin.devotionalPlans.invalidate(),
      utils.admin.devotionalDays.invalidate(),
      utils.admin.challenges.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  };

  const onSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Informe o nome do plano.");
      return;
    }
    const payload = {
      name: form.name,
      year: toInt(form.year, new Date().getFullYear()),
      description: form.description.trim() || null,
      isActive: form.isActive,
    };
    if (payload.year < 1900) {
      setError("Informe um ano válido.");
      return;
    }
    try {
      if (planId) {
        await updateMut.mutateAsync({ id: planId, ...payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      await invalidate();
      notifications.success(planId ? "Plano atualizado" : "Plano criado");
      goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar o plano";
      setError(message);
      notifications.error(message);
    }
  };

  const onDelete = async () => {
    if (!planId) return;
    const ok = await confirmAction(
      `Excluir o plano "${form.name}"? Todos os dias e desafios dele também serão apagados.`,
      "Excluir",
    );
    if (!ok) return;
    try {
      await deleteMut.mutateAsync({ id: planId });
      await invalidate();
      notifications.success("Plano excluído");
      goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao excluir o plano";
      setError(message);
      notifications.error(message);
    }
  };

  if (!isNew && !planId) {
    return <EmptyState icon="lock" title="Plano inválido" action={<Btn title="Voltar" onPress={goBack} />} />;
  }
  if (planId && planQuery.isLoading) return <Loading />;
  if (planId && planQuery.error) {
    return (
      <EmptyState
        icon="lock"
        title="Não foi possível carregar o plano"
        text={planQuery.error.message}
        action={<Btn title="Voltar" onPress={goBack} />}
      />
    );
  }

  const days = daysQuery.data?.items ?? [];
  const daysTotal = daysQuery.data?.total ?? 0;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title={isNew ? "Novo plano" : form.name || "Editar plano"}
        subtitle={isNew ? "Cadastre um novo ciclo devocional" : "Editar plano devocional"}
        onBack={goBack}
      />

      <Card>
        <View style={{ gap: 16 }}>
          <FormSection title="Dados do plano">
            <TextField
              label="Nome"
              required
              value={form.name}
              onChangeText={(name) => setForm((p) => ({ ...p, name }))}
              placeholder="Ex.: Plano Bíblico 2026"
            />
            <TextField
              label="Ano"
              required
              keyboardType="number-pad"
              value={form.year}
              onChangeText={(year) => setForm((p) => ({ ...p, year: year.replace(/\D/g, "").slice(0, 4) }))}
            />
            <TextField
              label="Descrição"
              multiline
              value={form.description}
              onChangeText={(description) => setForm((p) => ({ ...p, description }))}
            />
            <ToggleField
              label="Plano ativo"
              hint="Planos ativos aparecem para os jogadores"
              value={form.isActive}
              onChange={(isActive) => setForm((p) => ({ ...p, isActive }))}
            />
          </FormSection>
          <FormError message={error} />
          <FormActions
            onCancel={goBack}
            onSave={onSave}
            saving={createMut.isPending || updateMut.isPending}
            saveLabel={isNew ? "Criar plano" : "Salvar"}
            onDelete={planId ? onDelete : undefined}
            deleting={deleteMut.isPending}
          />
        </View>
      </Card>

      {planId ? (
        <Card
          title="Dias deste plano"
          subtitle={daysTotal ? `${daysTotal} ${daysTotal === 1 ? "dia cadastrado" : "dias cadastrados"}` : undefined}
          padded={false}
          action={
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Btn
                size="sm"
                variant="secondary"
                title="Ver todos"
                onPress={() => router.push(`/admin/days?planId=${planId}` as any)}
              />
              <Btn size="sm" title="Novo dia" onPress={() => router.push(`/admin/days/new?planId=${planId}` as any)} />
            </View>
          }
        >
          {daysQuery.isLoading ? (
            <Loading />
          ) : days.length === 0 ? (
            <EmptyState icon="calendar" title="Nenhum dia cadastrado" text="Adicione o primeiro dia deste plano." />
          ) : (
            days.map((day, i) => (
              <DataRow
                key={day.id}
                title={`Dia ${day.dayNumber} · ${day.bibleReference}`}
                meta={<Badge label={isoToBr(day.date as string | Date | null)} />}
                onPress={() => router.push(`/admin/days/${day.id}` as any)}
                last={i === days.length - 1}
              />
            ))
          )}
        </Card>
      ) : null}
    </View>
  );
}

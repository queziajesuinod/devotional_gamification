import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
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
import { CHALLENGE_TYPES, devotionalDayLabel, toInt, type ChallengeType } from "@/lib/admin/medals";

type FormState = {
  devotionalDayId: number | null;
  type: ChallengeType;
  title: string;
  description: string;
  baseXp: string;
  baseDenario: string;
};

const EMPTY: FormState = {
  devotionalDayId: null,
  type: "READING",
  title: "",
  description: "",
  baseXp: "10",
  baseDenario: "5",
};

const isNonNegativeInt = (v: string) => /^\d+$/.test(v.trim());

export default function AdminChallengeForm() {
  const router = useRouter();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const params = useLocalSearchParams<{ id: string; devotionalDayId?: string }>();
  const isNew = params.id === "new";
  const id = isNew ? 0 : Number(params.id);
  const validId = isNew || (Number.isInteger(id) && id > 0);

  const record = trpc.admin.challenges.byId.useQuery({ id }, { enabled: !isNew && validId });
  const days = trpc.admin.devotionalDays.list.useQuery({ page: 1, limit: 100 }, { staleTime: 60_000 });

  const [form, setForm] = useState<FormState>(() => {
    const preset = Number(params.devotionalDayId);
    return { ...EMPTY, devotionalDayId: isNew && preset > 0 ? preset : null };
  });
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (record.data) {
      setForm({
        devotionalDayId: record.data.devotionalDayId,
        type: record.data.type as ChallengeType,
        title: record.data.title,
        description: record.data.description || "",
        baseXp: `${record.data.baseXp}`,
        baseDenario: `${record.data.baseDenario}`,
      });
    }
  }, [record.data]);

  const dayOptions = useMemo(() => {
    const opts = (days.data?.items ?? []).map((d) => ({ value: d.id, label: devotionalDayLabel(d) }));
    if (form.devotionalDayId && !opts.some((o) => o.value === form.devotionalDayId)) {
      opts.unshift({ value: form.devotionalDayId, label: `Dia #${form.devotionalDayId}` });
    }
    return opts;
  }, [days.data, form.devotionalDayId]);

  const backToList = () => router.replace("/admin/challenges" as any);
  const goBack = () => (router.canGoBack() ? router.back() : backToList());

  const invalidate = async () => {
    await Promise.all([utils.admin.challenges.invalidate(), utils.admin.stats.invalidate()]);
  };

  const create = trpc.admin.challenges.create.useMutation();
  const update = trpc.admin.challenges.update.useMutation();
  const remove = trpc.admin.challenges.delete.useMutation();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((p) => ({ ...p, [key]: value }));

  const errors = {
    day: !form.devotionalDayId ? "Escolha o dia devocional." : null,
    title: !form.title.trim() ? "Informe o título." : null,
    baseXp: !isNonNegativeInt(form.baseXp) ? "Use um número inteiro (0 ou mais)." : null,
    baseDenario: !isNonNegativeInt(form.baseDenario) ? "Use um número inteiro (0 ou mais)." : null,
  };

  const handleSave = async () => {
    setTouched(true);
    setError(null);
    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      setError(firstError);
      return;
    }
    const payload = {
      devotionalDayId: form.devotionalDayId as number,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      baseXp: toInt(form.baseXp, 10),
      baseDenario: toInt(form.baseDenario, 5),
    };
    try {
      if (isNew) {
        await create.mutateAsync(payload);
      } else {
        await update.mutateAsync({ id, ...payload });
      }
      await invalidate();
      notifications.success(isNew ? "Desafio criado" : "Desafio salvo");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar o desafio";
      setError(message);
      notifications.error(message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction(`Excluir o desafio "${form.title}"?`, "Excluir");
    if (!ok) return;
    try {
      await remove.mutateAsync({ id });
      await invalidate();
      notifications.success("Desafio excluído");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao excluir o desafio";
      setError(message);
      notifications.error(message);
    }
  };

  if (!validId) {
    return (
      <EmptyState icon="lock" title="Desafio inválido" action={<Btn title="Voltar à lista" onPress={backToList} />} />
    );
  }
  if (!isNew && record.isLoading) return <Loading label="Carregando desafio..." />;
  if (!isNew && (record.error || !record.data)) {
    return (
      <EmptyState
        icon="lock"
        title="Desafio não encontrado"
        text={record.error?.message}
        action={<Btn title="Voltar à lista" onPress={backToList} />}
      />
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title={isNew ? "Novo desafio" : "Editar desafio"}
        subtitle={isNew ? "Uma missão para um dia devocional" : form.title}
        onBack={goBack}
      />
      <Card>
        <View style={{ gap: 24 }}>
          <FormSection title="Dia devocional" description="O desafio aparece para os jogadores neste dia.">
            {days.isLoading ? (
              <Loading label="Carregando dias..." />
            ) : dayOptions.length === 0 ? (
              <EmptyState icon="calendar" title="Nenhum dia devocional" text="Cadastre um dia antes de criar desafios." />
            ) : (
              <SelectField
                label="Dia"
                required
                options={dayOptions}
                value={form.devotionalDayId}
                onChange={(v) => set("devotionalDayId", v)}
                hint={touched && errors.day ? errors.day : "Mostrando os 100 dias mais recentes."}
              />
            )}
          </FormSection>

          <FormSection title="Desafio">
            <SelectField label="Tipo" required options={CHALLENGE_TYPES} value={form.type} onChange={(v) => set("type", v)} />
            <TextField
              label="Título"
              required
              value={form.title}
              onChangeText={(v) => set("title", v)}
              placeholder="Ex.: Ler o capítulo do dia"
              error={touched ? errors.title : null}
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChangeText={(v) => set("description", v)}
              placeholder="Opcional"
              multiline
            />
          </FormSection>

          <FormSection title="Recompensa">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <View style={{ flexGrow: 1, flexBasis: 160 }}>
                <TextField
                  label="XP base"
                  required
                  value={form.baseXp}
                  onChangeText={(v) => set("baseXp", v)}
                  keyboardType="number-pad"
                  error={touched ? errors.baseXp : null}
                />
              </View>
              <View style={{ flexGrow: 1, flexBasis: 160 }}>
                <TextField
                  label="Denários base"
                  required
                  value={form.baseDenario}
                  onChangeText={(v) => set("baseDenario", v)}
                  keyboardType="number-pad"
                  error={touched ? errors.baseDenario : null}
                />
              </View>
            </View>
          </FormSection>

          <FormError message={error} />
          <FormActions
            onCancel={goBack}
            onSave={handleSave}
            saving={create.isPending || update.isPending}
            saveLabel={isNew ? "Criar desafio" : "Salvar"}
            onDelete={isNew ? undefined : handleDelete}
            deleting={remove.isPending}
          />
        </View>
      </Card>
    </View>
  );
}

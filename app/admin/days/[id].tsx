import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
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

type ChallengeType = "READING" | "DEVOTIONAL" | "REFLECTION" | "EXTRA";

type DayChallengeDraft = {
  id?: number;
  type: ChallengeType;
  title: string;
  description: string;
  baseXp: string;
  baseDenario: string;
};

const CHALLENGE_TYPES: { value: ChallengeType; label: string }[] = [
  { value: "READING", label: "Leitura" },
  { value: "DEVOTIONAL", label: "Devocional" },
  { value: "REFLECTION", label: "Reflexão" },
  { value: "EXTRA", label: "Extra" },
];

const toInt = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

/** Masks typing into DD/MM/AAAA. */
const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let output = day;
  if (month) output += `/${month}`;
  if (year) output += `/${year}`;
  return output;
};

/** DD/MM/AAAA → YYYY-MM-DD, or null when incomplete / not a real date. */
const brToIso = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    return null;
  }
  return `${y}-${m}-${d}`;
};

/** YYYY-MM-DD (or Date) → DD/MM/AAAA. */
const isoToBr = (value?: string | Date | null) => {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

const newDraft = (): DayChallengeDraft => ({
  type: "READING",
  title: "",
  description: "",
  baseXp: "10",
  baseDenario: "5",
});

export default function AdminDayForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; planId?: string }>();
  const isNew = params.id === "new";
  const dayId = isNew ? null : toInt(String(params.id), 0) || null;
  const utils = trpc.useUtils();
  const notifications = useNotifications();

  const plansQuery = trpc.admin.devotionalPlans.list.useQuery({ page: 1, limit: 100 });
  const dayQuery = trpc.admin.devotionalDays.byId.useQuery({ id: dayId ?? 0 }, { enabled: !!dayId });
  const challengesQuery = trpc.admin.challenges.list.useQuery(
    { page: 1, limit: 100, devotionalDayId: dayId ?? undefined },
    { enabled: !!dayId },
  );

  const initialPlan = params.planId && Number(params.planId) > 0 ? String(Math.trunc(Number(params.planId))) : "";
  const [form, setForm] = useState({
    planId: initialPlan,
    dayNumber: "",
    date: "",
    bibleReference: "",
    devotionalText: "",
    reflectionQuestion: "",
  });
  const [drafts, setDrafts] = useState<DayChallengeDraft[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const day = dayQuery.data;
    const list = challengesQuery.data;
    if (loaded || !day || !list) return;
    setForm({
      planId: `${day.planId}`,
      dayNumber: `${day.dayNumber}`,
      date: isoToBr(day.date as string | Date | null),
      bibleReference: day.bibleReference,
      devotionalText: day.devotionalText || "",
      reflectionQuestion: day.reflectionQuestion || "",
    });
    const forEdit = list.items
      .filter((c) => c.devotionalDayId === day.id)
      .map((c) => ({
        id: c.id,
        type: c.type as ChallengeType,
        title: c.title,
        description: c.description || "",
        baseXp: `${c.baseXp}`,
        baseDenario: `${c.baseDenario}`,
      }));
    setDrafts(forEdit);
    setOriginalIds(forEdit.map((c) => c.id).filter((id): id is number => typeof id === "number"));
    setLoaded(true);
  }, [dayQuery.data, challengesQuery.data, loaded]);

  const dayCreate = trpc.admin.devotionalDays.create.useMutation();
  const dayUpdate = trpc.admin.devotionalDays.update.useMutation();
  const dayDelete = trpc.admin.devotionalDays.delete.useMutation();
  const challengeCreate = trpc.admin.challenges.create.useMutation();
  const challengeUpdate = trpc.admin.challenges.update.useMutation();
  const challengeDelete = trpc.admin.challenges.delete.useMutation();

  const planOptions = useMemo(
    () => (plansQuery.data?.items ?? []).map((p) => ({ value: `${p.id}`, label: `${p.name} (${p.year})` })),
    [plansQuery.data],
  );

  const goBack = () => router.replace("/admin/days" as any);

  const updateDraft = (index: number, patch: Partial<DayChallengeDraft>) =>
    setDrafts((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  const removeDraft = (index: number) => setDrafts((prev) => prev.filter((_, idx) => idx !== index));
  const addDraft = () => setDrafts((prev) => [...prev, newDraft()]);

  const invalidate = async () => {
    await Promise.all([
      utils.admin.devotionalDays.invalidate(),
      utils.admin.challenges.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  };

  const onSave = async () => {
    setError(null);
    const isoDate = brToIso(form.date);
    const payload = {
      planId: toInt(form.planId, 0),
      dayNumber: toInt(form.dayNumber, 1),
      date: isoDate ?? "",
      bibleReference: form.bibleReference,
      devotionalText: form.devotionalText.trim() || null,
      reflectionQuestion: form.reflectionQuestion.trim() || null,
    };
    if (!payload.planId || !payload.dayNumber || !form.date) {
      setError("Preencha o plano, o número do dia e a data.");
      return;
    }
    if (!isoDate) {
      setError("Data inválida. Use o formato DD/MM/AAAA.");
      return;
    }
    if (!payload.bibleReference.trim()) {
      setError("Informe a referência bíblica.");
      return;
    }
    if (drafts.some((c) => c.title.trim().length === 0)) {
      setError("Preencha o título de todos os desafios.");
      return;
    }

    setSaving(true);
    try {
      let savedId = dayId;
      if (dayId) {
        await dayUpdate.mutateAsync({ id: dayId, ...payload });
      } else {
        const created = await dayCreate.mutateAsync(payload);
        savedId = created?.id ?? null;
        if (!savedId) {
          const refreshed = await utils.admin.devotionalDays.list.fetch({
            page: 1,
            limit: 100,
            planId: payload.planId,
          });
          const match = refreshed.items.find(
            (d) =>
              d.planId === payload.planId &&
              d.dayNumber === payload.dayNumber &&
              String(d.date).slice(0, 10) === payload.date,
          );
          savedId = match?.id ?? null;
        }
        if (!savedId) {
          setError("Não foi possível obter o ID do dia para salvar os desafios.");
          await invalidate();
          return;
        }
      }

      const targetDayId: number = savedId ?? 0;
      const entries = drafts.filter((c) => c.title.trim().length > 0);
      const usedIds = new Set<number>();
      for (const challenge of entries) {
        const challengePayload = {
          devotionalDayId: targetDayId,
          type: challenge.type,
          title: challenge.title,
          description: challenge.description.trim() || null,
          baseXp: toInt(challenge.baseXp, 10),
          baseDenario: toInt(challenge.baseDenario, 5),
        };
        if (challenge.id) {
          await challengeUpdate.mutateAsync({ id: challenge.id, ...challengePayload });
          usedIds.add(challenge.id);
        } else {
          await challengeCreate.mutateAsync(challengePayload);
        }
      }
      if (dayId) {
        for (const id of originalIds.filter((oid) => !usedIds.has(oid))) {
          await challengeDelete.mutateAsync({ id });
        }
      }

      await invalidate();
      notifications.success(dayId ? "Dia atualizado" : "Dia criado");
      goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar o dia";
      setError(message);
      notifications.error(message);
      await invalidate();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!dayId) return;
    const ok = await confirmAction(
      `Excluir o dia ${form.dayNumber}${form.bibleReference ? ` (${form.bibleReference})` : ""}? Os desafios dele também serão apagados.`,
      "Excluir",
    );
    if (!ok) return;
    try {
      await dayDelete.mutateAsync({ id: dayId });
      await invalidate();
      notifications.success("Dia excluído");
      goBack();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao excluir o dia";
      setError(message);
      notifications.error(message);
    }
  };

  if (!isNew && !dayId) {
    return <EmptyState icon="lock" title="Dia inválido" action={<Btn title="Voltar" onPress={goBack} />} />;
  }
  if (dayId && (dayQuery.isLoading || challengesQuery.isLoading)) return <Loading />;
  if (dayId && (dayQuery.error || challengesQuery.error)) {
    return (
      <EmptyState
        icon="lock"
        title="Não foi possível carregar o dia"
        text={(dayQuery.error ?? challengesQuery.error)?.message}
        action={<Btn title="Voltar" onPress={goBack} />}
      />
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title={isNew ? "Novo dia devocional" : `Dia ${form.dayNumber || ""}`.trim()}
        subtitle={isNew ? "Cadastre a leitura e os desafios do dia" : form.bibleReference || "Editar dia devocional"}
        onBack={goBack}
      />

      <Card>
        <View style={{ gap: 24 }}>
          <FormSection title="Dados do dia">
            {plansQuery.isLoading ? (
              <Loading label="Carregando planos..." />
            ) : planOptions.length === 0 ? (
              <Text className="text-muted text-sm">Nenhum plano cadastrado. Crie um plano antes de cadastrar dias.</Text>
            ) : (
              <SelectField
                label="Plano"
                required
                options={planOptions}
                value={form.planId}
                onChange={(planId) => setForm((p) => ({ ...p, planId }))}
              />
            )}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <View style={{ flexGrow: 1, flexBasis: 160 }}>
                <TextField
                  label="Número do dia"
                  required
                  keyboardType="number-pad"
                  value={form.dayNumber}
                  onChangeText={(dayNumber) => setForm((p) => ({ ...p, dayNumber: dayNumber.replace(/\D/g, "") }))}
                />
              </View>
              <View style={{ flexGrow: 1, flexBasis: 160 }}>
                <TextField
                  label="Data"
                  required
                  keyboardType="number-pad"
                  placeholder="DD/MM/AAAA"
                  value={form.date}
                  onChangeText={(date) => setForm((p) => ({ ...p, date: formatDateInput(date) }))}
                />
              </View>
            </View>
            <TextField
              label="Referência bíblica"
              required
              placeholder="Ex.: João 3:16-21"
              value={form.bibleReference}
              onChangeText={(bibleReference) => setForm((p) => ({ ...p, bibleReference }))}
            />
            <TextField
              label="Texto devocional"
              multiline
              value={form.devotionalText}
              onChangeText={(devotionalText) => setForm((p) => ({ ...p, devotionalText }))}
            />
            <TextField
              label="Pergunta de reflexão"
              value={form.reflectionQuestion}
              onChangeText={(reflectionQuestion) => setForm((p) => ({ ...p, reflectionQuestion }))}
            />
          </FormSection>

          <FormSection
            title="Desafios do dia"
            description={
              dayId
                ? "Edite ou adicione desafios — tudo é salvo junto com o dia."
                : "Adicione desafios para criar junto com o dia."
            }
          >
            {drafts.length === 0 ? (
              <Text className="text-muted text-sm">Nenhum desafio neste dia.</Text>
            ) : (
              drafts.map((challenge, index) => (
                <View
                  key={challenge.id ? `c-${challenge.id}` : `draft-${index}`}
                  className="border border-border rounded-xl"
                  style={{ padding: 12, gap: 12 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <Text className="text-foreground font-bold">Desafio {index + 1}</Text>
                    <Btn
                      size="sm"
                      variant="ghost"
                      title="Remover"
                      accessibilityLabel={`Remover desafio ${index + 1}`}
                      onPress={() => removeDraft(index)}
                    />
                  </View>
                  <SelectField
                    label="Tipo"
                    options={CHALLENGE_TYPES}
                    value={challenge.type}
                    onChange={(type) => updateDraft(index, { type })}
                  />
                  <TextField
                    label="Título"
                    required
                    value={challenge.title}
                    onChangeText={(title) => updateDraft(index, { title })}
                  />
                  <TextField
                    label="Descrição"
                    value={challenge.description}
                    onChangeText={(description) => updateDraft(index, { description })}
                  />
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    <View style={{ flexGrow: 1, flexBasis: 120 }}>
                      <TextField
                        label="XP"
                        keyboardType="number-pad"
                        value={challenge.baseXp}
                        onChangeText={(baseXp) => updateDraft(index, { baseXp })}
                      />
                    </View>
                    <View style={{ flexGrow: 1, flexBasis: 120 }}>
                      <TextField
                        label="Denários"
                        keyboardType="number-pad"
                        value={challenge.baseDenario}
                        onChangeText={(baseDenario) => updateDraft(index, { baseDenario })}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
            <Btn variant="secondary" size="sm" title="Adicionar desafio" onPress={addDraft} />
          </FormSection>

          <FormError message={error} />
          <FormActions
            onCancel={goBack}
            onSave={onSave}
            saving={saving}
            saveLabel={isNew ? "Criar dia" : "Salvar"}
            onDelete={dayId ? onDelete : undefined}
            deleting={dayDelete.isPending}
          />
        </View>
      </Card>
    </View>
  );
}

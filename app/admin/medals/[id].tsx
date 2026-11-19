import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { GameIcon } from "@/components/game-icon";
import {
  Badge,
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
  ToggleField,
  confirmAction,
} from "@/components/panel/ui";
import {
  CHALLENGE_TYPES,
  EMPTY_MEDAL_FORM,
  MEDAL_CATEGORIES,
  MEDAL_EMOJI_OPTIONS,
  MEDAL_REQUIREMENT_OPTIONS,
  buildMedalRequirement,
  medalCategoryLabel,
  medalToForm,
  toInt,
  type MedalFormState,
  type MedalIconType,
} from "@/lib/admin/medals";

const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());
const isNonNegativeInt = (v: string) => /^\d+$/.test(v.trim());

const ICON_TYPES: { value: MedalIconType; label: string }[] = [
  { value: "emoji", label: "Emoji" },
  { value: "image", label: "Imagem (URL)" },
];

function MedalPreview({ form }: { form: MedalFormState }) {
  const url = form.iconType === "image" && isUrl(form.iconUrl) ? form.iconUrl.trim() : null;
  const grayUrl = form.iconType === "image" && isUrl(form.iconUrlGray) ? form.iconUrlGray.trim() : null;
  const emoji = form.iconType === "emoji" ? form.iconEmoji.trim() : "";
  const icon = (src: string | null, locked: boolean) => (
    <View
      style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: locked ? "rgba(107,94,76,0.12)" : "rgba(242,181,12,0.18)",
        borderWidth: 2,
        borderColor: locked ? "rgba(107,94,76,0.30)" : "#F2B50C",
      }}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: 52, height: 52 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : emoji ? (
        <Text style={{ fontSize: 36, opacity: locked ? 0.35 : 1 }}>{emoji}</Text>
      ) : (
        <GameIcon name="medal-gold" size={48} />
      )}
    </View>
  );
  return (
    <View style={{ gap: 12 }} accessibilityLabel={`Prévia da medalha ${form.name || "sem nome"}`}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          {icon(url, false)}
          <Text className="text-muted text-xs">Conquistada</Text>
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          {icon(grayUrl ?? url, true)}
          <Text className="text-muted text-xs">Bloqueada</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Text className="text-foreground font-extrabold text-base">{form.name.trim() || "Nome da medalha"}</Text>
        <Text className="text-muted text-sm">{form.description.trim() || "Descrição da medalha"}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Badge tone="brand" label={medalCategoryLabel(form.category)} />
        <Badge tone={form.isActive ? "good" : "neutral"} label={form.isActive ? "Ativa" : "Inativa"} />
      </View>
    </View>
  );
}

export default function AdminMedalForm() {
  const router = useRouter();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const params = useLocalSearchParams<{ id: string }>();
  const isNew = params.id === "new";
  const id = isNew ? 0 : Number(params.id);
  const validId = isNew || (Number.isInteger(id) && id > 0);

  const record = trpc.admin.medals.byId.useQuery({ id }, { enabled: !isNew && validId });
  const [form, setForm] = useState<MedalFormState>(EMPTY_MEDAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (record.data) setForm(medalToForm(record.data));
  }, [record.data]);

  const create = trpc.admin.medals.create.useMutation();
  const update = trpc.admin.medals.update.useMutation();
  const remove = trpc.admin.medals.delete.useMutation();

  const set = <K extends keyof MedalFormState>(key: K, value: MedalFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const backToList = () => router.replace("/admin/medals" as any);
  const goBack = () => (router.canGoBack() ? router.back() : backToList());
  const invalidate = () => Promise.all([utils.admin.medals.invalidate(), utils.admin.stats.invalidate()]);

  const rt = form.requirementType;
  const errors = {
    name: !form.name.trim() ? "Informe o nome." : null,
    description: !form.description.trim() ? "Informe a descrição." : null,
    iconUrl: form.iconType === "image" && form.iconUrl.trim() && !isUrl(form.iconUrl) ? "URL inválida (use http/https)." : null,
    iconUrlGray:
      form.iconType === "image" && form.iconUrlGray.trim() && !isUrl(form.iconUrlGray) ? "URL inválida (use http/https)." : null,
    requirement: !buildMedalRequirement(form).trim() ? "Preencha o requisito da medalha." : null,
    order: !isNonNegativeInt(form.order) ? "Use um número inteiro (0 ou mais)." : null,
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
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      iconEmoji: form.iconType === "emoji" ? form.iconEmoji.trim() || null : null,
      iconUrl: form.iconType === "image" ? form.iconUrl.trim() || null : null,
      iconUrlGray: form.iconType === "image" ? form.iconUrlGray.trim() || null : null,
      requirement: buildMedalRequirement(form),
      order: toInt(form.order, 0),
      isActive: form.isActive,
    };
    try {
      if (isNew) {
        await create.mutateAsync(payload);
      } else {
        await update.mutateAsync({ id, ...payload });
      }
      await invalidate();
      notifications.success(isNew ? "Medalha criada" : "Medalha salva");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar a medalha";
      setError(message);
      notifications.error(message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction(
      `Excluir a medalha "${form.name}"? Ela também será removida de quem já a conquistou.`,
      "Excluir",
    );
    if (!ok) return;
    try {
      await remove.mutateAsync({ id });
      await invalidate();
      notifications.success("Medalha excluída");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao excluir a medalha";
      setError(message);
      notifications.error(message);
    }
  };

  if (!validId) {
    return <EmptyState icon="lock" title="Medalha inválida" action={<Btn title="Voltar à lista" onPress={backToList} />} />;
  }
  if (!isNew && record.isLoading) return <Loading label="Carregando medalha..." />;
  if (!isNew && (record.error || !record.data)) {
    return (
      <EmptyState
        icon="lock"
        title="Medalha não encontrada"
        text={record.error?.message}
        action={<Btn title="Voltar à lista" onPress={backToList} />}
      />
    );
  }

  const emojiOptions = MEDAL_EMOJI_OPTIONS.map((e) => ({ value: e, label: e }));

  return (
    <View style={{ gap: 16 }}>
      <PageHeader
        title={isNew ? "Nova medalha" : "Editar medalha"}
        subtitle={isNew ? "Uma conquista para os jogadores" : form.name}
        onBack={goBack}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <View style={{ flexGrow: 2, flexBasis: 420, minWidth: 0 }}>
          <Card>
            <View style={{ gap: 24 }}>
              <FormSection title="Informações">
                <TextField
                  label="Nome"
                  required
                  value={form.name}
                  onChangeText={(v) => set("name", v)}
                  error={touched ? errors.name : null}
                />
                <TextField
                  label="Descrição"
                  required
                  multiline
                  value={form.description}
                  onChangeText={(v) => set("description", v)}
                  error={touched ? errors.description : null}
                />
                <SelectField
                  label="Categoria"
                  required
                  options={MEDAL_CATEGORIES}
                  value={form.category}
                  onChange={(v) => set("category", v)}
                />
              </FormSection>

              <FormSection title="Ícone">
                <SelectField label="Tipo de ícone" options={ICON_TYPES} value={form.iconType} onChange={(v) => set("iconType", v)} />
                {form.iconType === "emoji" ? (
                  <>
                    <SelectField label="Emoji" options={emojiOptions} value={form.iconEmoji} onChange={(v) => set("iconEmoji", v)} />
                    <TextField
                      label="Emoji personalizado"
                      value={form.iconEmoji}
                      onChangeText={(v) => set("iconEmoji", v)}
                      placeholder="Cole qualquer emoji"
                    />
                  </>
                ) : (
                  <>
                    <TextField
                      label="URL da imagem (colorida)"
                      value={form.iconUrl}
                      onChangeText={(v) => set("iconUrl", v)}
                      placeholder="https://..."
                      autoCapitalize="none"
                      keyboardType="url"
                      error={touched ? errors.iconUrl : null}
                    />
                    <TextField
                      label="URL da imagem (cinza / bloqueada)"
                      value={form.iconUrlGray}
                      onChangeText={(v) => set("iconUrlGray", v)}
                      placeholder="https://..."
                      autoCapitalize="none"
                      keyboardType="url"
                      hint="Opcional. Mostrada enquanto a medalha não foi conquistada."
                      error={touched ? errors.iconUrlGray : null}
                    />
                  </>
                )}
              </FormSection>

              <FormSection title="Requisito" description="O que o jogador precisa fazer para ganhar a medalha.">
                <SelectField
                  label="Tipo de requisito"
                  required
                  options={MEDAL_REQUIREMENT_OPTIONS}
                  value={rt}
                  onChange={(v) => set("requirementType", v)}
                />
                {rt === "streak" ? (
                  <TextField
                    label="Dias de sequência"
                    value={form.requirementDays}
                    onChangeText={(v) => set("requirementDays", v)}
                    keyboardType="number-pad"
                  />
                ) : null}
                {rt === "challenge_type_count" ? (
                  <SelectField
                    label="Tipo de desafio"
                    options={CHALLENGE_TYPES}
                    value={form.requirementChallengeType}
                    onChange={(v) => set("requirementChallengeType", v)}
                  />
                ) : null}
                {rt === "total_devotionals" || rt === "total_reflections" || rt === "challenge_type_count" ? (
                  <TextField
                    label="Quantidade"
                    value={form.requirementCount}
                    onChangeText={(v) => set("requirementCount", v)}
                    keyboardType="number-pad"
                  />
                ) : null}
                {rt === "multiple_books" ? (
                  <TextField
                    label="Livros"
                    value={form.requirementBooks}
                    onChangeText={(v) => set("requirementBooks", v)}
                    placeholder="Gênesis, Êxodo, Salmos"
                    hint="Separe os livros por vírgula."
                  />
                ) : null}
                {rt === "book" ? (
                  <TextField
                    label="Nome do livro"
                    value={form.requirementBookName}
                    onChangeText={(v) => set("requirementBookName", v)}
                  />
                ) : null}
                {rt === "early_bird" || rt === "night_owl" ? (
                  <TextField
                    label="Hora (0–23)"
                    value={form.requirementHour}
                    onChangeText={(v) => set("requirementHour", v)}
                    keyboardType="number-pad"
                  />
                ) : null}
                {rt === "custom" ? (
                  <TextField
                    label="Requisito bruto"
                    multiline
                    value={form.requirementRaw}
                    onChangeText={(v) => set("requirementRaw", v)}
                    placeholder='JSON ou texto, ex.: {"type":"streak","days":30}'
                    autoCapitalize="none"
                    error={touched ? errors.requirement : null}
                  />
                ) : null}
              </FormSection>

              <FormSection title="Exibição">
                <TextField
                  label="Ordem"
                  value={form.order}
                  onChangeText={(v) => set("order", v)}
                  keyboardType="number-pad"
                  hint="Menor aparece primeiro."
                  error={touched ? errors.order : null}
                />
                <ToggleField
                  label="Ativa"
                  value={form.isActive}
                  onChange={(v) => set("isActive", v)}
                />
              </FormSection>

              <FormError message={error} />
              <FormActions
                onCancel={goBack}
                onSave={handleSave}
                saving={create.isPending || update.isPending}
                saveLabel={isNew ? "Criar medalha" : "Salvar"}
                onDelete={isNew ? undefined : handleDelete}
                deleting={remove.isPending}
              />
            </View>
          </Card>
        </View>

        <View style={{ flexGrow: 1, flexBasis: 260, minWidth: 0 }}>
          <Card title="Prévia" subtitle="Como o jogador vê a medalha">
            <MedalPreview form={form} />
          </Card>
        </View>
      </View>
    </View>
  );
}

/** Admin · create / edit an encouragement message. */
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { GameIcon } from "@/components/game-icon";
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
  ToggleField,
  confirmAction,
} from "@/components/panel/ui";
import { ENCOURAGEMENT_CATEGORIES, ENCOURAGEMENT_INFO, type EncouragementType } from "@shared/engagement";

type Form = {
  label: string;
  receivedText: string;
  emoji: string;
  category: EncouragementType;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: Form = { label: "", receivedText: "", emoji: "", category: "CHEER", sortOrder: "10", isActive: true };

export default function AdminMessageFormPage() {
  const params = useLocalSearchParams<{ id: string }>();
  return <AdminMessageForm idParam={params.id} />;
}

export function AdminMessageForm({ idParam }: { idParam: string | undefined }) {
  const router = useRouter();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const isNew = idParam === "new";
  const id = isNew ? 0 : Number(idParam);
  const validId = isNew || (Number.isInteger(id) && id > 0);

  const record = trpc.admin.encouragementMessages.byId.useQuery({ id }, { enabled: !isNew && validId });
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = record.data;
    if (!r) return;
    setForm({
      label: r.label,
      receivedText: r.receivedText,
      emoji: r.emoji,
      category: (["PRAYED", "CHEER", "PROUD"].includes(r.category) ? r.category : "CHEER") as EncouragementType,
      sortOrder: String(r.sortOrder),
      isActive: r.isActive,
    });
  }, [record.data]);

  const create = trpc.admin.encouragementMessages.create.useMutation();
  const update = trpc.admin.encouragementMessages.update.useMutation();
  const remove = trpc.admin.encouragementMessages.delete.useMutation();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((p) => ({ ...p, [key]: value }));
  const backToList = () => router.replace("/admin/messages" as any);
  const goBack = () => (router.canGoBack() ? router.back() : backToList());

  const errors = {
    label: form.label.trim().length < 2 ? "Escreva a mensagem." : null,
    receivedText: form.receivedText.trim().length < 2 ? "Escreva o que aparece para quem recebe." : null,
    sortOrder: /^\d+$/.test(form.sortOrder.trim()) ? null : "Use um número inteiro.",
  };

  const handleSave = async () => {
    setTouched(true);
    setError(null);
    const first = Object.values(errors).find(Boolean);
    if (first) {
      setError(first);
      return;
    }
    const payload = {
      label: form.label.trim(),
      receivedText: form.receivedText.trim(),
      emoji: form.emoji.trim(),
      category: form.category,
      sortOrder: Number(form.sortOrder.trim()),
      isActive: form.isActive,
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ id, ...payload });
      await utils.admin.encouragementMessages.invalidate();
      notifications.success(isNew ? "Mensagem criada" : "Mensagem salva");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar a mensagem";
      setError(message);
      notifications.error(message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction(
      `Excluir “${form.label}”? Ela some da lista dos jogadores. As cartinhas já enviadas continuam aparecendo.`,
      "Excluir",
    );
    if (!ok) return;
    try {
      await remove.mutateAsync({ id });
      await utils.admin.encouragementMessages.invalidate();
      notifications.success("Mensagem excluída");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao excluir a mensagem";
      setError(message);
      notifications.error(message);
    }
  };

  if (!validId) return <EmptyState icon="lock" title="Mensagem inválida" action={<Btn title="Voltar à lista" onPress={backToList} />} />;
  if (!isNew && record.isLoading) return <Loading label="Carregando mensagem..." />;
  if (!isNew && (record.error || !record.data)) {
    return <EmptyState icon="lock" title="Mensagem não encontrada" text={record.error?.message} action={<Btn title="Voltar à lista" onPress={backToList} />} />;
  }

  const icon = ENCOURAGEMENT_INFO[form.category].icon;

  return (
    <View style={{ gap: 16 }}>
      <PageHeader title={isNew ? "Nova mensagem" : "Editar mensagem"} subtitle={isNew ? "Um jeito novo de encorajar" : form.label} onBack={goBack} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <View style={{ flexGrow: 2, flexBasis: 420, minWidth: 0 }}>
          <Card>
            <View style={{ gap: 24 }}>
              <FormSection title="Mensagem">
                <TextField
                  label="O que o jogador escolhe enviar"
                  required
                  value={form.label}
                  onChangeText={(v) => set("label", v)}
                  placeholder="Ex.: Deus tem um plano lindo pra você"
                  error={touched ? errors.label : null}
                />
                <TextField
                  label="O que aparece para quem recebe"
                  required
                  value={form.receivedText}
                  onChangeText={(v) => set("receivedText", v)}
                  placeholder="Ex.: disse que Deus tem um plano lindo pra você"
                  hint="Vem depois do nome de quem mandou: “Ana disse que…”."
                  error={touched ? errors.receivedText : null}
                />
                <TextField label="Emoji (opcional)" value={form.emoji} onChangeText={(v) => set("emoji", v)} placeholder="Ex.: 🌟" />
                <SelectField
                  label="Categoria"
                  options={ENCOURAGEMENT_CATEGORIES}
                  value={form.category}
                  onChange={(v) => set("category", v)}
                />
              </FormSection>

              <FormSection title="Exibição">
                <TextField
                  label="Ordem"
                  keyboardType="number-pad"
                  value={form.sortOrder}
                  onChangeText={(v) => set("sortOrder", v)}
                  hint="Menor aparece primeiro."
                  error={touched ? errors.sortOrder : null}
                />
                <ToggleField label="Ativa (aparece para os jogadores)" value={form.isActive} onChange={(v) => set("isActive", v)} />
              </FormSection>

              <FormError message={error} />
              <FormActions
                onCancel={goBack}
                onSave={handleSave}
                saving={create.isPending || update.isPending}
                saveLabel={isNew ? "Criar mensagem" : "Salvar"}
                onDelete={isNew ? undefined : handleDelete}
                deleting={remove.isPending}
              />
            </View>
          </Card>
        </View>

        <View style={{ flexGrow: 1, flexBasis: 260, minWidth: 0 }}>
          <Card title="Prévia" subtitle="Quem envia escolhe · quem recebe lê">
            <View style={{ gap: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 3,
                  borderColor: "#F2B50C",
                  backgroundColor: "rgba(242,181,12,0.14)",
                }}
              >
                <GameIcon name={icon} size={34} style={{ marginRight: 10 }} />
                <Text className="text-foreground font-extrabold flex-1">{form.label.trim() || "Sua mensagem"}</Text>
              </View>
              <View style={{ padding: 12, borderRadius: 16, backgroundColor: "#F4E4C1" }}>
                <Text style={{ color: "#3B2A06", fontWeight: "700" }}>
                  {form.emoji.trim() ? `${form.emoji.trim()} ` : ""}Ana {form.receivedText.trim() || "…"}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

/**
 * Admin · create / edit a Baú de Desafio: rules (price, deadline, how many challenges are
 * drawn, reward) and the pool of challenges. Chests already bought keep their own copy.
 */
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useNotifications } from "@/components/notification-provider";
import { ChestArt } from "@/components/reino/chest-art";
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
  CHALLENGE_KINDS,
  CHEST_COLORS,
  challengeKindInfo,
  deadlineLabel,
  toChestChallenge,
  type ChallengeKind,
  type PoolChallenge,
} from "@shared/chests";

type Row = { kind: ChallengeKind; target: string; text: string; emoji: string; messageId: number | null };

type Form = {
  name: string;
  description: string;
  color: string;
  price: string;
  days: string;
  challengeCount: string;
  rewardXp: string;
  rewardDenario: string;
  sortOrder: string;
  isActive: boolean;
  rows: Row[];
};

const EMPTY: Form = {
  name: "",
  description: "",
  color: CHEST_COLORS[2].value,
  price: "100",
  days: "3",
  challengeCount: "2",
  rewardXp: "100",
  rewardDenario: "150",
  sortOrder: "10",
  isActive: true,
  rows: [
    { kind: "ENCOURAGE_PEOPLE", target: "3", text: "", emoji: "", messageId: null },
    { kind: "DEVOTIONAL_DAYS", target: "2", text: "", emoji: "", messageId: null },
  ],
};

const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);

const KIND_OPTIONS = CHALLENGE_KINDS.map((k) => ({ value: k.kind, label: `${k.emoji} ${k.label}` }));

export default function AdminChestFormPage() {
  const params = useLocalSearchParams<{ id: string }>();
  return <AdminChestForm idParam={params.id} />;
}

export function AdminChestForm({ idParam }: { idParam: string | undefined }) {
  const router = useRouter();
  const notifications = useNotifications();
  const utils = trpc.useUtils();
  const isNew = idParam === "new";
  const id = isNew ? 0 : Number(idParam);
  const validId = isNew || (Number.isInteger(id) && id > 0);

  const record = trpc.admin.chestTypes.byId.useQuery({ id }, { enabled: !isNew && validId });
  const messages = trpc.admin.encouragementMessages.list.useQuery();
  const messageOptions = (messages.data ?? []).map((m) => ({
    value: m.id,
    label: `${m.emoji ? `${m.emoji} ` : ""}${m.label}${m.isActive ? "" : " (desativada)"}`,
  }));
  const messageLabelOf = (messageId: number | null) => messages.data?.find((m) => m.id === messageId)?.label;
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = record.data;
    if (!r) return;
    let pool: PoolChallenge[] = [];
    try {
      pool = JSON.parse(r.challenges);
    } catch {
      pool = [];
    }
    setForm({
      name: r.name,
      description: r.description,
      color: r.color,
      price: String(r.price),
      days: String(r.days),
      challengeCount: String(r.challengeCount),
      rewardXp: String(r.rewardXp),
      rewardDenario: String(r.rewardDenario),
      sortOrder: String(r.sortOrder),
      isActive: r.isActive,
      rows: pool.map((p) => ({
        kind: p.kind,
        target: String(p.target ?? 1),
        text: p.text ?? "",
        emoji: p.emoji ?? "",
        messageId: p.messageId ?? null,
      })),
    });
  }, [record.data]);

  const create = trpc.admin.chestTypes.create.useMutation();
  const update = trpc.admin.chestTypes.update.useMutation();
  const remove = trpc.admin.chestTypes.delete.useMutation();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((p) => ({ ...p, [key]: value }));
  const setRow = (i: number, patch: Partial<Row>) =>
    setForm((p) => ({ ...p, rows: p.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const addRow = () =>
    setForm((p) => ({ ...p, rows: [...p.rows, { kind: "PRAY_FOR", target: "1", text: "", emoji: "", messageId: null }] }));
  const removeRow = (i: number) => setForm((p) => ({ ...p, rows: p.rows.filter((_, j) => j !== i) }));

  const backToList = () => router.replace("/admin/chests" as any);
  const goBack = () => (router.canGoBack() ? router.back() : backToList());

  const tracked = form.rows.filter((r) => r.kind !== "HONOR").length;
  const honor = form.rows.length - tracked;
  const count = int(form.challengeCount);
  const errors = {
    name: form.name.trim().length < 2 ? "Dê um nome ao baú." : null,
    price: isNaN(int(form.price)) ? "Use um número inteiro." : null,
    days: isNaN(int(form.days)) || int(form.days) < 1 || int(form.days) > 60 ? "Entre 1 e 60 dias." : null,
    challengeCount: isNaN(count) || count < 1 || count > 10 ? "Entre 1 e 10." : null,
    rewardXp: isNaN(int(form.rewardXp)) ? "Use um número inteiro." : null,
    rewardDenario: isNaN(int(form.rewardDenario)) ? "Use um número inteiro." : null,
    sortOrder: isNaN(int(form.sortOrder)) ? "Use um número inteiro." : null,
    pool:
      form.rows.length === 0
        ? "Adicione pelo menos um desafio."
        : !isNaN(count) && tracked + Math.min(honor, 1) < count
          ? `O baú sorteia ${count} desafios, mas só dá para sortear ${tracked + Math.min(honor, 1)} (no máximo 1 de confiança por baú). Adicione mais desafios ou diminua o número.`
          : form.rows.some((r) => r.kind !== "HONOR" && (isNaN(int(r.target)) || int(r.target) < 1))
            ? "Cada desafio precisa de uma meta (número maior que 0)."
            : form.rows.some((r) => r.kind === "HONOR" && !r.text.trim())
              ? "Desafio de confiança precisa de um texto (o que a criança vai fazer)."
              : form.rows.some((r) => r.kind === "SEND_MESSAGE" && !r.messageId)
                ? "Escolha qual mensagem deve ser enviada."
                : null,
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
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      price: int(form.price),
      days: int(form.days),
      challengeCount: int(form.challengeCount),
      rewardXp: int(form.rewardXp),
      rewardDenario: int(form.rewardDenario),
      sortOrder: int(form.sortOrder),
      isActive: form.isActive,
      challenges: form.rows.map((r) => ({
        kind: r.kind,
        target: r.kind === "HONOR" ? 1 : int(r.target),
        text: r.text.trim() || undefined,
        emoji: r.emoji.trim() || undefined,
        ...(r.kind === "SEND_MESSAGE" && r.messageId
          ? { messageId: r.messageId, messageLabel: messageLabelOf(r.messageId) }
          : {}),
      })),
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ id, ...payload });
      await utils.admin.chestTypes.invalidate();
      notifications.success(isNew ? "Baú criado" : "Baú salvo");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar o baú";
      setError(message);
      notifications.error(message);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction(
      `Excluir o "${form.name}"? Ele sai do Mercado. Quem já comprou continua com o baú e os desafios dele.`,
      "Excluir",
    );
    if (!ok) return;
    try {
      await remove.mutateAsync({ id });
      await utils.admin.chestTypes.invalidate();
      notifications.success("Baú excluído");
      backToList();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao excluir o baú";
      setError(message);
      notifications.error(message);
    }
  };

  if (!validId) return <EmptyState icon="lock" title="Baú inválido" action={<Btn title="Voltar à lista" onPress={backToList} />} />;
  if (!isNew && record.isLoading) return <Loading label="Carregando baú..." />;
  if (!isNew && (record.error || !record.data)) {
    return (
      <EmptyState icon="lock" title="Baú não encontrado" text={record.error?.message} action={<Btn title="Voltar à lista" onPress={backToList} />} />
    );
  }

  const profit = int(form.rewardDenario) - int(form.price);

  return (
    <View style={{ gap: 16 }}>
      <PageHeader title={isNew ? "Novo baú" : "Editar baú"} subtitle={isNew ? "Um baú para o Mercado" : form.name} onBack={goBack} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <View style={{ flexGrow: 2, flexBasis: 420, minWidth: 0 }}>
          <Card>
            <View style={{ gap: 24 }}>
              <FormSection title="Informações">
                <TextField label="Nome" required value={form.name} onChangeText={(v) => set("name", v)} error={touched ? errors.name : null} placeholder="Ex.: Baú da Páscoa" />
                <TextField
                  label="Descrição"
                  value={form.description}
                  onChangeText={(v) => set("description", v)}
                  placeholder="Ex.: 2 desafios em 3 dias"
                  hint="Opcional. Se ficar vazio, o app mostra quantos desafios e o prazo."
                />
                <SelectField label="Cor" options={CHEST_COLORS} value={form.color} onChange={(v) => set("color", v)} />
              </FormSection>

              <FormSection title="Regras e prêmio">
                <TextField label="Preço (denários)" required keyboardType="number-pad" value={form.price} onChangeText={(v) => set("price", v)} error={touched ? errors.price : null} />
                <TextField label="Prazo (dias)" required keyboardType="number-pad" value={form.days} onChangeText={(v) => set("days", v)} error={touched ? errors.days : null} />
                <TextField
                  label="Quantos desafios sortear"
                  required
                  keyboardType="number-pad"
                  value={form.challengeCount}
                  onChangeText={(v) => set("challengeCount", v)}
                  hint="Sorteados da lista abaixo a cada compra. Para desafios fixos, use o mesmo número de desafios da lista."
                  error={touched ? errors.challengeCount : null}
                />
                <TextField label="Prêmio em denários" required keyboardType="number-pad" value={form.rewardDenario} onChangeText={(v) => set("rewardDenario", v)} error={touched ? errors.rewardDenario : null} />
                <TextField label="Prêmio em XP" required keyboardType="number-pad" value={form.rewardXp} onChangeText={(v) => set("rewardXp", v)} error={touched ? errors.rewardXp : null} />
              </FormSection>

              <FormSection
                title={`Desafios (${form.rows.length})`}
                description="A lista de onde os desafios são sorteados. O app confere sozinho a atividade feita depois da compra; os de confiança a criança marca com “Eu fiz!”."
              >
                {form.rows.map((r, i) => {
                  const info = challengeKindInfo(r.kind);
                  const isHonor = r.kind === "HONOR";
                  const preview = toChestChallenge(
                    {
                      kind: r.kind,
                      target: isNaN(int(r.target)) ? 1 : int(r.target),
                      text: r.text,
                      emoji: r.emoji,
                      messageLabel: messageLabelOf(r.messageId),
                    },
                    i,
                  );
                  return (
                    <View
                      key={i}
                      style={{ borderWidth: 1, borderColor: "rgba(139,90,43,0.22)", borderRadius: 14, padding: 12, gap: 10 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text className="text-foreground font-extrabold flex-1">
                          {preview.emoji} {preview.text}
                        </Text>
                        <Btn size="sm" variant="ghost" title="Remover" accessibilityLabel={`Remover desafio ${i + 1}`} onPress={() => removeRow(i)} />
                      </View>
                      <SelectField label="Tipo" options={KIND_OPTIONS} value={r.kind} onChange={(v) => setRow(i, { kind: v as ChallengeKind })} />
                      {r.kind === "SEND_MESSAGE" ? (
                        messageOptions.length ? (
                          <SelectField
                            label="Qual mensagem"
                            required
                            options={messageOptions}
                            value={r.messageId ?? -1}
                            onChange={(v) => setRow(i, { messageId: v })}
                          />
                        ) : (
                          <Text className="text-muted text-sm">Cadastre mensagens em Gamificação → Mensagens primeiro.</Text>
                        )
                      ) : null}
                      {!isHonor ? (
                        <TextField label={`Meta · ${info.targetLabel}`} keyboardType="number-pad" value={r.target} onChangeText={(v) => setRow(i, { target: v })} />
                      ) : null}
                      <TextField
                        label={isHonor ? "O que a criança vai fazer" : "Texto (opcional)"}
                        required={isHonor}
                        value={r.text}
                        onChangeText={(v) => setRow(i, { text: v })}
                        placeholder={
                          isHonor
                            ? "Ex.: Leia um Salmo em voz alta para alguém da sua casa"
                            : info.text(isNaN(int(r.target)) ? 1 : int(r.target), messageLabelOf(r.messageId))
                        }
                      />
                      <TextField label="Emoji (opcional)" value={r.emoji} onChangeText={(v) => setRow(i, { emoji: v })} placeholder={info.emoji} />
                    </View>
                  );
                })}
                <Btn variant="secondary" title="+ Adicionar desafio" onPress={addRow} />
                {touched && errors.pool ? <Text style={{ color: "#A11F25", fontSize: 13, fontWeight: "700" }}>{errors.pool}</Text> : null}
              </FormSection>

              <FormSection title="Exibição">
                <TextField label="Ordem no Mercado" keyboardType="number-pad" value={form.sortOrder} onChangeText={(v) => set("sortOrder", v)} hint="Menor aparece primeiro." error={touched ? errors.sortOrder : null} />
                <ToggleField label="À venda no Mercado" value={form.isActive} onChange={(v) => set("isActive", v)} />
              </FormSection>

              <FormError message={error} />
              <FormActions
                onCancel={goBack}
                onSave={handleSave}
                saving={create.isPending || update.isPending}
                saveLabel={isNew ? "Criar baú" : "Salvar"}
                onDelete={isNew ? undefined : handleDelete}
                deleting={remove.isPending}
              />
            </View>
          </Card>
        </View>

        <View style={{ flexGrow: 1, flexBasis: 260, minWidth: 0 }}>
          <Card title="Prévia" subtitle="Como aparece no Mercado">
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ChestArt color={form.color} size={64} />
                <View style={{ flex: 1 }}>
                  <Text className="text-foreground font-extrabold text-base">{form.name.trim() || "Nome do baú"}</Text>
                  <Text className="text-muted text-sm">
                    {form.description.trim() ||
                      `${isNaN(count) ? "?" : count} ${count === 1 ? "desafio" : "desafios"} em ${deadlineLabel(isNaN(int(form.days)) ? 1 : int(form.days))}`}
                  </Text>
                </View>
              </View>
              <Text className="text-foreground text-sm font-bold">
                Custa {isNaN(int(form.price)) ? "?" : int(form.price)} · prêmio +{isNaN(int(form.rewardDenario)) ? "?" : int(form.rewardDenario)} denários e +
                {isNaN(int(form.rewardXp)) ? "?" : int(form.rewardXp)} XP
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Badge label={form.isActive ? "À venda" : "Fora do Mercado"} tone={form.isActive ? "good" : "neutral"} />
                {!isNaN(profit) ? (
                  <Badge label={profit >= 0 ? `Lucro +${profit} ao completar` : `Prejuízo ${profit}: ninguém vai querer!`} tone={profit > 0 ? "brand" : "bad"} />
                ) : null}
              </View>
              <Text className="text-muted text-xs">
                A cada compra, {isNaN(count) ? "?" : count} de {form.rows.length} desafios são sorteados (no máximo 1 de confiança).
              </Text>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

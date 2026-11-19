import { useEffect, useState } from "react";
import type React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { GameButton } from "@/components/game-button";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { HeroTexture } from "@/components/hero-texture";
import { Figurine } from "@/components/figurine";
import { DEFAULT_CHARACTER } from "@shared/character-catalog";
import { SOFT_SHADOW } from "@/lib/ui";
import { getLevelProgress } from "@shared/progression";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import axios from "axios";
import { useNotifications } from "@/components/notification-provider";
import { ReminderSettings } from "@/components/reminder-settings";

type GenderValue = "male" | "female" | "";

const GENDER_LABELS: Record<Exclude<GenderValue, "">, string> = {
  male: "Masculino",
  female: "Feminino",
};

const GENDER_OPTIONS: Array<{ value: GenderValue; label: string }> = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Feminino" },
];

const resolveGenderValue = (value?: string | null): GenderValue => {
  if (!value) return "";
  const normalized = value.toString().trim().toLowerCase();
  if (["male", "masculino"].includes(normalized)) return "male";
  if (["female", "feminino"].includes(normalized)) return "female";
  return "";
};

const getGenderLabel = (value?: string | null) => {
  const resolved = resolveGenderValue(value);
  return resolved ? GENDER_LABELS[resolved] : "-";
};

const formatBirthDateForDisplay = (value?: string | null | Date) => {
  if (!value) return "-";
  const isoValue =
    typeof value === "string" ? value : value.toISOString().split("T")[0];
  const [year, month, day] = isoValue.split("-");
  if (!day || !month || !year) return isoValue;
  return `${day}/${month}/${year}`;
};

const formatBirthDateForInput = (value?: string | null | Date) => {
  if (!value) return "";
  const isoValue =
    typeof value === "string" ? value : value.toISOString().split("T")[0];
  const [year, month, day] = isoValue.split("-");
  if (!day || !month || !year) return "";
  return `${day}/${month}/${year}`;
};

const maskBirthDateInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let formatted = day;
  if (digits.length > 2) {
    formatted += `/${month}`;
  }
  if (digits.length > 4) {
    formatted += `/${year}`;
  }
  return formatted;
};

const maskWhatsappInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) {
    return `(${digits}`;
  }

  const area = digits.slice(0, 2);
  const firstDigit = digits.slice(2, 3);
  const middle = digits.slice(3, Math.min(7, digits.length));
  const last = digits.slice(7, digits.length);

  const parts = [`(${area})`];
  let rest = firstDigit;
  if (middle) {
    rest += ` ${middle}`;
  }
  if (last) {
    rest += `-${last}`;
  }
  parts.push(rest.trim());
  return parts.join(" ").trim();
};

const formatWhatsappForInput = (value?: string | null) =>
  maskWhatsappInput(value ?? "");

const buildBirthDateIso = (digits: string) => {
  const day = digits.slice(0, 2).padStart(2, "0");
  const month = digits.slice(2, 4).padStart(2, "0");
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
};

const isFullNameValid = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { data: userData, refetch } = trpc.user.me.useQuery();

  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<GenderValue>("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [passwordMode, setPasswordMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const notifications = useNotifications();

  const getApiUrl = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const origin = window.location.origin
        .replace(":8081", ":3009")
        .replace("8081-", "3009-");
      return `${origin}/api`;
    }
    return "https://3000-il1293ezarklxcfek50kx-f2f21d31.us2.manus.computer/api";
  };

  const resetProfileForm = () => {
    setFullName("");
    setNickname("");
    setEmail("");
    setGender("");
    setBirthDate("");
    setWhatsapp("");
  };

  const handleStartEdit = () => {
    setFullName(userData?.name || "");
    setNickname(userData?.nickname || "");
    setEmail(userData?.email || "");
    setGender(resolveGenderValue(userData?.gender));
    setBirthDate(formatBirthDateForInput(userData?.birthDate));
    setWhatsapp(formatWhatsappForInput(userData?.whatsapp));
    setError("");
    setEditMode(true);
  };

  const handleUpdateProfile = async () => {
    const trimmedFullName = fullName.trim();
    if (trimmedFullName && !isFullNameValid(trimmedFullName)) {
      setError("Informe um nome completo com pelo menos duas palavras");
      return;
    }

    const trimmedNickname = nickname.trim();
    const trimmedEmail = email.trim();
    const trimmedWhatsapp = whatsapp.trim();

    const trimmedBirthDate = birthDate.trim();
    let birthDatePayload: string | null = null;

    if (trimmedBirthDate) {
      const digits = trimmedBirthDate.replace(/\D/g, "");
      if (digits.length !== 8) {
        setError("Informe a data de nascimento completa (DD/MM/AAAA)");
        return;
      }
      birthDatePayload = buildBirthDateIso(digits);
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = getApiUrl();
      const payload: Record<string, unknown> = {};
      if (trimmedFullName) {
        payload.name = trimmedFullName;
      }
      if (
        trimmedNickname &&
        trimmedNickname !== (userData?.nickname || "").trim()
      ) {
        payload.nickname = trimmedNickname;
      }
      if (trimmedEmail) payload.email = trimmedEmail.toLowerCase();
      payload.gender = gender || null;
      payload.birthDate = birthDatePayload;
      const normalizedWhatsapp = trimmedWhatsapp.replace(/\D/g, "");
      payload.whatsapp = normalizedWhatsapp || null;

      const response = await axios.put(`${apiUrl}/auth/profile`, payload, {
        withCredentials: true,
      });

      if (response.data.success) {
        await refetch();
        resetProfileForm();
        setEditMode(false);
        notifications.success("Perfil atualizado com sucesso!");
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.response?.data?.error || "Erro ao atualizar perfil");
      notifications.error(
        err.response?.data?.error || "Erro ao atualizar perfil",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      const message = "Preencha todos os campos";
      setPasswordError(message);
      notifications.error(message);
      return;
    }

    if (newPassword.length < 6) {
      const message = "Nova senha deve ter no mínimo 6 caracteres";
      setPasswordError(message);
      notifications.error(message);
      return;
    }

    if (newPassword !== confirmPassword) {
      const message = "As senhas não coincidem";
      setPasswordError(message);
      notifications.error(message);
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");

    try {
      const apiUrl = getApiUrl();
      const response = await axios.put(
        `${apiUrl}/auth/password`,
        {
          currentPassword,
          newPassword,
        },
        {
          withCredentials: true,
        },
      );

      if (response.data.success) {
        setPasswordMode(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        notifications.success("Senha alterada com sucesso!");
      }
    } catch (err: any) {
      console.error("Password change error:", err);
      const message = err.response?.data?.error || "Erro ao alterar senha";
      setPasswordError(message);
      notifications.error(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (confirm("Tem certeza que deseja sair?")) {
        logout();
        router.replace("/login" as any);
      }
    } else {
      Alert.alert("Sair", "Tem certeza que deseja sair?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/login" as any);
          },
        },
      ]);
    }
  };

  if (!userData) {
    return (
      <ScreenContainer className="justify-center items-center">
        <ActivityIndicator size="large" color="#8B4513" />
      </ScreenContainer>
    );
  }

  const levelProgress = getLevelProgress(userData.xpTotal || 0);
  const cancelProfileEdit = () => {
    setEditMode(false);
    resetProfileForm();
    setError("");
  };
  const cancelPasswordEdit = () => {
    setPasswordMode(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View className="bg-primary rounded-b-3xl px-5 pt-5 pb-6" style={SOFT_SHADOW}>
            <HeroTexture style={{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }} />
            <GameButton variant="wood" size="sm" title="Voltar" onPress={() => router.back()} />

            <View className="items-center mt-2">
              <View
                className="rounded-full items-center justify-center bg-white/90"
                style={{ width: 104, height: 104, borderWidth: 4, borderColor: "#F2B50C", overflow: "hidden" }}
              >
                <Figurine
                  figurine={
                    userData.figurine ?? {
                      character: DEFAULT_CHARACTER,
                      chosen: false,
                      look: "original",
                      hair: null,
                      accessory: null,
                    }
                  }
                  height={96}
                  mode="head"
                  label={`Avatar de ${userData.nickname}`}
                />
              </View>
              <Text className="font-display mt-3" style={{ color: "#FFFFFF", fontSize: 24 }}>
                {userData.nickname}
              </Text>
              <View className="flex-row items-center bg-white/15 px-3 py-1 rounded-full mt-1">
                <GameIcon name={levelProgress.title.icon} size={18} style={{ marginRight: 6 }} />
                <Text style={{ color: "#FFFFFF" }} className="text-xs font-extrabold">
                  Nível {levelProgress.level} · {levelProgress.title.title}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-2 mt-5 w-full self-center" style={{ maxWidth: 520 }}>
              <StatChip icon="xp" label="XP" value={userData.xpTotal} />
              <StatChip icon="coin" label="Denários" value={userData.denarioBalance} />
              <StatChip icon="streak" label="Sequência" value={userData.currentStreak} />
            </View>
          </View>

          <View className="px-4 pt-5 gap-4 w-full self-center" style={{ maxWidth: 720 }}>
            {/* Meu perfil */}
            <Section
              icon="tab-profile"
              title="Meu perfil"
              action={!editMode ? <GameButton variant="wood" size="sm" title="Editar" onPress={handleStartEdit} /> : null}
            >
              {editMode ? (
                <View className="gap-4">
                  <Field label="Nome completo" icon="tab-profile">
                    <TextInput
                      style={inputStyle}
                      placeholder={userData.name || "Seu nome e sobrenome"}
                      placeholderTextColor={PLACEHOLDER}
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </Field>
                  <Field label="Apelido" icon="level-shield" hint="É assim que você aparece no ranking">
                    <TextInput
                      style={inputStyle}
                      placeholder={userData.nickname || ""}
                      placeholderTextColor={PLACEHOLDER}
                      value={nickname}
                      onChangeText={setNickname}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </Field>
                  <Field label="Email" icon="love-letter">
                    <TextInput
                      style={inputStyle}
                      placeholder={userData.email || ""}
                      placeholderTextColor={PLACEHOLDER}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </Field>
                  <Field label="Sexo" optional>
                    <View className="flex-row gap-2">
                      {GENDER_OPTIONS.map((option) => {
                        const active = gender === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: active }}
                            onPress={() => setGender((current) => (current === option.value ? "" : option.value))}
                            style={{
                              flex: 1,
                              borderRadius: 16,
                              paddingVertical: 12,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 2,
                              borderColor: active ? "#27509C" : "#D8C9A8",
                              backgroundColor: active ? "rgba(39,80,156,0.10)" : "rgba(244,228,193,0.4)",
                            }}
                          >
                            <Text className={`font-extrabold ${active ? "text-primary" : "text-foreground"}`}>
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Field>
                  <Field label="Data de nascimento" icon="calendar" optional>
                    <TextInput
                      style={inputStyle}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={PLACEHOLDER}
                      value={birthDate}
                      onChangeText={(value) => setBirthDate(maskBirthDateInput(value))}
                      keyboardType="numeric"
                      maxLength={10}
                      editable={!loading}
                    />
                  </Field>
                  <Field label="WhatsApp" icon="bell" optional>
                    <TextInput
                      style={inputStyle}
                      placeholder="(00) 00000-0000"
                      placeholderTextColor={PLACEHOLDER}
                      value={whatsapp}
                      onChangeText={(value) => setWhatsapp(maskWhatsappInput(value))}
                      keyboardType="phone-pad"
                      maxLength={18}
                      editable={!loading}
                    />
                  </Field>

                  {error ? <ErrorNote message={error} /> : null}

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <GameButton fullWidth variant="wood" title="Cancelar" disabled={loading} onPress={cancelProfileEdit} />
                    </View>
                    <View className="flex-1">
                      <GameButton fullWidth variant="royal" title="Salvar" onPress={handleUpdateProfile} loading={loading} />
                    </View>
                  </View>
                </View>
              ) : (
                <View>
                  <InfoRow icon="tab-profile" label="Nome completo" value={userData.name || "-"} />
                  <InfoRow icon="level-shield" label="Apelido" value={userData.nickname} />
                  <InfoRow icon="love-letter" label="Email" value={userData.email || "-"} />
                  <InfoRow icon="tab-cells" label="Sexo" value={getGenderLabel(userData.gender)} />
                  <InfoRow icon="calendar" label="Data de nascimento" value={formatBirthDateForDisplay(userData.birthDate)} />
                  <InfoRow icon="bell" label="WhatsApp" value={userData.whatsapp ? formatWhatsappForInput(userData.whatsapp) : "-"} last />
                </View>
              )}
            </Section>

            {/* Lembretes */}
            <Section icon="bell" title="Lembretes">
              <ReminderSettings doneToday={userData?.streakStatus === "done_today"} streak={userData?.currentStreak ?? 0} />
              {Platform.OS === "web" ? (
                <Text className="text-muted text-sm">Os lembretes funcionam no app do celular.</Text>
              ) : null}
            </Section>

            {/* Segurança */}
            <Section
              icon="lock"
              title="Segurança"
              action={!passwordMode ? <GameButton variant="wood" size="sm" title="Alterar" onPress={() => setPasswordMode(true)} /> : null}
            >
              {passwordMode ? (
                <View className="gap-4">
                  <Field label="Senha atual" icon="lock">
                    <TextInput
                      style={inputStyle}
                      placeholder="Digite sua senha atual"
                      placeholderTextColor={PLACEHOLDER}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry
                      autoComplete="current-password"
                      editable={!passwordLoading}
                    />
                  </Field>
                  <Field label="Nova senha" icon="level-shield" hint="Mínimo de 6 caracteres">
                    <TextInput
                      style={inputStyle}
                      placeholder="Crie uma nova senha"
                      placeholderTextColor={PLACEHOLDER}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      autoComplete="new-password"
                      editable={!passwordLoading}
                    />
                  </Field>
                  <Field label="Confirmar nova senha" icon="level-shield">
                    <TextInput
                      style={inputStyle}
                      placeholder="Digite a nova senha de novo"
                      placeholderTextColor={PLACEHOLDER}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoComplete="new-password"
                      editable={!passwordLoading}
                    />
                  </Field>

                  {passwordError ? <ErrorNote message={passwordError} /> : null}

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <GameButton fullWidth variant="wood" title="Cancelar" disabled={passwordLoading} onPress={cancelPasswordEdit} />
                    </View>
                    <View className="flex-1">
                      <GameButton fullWidth variant="royal" title="Alterar" onPress={handleChangePassword} loading={passwordLoading} />
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <GameIcon name="level-shield" size={36} style={{ marginRight: 10 }} />
                  <Text className="text-muted text-sm flex-1">Sua senha protege sua jornada. Troque quando quiser.</Text>
                </View>
              )}
            </Section>

            {/* Conta */}
            <Section icon="settings" title="Conta">
              <GameButton fullWidth size="lg" variant="banner" title="Sair da conta" onPress={handleLogout} />
              <Text className="text-muted text-xs text-center mt-2">
                Você pode voltar quando quiser. Seu progresso fica salvo.
              </Text>
            </Section>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ---------------- building blocks ----------------

const PLACEHOLDER = "#9B8C74";
const inputStyle = {
  fontSize: 16,
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderRadius: 16,
  borderWidth: 2,
  borderColor: "#D8C9A8",
  backgroundColor: "#FFF9EC",
  color: "#241A12",
} as const;

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: GameIconName;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-surface rounded-3xl p-4" style={SOFT_SHADOW}>
      <View className="flex-row items-center mb-4">
        <GameIcon name={icon} size={32} style={{ marginRight: 8 }} />
        <Text className="font-display text-foreground flex-1" style={{ fontSize: 18 }}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function Field({
  label,
  icon,
  optional,
  hint,
  children,
}: {
  label: string;
  icon?: GameIconName;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <View className="flex-row items-center mb-2">
        {icon ? <GameIcon name={icon} size={18} style={{ marginRight: 6 }} /> : null}
        <Text className="text-foreground text-sm font-extrabold">{label}</Text>
        {optional ? <Text className="text-muted text-xs ml-1">(opcional)</Text> : null}
      </View>
      {children}
      {hint ? <Text className="text-muted text-xs mt-1">{hint}</Text> : null}
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: GameIconName; label: string; value: string; last?: boolean }) {
  return (
    <View
      className="flex-row items-center py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: "rgba(139,90,43,0.15)" }}
    >
      <View className="w-10 h-10 rounded-2xl bg-parchment/60 items-center justify-center mr-3">
        <GameIcon name={icon} size={24} />
      </View>
      <View className="flex-1">
        <Text className="text-muted text-xs">{label}</Text>
        <Text className="text-foreground text-base font-bold" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatChip({ icon, label, value }: { icon: GameIconName; label: string; value: number }) {
  return (
    <View className="flex-1 bg-white/15 rounded-2xl py-2 items-center">
      <GameIcon name={icon} size={26} />
      <Text style={{ color: "#FFFFFF" }} className="text-lg font-extrabold mt-1">
        {value}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.8)" }} className="text-[11px] font-bold">
        {label}
      </Text>
    </View>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <View className="flex-row items-center bg-error/10 p-3 rounded-2xl" accessibilityRole="alert">
      <GameIcon name="lock" size={20} style={{ marginRight: 8 }} />
      <Text className="text-error text-sm font-bold flex-1">{message}</Text>
    </View>
  );
}

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import axios from "axios";
import { useNotifications } from "@/components/notification-provider";

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

const formatWhatsappForInput = (value?: string | null) => maskWhatsappInput(value ?? "");

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
      const origin = window.location.origin.replace(':8081', ':3009').replace('8081-', '3009-');
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
      if (trimmedNickname && trimmedNickname !== (userData?.nickname || "").trim()) {
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
      notifications.error(err.response?.data?.error || "Erro ao atualizar perfil");
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
        }
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

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="p-6"
        >
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4 relative">
              {userData.avatarUrl ? (
                <Image
                  source={{ uri: userData.avatarUrl }}
                  className="w-24 h-24 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-white text-4xl font-bold">
                  {userData.nickname.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text className="text-foreground text-2xl font-bold mt-2">
              {userData.nickname}
            </Text>
            <Text className="text-muted text-sm">Nível {userData.level}</Text>
          </View>

          {/* Stats */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-muted text-xs mb-1">XP Total</Text>
            <Text className="text-foreground text-2xl font-bold">
              {userData.xpTotal}
            </Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
            <Text className="text-muted text-xs mb-1">Denários</Text>
            <Text className="text-foreground text-2xl font-bold">
              {userData.denarioBalance}
            </Text>
          </View>
        </View>

        {/* Profile Information */}
        <View className="bg-surface rounded-xl p-4 border border-border mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-foreground text-lg font-bold">
                Informações do Perfil
              </Text>
              {!editMode && (
                <TouchableOpacity onPress={handleStartEdit}>
                  <Text className="text-primary font-semibold">Editar</Text>
                </TouchableOpacity>
              )}
            </View>

            {editMode ? (
              <View className="gap-4">
                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Nome completo
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder={userData.name || ""}
                    placeholderTextColor="#9BA1A6"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Apelido
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder={userData.nickname || ""}
                    placeholderTextColor="#9BA1A6"
                    value={nickname}
                    onChangeText={setNickname}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Email
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder={userData.email || ""}
                    placeholderTextColor="#9BA1A6"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Sexo{" "}
                    <Text className="text-muted text-xs">(opcional)</Text>
                  </Text>
                  <View className="flex-row gap-2">
                    {GENDER_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() =>
                          setGender((current) =>
                            current === option.value ? "" : option.value
                          )
                        }
                        className={`flex-1 rounded-xl border px-4 py-3 items-center justify-center ${
                          gender === option.value
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                        }`}
                      >
                        <Text
                          className={`font-semibold ${
                            gender === option.value ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Data de nascimento{" "}
                    <Text className="text-muted text-xs">(opcional)</Text>
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#9BA1A6"
                    value={birthDate}
                    onChangeText={(value) => setBirthDate(maskBirthDateInput(value))}
                    keyboardType="numeric"
                    maxLength={10}
                    editable={!loading}
                  />
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    WhatsApp{" "}
                    <Text className="text-muted text-xs">(opcional)</Text>
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="(00) 00000-0000"
                    placeholderTextColor="#9BA1A6"
                    value={whatsapp}
                    onChangeText={(value) => setWhatsapp(maskWhatsappInput(value))}
                    keyboardType="phone-pad"
                    maxLength={18}
                    editable={!loading}
                  />
                </View>

                {error ? (
                  <View className="bg-error/10 p-3 rounded-xl">
                    <Text className="text-error text-sm text-center">{error}</Text>
                  </View>
                ) : null}

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 bg-border py-3 rounded-full active:opacity-70"
                    onPress={() => {
                      setEditMode(false);
                      resetProfileForm();
                      setError("");
                    }}
                    disabled={loading}
                  >
                    <Text className="text-foreground text-center font-semibold">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary py-3 rounded-full active:opacity-70"
                    onPress={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-center font-semibold">
                        Salvar
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="gap-3">
                <View>
                  <Text className="text-muted text-xs mb-1">Nome completo</Text>
                  <Text className="text-foreground text-base">
                    {userData.name || "-"}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs mb-1">Apelido</Text>
                  <Text className="text-foreground text-base">
                    {userData.nickname}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs mb-1">Email</Text>
                  <Text className="text-foreground text-base">
                    {userData.email}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs mb-1">Sexo</Text>
                  <Text className="text-foreground text-base">
                    {getGenderLabel(userData.gender)}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs mb-1">
                    Data de nascimento
                  </Text>
                  <Text className="text-foreground text-base">
                    {formatBirthDateForDisplay(userData.birthDate)}
                  </Text>
                </View>
                <View>
                  <Text className="text-muted text-xs mb-1">WhatsApp</Text>
                  <Text className="text-foreground text-base">
                    {userData.whatsapp || "-"}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Change Password */}
          <View className="bg-surface rounded-xl p-4 border border-border mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-foreground text-lg font-bold">Senha</Text>
              {!passwordMode && (
                <TouchableOpacity onPress={() => setPasswordMode(true)}>
                  <Text className="text-primary font-semibold">Alterar</Text>
                </TouchableOpacity>
              )}
            </View>

            {passwordMode ? (
              <View className="gap-4">
                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Senha Atual
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="Digite sua senha atual"
                    placeholderTextColor="#9BA1A6"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    editable={!passwordLoading}
                  />
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Nova Senha
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9BA1A6"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    editable={!passwordLoading}
                  />
                </View>

                <View>
                  <Text className="text-foreground text-sm font-semibold mb-2">
                    Confirmar Nova Senha
                  </Text>
                  <TextInput
                    className="bg-background border border-border rounded-xl px-4 py-3 text-foreground"
                    placeholder="Digite a nova senha novamente"
                    placeholderTextColor="#9BA1A6"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!passwordLoading}
                  />
                </View>

                {passwordError ? (
                  <View className="bg-error/10 p-3 rounded-xl">
                    <Text className="text-error text-sm text-center">
                      {passwordError}
                    </Text>
                  </View>
                ) : null}

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 bg-border py-3 rounded-full active:opacity-70"
                    onPress={() => {
                      setPasswordMode(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setPasswordError("");
                    }}
                    disabled={passwordLoading}
                  >
                    <Text className="text-foreground text-center font-semibold">
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary py-3 rounded-full active:opacity-70"
                    onPress={handleChangePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white text-center font-semibold">
                        Alterar
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text className="text-muted text-sm">
                Clique em &ldquo;Alterar&rdquo; para mudar sua senha
              </Text>
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            className="bg-error py-4 rounded-full active:opacity-70 mb-6"
            onPress={handleLogout}
          >
            <Text className="text-white text-center font-bold text-lg">Sair</Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            className="py-3 active:opacity-70"
            onPress={() => router.back()}
          >
            <Text className="text-primary text-center font-semibold">
              Voltar ao App
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

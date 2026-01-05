import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import axios from "axios";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { useNotifications } from "@/components/notification-provider";

export default function RegisterScreen() {
  const router = useRouter();
  const notifications = useNotifications();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getApiUrl = () => {
    // Always use the backend API URL (port 3000)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      // Replace port 8081 with 3000 for backend API
      const origin = window.location.origin.replace(':8081', ':3009').replace('8081-', '3009-');
      return `${origin}/api`;
    }
    return "https://3000-il1293ezarklxcfek50kx-f2f21d31.us2.manus.computer/api";
  };

  const handleRegister = async () => {
    if (!nickname || !email || !password || !confirmPassword) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = getApiUrl();
      const response = await axios.post(`${apiUrl}/auth/register`, {
        nickname: nickname.trim(),
        email: email.trim().toLowerCase(),
        password,
      }, {
        withCredentials: true,
      });

      if (response.data.success) {
        const sessionToken: string | undefined = response.data.sessionToken;
        if (sessionToken) {
          await Auth.setSessionToken(sessionToken);
          if (Platform.OS === "web") {
            await Api.establishSession(sessionToken);
          }
        }

        const user = response.data.user;
        if (user) {
          await Auth.setUserInfo({
            id: user.id,
            openId: user.openId,
            name: user.nickname || user.email || null,
            email: user.email ?? null,
            loginMethod: "email",
            role: user.role ?? "user",
            lastSignedIn: new Date(),
          });
        }

        const target = user?.role === "leader" ? "/leader" : "/(tabs)";
        notifications.success("Conta criada com sucesso!");
        router.replace(target);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      setError(err.response?.data?.error || "Erro ao criar conta. Tente novamente.");
      notifications.error(err.response?.data?.error || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center p-6">
            {/* Logo/Header */}
            <View className="items-center mb-8">
              <Text className="text-6xl mb-4">📖</Text>
              <Text className="text-foreground text-3xl font-bold text-center">
                Criar Conta
              </Text>
              <Text className="text-muted text-center mt-2">
                Comece sua jornada de fé hoje
              </Text>
            </View>

            {/* Registration Form */}
            <View className="gap-4">
              <View>
                <Text className="text-foreground text-sm font-semibold mb-2">
                  Apelido
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="Como quer ser chamado?"
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
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="seu@email.com"
                  placeholderTextColor="#9BA1A6"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />
              </View>

              <View>
                <Text className="text-foreground text-sm font-semibold mb-2">
                  Senha
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9BA1A6"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  editable={!loading}
                />
              </View>

              <View>
                <Text className="text-foreground text-sm font-semibold mb-2">
                  Confirmar Senha
                </Text>
                <TextInput
                  className="bg-surface border border-border rounded-xl px-4 py-3 text-foreground"
                  placeholder="Digite a senha novamente"
                  placeholderTextColor="#9BA1A6"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  editable={!loading}
                />
              </View>

              {error ? (
                <View className="bg-error/10 p-3 rounded-xl">
                  <Text className="text-error text-sm text-center">{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                className="bg-primary py-4 rounded-full mt-4 active:opacity-70"
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-center font-bold text-lg">
                    Criar Conta
                  </Text>
                )}
              </TouchableOpacity>

              <View className="flex-row items-center justify-center mt-4">
                <Text className="text-muted">Já tem uma conta? </Text>
                <TouchableOpacity onPress={() => router.back()}>
                  <Text className="text-primary font-semibold">Entrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

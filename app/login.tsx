import { useRef, useState } from "react";
import { View, TextInput, Platform } from "react-native";
import { GameButton } from "@/components/game-button";
import { AuthScreen, AuthField, AuthError, AuthDivider, AUTH_INPUT, AUTH_PLACEHOLDER } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { useRouter } from "expo-router";
import axios from "axios";
import * as Auth from "@/lib/_core/auth";
import * as Api from "@/lib/_core/api";
import { getApiBaseUrl } from "@/constants/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const baseUrl = getApiBaseUrl();
      const response = await axios.post(
        `${baseUrl}/api/auth/login`,
        {
          email: email.trim().toLowerCase(),
          password,
        },
        {
          withCredentials: true,
        },
      );

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
        router.replace(target);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.error || "Erro ao fazer login. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen title="Devocional Quest" subtitle="Sua jornada no Reino continua aqui!">
      <View className="gap-4 mt-6">
        <AuthField label="Email" icon="love-letter">
          <TextInput
            style={AUTH_INPUT}
            placeholder="seu@email.com"
            placeholderTextColor={AUTH_PLACEHOLDER}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />
        </AuthField>

        <AuthField label="Senha" icon="lock">
          <PasswordInput
            inputRef={passwordRef}
            placeholder="Sua senha secreta"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />
        </AuthField>

        {error ? <AuthError message={error} /> : null}

        <GameButton
          style={{ marginTop: 6 }}
          fullWidth
          size="lg"
          variant="royal"
          icon="rocket"
          title="Entrar no Reino"
          onPress={handleLogin}
          loading={loading}
        />
      </View>

      <AuthDivider label="Primeira vez por aqui?" />

      <GameButton
        fullWidth
        variant="gold"
        icon="party"
        title="Criar minha conta"
        disabled={loading}
        onPress={() => router.push("/register" as any)}
      />
    </AuthScreen>
  );
}

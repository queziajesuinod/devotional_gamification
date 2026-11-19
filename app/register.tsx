import { useRef, useState } from "react";
import { View, Text, TextInput, Platform } from "react-native";
import { GameButton } from "@/components/game-button";
import { AuthScreen, AuthField, AuthError, AuthDivider, AUTH_INPUT, AUTH_PLACEHOLDER } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
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
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const getApiUrl = () => {
    // Always use the backend API URL (port 3000)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      // Replace port 8081 with 3000 for backend API
      const origin = window.location.origin
        .replace(":8081", ":3009")
        .replace("8081-", "3009-");
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
      const response = await axios.post(
        `${apiUrl}/auth/register`,
        {
          nickname: nickname.trim(),
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
        notifications.success("Conta criada com sucesso!");
        router.replace(target);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      setError(
        err.response?.data?.error || "Erro ao criar conta. Tente novamente.",
      );
      notifications.error(
        err.response?.data?.error || "Erro ao criar conta. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const longEnough = password.length >= 6;
  const matches = confirmPassword.length > 0 && password === confirmPassword;

  const goToLogin = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/login" as any);
  };

  return (
    <AuthScreen title="Criar conta" subtitle="Sua aventura no Reino começa hoje!" subtitleIcon="map" heroScale={0.85}>
      <View className="gap-4 mt-6">
        <AuthField label="Apelido" icon="level-shield" hint="É assim que você aparece no ranking">
          <TextInput
            style={AUTH_INPUT}
            placeholder="Como quer ser chamado?"
            placeholderTextColor={AUTH_PLACEHOLDER}
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!loading}
          />
        </AuthField>

        <AuthField label="Email" icon="love-letter">
          <TextInput
            ref={emailRef}
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
            placeholder="Crie uma senha secreta"
            value={password}
            onChangeText={setPassword}
            autoComplete="password-new"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            editable={!loading}
          />
        </AuthField>

        <AuthField label="Confirmar senha" icon="level-shield">
          <PasswordInput
            inputRef={confirmRef}
            placeholder="Digite a senha de novo"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoComplete="password-new"
            returnKeyType="go"
            onSubmitEditing={handleRegister}
            editable={!loading}
          />
        </AuthField>

        {/* Live checklist: each requirement lights up when met */}
        <View className="rounded-2xl p-3 gap-2" style={{ backgroundColor: "rgba(244,228,193,0.55)" }}>
          <Check ok={longEnough} label="Senha com 6 caracteres ou mais" />
          <Check ok={matches} label="As duas senhas são iguais" />
        </View>

        {error ? <AuthError message={error} /> : null}

        <GameButton
          style={{ marginTop: 6 }}
          fullWidth
          size="lg"
          variant="banner"
          icon="party"
          title="Começar a aventura"
          onPress={handleRegister}
          loading={loading}
        />
      </View>

      <AuthDivider label="Já tem uma conta?" />

      <GameButton fullWidth variant="wood" title="Entrar" disabled={loading} onPress={goToLogin} />
    </AuthScreen>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View className="flex-row items-center" accessibilityLabel={`${label}: ${ok ? "ok" : "pendente"}`}>
      <View
        className="items-center justify-center rounded-full mr-2"
        style={{
          width: 22,
          height: 22,
          backgroundColor: ok ? "#2E8B57" : "transparent",
          borderWidth: 2,
          borderColor: ok ? "#2E8B57" : "#C9B48A",
        }}
      >
        {ok ? <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900" }}>✓</Text> : null}
      </View>
      <Text className="text-sm font-bold" style={{ color: ok ? "#2E6B47" : "#7A5A3C" }}>
        {label}
      </Text>
    </View>
  );
}

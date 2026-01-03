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
  Alert,
  Image,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";

export default function SettingsScreen() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const { data: userData, refetch } = trpc.user.me.useQuery();

  const [editMode, setEditMode] = useState(false);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [passwordMode, setPasswordMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const getApiUrl = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const origin = window.location.origin.replace(':8081', ':3000').replace('8081-', '3000-');
      return `${origin}/api`;
    }
    return "https://3000-il1293ezarklxcfek50kx-f2f21d31.us2.manus.computer/api";
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        if (Platform.OS === "web") {
          alert("Permissão negada para acessar a galeria");
        } else {
          Alert.alert("Permissão negada", "Precisamos de permissão para acessar suas fotos");
        }
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      setAvatarUploading(true);

      // Upload image
      const apiUrl = getApiUrl();
      const formData = new FormData();
      
      if (Platform.OS === "web") {
        // Web: fetch the blob and append
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        formData.append("avatar", blob, "avatar.jpg");
      } else {
        // Native: use uri directly
        formData.append("avatar", {
          uri: result.assets[0].uri,
          type: "image/jpeg",
          name: "avatar.jpg",
        } as any);
      }

      const uploadResponse = await axios.post(
        `${apiUrl}/auth/avatar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (uploadResponse.data.success) {
        await refetch();
        if (Platform.OS === "web") {
          alert("Foto atualizada com sucesso!");
        }
      }
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      if (Platform.OS === "web") {
        alert(error.response?.data?.error || "Erro ao fazer upload da foto");
      } else {
        Alert.alert("Erro", error.response?.data?.error || "Erro ao fazer upload da foto");
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!nickname.trim() && !email.trim()) {
      setError("Preencha pelo menos um campo");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = getApiUrl();
      const response = await axios.put(
        `${apiUrl}/auth/profile`,
        {
          nickname: nickname.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        await refetch();
        setEditMode(false);
        if (Platform.OS === "web") {
          alert("Perfil atualizado com sucesso!");
        }
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.response?.data?.error || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Nova senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem");
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
        if (Platform.OS === "web") {
          alert("Senha alterada com sucesso!");
        }
      }
    } catch (err: any) {
      console.error("Password change error:", err);
      setPasswordError(err.response?.data?.error || "Erro ao alterar senha");
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
            <TouchableOpacity
              className="w-24 h-24 bg-primary rounded-full items-center justify-center mb-4 relative"
              onPress={handlePickImage}
              disabled={avatarUploading}
            >
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
              {avatarUploading && (
                <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickImage} disabled={avatarUploading}>
              <Text className="text-primary text-sm font-semibold">
                {userData.avatarUrl ? "Alterar Foto" : "Adicionar Foto"}
              </Text>
            </TouchableOpacity>
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
                <TouchableOpacity onPress={() => setEditMode(true)}>
                  <Text className="text-primary font-semibold">Editar</Text>
                </TouchableOpacity>
              )}
            </View>

            {editMode ? (
              <View className="gap-4">
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
                      setNickname(userData.nickname || "");
                      setEmail(userData.email || "");
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
                Clique em "Alterar" para mudar sua senha
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

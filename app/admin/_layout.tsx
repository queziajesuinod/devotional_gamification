import { ActivityIndicator, Text, View } from "react-native";
import { Slot } from "expo-router";
import { trpc } from "@/lib/trpc";
import { PanelShell, type NavItem } from "@/components/panel/panel-shell";

export default function AdminLayout() {
  const adminMe = trpc.admin.me.useQuery();
  const stats = trpc.admin.stats.useQuery(undefined, { enabled: !!adminMe.data, staleTime: 30_000 });

  if (adminMe.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-muted">Carregando painel...</Text>
      </View>
    );
  }

  if (adminMe.error || !adminMe.data) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-error font-bold text-center">Acesso negado. É preciso ser administrador.</Text>
      </View>
    );
  }

  const pending = stats.data?.groups.pendingRequests ?? 0;
  const items: NavItem[] = [
    { href: "/admin", label: "Visão geral", icon: "tab-ranking", group: "Painel" },
    { href: "/admin/users", label: "Usuários", icon: "tab-profile", group: "Pessoas" },
    { href: "/admin/groups", label: "Células", icon: "tab-cells" },
    { href: "/admin/requests", label: "Pedidos", icon: "love-letter", badge: pending || undefined },
    { href: "/admin/plans", label: "Planos", icon: "map", group: "Conteúdo" },
    { href: "/admin/days", label: "Dias devocionais", icon: "calendar" },
    { href: "/admin/challenges", label: "Desafios", icon: "quest-target" },
    { href: "/admin/medals", label: "Medalhas", icon: "medal-gold", group: "Gamificação" },
    { href: "/admin/shop", label: "Guarda-roupa", icon: "tab-shop" },
    { href: "/admin/chests", label: "Baús", icon: "chest" },
    { href: "/admin/messages", label: "Mensagens", icon: "pray" },
  ];

  return (
    <PanelShell
      areaLabel="Administração"
      root="/admin"
      items={items}
      userLabel={`${adminMe.data.nickname}${adminMe.data.email ? ` · ${adminMe.data.email}` : ""}`}
    >
      <Slot />
    </PanelShell>
  );
}

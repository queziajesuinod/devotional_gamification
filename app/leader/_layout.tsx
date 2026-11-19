import { Slot } from "expo-router";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { PanelShell, type NavItem } from "@/components/panel/panel-shell";

export default function LeaderLayout() {
  const { user } = useAuth();
  // Shared cache with the pages: the sidebar badge reuses the dashboard query.
  const dashboard = trpc.leader.dashboard.useQuery(undefined, { staleTime: 15_000 });
  const pending = dashboard.data?.pendingRequests.length ?? 0;
  const inbox = trpc.engagement.inbox.useQuery(undefined, { staleTime: 30_000 });
  const unseen = inbox.data?.unseen ?? 0;

  const items: NavItem[] = [
    { href: "/leader", label: "Visão geral", icon: "tab-ranking", group: "Minha célula" },
    { href: "/leader/members", label: "Membros", icon: "tab-cells" },
    { href: "/leader/requests", label: "Pedidos", icon: "seal", badge: pending || undefined },
    { href: "/leader/messages", label: "Mensagens", icon: "love-letter", badge: unseen || undefined },
  ];

  return (
    <PanelShell
      areaLabel={dashboard.data?.group ? `Líder · ${dashboard.data.group.name}` : "Painel do líder"}
      root="/leader"
      items={items}
      userLabel={user?.name ?? user?.email ?? undefined}
    >
      <Slot />
    </PanelShell>
  );
}

/**
 * Dashboard shell for /admin and /leader: fixed royal sidebar on wide screens,
 * a top bar with a collapsible menu on phones. Content scrolls on a calm surface.
 */
import type React from "react";
import { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { useAuth } from "@/hooks/use-auth";
import { confirmAction } from "@/components/panel/ui";

export type NavItem = {
  href: string;
  label: string;
  icon: GameIconName;
  /** Small count shown next to the label (e.g. pending requests). */
  badge?: number;
  /** Section heading shown above this item in the sidebar. */
  group?: string;
};

const SIDEBAR_BG = "#14254A";
const SIDEBAR_ACTIVE = "rgba(255,255,255,0.12)";

function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === root || pathname === `${root}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  items,
  root,
  onNavigate,
}: {
  items: NavItem[];
  root: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View style={{ gap: 2 }}>
      {items.map((item) => {
        const active = isActive(pathname, item.href, root);
        return (
          <View key={item.href}>
            {item.group ? (
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 11,
                  fontWeight: "800",
                  letterSpacing: 0.8,
                  marginTop: 14,
                  marginBottom: 4,
                  marginLeft: 12,
                }}
              >
                {item.group.toUpperCase()}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected: active }}
              onPress={() => {
                router.push(item.href as any);
                onNavigate?.();
              }}
              style={({ hovered }: any) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 42,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: active ? SIDEBAR_ACTIVE : hovered ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeftWidth: 3,
                borderLeftColor: active ? "#F2B50C" : "transparent",
              })}
            >
              <GameIcon name={item.icon} size={22} />
              <Text style={{ color: "#FFFFFF", fontWeight: active ? "800" : "600", fontSize: 14, flex: 1 }}>
                {item.label}
              </Text>
              {item.badge ? (
                <View style={{ backgroundColor: "#F2B50C", borderRadius: 999, minWidth: 22, paddingHorizontal: 6, alignItems: "center" }}>
                  <Text style={{ color: "#3B2412", fontWeight: "900", fontSize: 12 }}>{item.badge}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function PanelShell({
  areaLabel,
  root,
  items,
  userLabel,
  children,
}: {
  areaLabel: string;
  root: string;
  items: NavItem[];
  userLabel?: string;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const current = items.find((i) => isActive(pathname, i.href, root));

  const handleLogout = async () => {
    if (!(await confirmAction("Deseja sair do painel?", "Sair"))) return;
    await logout();
    router.replace("/login" as any);
  };

  const brand = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <GameIcon name="crown" size={30} />
      <View>
        <Text className="font-display" style={{ color: "#FFFFFF", fontSize: 16 }}>
          Devocional Quest
        </Text>
        <Text style={{ color: "#F2B50C", fontSize: 11, fontWeight: "800" }}>{areaLabel}</Text>
      </View>
    </View>
  );

  const footer = (
    <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", paddingTop: 12, gap: 8 }}>
      {userLabel ? (
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }} numberOfLines={1}>
          {userLabel}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={handleLogout}
        style={({ hovered }: any) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 40,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: hovered ? "rgba(255,255,255,0.08)" : "transparent",
        })}
      >
        <GameIcon name="arch" size={20} />
        <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Sair</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: SIDEBAR_BG }}>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        {wide ? (
          <View style={{ width: 252, backgroundColor: SIDEBAR_BG, padding: 16, justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              {brand}
              <ScrollView style={{ marginTop: 20 }} contentContainerStyle={{ paddingBottom: 12 }}>
                <NavList items={items} root={root} />
              </ScrollView>
            </View>
            {footer}
          </View>
        ) : (
          <View style={{ backgroundColor: SIDEBAR_BG, paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {brand}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={menuOpen ? "Fechar menu" : "Abrir menu"}
                accessibilityState={{ expanded: menuOpen }}
                onPress={() => setMenuOpen((v) => !v)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 40,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{menuOpen ? "Fechar" : current?.label ?? "Menu"}</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 12 }}>{menuOpen ? "▲" : "▼"}</Text>
              </Pressable>
            </View>
            {menuOpen ? (
              <View style={{ paddingTop: 8, paddingBottom: 4 }}>
                <NavList items={items} root={root} onNavigate={() => setMenuOpen(false)} />
                <View style={{ marginTop: 10 }}>{footer}</View>
              </View>
            ) : null}
          </View>
        )}

        <View className="bg-background" style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: wide ? 28 : 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            <View style={{ width: "100%", maxWidth: 1180, alignSelf: "center" }}>{children}</View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

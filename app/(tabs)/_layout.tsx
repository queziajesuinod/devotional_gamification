import { Tabs } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { HapticTab } from "@/components/haptic-tab";
import { GameIcon, type GameIconName } from "@/components/game-icon";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

/** Game-style tab icon: the active one pops up bigger, inactive ones rest smaller and faded. */
function TabIcon({ name, focused }: { name: GameIconName; focused: boolean }) {
  const scale = useSharedValue(focused ? 1.15 : 0.9);
  const lift = useSharedValue(focused ? -4 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 0.9, { damping: 9, stiffness: 220 });
    lift.value = withSpring(focused ? -4 : 0, { damping: 9, stiffness: 220 });
  }, [focused, scale, lift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
    opacity: focused ? 1 : 0.6,
  }));

  return (
    <Animated.View style={style}>
      <GameIcon name={name} size={34} />
    </Animated.View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 68 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontWeight: "800", fontSize: 11 },
        tabBarStyle: {
          paddingTop: 10,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ focused }) => <TabIcon name="tab-home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: "Loja",
          tabBarIcon: ({ focused }) => <TabIcon name="tab-shop" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => <TabIcon name="tab-profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Ranking",
          tabBarIcon: ({ focused }) => <TabIcon name="tab-ranking" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Células",
          tabBarIcon: ({ focused }) => <TabIcon name="tab-cells" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

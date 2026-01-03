import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { View, ActivityIndicator } from "react-native";

/**
 * AuthGuard - Protects routes and redirects to login if not authenticated
 * 
 * Wrap protected screens with this component to ensure user is logged in.
 * Automatically redirects to /login if authentication is not present.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const segment = segments[0];
    const inAuthGroup =
      segment === "(tabs)" ||
      segment === "group-details" ||
      segment === "group-admin" ||
      segment === "reflections" ||
      segment === "settings" ||
      segment === "admin" ||
      segment === "leader";

    if (!user && inAuthGroup) {
      // User is not authenticated and trying to access protected route
      router.replace("/login");
      return;
    }

    if (user && (segment === "login" || segment === "register")) {
      // User is authenticated and on login/register page, redirect to home
      router.replace(user.role === "leader" ? "/leader" : "/(tabs)");
      return;
    }

    if (user?.role === "leader" && segment !== "leader") {
      // Leader accounts should stay in the leader dashboard
      router.replace("/leader");
      return;
    }

    if (user && segment === "leader" && user.role !== "leader" && user.role !== "admin") {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return <>{children}</>;
}

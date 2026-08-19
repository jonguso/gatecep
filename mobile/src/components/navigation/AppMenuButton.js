import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../features/auth/hooks/useAuth";

const HIDDEN_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/menu",
  "/dashboard",
  "/(tabs)/dashboard"
]);

function shouldHide(pathname) {
  const path = String(pathname || "");
  return HIDDEN_PATHS.has(path) || path.startsWith("/onboarding");
}

export default function AppMenuButton() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();

  if (loading || !user || shouldHide(pathname)) return null;

  const isTabRoute = ["/markets", "/trading", "/calendar", "/news"].includes(pathname);

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open GateCEP menu"
        accessibilityHint="Opens navigation for portfolio, guidance, account, and data tools"
        hitSlop={10}
        onPress={() => router.push("/menu")}
        style={({ pressed }) => [
          styles.button,
          { bottom: Math.max(insets.bottom, 10) + (isTabRoute ? 70 : 8) },
          pressed && styles.buttonPressed
        ]}
      >
        <Text style={styles.icon}>☰</Text>
        <Text style={styles.label}>Menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  button: {
    position: "absolute",
    right: 14,
    minWidth: 88,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8
  },
  buttonPressed: { backgroundColor: "#334155", borderColor: "#67e8f9" },
  icon: { color: "#67e8f9", fontSize: 20, fontWeight: "900" },
  label: { color: "white", fontSize: 13, fontWeight: "900" }
});

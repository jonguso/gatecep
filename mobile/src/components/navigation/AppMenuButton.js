import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { WEB_SHELL_MIN_WIDTH } from "../web/WebTopNavigation";

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
  const { width } = useWindowDimensions();
  const { user, loading } = useAuth();
  const wideWeb = Platform.OS === "web" && width >= WEB_SHELL_MIN_WIDTH;

  if (wideWeb || loading || !user || shouldHide(pathname)) return null;

  /*
   * PC-031M4R5C1
   *
   * Global authenticated menu chrome is top-left by default.
   * HIDDEN_PATHS remains the authority for routes that must not
   * render this control. Dashboard stays hidden because Portfolio
   * owns its local hamburger.
   */
  const useTopChrome = true;

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
          useTopChrome && styles.tabChromeButton,
          {
            top: Math.max(insets.top, 8) + 8,
            left: 14,
            right: "auto",
            bottom: "auto"
          },
          pressed && styles.buttonPressed
        ]}
      >
        <Text style={styles.icon}>☰</Text>
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
  tabChromeButton: {
    minWidth: 48,
    width: 48,
    height: 40,
    paddingHorizontal: 0,
    borderRadius: 14
  },
  buttonPressed: { backgroundColor: "#334155", borderColor: "#67e8f9" },
  icon: { color: "#67e8f9", fontSize: 20, fontWeight: "900" },
  label: { color: "white", fontSize: 13, fontWeight: "900" }
});

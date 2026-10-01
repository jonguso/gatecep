import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { router, usePathname } from "expo-router";

import { useAuth } from "../../features/auth/hooks/useAuth";

export const WEB_SHELL_MIN_WIDTH = 1100;

const PRIMARY_NAV = [
  { label: "Portfolio", route: "/(tabs)/dashboard", matches: ["/dashboard", "/(tabs)/dashboard"] },
  { label: "Markets", route: "/(tabs)/markets", matches: ["/markets", "/(tabs)/markets"] },
  { label: "Trading", route: "/(tabs)/trading", matches: ["/trading", "/(tabs)/trading"] },
  { label: "Performance", route: "/performance", matches: ["/performance"] },
  { label: "Calendar", route: "/(tabs)/calendar", matches: ["/calendar", "/(tabs)/calendar"] },
  { label: "News", route: "/(tabs)/news", matches: ["/news", "/(tabs)/news"] }
];

const HIDDEN_PATHS = new Set(["/", "/login", "/register"]);

function isActive(pathname, item) {
  const path = String(pathname || "");
  return item.matches.some((match) => path === match || path.startsWith(`${match}/`));
}

export function useWideWebShell() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= WEB_SHELL_MIN_WIDTH;
}

export default function WebTopNavigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const wideWeb = useWideWebShell();

  if (!wideWeb || loading || !user || HIDDEN_PATHS.has(String(pathname || ""))) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.inner}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="GateCEP Portfolio"
          onPress={() => router.replace("/(tabs)/dashboard")}
          style={styles.brand}
        >
          <Text style={styles.brandName}>GateCEP</Text>
          <Text style={styles.brandDetail}>Investor</Text>
        </Pressable>

        <View accessibilityRole="navigation" style={styles.nav}>
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => router.push(item.route)}
                style={({ pressed }) => [
                  styles.navItem,
                  active && styles.navItemActive,
                  pressed && styles.navItemPressed
                ]}
              >
                <Text style={[styles.navText, active && styles.navTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open GateCEP menu"
            onPress={() => router.push("/menu")}
            style={({ pressed }) => [
              styles.moreButton,
              pressed && styles.buttonPressed
            ]}
          >
            <Text style={styles.moreText}>More</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Coach G"
            onPress={() => router.push("/(tabs)/coach")}
            style={({ pressed }) => [
              styles.coachButton,
              pressed && styles.buttonPressed
            ]}
          >
            <Text style={styles.coachText}>G</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 64,
    backgroundColor: "#0f172a",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    zIndex: 900
  },
  inner: {
    flex: 1,
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 20
  },
  brand: {
    minWidth: 128,
    justifyContent: "center"
  },
  brandName: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900"
  },
  brandDetail: {
    color: "#67e8f9",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 1
  },
  nav: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  navItem: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  navItemActive: {
    backgroundColor: "rgba(34,211,238,.10)",
    borderColor: "rgba(34,211,238,.28)",
    borderWidth: 1
  },
  navItemPressed: {
    backgroundColor: "#1e293b"
  },
  navText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800"
  },
  navTextActive: {
    color: "#67e8f9"
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  moreButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderColor: "#334155",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  moreText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "900"
  },
  coachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#22d3ee",
    borderColor: "#a5f3fc",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  coachText: {
    color: "#020617",
    fontSize: 20,
    fontWeight: "900"
  },
  buttonPressed: {
    opacity: 0.78
  }
});

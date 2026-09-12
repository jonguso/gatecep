import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../src/features/auth/hooks/useAuth";
import { logout } from "../src/auth/authStore";
import {
  CollapsibleSection,
  MobileHeader,
  MobileScreen
} from "../src/components/mobile/MobileUI";

export const MENU_SECTIONS = [
  {
    title: "Primary",
    summary: "Home, markets, trading, and Coach G",
    initiallyOpen: true,
    items: [
      { title: "Home", detail: "Portfolio value, allocation, and holdings", route: "/(tabs)/dashboard" },
      { title: "Markets", detail: "NSE prices and market movement", route: "/(tabs)/markets" },
      { title: "Trading", detail: "Review and place investor-directed orders", route: "/(tabs)/trading" },
      { title: "Coach G", detail: "Personalized portfolio and wealth guidance", route: "/(tabs)/coach" }
    ]
  },
  {
    title: "Portfolio",
    summary: "Performance, analysis, risk, and activity",
    items: [
      { title: "Performance", detail: "Returns, benchmarks, goals, and snapshot history", route: "/performance" },
      { title: "Portfolio Analysis", detail: "Health, priorities, liquidity, and data quality", route: "/unified-portfolio-analytics" },
      { title: "Portfolio Risk", detail: "Concentration, downside, and risk alignment", route: "/portfolio-risk" },
      { title: "Portfolio Activity", detail: "Buys, sells, deposits, withdrawals, dividends, and fees", route: "/portfolio-activity" }
    ]
  },
  {
    title: "Connect & Reconcile",
    summary: "Broker evidence, uploads, corrections, and entry",
    items: [
      { title: "Sync & Reconcile", detail: "Upload broker evidence, compare REAL holdings and cash, and review corrections", route: "/portfolio-sync-center" },
      { title: "Market Price Import", detail: "Restricted temporary import of licensed myStocks CSV prices", route: "/market-price-import" },
      { title: "Broker Profile", detail: "Review the connected broker account profile", route: "/broker-profile" },
      { title: "Manual Portfolio Entry", detail: "Create or correct investor-entered REAL holdings", route: "/manual-portfolio-entry" }
    ]
  },
  {
    title: "Journey & Account",
    summary: "Goals, guidance, profile, and investor timeline",
    items: [
      { title: "Wealth Journey", detail: "Goals, progress, recovery options, and Coach G guidance", route: "/wealth-journey" },
      { title: "My Profile", detail: "Account, investor profile, broker, and portfolio summary", route: "/my-profile" },
      { title: "Investor Timeline", detail: "Review important investor and portfolio events", route: "/investor-timeline" }
    ]
  }
];

export default function Menu() {
  const { user } = useAuth();

  async function handleLogout() {
    await logout();
    await AsyncStorage.removeItem("gatecepSession");
    await AsyncStorage.removeItem("gatecepCurrentUserId");
    await AsyncStorage.setItem("gatecepIsLoggedIn", "false");
    router.replace("/login");
  }

  return (
    <MobileScreen testID="gatecep-menu">
      <MobileHeader
        title="Menu"
        subtitle="One place for portfolio, guidance, account, and data tools."
        onBack={() => router.back()}
        actionLabel="Home"
        onAction={() => router.replace("/(tabs)/dashboard")}
      />

      <View style={styles.userCard}>
        <Text style={styles.userLabel}>Signed in as</Text>
        <Text style={styles.userName}>{user?.username || user?.email || "Investor"}</Text>
      </View>

      {MENU_SECTIONS.map((section) => (
        <CollapsibleSection
          key={section.title}
          title={section.title}
          summary={section.summary}
          initiallyOpen={section.initiallyOpen}
        >
          <View style={styles.group}>
            {section.items.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.title}
                onPress={() => router.push(item.route)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDetail}>{item.detail}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}
          </View>
        </CollapsibleSection>
      ))}

      <Pressable accessibilityRole="button" style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  userCard: {
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 2
  },
  userLabel: { color: "#94a3b8", fontSize: 11 },
  userName: { color: "#67e8f9", fontSize: 17, fontWeight: "900", marginTop: 3 },
  group: { gap: 9 },
  item: {
    minHeight: 66,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  itemPressed: { backgroundColor: "#1e293b", borderColor: "#67e8f9" },
  itemCopy: { flex: 1 },
  itemTitle: { color: "white", fontWeight: "900", fontSize: 15 },
  itemDetail: { color: "#94a3b8", fontSize: 11, lineHeight: 16, marginTop: 4 },
  arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900" },
  logout: {
    minHeight: 50,
    marginTop: 18,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  logoutText: { color: "#fca5a5", fontWeight: "900" }
});

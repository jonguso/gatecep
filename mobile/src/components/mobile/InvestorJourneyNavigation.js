import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

export const INVESTOR_JOURNEY = {
  coach: { step: 1, title: "Coach Insights", previous: "/(tabs)/dashboard", next: "/unified-portfolio-analytics" },
  analysis: { step: 2, title: "Portfolio Analysis", previous: "/(tabs)/coach", next: "/performance" },
  performance: { step: 3, title: "Performance", previous: "/unified-portfolio-analytics", next: "/portfolio-risk" },
  risk: { step: 4, title: "Portfolio Risk", previous: "/performance", next: "/wealth-journey" },
  goals: { step: 5, title: "Goals & Wealth Journey", previous: "/portfolio-risk", next: "/goal-scenario-planner" },
  scenario: { step: 6, title: "Goal Recovery Simulation", previous: "/wealth-journey", next: "/(tabs)/dashboard" }
};

export default function InvestorJourneyNavigation({
  stage,
  onRefresh,
  refreshing = false,
  nextLabel,
  previousLabel,
  onNext
}) {
  const current = INVESTOR_JOURNEY[stage];
  if (!current) return null;

  const isLast = current.step === Object.keys(INVESTOR_JOURNEY).length;

  return (
    <View style={styles.container} testID={`investor-journey-${stage}`}>
      <Text style={styles.progress}>INVESTOR JOURNEY • {current.step} OF {Object.keys(INVESTOR_JOURNEY).length}</Text>
      <Text style={styles.title}>{current.title}</Text>
      <View style={styles.utilityRow}>
        <Pressable style={styles.utilityButton} onPress={() => router.replace(current.previous)}>
          <Text style={styles.utilityText}>{previousLabel || "‹ Back"}</Text>
        </Pressable>
        <Pressable style={styles.utilityButton} onPress={() => router.replace("/(tabs)/dashboard")}>
          <Text style={styles.utilityText}>Home</Text>
        </Pressable>
        {onRefresh ? (
          <Pressable disabled={refreshing} style={[styles.utilityButton, refreshing && styles.disabled]} onPress={onRefresh}>
            {refreshing ? <ActivityIndicator size="small" color="#67e8f9" /> : <Text style={styles.utilityText}>Refresh</Text>}
          </Pressable>
        ) : null}
      </View>
      <Pressable
        style={styles.nextButton}
        onPress={() => onNext ? onNext() : isLast ? router.replace(current.next) : router.push(current.next)}
      >
        <Text style={styles.nextText}>{nextLabel || (isLast ? "Finish: Home" : "Continue")}</Text>
        <Text style={styles.nextArrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: "#334155", backgroundColor: "#111827", gap: 10 },
  progress: { color: "#67e8f9", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  title: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
  utilityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  utilityButton: { minHeight: 42, minWidth: 76, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
  utilityText: { color: "#67e8f9", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  nextButton: { minHeight: 52, paddingHorizontal: 18, borderRadius: 14, backgroundColor: "#9333ea", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nextText: { color: "#ffffff", fontSize: 15, fontWeight: "900", flex: 1, textAlign: "center" },
  nextArrow: { color: "#ffffff", fontSize: 24, fontWeight: "900" }
});

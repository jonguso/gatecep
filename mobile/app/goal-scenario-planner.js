import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";

import { loadRealCurrentInvestorWealthJourney } from "../src/features/wealth-journey/realWealthJourneyRuntime";
import { loadUnifiedPortfolioRuntime } from "../src/portfolio/unifiedPortfolioApi";
import { buildGoalDiversificationScenario } from "../src/features/wealth-journey/goalDiversificationScenarioService";
import InvestorJourneyNavigation from "../src/components/mobile/InvestorJourneyNavigation";

export default function GoalScenarioPlanner() {
  const { width: viewportWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portfolio, setPortfolio] = useState(null);
  const [goal, setGoal] = useState(null);
  const [monthlyContribution, setMonthlyContribution] = useState("0");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [annualReturn, setAnnualReturn] = useState("8");
  const [defensiveTarget, setDefensiveTarget] = useState("5");
  const [sectorTargets, setSectorTargets] = useState({});

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [journey, realPortfolio] = await Promise.all([
        loadRealCurrentInvestorWealthJourney(),
        loadUnifiedPortfolioRuntime({ broker: "ALL" })
      ]);
      const goalSummary = journey?.experience?.goalsSummary?.goals?.[0] || null;
      const priority = journey?.experience?.journey?.topPriorityGoal || journey?.experience?.journey?.goalAdvice?.[0] || null;
      const trajectory = priority?.progress?.trajectory || priority?.trajectory || null;
      const resolvedGoal = {
        name: goalSummary?.name || priority?.goal?.name || "Financial Goal",
        targetAmount: goalSummary?.targetAmount ?? trajectory?.targetAmount,
        targetDate: goalSummary?.targetDate || priority?.goal?.targetDate,
        monthlyContribution: trajectory?.monthlyContribution ?? priority?.contributionBehavior?.monthlyContribution ?? 0
      };
      if (!resolvedGoal.targetAmount || !resolvedGoal.targetDate) throw new Error("A target amount and target date are required before simulation.");
      setGoal(resolvedGoal);
      setTargetAmount(String(resolvedGoal.targetAmount));
      setTargetDate(String(resolvedGoal.targetDate));
      setMonthlyContribution(String(resolvedGoal.monthlyContribution || 0));
      setPortfolio(realPortfolio);
      setSectorTargets({});
    } catch (loadError) {
      setError(loadError?.message || "Unable to build the goal scenario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const sectorRows = useMemo(() => groupSectors(portfolio?.holdings), [portfolio]);
  const scenario = useMemo(() => buildGoalDiversificationScenario({
    currentValue: portfolio?.summary?.netWorth ?? portfolio?.netWorth ?? portfolio?.summary?.totalValue,
    targetAmount,
    targetDate,
    monthlyContribution,
    annualReturnPercentage: annualReturn,
    defensiveTargetPercentage: defensiveTarget,
    currentDefensiveValue: defensiveValue(portfolio?.holdings),
    sectors: sectorRows.map((row) => ({ ...row, targetPercentage: sectorTargets[row.sector] }))
  }), [portfolio, targetAmount, targetDate, monthlyContribution, annualReturn, defensiveTarget, sectorRows, sectorTargets]);

  function continueToRecommendations() {
    router.push({
      pathname: "/goal-recovery-choice",
      params: {
        scenario: "goal-aware",
        goalName: goal?.name || "Financial Goal",
        targetAmount: String(targetAmount),
        targetDate: String(targetDate),
        monthlyContribution: String(monthlyContribution),
        annualReturn: String(annualReturn),
        defensiveTarget: String(defensiveTarget),
        projectedValue: String(scenario?.trajectory?.projectedValue ?? ""),
        goalGap: String(scenario?.goalGap ?? ""),
        requiredMonthlyContribution: String(scenario?.requiredMonthlyContribution ?? ""),
        defensiveGap: String(scenario?.defensivePlan?.gap ?? ""),
        largestSector: scenario?.concentration?.currentLargestSector || "",
        largestCurrent: String(scenario?.concentration?.currentLargestPercentage ?? ""),
        largestSimulated: String(scenario?.concentration?.simulatedLargestPercentage ?? ""),
        sectorTargetsJson: JSON.stringify(sectorTargets || {})
      }
    });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#67e8f9" /><Text style={styles.muted}>Building a read-only scenario…</Text></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, viewportWidth >= 720 && styles.av3bContentWide, viewportWidth < 720 && styles.av3bContentCompact, viewportWidth < 480 && styles.av3bContentNarrow]}>
      <Text style={styles.eyebrow}>COACH G • SIMULATION ONLY</Text>
      <Text style={[styles.title, viewportWidth < 720 && styles.av3bTitleCompact, viewportWidth < 480 && styles.av3bTitleNarrow]}>Goal Recovery Simulator</Text>
      <Text style={styles.subtitle}>Change the assumptions and see the impact. Your REAL portfolio, goal, Investor DNA, and contributions will not be changed.</Text>

      {error ? <View style={styles.warning}><Text style={styles.warningTitle}>Scenario unavailable</Text><Text style={styles.body}>{error}</Text></View> : null}

      <View style={[styles.card, viewportWidth < 480 && styles.av3ahCardNarrow]}>
        <Text style={styles.cardTitle}>{goal?.name || "Goal assumptions"}</Text>
        <View style={[styles.inputGrid, styles.av3bInputGrid]}>
          <Field label="Target amount (KES)" value={targetAmount} onChangeText={setTargetAmount} numeric />
          <Field label="Target date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} />
          <Field label="Monthly contribution (KES)" value={monthlyContribution} onChangeText={setMonthlyContribution} numeric />
          <Field label="Expected annual return (%)" value={annualReturn} onChangeText={setAnnualReturn} numeric />
          <Field label="Defensive/MMF target (%)" value={defensiveTarget} onChangeText={setDefensiveTarget} numeric />
        </View>
        <View style={[styles.presetRow, viewportWidth < 480 && styles.av3ahPresetRowNarrow]}>
          <Preset label="+ KES 5,000/month" onPress={() => setMonthlyContribution(String(number(monthlyContribution) + 5000))} />
          <Preset label="+ 6 months" onPress={() => setTargetDate(addMonths(targetDate, 6))} />
          <Preset label="Reduce target 5%" onPress={() => setTargetAmount(String(Math.round(number(targetAmount) * 0.95)))} />
        </View>
      </View>

      {scenario.valid ? <>
        <View style={[styles.card, viewportWidth < 480 && styles.av3ahCardNarrow]}>
          <Text style={styles.cardTitle}>Goal impact</Text>
          <View style={[styles.metrics, viewportWidth < 560 && styles.av3ahMetricsNarrow]}>
            <Metric label="Projected value" value={`KES ${money(scenario.trajectory.projectedValue)}`} />
            <Metric label="Goal shortfall" value={`KES ${money(scenario.goalGap)}`} danger={scenario.goalGap > 0} />
            <Metric label="Required monthly" value={`KES ${money(scenario.requiredMonthlyContribution)}`} />
            <Metric label="Additional monthly" value={`KES ${money(scenario.additionalMonthlyContribution)}`} danger={scenario.additionalMonthlyContribution > 0} />
          </View>
          <Text style={scenario.goalGap > 0 ? styles.warningText : styles.successText}>{scenario.goalGap > 0 ? `This scenario still falls short by KES ${money(scenario.goalGap)}.` : `This scenario reaches the goal with a KES ${money(scenario.goalSurplus)} surplus.`}</Text>
        </View>

        <View style={[styles.card, viewportWidth < 480 && styles.av3ahCardNarrow]}>
          <Text style={styles.cardTitle}>Contribution routing</Text>
          <Text style={styles.body}>MMF is one allocation destination—not the entire goal solution.</Text>
          <RouteRow label="Verified MMF / fixed income" value={scenario.contributionPlan.defensive} compact={viewportWidth < 520} />
          <RouteRow label="Underweight equity sectors" value={scenario.contributionPlan.equitySectors} compact={viewportWidth < 520} />
          <RouteRow label="Total planned contributions" value={scenario.contributionPlan.total} compact={viewportWidth < 520} />
          <Text style={styles.muted}>Defensive allocation gap: KES {money(scenario.defensivePlan.gap)} at a {scenario.defensivePlan.targetPercentage.toFixed(1)}% illustrative target.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diversification simulation</Text>
          <Text style={styles.body}>Edit illustrative sector targets. Future equity contributions are redirected toward underweight sectors; no sale is created.</Text>
          {scenario.sectorPlan.map((row) => <View key={row.sector} style={[styles.sectorRow, viewportWidth < 560 && styles.av3ahSectorRowCompact, viewportWidth < 480 && styles.av3ahSectorRowNarrow]}>
            <View style={styles.sectorCopy}><Text style={styles.sectorName}>{row.sector}</Text><Text style={styles.muted}>Current {row.currentPercentage.toFixed(1)}% → simulated {row.simulatedPercentage.toFixed(1)}%</Text><Text style={styles.successText}>Direct KES {money(row.directedContribution)}</Text></View>
            <View style={viewportWidth < 560 && styles.av3ahTargetWrap}><Text style={styles.inputLabel}>Target %</Text><TextInput style={[styles.targetInput, viewportWidth < 560 && styles.av3ahTargetInputCompact]} keyboardType="decimal-pad" value={String(sectorTargets[row.sector] ?? row.targetPercentage)} onChangeText={(value) => setSectorTargets((current) => ({ ...current, [row.sector]: value }))} /></View>
          </View>)}
          <Text style={styles.muted}>Largest sector: {scenario.concentration.currentLargestSector} {number(scenario.concentration.currentLargestPercentage).toFixed(1)}% → {number(scenario.concentration.simulatedLargestPercentage).toFixed(1)}% simulated.</Text>
        </View>

        <View style={styles.warning}><Text style={styles.warningTitle}>Simulation safeguards</Text><Text style={styles.body}>No trades, transfers, goal updates, contribution changes, or REAL portfolio changes have been made.</Text></View>
      </> : null}

      <InvestorJourneyNavigation stage="scenario" onRefresh={load} refreshing={loading} onNext={continueToRecommendations} nextLabel="Continue with this scenario" />
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, numeric }) { return <View style={[styles.field, styles.av3bField, styles.av3ahField]}><Text style={styles.inputLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={numeric ? "decimal-pad" : "default"} /></View>; }
function Metric({ label, value, danger }) { return <View style={[styles.metric, styles.av3ahMetric]}><Text style={styles.inputLabel}>{label}</Text><Text style={danger ? styles.dangerValue : styles.metricValue}>{value}</Text></View>; }
function RouteRow({ label, value, compact }) { return <View style={[styles.routeRow, compact && styles.av3ahRouteRowCompact]}><Text style={[styles.body, styles.av3ahRouteLabel]}>{label}</Text><Text style={[styles.metricValue, compact && styles.av3ahRouteValueCompact]}>KES {money(value)}</Text></View>; }
function Preset({ label, onPress }) { return <Pressable style={[styles.preset, styles.av3ahPreset]} onPress={onPress}><Text style={styles.presetText}>{label}</Text></Pressable>; }
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function money(value) { return number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function addMonths(value, count) { const date = new Date(`${value}T00:00:00`); if (Number.isNaN(date.getTime())) return value; date.setMonth(date.getMonth() + count); return date.toISOString().slice(0, 10); }
function holdingValue(row) { return number(row?.marketValue ?? row?.value) || number(row?.quantity) * number(row?.marketPrice ?? row?.price); }
function groupSectors(holdings = []) { const map = new Map(); for (const row of Array.isArray(holdings) ? holdings : []) { if (isDefensive(row)) continue; const sector = String(row?.sector || "Other"); map.set(sector, (map.get(sector) || 0) + holdingValue(row)); } return [...map].map(([sector, value]) => ({ sector, value })).sort((a, b) => b.value - a.value); }
function isDefensive(row) { const text = `${row?.assetClass || ""} ${row?.sector || ""} ${row?.name || ""}`.toUpperCase(); return /MONEY.?MARKET|FIXED.?INCOME|BOND|MMF/.test(text); }
function defensiveValue(holdings = []) { return (Array.isArray(holdings) ? holdings : []).filter(isDefensive).reduce((sum, row) => sum + holdingValue(row), 0); }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" }, content: { padding: 20, paddingTop: 54, paddingBottom: 120, gap: 16 }, center: { flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center", gap: 12 }, eyebrow: { color: "#67e8f9", fontWeight: "900", fontSize: 12 }, title: { color: "#fff", fontSize: 32, fontWeight: "900" }, subtitle: { color: "#94a3b8", lineHeight: 21 }, card: { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e293b", borderRadius: 20, padding: 16, gap: 12 }, cardTitle: { color: "#67e8f9", fontSize: 20, fontWeight: "900" }, body: { color: "#cbd5e1", lineHeight: 20 }, muted: { color: "#94a3b8", lineHeight: 18 }, inputGrid: { gap: 10 }, field: { gap: 5 }, inputLabel: { color: "#94a3b8", fontSize: 12 }, input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: "#334155", backgroundColor: "#020617", color: "#fff", paddingHorizontal: 12, fontWeight: "800" }, presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, preset: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#1e293b" }, presetText: { color: "#67e8f9", fontWeight: "800" }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, metric: { width: "48%", backgroundColor: "#020617", borderRadius: 12, padding: 12, gap: 5 }, metricValue: { color: "#f8fafc", fontWeight: "900" }, dangerValue: { color: "#fca5a5", fontWeight: "900" }, warningText: { color: "#fca5a5", fontWeight: "800", lineHeight: 20 }, successText: { color: "#86efac", fontWeight: "800", lineHeight: 20 }, routeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingVertical: 9 }, sectorRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingVertical: 10 }, sectorCopy: { flex: 1, gap: 4 }, sectorName: { color: "#fff", fontWeight: "900", fontSize: 16 }, targetInput: { width: 76, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#7e22ce", backgroundColor: "#020617", color: "#fff", textAlign: "center", fontWeight: "900" }, warning: { backgroundColor: "#1c1418", borderColor: "#854d0e", borderWidth: 1, borderRadius: 18, padding: 15, gap: 7 }, warningTitle: { color: "#fde68a", fontWeight: "900" },

  /* PC-030M20AV3B RESPONSIVE CALIBRATION */
  av3bContentWide: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    paddingHorizontal: 24
  },
  av3bContentCompact: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 128
  },
  av3bContentNarrow: {
    paddingHorizontal: 12
  },
  av3bHeaderCompact: {
    flexWrap: "wrap",
    alignItems: "stretch"
  },
  av3bHeaderActionsCompact: {
    width: "100%",
    flexWrap: "wrap"
  },
  av3bTitleCompact: {
    fontSize: 28,
    lineHeight: 34
  },
  av3bTitleNarrow: {
    fontSize: 25,
    lineHeight: 31
  },
  av3bInputGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  av3bField: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 0
  },
  av3bSectorRowNarrow: {
    flexDirection: "column",
    alignItems: "stretch"
  },

  /* PC-030M20AV3AH RESPONSIVE CALIBRATION */
  av3ahCardNarrow: {
    padding: 14,
    borderRadius: 16
  },
  av3ahField: {
    width: "100%",
    minWidth: 0
  },
  av3ahPresetRowNarrow: {
    flexDirection: "column",
    alignItems: "stretch"
  },
  av3ahPreset: {
    minHeight: 44,
    justifyContent: "center"
  },
  av3ahMetricsNarrow: {
    flexDirection: "column"
  },
  av3ahMetric: {
    minWidth: 0
  },
  av3ahRouteRowCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 5
  },
  av3ahRouteLabel: {
    flexShrink: 1
  },
  av3ahRouteValueCompact: {
    textAlign: "left"
  },
  av3ahSectorRowCompact: {
    alignItems: "flex-start"
  },
  av3ahSectorRowNarrow: {
    flexDirection: "column",
    alignItems: "stretch"
  },
  av3ahTargetWrap: {
    width: "100%",
    gap: 5
  },
  av3ahTargetInputCompact: {
    width: "100%",
    textAlign: "left",
    paddingHorizontal: 12
  }
});

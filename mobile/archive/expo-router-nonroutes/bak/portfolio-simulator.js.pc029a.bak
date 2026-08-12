import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";

const scenarios = [
  { key: "market_drop", title: "Market Drops 10%", growthRate: -10, monthly: 0 },
  { key: "steady_growth", title: "Steady Growth 8%", growthRate: 8, monthly: 0 },
  { key: "monthly_5000", title: "Add KES 5,000 Monthly", growthRate: 8, monthly: 5000 },
  { key: "monthly_10000", title: "Add KES 10,000 Monthly", growthRate: 8, monthly: 10000 },
  { key: "aggressive", title: "Aggressive Growth 15%", growthRate: 15, monthly: 5000 },
  { key: "conservative", title: "Conservative Growth 4%", growthRate: 4, monthly: 3000 }
];

export default function PortfolioSimulator() {
  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState(scenarios[1]);
  const [months, setMonths] = useState("12");
  const [customMonthly, setCustomMonthly] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const portfolioRaw = await userGetItem("ManualPortfolio");
    const cashRaw = userGetItem("availableCash");

    if (portfolioRaw) {
      setHoldings(JSON.parse(portfolioRaw));
    }

    if (cashRaw) {
      setCash(Number(cashRaw || 0));
    }
  }

  const portfolioValue = useMemo(() => {
    return holdings.reduce(
      (sum, item) => sum + Number(item.marketValue || item.value || 0),
      0
    );
  }, [holdings]);

  const startingValue = portfolioValue + Number(cash || 0);

  function runScenario() {
    const duration = Number(months || 0);

    if (!duration || duration <= 0) {
      Alert.alert("Invalid Period", "Enter number of months.");
      return;
    }

    const monthly =
      customMonthly !== ""
        ? Number(customMonthly || 0)
        : Number(selectedScenario.monthly || 0);

    const annualRate = Number(selectedScenario.growthRate || 0) / 100;
    const monthlyRate = annualRate / 12;

    let projectedPortfolio = portfolioValue;
    let totalContributions = 0;

    for (let i = 0; i < duration; i++) {
      projectedPortfolio = projectedPortfolio * (1 + monthlyRate);
      projectedPortfolio += monthly;
      totalContributions += monthly;
    }

    const projectedTotal = projectedPortfolio + cash;
    const gainLoss = projectedTotal - startingValue - totalContributions;

    setResult({
      scenario: selectedScenario.title,
      months: duration,
      monthly,
      growthRate: selectedScenario.growthRate,
      startingValue,
      projectedTotal,
      totalContributions,
      gainLoss
    });
  }

  async function saveScenario() {
    if (!result) {
      Alert.alert("No Scenario", "Run a scenario first.");
      return;
    }

    const raw = await userGetItem("SavedScenarios");
    const saved = raw ? JSON.parse(raw) : [];

    saved.unshift({
      ...result,
      savedAt: new Date().toISOString()
    });

    await userGetItem("SavedScenarios", JSON.stringify(saved));

    Alert.alert("Saved", "Scenario saved to your profile.");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Portfolio Simulator</Text>

      <Text style={styles.subtitle}>
        Test how your portfolio could change under different contribution and market scenarios.
      </Text>

      <View style={styles.summaryCard}>
        <Metric label="Portfolio Value" value={`KES ${money(portfolioValue)}`} />
        <Metric label="Cash" value={`KES ${money(cash)}`} />
        <Metric label="Starting Total" value={`KES ${money(startingValue)}`} />
        <Metric label="Holdings" value={String(holdings.length)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choose Scenario</Text>

        {scenarios.map((scenario) => (
          <Pressable
            key={scenario.key}
            style={[
              styles.scenarioRow,
              selectedScenario.key === scenario.key && styles.scenarioActive
            ]}
            onPress={() => {
              setSelectedScenario(scenario);
              setCustomMonthly("");
              setResult(null);
            }}
          >
            <View>
              <Text style={styles.scenarioTitle}>{scenario.title}</Text>
              <Text style={styles.small}>
                Growth: {scenario.growthRate}% yearly • Monthly: KES {money(scenario.monthly)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customize</Text>

        <Text style={styles.label}>Months</Text>
        <TextInput
          value={months}
          onChangeText={setMonths}
          keyboardType="numeric"
          placeholder="12"
          placeholderTextColor="#64748b"
          style={styles.input}
        />

        <Text style={styles.label}>Custom Monthly Contribution Optional</Text>
        <TextInput
          value={customMonthly}
          onChangeText={setCustomMonthly}
          keyboardType="numeric"
          placeholder="Leave blank to use scenario default"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
      </View>

      <Pressable style={styles.primary} onPress={runScenario}>
        <Text style={styles.primaryText}>Run Scenario</Text>
      </Pressable>

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.cardTitle}>Scenario Result</Text>

          <Metric label="Scenario" value={result.scenario} full />
          <Metric label="Projected Value" value={`KES ${money(result.projectedTotal)}`} full />
          <Metric label="Total Contributions" value={`KES ${money(result.totalContributions)}`} full />
          <Metric
            label="Estimated Gain/Loss"
            value={`KES ${money(result.gainLoss)}`}
            full
            positive={result.gainLoss >= 0}
          />

          <Text style={styles.note}>
            This is a planning estimate only. Actual market results will differ.
          </Text>

          <Pressable style={styles.secondary} onPress={saveScenario}>
            <Text style={styles.secondaryText}>Save Preferred Scenario</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.backButton} onPress={() => router.replace("/coach")}>
  <Text style={styles.backText}>Back to Coach G Insights</Text>
</Pressable>

<Pressable
  style={styles.backButton}
  onPress={() => router.replace("/starter-plan")}
>
  <Text style={styles.backText}>Back to Starter Plan</Text>
</Pressable>

    </ScrollView>
  );
}

function Metric({ label, value, full, positive }) {
  return (
    <View style={[styles.metric, full && styles.metricFull]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          positive === true && styles.green,
          positive === false && styles.red
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  summaryCard: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  metricFull: {
    width: "100%",
    marginTop: 10
  },
  metricLabel: { color: "#94a3b8", fontSize: 12 },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6
  },
  card: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  resultCard: {
    marginTop: 22,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  scenarioRow: {
    marginTop: 12,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16
  },
  scenarioActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.14)"
  },
  scenarioTitle: {
    color: "white",
    fontWeight: "900"
  },
  small: {
    color: "#94a3b8",
    marginTop: 6,
    lineHeight: 19
  },
  label: {
    color: "#94a3b8",
    marginTop: 14
  },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    color: "white",
    marginTop: 8
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  secondary: {
    marginTop: 18,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  backButton: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  backText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontWeight: "900"
  },
  note: {
    color: "#fde68a",
    marginTop: 16,
    lineHeight: 20
  },
  green: { color: "#86efac" },
  red: { color: "#fca5a5" }
});
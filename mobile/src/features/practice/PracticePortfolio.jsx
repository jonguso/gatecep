import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import { userGetItem, userSetItem } from "../../auth/userStorage";

import CoachInsightCard from "./components/CoachInsightCard";
import ConfidenceMeter from "./components/ConfidenceMeter";
import LessonCard from "./components/LessonCard";
import PortfolioAllocationCard from "./components/PortfolioAllocationCard";

const ALLOCATION_REASONS = {
  "Growth Stocks":
    "These investments may move more in the short term, but they can provide stronger long-term growth potential.",

  "Dividend Stocks":
    "These companies may return part of their profits to investors, which can support steady long-term income.",

  "ETF / Diversifier":
    "This allocation spreads your money across different investments, reducing dependence on a single company.",

  Banking:
    "Banks can provide exposure to Kenya's wider economy through lending, savings, payments, and business activity.",

  "Cash Reserve":
    "Cash gives your portfolio flexibility and allows you to respond calmly when opportunities or unexpected needs arise."
};

const PRACTICE_SECURITIES = {
  "Growth Stocks": [
    {
      symbol: "SCOM",
      name: "Safaricom",
      sector: "Telecommunication",
      price: 30.6,
      reason:
        "Provides exposure to telecommunications, digital payments, and long-term business growth."
    },
    {
      symbol: "KEGN",
      name: "KenGen",
      sector: "Energy",
      price: 45.5,
      reason:
        "Provides exposure to electricity generation and Kenya's long-term infrastructure needs."
    },
    {
      symbol: "EQTY",
      name: "Equity Group",
      sector: "Banking",
      price: 48,
      reason:
        "Provides exposure to banking, regional growth, and financial services."
    }
  ],

  "Dividend Stocks": [
    {
      symbol: "SCOM",
      name: "Safaricom",
      sector: "Telecommunication",
      price: 30.6,
      reason:
        "A familiar company that may combine business growth with dividend income."
    },
    {
      symbol: "EABL",
      name: "East African Breweries",
      sector: "Manufacturing",
      price: 248,
      reason:
        "Provides consumer-business exposure and may support an income-focused strategy."
    },
    {
      symbol: "COOP",
      name: "Co-operative Bank",
      sector: "Banking",
      price: 16,
      reason:
        "Provides accessible banking exposure for a diversified practice portfolio."
    }
  ],

  "ETF / Diversifier": [
    {
      symbol: "GLD",
      name: "Gold ETF",
      sector: "ETF",
      price: 5690,
      reason:
        "Provides diversification beyond ordinary company shares."
    },
    {
      symbol: "SMWF",
      name: "Satrix MSCI World Feeder",
      sector: "ETF",
      price: 950,
      reason:
        "Provides practice exposure to diversified global-market investing."
    }
  ],

  Banking: [
    {
      symbol: "KCB",
      name: "KCB Group",
      sector: "Banking",
      price: 45,
      reason:
        "Provides exposure to a large regional banking institution."
    },
    {
      symbol: "EQTY",
      name: "Equity Group",
      sector: "Banking",
      price: 48,
      reason:
        "Provides exposure to retail banking and regional financial services."
    },
    {
      symbol: "COOP",
      name: "Co-operative Bank",
      sector: "Banking",
      price: 16,
      reason:
        "Provides a lower-priced banking example for practice investing."
    }
  ]
};

export default function PracticePortfolio() {
  const [savedProfile, setSavedProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);

      const raw = await userGetItem("investorProfile");

      if (!raw) {
        setSavedProfile(null);
        return;
      }

      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      setSavedProfile(parsed);
    } catch (error) {
      console.error("Unable to load investor profile:", error);
      setSavedProfile(null);
    } finally {
      setLoading(false);
    }
  }

  const allocations = useMemo(() => {
    return Array.isArray(savedProfile?.starterPlan?.allocations)
      ? savedProfile.starterPlan.allocations
      : [];
  }, [savedProfile]);

  const practiceHoldings = useMemo(() => {
    return buildPracticeHoldings(allocations);
  }, [allocations]);

  const cashReserve = useMemo(() => {
    return allocations
      .filter((item) => item.name === "Cash Reserve")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [allocations]);

  const investedAmount = useMemo(() => {
    return practiceHoldings.reduce(
      (sum, holding) => sum + Number(holding.marketValue || 0),
      0
    );
  }, [practiceHoldings]);

  async function createPracticePortfolio() {
    if (!savedProfile) {
      Alert.alert(
        "Investor DNA Required",
        "Complete the Welcome Journey before building a Practice Portfolio."
      );
      return;
    }

    if (!practiceHoldings.length) {
      Alert.alert(
        "Portfolio Not Ready",
        "Coach G could not build practice holdings from the current Wealth Blueprint."
      );
      return;
    }

    try {
      setCreating(true);

      const practicePortfolio = {
        type: "GATECEP_PRACTICE_PORTFOLIO",
        status: "ACTIVE",
        investorType: savedProfile?.profile?.investorType || null,
        riskProfile:
          savedProfile?.investorDNA?.riskProfile ||
          savedProfile?.profile?.dna?.riskProfile ||
          null,
        startingAmount: Number(
          savedProfile?.starterPlan?.startingAmount ||
            savedProfile?.profile?.amount ||
            0
        ),
        investedAmount,
        availableCash: cashReserve,
        holdings: practiceHoldings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      /*
       * Canonical practice records.
       */
      await userSetItem(
        "practicePortfolio",
        JSON.stringify(practicePortfolio)
      );

      await userSetItem(
        "ManualPortfolio",
        JSON.stringify(practiceHoldings)
      );

      await userSetItem(
        "availableCash",
        String(cashReserve)
      );

      await userSetItem("practicePortfolioCreated", "true");

      /*
       * Temporary compatibility with screens that still read the legacy
       * non-user-scoped AsyncStorage keys. These can be removed after
       * the dashboard and simulator complete their storage migration.
       */
      await AsyncStorage.setItem(
        "gatecepManualPortfolio",
        JSON.stringify(practiceHoldings)
      );

      await AsyncStorage.setItem(
        "gatecepStatementUploaded",
        "true"
      );

      Alert.alert(
        "Practice Portfolio Ready",
        "Coach G has created your Practice Portfolio. No real money was used.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/(tabs)/dashboard")
          }
        ]
      );
    } catch (error) {
      console.error("Unable to create Practice Portfolio:", error);

      Alert.alert(
        "Coach G",
        error.message || "Unable to create your Practice Portfolio."
      );
    } finally {
      setCreating(false);
    }
  }

  function openLesson() {
    Alert.alert(
      "Why Diversification Matters",
      "Diversification means spreading your money across different investments. It cannot remove all risk, but it can reduce the effect of one poor-performing investment on your entire portfolio."
    );
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingTitle}>
          Coach G is preparing your plan...
        </Text>
      </View>
    );
  }

  if (!savedProfile) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Practice Portfolio</Text>

        <CoachInsightCard>
          I need to understand you before I can build a portfolio that fits
          your goals. Let's complete your Welcome Journey first.
        </CoachInsightCard>

        <Pressable
          style={styles.primary}
          onPress={() => router.replace("/new-investor")}
        >
          <Text style={styles.primaryText}>Meet Coach G</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const firstName =
    savedProfile?.profile?.firstName ||
    savedProfile?.profile?.name?.split?.(" ")?.[0] ||
    "";

  const investorType =
    savedProfile?.profile?.investorType ||
    savedProfile?.investorDNA?.investorType ||
    "Developing Investor";

  const comfortProfile =
    savedProfile?.profile?.risk ||
    savedProfile?.investorDNA?.riskProfile ||
    savedProfile?.profile?.dna?.riskProfile ||
    "balanced";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.eyebrow}>Practice Investing</Text>

      <Text style={styles.title}>
        {firstName
          ? `${firstName}, let's build your first portfolio.`
          : "Let's build your first portfolio."}
      </Text>

      <Text style={styles.subtitle}>
        This portfolio is for learning. No real money will be invested and no
        live broker order will be placed.
      </Text>

      <CoachInsightCard>
        Based on what you've shared, I prepared a Practice Portfolio for a{" "}
        {String(investorType).toLowerCase()} with a{" "}
        {String(comfortProfile).toLowerCase()} comfort profile. I'll explain
        why each part is included before you decide what to do.
      </CoachInsightCard>

      <View style={styles.summaryCard}>
        <Metric
          label="Starting Amount"
          value={`KES ${money(
            savedProfile?.starterPlan?.startingAmount ||
              savedProfile?.profile?.amount
          )}`}
        />

        <Metric
          label="Estimated Invested"
          value={`KES ${money(investedAmount)}`}
        />

        <Metric
          label="Cash Reserve"
          value={`KES ${money(cashReserve)}`}
        />

        <Metric
          label="Investor Type"
          value={investorType}
        />
      </View>

      <LessonCard
        title="Why diversification matters"
        summary="Spreading money across different investments can reduce dependence on one company or one part of the market."
        duration="90 sec"
        onPress={openLesson}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Your Practice Allocation
        </Text>

        <Text style={styles.sectionIntro}>
          Each allocation has a different role. Together, they form a more
          balanced learning portfolio.
        </Text>

        {allocations.map((allocation) => (
          <PortfolioAllocationCard
            key={allocation.name}
            name={allocation.name}
            weight={allocation.weight}
            amount={allocation.amount}
            reason={
              ALLOCATION_REASONS[allocation.name] ||
              "This allocation supports your current Wealth Blueprint."
            }
          />
        ))}
      </View>

      <ConfidenceMeter
        level={2}
        maxLevel={8}
        label="Building Your Foundation"
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          What Coach G Wants You to Learn
        </Text>

        {[
          "Why different investments serve different purposes",
          "Why cash can provide flexibility",
          "Why diversification matters",
          "Why short-term price movement is not the whole story",
          "Why every investment decision should connect to a goal"
        ].map((item) => (
          <Text key={item} style={styles.learningItem}>
            ✓ {item}
          </Text>
        ))}
      </View>

      <View style={styles.promiseCard}>
        <Text style={styles.promiseTitle}>The GateCEP Promise</Text>

        <Text style={styles.promiseText}>
          Coach G will explain the options. You remain in control of every
          decision.
        </Text>

        <Text style={styles.promiseTagline}>
          We advise. You decide.
        </Text>
      </View>

      <Pressable
        style={[
          styles.primary,
          creating && styles.buttonDisabled
        ]}
        disabled={creating}
        onPress={createPracticePortfolio}
      >
        {creating ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.primaryText}>
            Build My Practice Portfolio
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.replace("/new-investor")}
      >
        <Text style={styles.secondaryText}>
          Review My Investor DNA
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function buildPracticeHoldings(allocations = []) {
  const holdings = [];

  allocations.forEach((allocation) => {
    if (allocation.name === "Cash Reserve") {
      return;
    }

    const securities = PRACTICE_SECURITIES[allocation.name] || [];
    const allocationAmount = Number(allocation.amount || 0);

    if (!securities.length || allocationAmount <= 0) {
      return;
    }

    const amountPerSecurity = allocationAmount / securities.length;

    securities.forEach((security) => {
      const quantity = Math.floor(
        amountPerSecurity / Number(security.price || 1)
      );

      if (quantity <= 0) {
        return;
      }

      const marketValue = quantity * Number(security.price || 0);

      holdings.push({
        symbol: security.symbol,
        name: security.name,
        sector: security.sector,
        quantity: String(quantity),
        averagePrice: String(security.price),
        marketPrice: String(security.price),
        marketValue,
        profitLoss: 0,
        reason: security.reason,
        source: "GATECEP_PRACTICE_PORTFOLIO",
        isPractice: true
      });
    });
  });

  return combineDuplicateHoldings(holdings);
}

function combineDuplicateHoldings(holdings = []) {
  const combined = new Map();

  holdings.forEach((holding) => {
    const existing = combined.get(holding.symbol);

    if (!existing) {
      combined.set(holding.symbol, { ...holding });
      return;
    }

    const existingQuantity = Number(existing.quantity || 0);
    const incomingQuantity = Number(holding.quantity || 0);
    const totalQuantity = existingQuantity + incomingQuantity;

    const existingValue = Number(existing.marketValue || 0);
    const incomingValue = Number(holding.marketValue || 0);
    const totalValue = existingValue + incomingValue;

    combined.set(holding.symbol, {
      ...existing,
      quantity: String(totalQuantity),
      averagePrice:
        totalQuantity > 0
          ? String(totalValue / totalQuantity)
          : existing.averagePrice,
      marketValue: totalValue
    });
  });

  return Array.from(combined.values());
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {String(value || "N/A")}
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
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 110
  },

  centerScreen: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },

  loadingTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center"
  },

  eyebrow: {
    color: "#c084fc",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 12,
    lineHeight: 22
  },

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

  metricLabel: {
    color: "#94a3b8",
    fontSize: 12
  },

  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6
  },

  section: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  sectionTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900"
  },

  sectionIntro: {
    color: "#94a3b8",
    lineHeight: 21,
    marginTop: 8
  },

  learningItem: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginTop: 10
  },

  promiseCard: {
    marginTop: 22,
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  promiseTitle: {
    color: "#fde68a",
    fontSize: 18,
    fontWeight: "900"
  },

  promiseText: {
    color: "#fef3c7",
    lineHeight: 22,
    marginTop: 10
  },

  promiseTagline: {
    color: "white",
    fontWeight: "900",
    marginTop: 14
  },

  primary: {
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18,
    marginTop: 24
  },

  buttonDisabled: {
    opacity: 0.65
  },

  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },

  secondary: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18,
    marginTop: 14
  },

  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});
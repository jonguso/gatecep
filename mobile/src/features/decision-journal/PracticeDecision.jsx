import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { userGetItem } from "../../auth/userStorage";
import { loadUnifiedPortfolio } from "../../portfolio/unifiedPortfolioApi";

import {
  addDecisionJournalEntry
} from "./decisionJournalStore";

import DecisionReasonCard from "./components/DecisionReasonCard";
import DecisionSummaryCard from "./components/DecisionSummaryCard";

const DECISION_REASONS = [
  {
    value: "LONG_TERM_GROWTH",
    icon: "🌱",
    title: "Long-term growth",
    description:
      "I believe this investment may support my long-term wealth-building goal."
  },
  {
    value: "DIVIDEND_INCOME",
    icon: "💰",
    title: "Dividend income",
    description:
      "I am interested in the possibility of receiving income while remaining invested."
  },
  {
    value: "DIVERSIFICATION",
    icon: "🧩",
    title: "Portfolio diversification",
    description:
      "This investment may reduce how much my portfolio depends on one company or sector."
  },
  {
    value: "COACH_G_RESEARCH",
    icon: "🧠",
    title: "Coach G encouraged me to research it",
    description:
      "The explanation made this investment worth studying before I decide."
  },
  {
    value: "PRACTICE_ONLY",
    icon: "🎓",
    title: "I want to practice",
    description:
      "I am using this decision to learn how investing works without risking real money."
  },
  {
    value: "UNSURE",
    icon: "🤔",
    title: "I am not sure yet",
    description:
      "I need more explanation before I feel ready to make even a practice decision."
  }
];

const EXPECTED_OUTCOMES = [
  {
    value: "GROW_OVER_TIME",
    title: "Grow over time"
  },
  {
    value: "PROVIDE_INCOME",
    title: "Provide dividend income"
  },
  {
    value: "REDUCE_PORTFOLIO_RISK",
    title: "Improve diversification"
  },
  {
    value: "LEARN_INVESTING",
    title: "Help me learn"
  },
  {
    value: "REVIEW_LATER",
    title: "I want to review it later"
  }
];

export default function PracticeDecision() {
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [selectedHolding, setSelectedHolding] = useState(null);

  const [reason, setReason] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");
  const [savedDecision, setSavedDecision] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const [profileRaw, portfolioResult] = await Promise.all([
        userGetItem("investorProfile").catch(() => null),
        loadUnifiedPortfolio({ broker: "ALL" }).catch(() => null)
      ]);

      const parsedProfile = parseStoredValue(profileRaw);
      const portfolioHoldings = Array.isArray(portfolioResult?.holdings)
        ? portfolioResult.holdings
        : [];

      setProfile(parsedProfile);
      setHoldings(portfolioHoldings);

      const requestedSymbol = String(params?.symbol || "").toUpperCase();

      const requestedHolding = requestedSymbol
        ? portfolioHoldings.find(
            (holding) =>
              String(holding.symbol || "").toUpperCase() === requestedSymbol
          )
        : null;

      setSelectedHolding(requestedHolding || portfolioHoldings[0] || null);
    } catch (error) {
      console.error("Unable to load practice decision:", error);
    } finally {
      setLoading(false);
    }
  }

  const investorProfile = profile?.profile || profile || {};

  const investorDNA =
    profile?.investorDNA ||
    investorProfile?.dna ||
    {};

  const investorGoal =
    investorProfile?.goal ||
    investorDNA?.goal ||
    null;

  const investorType =
    investorProfile?.investorType ||
    investorDNA?.investorType ||
    null;

  const coachExplanation = useMemo(() => {
    return buildCoachExplanation({
      holding: selectedHolding,
      investorGoal,
      investorType
    });
  }, [selectedHolding, investorGoal, investorType]);

  async function saveDecision() {
    if (!selectedHolding) {
      Alert.alert(
        "Choose an Investment",
        "Select an investment before recording your practice decision."
      );
      return;
    }

    if (!reason) {
      Alert.alert(
        "Tell Coach G Why",
        "Choose the reason that best explains why this investment interests you."
      );
      return;
    }

    if (!expectedOutcome) {
      Alert.alert(
        "Expected Outcome",
        "Choose what you expect this investment to contribute to your plan."
      );
      return;
    }

    try {
      setSaving(true);

      const reasonOption = DECISION_REASONS.find(
        (item) => item.value === reason
      );

      const outcomeOption = EXPECTED_OUTCOMES.find(
        (item) => item.value === expectedOutcome
      );

      const saved = await addDecisionJournalEntry({
        symbol: selectedHolding.symbol,
        companyName:
          selectedHolding.name ||
          selectedHolding.companyName ||
          selectedHolding.symbol,
        decision: "CONSIDER_BUY",
        reason: reasonOption?.title || reason,
        expectedOutcome:
          outcomeOption?.title || expectedOutcome,
        confidence,
        investorGoal,
        investorType,
        priceAtDecision:
          selectedHolding.marketPrice ||
          selectedHolding.price ||
          selectedHolding.averagePrice ||
          0,
        quantity: 0,
        notes,
        isPractice: true,
        status: "RECORDED",
        reviewStatus: "PENDING"
      });

      setSavedDecision(saved);
    } catch (error) {
      Alert.alert(
        "Coach G",
        error.message || "Unable to save your practice decision."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loadingTitle}>
          Coach G is preparing your decision...
        </Text>
      </View>
    );
  }

  if (!selectedHolding && holdings.length === 0) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>Practice Decision</Text>
        <Text style={styles.title}>No practice holdings yet</Text>

        <View style={styles.coachCard}>
          <Text style={styles.coachLabel}>Coach G</Text>
          <Text style={styles.coachText}>
            Build your Practice Portfolio first. Then we can study one
            investment and record why it may fit your plan.
          </Text>
        </View>

        <Pressable
          style={styles.primary}
          onPress={() => router.replace("/starter-plan")}
        >
          <Text style={styles.primaryText}>
            Build Practice Portfolio
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (savedDecision) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.eyebrow}>Decision Recorded</Text>
        <Text style={styles.title}>
          You paused and thought before acting.
        </Text>

        <View style={styles.coachCard}>
          <Text style={styles.coachLabel}>Coach G</Text>
          <Text style={styles.coachText}>
            This is how thoughtful investing begins. We did not place an
            order. We recorded what you understood, what you expected,
            and how confident you felt.
          </Text>
        </View>

        <DecisionSummaryCard
          symbol={savedDecision.symbol}
          companyName={savedDecision.companyName}
          reason={savedDecision.reason}
          expectedOutcome={savedDecision.expectedOutcome}
          confidence={savedDecision.confidence}
          price={savedDecision.priceAtDecision}
          decision="Consider Buy"
        />

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/decision-journal")}
        >
          <Text style={styles.primaryText}>
            Open My Decision Journal
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.secondaryText}>
            Return to My Journey
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.eyebrow}>First Practice Decision</Text>

      <Text style={styles.title}>
        Let’s think before we act.
      </Text>

      <Text style={styles.subtitle}>
        No real order will be submitted. This exercise helps Coach G
        understand how you make investment decisions.
      </Text>

      <View style={styles.coachCard}>
        <Text style={styles.coachLabel}>Coach G</Text>
        <Text style={styles.coachText}>{coachExplanation}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Choose an investment to study
        </Text>

        <Text style={styles.sectionIntro}>
          Select one holding from your current practice or unified
          portfolio.
        </Text>

        <View style={styles.holdingList}>
          {holdings.map((holding, index) => {
            const symbol = String(holding.symbol || `HOLDING-${index}`);
            const selected =
              selectedHolding?.symbol === holding.symbol;

            return (
              <Pressable
                key={`${symbol}-${index}`}
                style={[
                  styles.holdingCard,
                  selected && styles.selectedHoldingCard
                ]}
                onPress={() => setSelectedHolding(holding)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.holdingSymbol}>
                    {holding.symbol || "N/A"}
                  </Text>

                  <Text style={styles.holdingName}>
                    {holding.name ||
                      holding.companyName ||
                      holding.sector ||
                      "Practice Security"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.holdingPrice}>
                    KES{" "}
                    {money(
                      holding.marketPrice ||
                      holding.price ||
                      holding.averagePrice
                    )}
                  </Text>

                  <Text style={styles.holdingSelect}>
                    {selected ? "Selected" : "Choose"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          What made this investment interesting?
        </Text>

        <Text style={styles.sectionIntro}>
          There is no perfect answer. Coach G wants to understand your
          thinking.
        </Text>

        {DECISION_REASONS.map((item) => (
          <DecisionReasonCard
            key={item.value}
            icon={item.icon}
            title={item.title}
            description={item.description}
            selected={reason === item.value}
            onPress={() => setReason(item.value)}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          What do you expect from it?
        </Text>

        <View style={styles.outcomeWrap}>
          {EXPECTED_OUTCOMES.map((item) => (
            <Pressable
              key={item.value}
              style={[
                styles.outcomeChip,
                expectedOutcome === item.value &&
                  styles.selectedOutcomeChip
              ]}
              onPress={() => setExpectedOutcome(item.value)}
            >
              <Text
                style={[
                  styles.outcomeText,
                  expectedOutcome === item.value &&
                    styles.selectedOutcomeText
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          How confident do you feel?
        </Text>

        <Text style={styles.sectionIntro}>
          Confidence is not certainty. It simply helps us understand how
          comfortable you feel with your reasoning.
        </Text>

        <View style={styles.confidenceRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              style={[
                styles.confidenceButton,
                confidence === value &&
                  styles.selectedConfidenceButton
              ]}
              onPress={() => setConfidence(value)}
            >
              <Text
                style={[
                  styles.confidenceText,
                  confidence === value &&
                    styles.selectedConfidenceText
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.confidenceLabel}>
          {confidenceDescription(confidence)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Anything else you want to remember?
        </Text>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional note to your future self..."
          placeholderTextColor="#64748b"
          style={styles.notesInput}
        />
      </View>

      <View style={styles.promiseCard}>
        <Text style={styles.promiseTitle}>
          Before we continue
        </Text>

        <Text style={styles.promiseText}>
          Coach G has explained the investment and helped you reflect.
          The decision remains yours.
        </Text>

        <Text style={styles.promiseTagline}>
          We advise. You decide.
        </Text>
      </View>

      <Pressable
        style={[
          styles.primary,
          saving && styles.disabled
        ]}
        disabled={saving}
        onPress={saveDecision}
      >
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.primaryText}>
            Record My Practice Decision
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.secondaryText}>
          Not Ready Yet
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function buildCoachExplanation({
  holding,
  investorGoal,
  investorType
}) {
  if (!holding) {
    return "Choose one investment and I’ll help you think through why it may or may not fit your plan.";
  }

  const symbol = holding.symbol || "this investment";
  const company =
    holding.name ||
    holding.companyName ||
    holding.sector ||
    symbol;

  const goalText = investorGoal
    ? humanizeValue(investorGoal).toLowerCase()
    : "your current investing goal";

  const investorText = investorType
    ? String(investorType).toLowerCase()
    : "developing investor";

  return `${company} (${symbol}) is already part of your portfolio. As a ${investorText}, the important question is not whether the price will rise tomorrow. The question is whether you understand how this investment may support ${goalText}, what risks it introduces, and what role it should play alongside your other holdings.`;
}

function confidenceDescription(value) {
  if (value <= 1) {
    return "I need much more explanation.";
  }

  if (value === 2) {
    return "I understand a little, but I still have questions.";
  }

  if (value === 3) {
    return "I understand the basic reasoning.";
  }

  if (value === 4) {
    return "I feel comfortable with my reasoning.";
  }

  return "I feel very confident, but I remain open to learning.";
}

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function humanizeValue(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
    fontSize: 12,
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
    lineHeight: 22,
    marginTop: 10
  },

  coachCard: {
    marginTop: 20,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  coachLabel: {
    color: "#67e8f9",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },

  coachText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24
  },

  section: {
    marginTop: 20,
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

  holdingList: {
    marginTop: 12
  },

  holdingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 10
  },

  selectedHoldingCard: {
    borderColor: "#67e8f9",
    backgroundColor: "rgba(6,182,212,.10)"
  },

  holdingSymbol: {
    color: "white",
    fontSize: 18,
    fontWeight: "900"
  },

  holdingName: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 12
  },

  holdingPrice: {
    color: "white",
    fontWeight: "900"
  },

  holdingSelect: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 5
  },

  outcomeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },

  outcomeChip: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11
  },

  selectedOutcomeChip: {
    borderColor: "#67e8f9",
    backgroundColor: "rgba(6,182,212,.10)"
  },

  outcomeText: {
    color: "#cbd5e1",
    fontWeight: "800"
  },

  selectedOutcomeText: {
    color: "#67e8f9"
  },

  confidenceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16
  },

  confidenceButton: {
    flex: 1,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center"
  },

  selectedConfidenceButton: {
    backgroundColor: "#9333ea",
    borderColor: "#c084fc"
  },

  confidenceText: {
    color: "#94a3b8",
    fontWeight: "900"
  },

  selectedConfidenceText: {
    color: "white"
  },

  confidenceLabel: {
    color: "#cbd5e1",
    marginTop: 12,
    lineHeight: 20
  },

  notesInput: {
    minHeight: 120,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    color: "white",
    marginTop: 14,
    textAlignVertical: "top"
  },

  promiseCard: {
    marginTop: 20,
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

  disabled: {
    opacity: 0.6
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
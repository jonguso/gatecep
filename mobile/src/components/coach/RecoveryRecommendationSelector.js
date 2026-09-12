import { requestFloatingCoachGOpen } from "../../features/trading/floatingCoachGActivationService";
// PC-030M20AU3 — Select Recommendation → Coach G Response
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { loadRealCurrentInvestorWealthJourney } from "../../features/wealth-journey/realWealthJourneyRuntime";
import {
  buildRecoveryRecommendationChoices,
  buildRecoveryChoiceConversationSeed,
  buildSelectedRecoveryCoachResponse
} from "../../features/trading/recoveryRecommendationSelectorService";
import { startDecisionConversation } from "../../features/trading/coachGDecisionConversationSession";

const first = (value) => Array.isArray(value) ? value[0] : value;

export default function RecoveryRecommendationSelector({
  onCreateOwnWhatIf,
  onCompareAll,
  onConversationStarted
}) {
  const params = useLocalSearchParams();
  const decisionSource =
    String(first(params?.decisionSource) || "").toUpperCase();
  const goalName = String(first(params?.goalName) || "");
  const remainingGoalGap = Number(
    first(params?.remainingGoalGap) ||
    first(params?.goalGap) ||
    0
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);

  const isRecoveryEntry = decisionSource === "COACH_G_RECOVERY";

  useEffect(() => {
    if (!isRecoveryEntry) return;
    let active = true;

    (async () => {
      try {
        setLoading(true);
        const wealthJourney =
          await loadRealCurrentInvestorWealthJourney();

        if (!active) return;

        setResult(
          buildRecoveryRecommendationChoices({
            wealthJourney,
            goalName
          })
        );
      } catch (error) {
        if (!active) return;
        setResult({
          available: false,
          status: "RECOVERY_LOAD_FAILED",
          choices: [],
          message:
            error?.message ||
            "Unable to load the current recovery recommendations."
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isRecoveryEntry, goalName]);

  const choices = useMemo(
    () => Array.isArray(result?.choices) ? result.choices : [],
    [result]
  );

  const selectedChoice = useMemo(
    () =>
      choices.find((choice) => choice.id === selectedChoiceId) ||
      null,
    [choices, selectedChoiceId]
  );

  const selectedCoachResponse = useMemo(
    () =>
      selectedChoice
        ? buildSelectedRecoveryCoachResponse({
            choice: selectedChoice,
            goalName: result?.goalName || goalName,
            remainingGoalGap:
              Number.isFinite(remainingGoalGap) &&
              remainingGoalGap !== 0
                ? Math.abs(remainingGoalGap)
                : null
          })
        : null,
    [
      selectedChoice,
      result?.goalName,
      goalName,
      remainingGoalGap
    ]
  );

  if (!isRecoveryEntry) return null;

  function selectChoice(choice) {
    // Selection is temporary Decision Lab UI state only.
    // It does not start a session, change a goal, or mutate a portfolio.
    setSelectedChoiceId(choice.id);
  }

  function continueWithCoach() {
    if (!selectedChoice) return;

    const seed = buildRecoveryChoiceConversationSeed({
      choice: selectedChoice,
      goalName: result?.goalName || goalName,
      remainingGoalGap:
        Number.isFinite(remainingGoalGap) &&
        remainingGoalGap !== 0
          ? Math.abs(remainingGoalGap)
          : null
    });

    if (!seed.available) return;

    startDecisionConversation({
      scenario: seed.scenario,
      openingText:
        selectedCoachResponse?.answer ||
        seed.openingText,
      openingQuestion:
        selectedCoachResponse?.question ||
        seed.openingQuestion
    });
    // PC-030M20AU4C close Decision Lab before Floating Coach
    onConversationStarted?.();

    setTimeout(() => {
      requestFloatingCoachGOpen({
      source: "RECOVERY_RECOMMENDATION",
      question:
      selectedCoachResponse?.question ||
      seed.openingQuestion,
      context: {
      scenarioId: selectedChoice?.id || null,
      strategy: selectedChoice?.strategy || null,
      goalName: result?.goalName || goalName || null
      }
      });
    }, 0);
  }

  function compareAll() {
    if (onCompareAll) {
      onCompareAll(choices);
      return;
    }

    startDecisionConversation({
      scenario: {
        source: "COACH_G_RECOVERY",
        action: "EXPLORE",
        investorReason: "GOAL_RECOVERY",
        decisionPriority: "GOAL_PROGRESS",
        recommendationContext: {
          comparisonRequested: true,
          choices: choices.map((item) => ({
            id: item.id,
            title: item.title,
            strategy: item.strategy,
            description: item.description,
            tradeoff: item.tradeoff,
            feasibility: item.feasibility,
            recommended: item.recommended
          }))
        },
        goalContext: {
          goalName: result?.goalName || goalName || null
        }
      },
      openingText:
        `You asked me to compare the ${choices.length} evidence-backed recovery paths for ${result?.goalName || goalName || "this goal"}.`,
      openingQuestion:
        "Which trade-off matters most to you while we compare them: cash flexibility, timeline, target size, allocation risk, or contribution burden?"
    });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>
        COACH G RECOVERY OPTIONS
      </Text>

      <Text style={styles.title}>
        Choose what you want to explore
      </Text>

      <Text style={styles.body}>
        Select one recovery path. Coach G will explain that exact
        option and ask a question before you decide whether to
        continue.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#67e8f9" />
          <Text style={styles.small}>
            Loading current recovery recommendations…
          </Text>
        </View>
      ) : null}

      {!loading && !result?.available ? (
        <View style={styles.notice}>
          <Text style={styles.body}>
            {result?.message ||
              "No evidence-backed recovery options are available right now."}
          </Text>
        </View>
      ) : null}

      {choices.map((choice) => {
        const selected = selectedChoiceId === choice.id;

        return (
          <Pressable
            key={choice.id}
            onPress={() => selectChoice(choice)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.card,
              choice.recommended && styles.recommendedCard,
              selected && styles.selectedCard
            ]}
          >
            <View style={styles.row}>
              <Text style={styles.badge}>
                {selected
                  ? "SELECTED ✓"
                  : choice.recommended
                    ? "RECOMMENDED"
                    : "OPTION"}
              </Text>

              {choice.feasibility ? (
                <Text style={styles.feasibility}>
                  {choice.feasibility} FEASIBILITY
                </Text>
              ) : null}
            </View>

            <Text style={styles.cardTitle}>
              {choice.title}
            </Text>

            <Text style={styles.body}>
              {choice.description}
            </Text>

            {choice.tradeoff ? (
              <Text style={styles.tradeoff}>
                Trade-off: {choice.tradeoff}
              </Text>
            ) : null}

            <Text style={styles.selectHint}>
              {selected
                ? "This recovery path is selected."
                : "Select this recovery path"}
            </Text>
          </Pressable>
        );
      })}

      {selectedChoice && selectedCoachResponse ? (
        <View style={styles.coachResponse}>
          <Text style={styles.coachLabel}>
            COACH G — YOUR SELECTED OPTION
          </Text>

          <Text style={styles.selectedTitle}>
            {selectedChoice.title}
          </Text>

          <Text style={styles.coachAnswer}>
            {selectedCoachResponse.answer}
          </Text>

          <Text style={styles.coachQuestion}>
            {selectedCoachResponse.question}
          </Text>

          <Pressable
            style={styles.continueButton}
            onPress={continueWithCoach}
          >
            <Text style={styles.continueButtonText}>
              Answer Coach G
            </Text>
          </Pressable>
        </View>
      ) : null}

      {choices.length > 1 ? (
        <Pressable
          style={styles.secondary}
          onPress={compareAll}
        >
          <Text style={styles.secondaryText}>
            Compare all options
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.secondary}
        onPress={onCreateOwnWhatIf}
      >
        <Text style={styles.secondaryText}>
          Create my own what-if
        </Text>
      </Pressable>

      <Text style={styles.integrity}>
        Selecting an option is temporary scenario context only. It
        does not change your goal, Investor DNA, REAL portfolio,
        Practice portfolio, or place a broker order.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    gap: 10
  },
  eyebrow: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "900"
  },
  body: {
    color: "#cbd5e1",
    lineHeight: 20
  },
  small: {
    color: "#94a3b8"
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  notice: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 13,
    backgroundColor: "#0f172a"
  },
  card: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#111c31",
    gap: 8
  },
  recommendedCard: {
    borderColor: "#22d3ee",
    backgroundColor: "#0b2432"
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: "#67e8f9",
    backgroundColor: "#0c2b3b"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap"
  },
  badge: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900"
  },
  feasibility: {
    color: "#a7f3d0",
    fontSize: 10,
    fontWeight: "800"
  },
  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "900"
  },
  tradeoff: {
    color: "#fde68a",
    lineHeight: 19,
    fontSize: 13
  },
  selectHint: {
    color: "#67e8f9",
    fontWeight: "800",
    fontSize: 12,
    marginTop: 2
  },
  coachResponse: {
    borderWidth: 1,
    borderColor: "#22d3ee",
    borderRadius: 16,
    padding: 15,
    backgroundColor: "#0b1f33",
    gap: 9
  },
  coachLabel: {
    color: "#67e8f9",
    fontSize: 10,
    fontWeight: "900"
  },
  selectedTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "900"
  },
  coachAnswer: {
    color: "#e2e8f0",
    lineHeight: 21
  },
  coachQuestion: {
    color: "white",
    lineHeight: 21,
    fontWeight: "800"
  },
  continueButton: {
    backgroundColor: "#0891b2",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  continueButtonText: {
    color: "white",
    fontWeight: "900"
  },
  secondary: {
    borderWidth: 1,
    borderColor: "#67e8f9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  secondaryText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  integrity: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16
  }
});

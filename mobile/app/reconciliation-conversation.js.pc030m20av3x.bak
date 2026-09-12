import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import {
  loadCurrentCoachGReconciliationConversation,
  submitCoachGReconciliationClarification
} from "../src/features/wealth-journey/coachGReconciliationConversationService";

export default function ReconciliationConversationScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [savedMessage, setSavedMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const next =
        await loadCurrentCoachGReconciliationConversation();
      setResult(next);
    } catch (error) {
      console.log(
        "Reconciliation conversation load error:",
        error?.message
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const conversation = result?.conversation;
  const signal = conversation?.activeSignal;
  const prompt = conversation?.prompt || {};
  const options = useMemo(
    () =>
      Array.isArray(result?.responseOptions)
        ? result.responseOptions
        : [],
    [result]
  );

  async function submit() {
    if (!signal || !selectedType || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setSavedMessage(null);

      const saved =
        await submitCoachGReconciliationClarification({
          signal,
          responseType: selectedType,
          responseText
        });

      if (!saved?.success) {
        setSavedMessage(
          saved?.reason ||
            "Coach G could not save that clarification."
        );
        return;
      }

      setSavedMessage(
        "Thanks. Coach G saved your explanation as confirmed clarification evidence. Your Investor DNA was not changed automatically."
      );

      setSelectedType(null);
      setResponseText("");
    } catch (error) {
      setSavedMessage(
        error?.message ||
          "Unable to save the clarification."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Coach G is reviewing your real investing activity...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Coach G</Text>
        <View style={{ width: 46 }} />
      </View>

      {!conversation || conversation?.state === "NOT_REQUIRED" ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            You're broadly aligned
          </Text>

          <Text style={styles.body}>
            Coach G does not currently see a material real-investing issue that needs clarification.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              INVESTOR DNA CHECK-IN
            </Text>

            <Text style={styles.title}>
              {signal?.title ||
                "Something worth discussing"}
            </Text>

            {prompt?.opener ? (
              <Text style={styles.body}>
                {prompt.opener}
              </Text>
            ) : null}

            {prompt?.observation ? (
              <View style={styles.observationBox}>
                <Text style={styles.observationText}>
                  {prompt.observation}
                </Text>
              </View>
            ) : null}

            <Text style={styles.question}>
              {prompt?.question ||
                signal?.question ||
                "What changed, if anything?"}
            </Text>

            {prompt?.whyItMatters ? (
              <Text style={styles.small}>
                Why Coach G is asking: {prompt.whyItMatters}
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Help Coach G understand
            </Text>

            {options.map((option) => (
              <Pressable
                key={option.type}
                style={[
                  styles.option,
                  selectedType === option.type &&
                    styles.optionSelected
                ]}
                onPress={() =>
                  setSelectedType(option.type)
                }
              >
                <View
                  style={[
                    styles.radio,
                    selectedType === option.type &&
                      styles.radioSelected
                  ]}
                />

                <Text style={styles.optionText}>
                  {option.label}
                </Text>
              </Pressable>
            ))}

            <Text style={styles.inputLabel}>
              Anything else Coach G should know?
            </Text>

            <TextInput
              style={styles.input}
              multiline
              value={responseText}
              onChangeText={setResponseText}
              placeholder="Explain in your own words..."
              placeholderTextColor="#64748b"
            />

            <Pressable
              style={[
                styles.primaryButton,
                (!selectedType || submitting) &&
                  styles.disabledButton
              ]}
              disabled={!selectedType || submitting}
              onPress={submit}
            >
              <Text style={styles.primaryButtonText}>
                {submitting
                  ? "Saving..."
                  : "Save My Explanation"}
              </Text>
            </Pressable>

            {savedMessage ? (
              <Text style={styles.saved}>
                {savedMessage}
              </Text>
            ) : null}
          </View>

          {result?.dnaUpdateReview?.shouldReview ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/dna-update-review")
              }
            >
              <Text style={styles.primaryButtonText}>
                Review Investor DNA Changes
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push("/dna-update-review")
              }
            >
              <Text style={styles.primaryButtonText}>
                View Investor DNA Review Status
              </Text>
            </Pressable>
          )}

          <View style={styles.guardrail}>
            <Text style={styles.guardrailTitle}>
              What happens next
            </Text>

            <Text style={styles.small}>
              Coach G uses your explanation as confirmed evidence when reassessing your plan. A single response does not automatically rewrite your Investor DNA, place trades, or change your portfolio.
            </Text>
          </View>

          {Number(
            conversation?.remainingSignals?.length || 0
          ) > 0 ? (
            <Text style={styles.footerText}>
              Coach G has{" "}
              {conversation.remainingSignals.length} other
              item(s) to discuss later. We handle one
              meaningful issue at a time.
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 18,
    paddingBottom: 40
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12
  },
  loadingText: {
    color: "#cbd5e1",
    textAlign: "center"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18
  },
  back: {
    color: "#67e8f9",
    fontWeight: "800",
    width: 46
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 21
  },
  card: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 18,
    padding: 17,
    marginBottom: 14,
    gap: 12
  },
  eyebrow: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 1.2
  },
  title: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 22
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17
  },
  body: {
    color: "#cbd5e1",
    lineHeight: 22
  },
  observationBox: {
    backgroundColor: "#111c31",
    borderLeftWidth: 3,
    borderLeftColor: "#22d3ee",
    padding: 12,
    borderRadius: 10
  },
  observationText: {
    color: "#e2e8f0",
    lineHeight: 21
  },
  question: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    lineHeight: 23
  },
  small: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 13,
    gap: 10
  },
  optionSelected: {
    borderColor: "#22d3ee",
    backgroundColor: "#0c2230"
  },
  radio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#64748b"
  },
  radioSelected: {
    borderWidth: 5,
    borderColor: "#22d3ee"
  },
  optionText: {
    color: "#e2e8f0",
    fontWeight: "700",
    flex: 1
  },
  inputLabel: {
    color: "#cbd5e1",
    fontWeight: "800",
    marginTop: 4
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    color: "#fff",
    padding: 12,
    textAlignVertical: "top"
  },
  primaryButton: {
    backgroundColor: "#0891b2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  disabledButton: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "900"
  },
  saved: {
    color: "#86efac",
    lineHeight: 19,
    fontWeight: "700"
  },
  guardrail: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14
  },
  guardrailTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    marginBottom: 6
  },
  footerText: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18
  }
});

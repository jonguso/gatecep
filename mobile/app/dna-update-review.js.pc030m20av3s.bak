import React, { useCallback, useState } from "react";
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
  loadCurrentInvestorDNAReview,
  proposeInvestorDNAReviewField,
  confirmInvestorDNAReviewField,
  submitInvestorDNAReviewConfirmation
} from "../src/features/wealth-journey/investorDNAReviewConfirmationService";

export default function InvestorDNAReviewScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [review, setReview] = useState(null);
  const [fields, setFields] = useState([]);
  const [confirmAll, setConfirmAll] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const next =
        await loadCurrentInvestorDNAReview();

      setReview(next);
      setFields(
        Array.isArray(next?.fields)
          ? next.fields
          : []
      );
    } catch (error) {
      console.log(
        "Investor DNA review load error:",
        error?.message
      );

      setReview(null);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function updateField(fieldKey, proposedValue) {
    setFields((current) =>
      proposeInvestorDNAReviewField({
        fields: current,
        fieldKey,
        proposedValue
      })
    );
  }

  function toggleField(field) {
    const isConfirmed =
      field?.status === "CONFIRMED";

    setFields((current) =>
      confirmInvestorDNAReviewField({
        fields: current,
        fieldKey: field?.fieldKey,
        confirmed: !isConfirmed
      })
    );
  }

  async function submit() {
    if (submitting || !confirmAll) return;

    try {
      setSubmitting(true);
      setMessage(null);

      const result =
        await submitInvestorDNAReviewConfirmation({
          fields,
          dnaUpdateReview:
            review?.dnaUpdateReview || {},
          investorConfirmation:
            confirmAll
        });

      if (!result?.success) {
        setMessage(
          result?.reason ||
          "Unable to save the Investor DNA review."
        );
        return;
      }

      setMessage(
        result?.message ||
        "Your review was saved."
      );
    } catch (error) {
      setMessage(
        error?.message ||
        "Unable to save the Investor DNA review."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>
          Coach G is preparing your Investor DNA review...
        </Text>
      </View>
    );
  }

  const shouldReview =
    review?.shouldReview === true;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          Investor DNA Review
        </Text>

        <View style={{ width: 46 }} />
      </View>

      {!shouldReview ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            No DNA update review needed
          </Text>

          <Text style={styles.body}>
            Coach G does not currently have confirmed real-investing evidence that requires a field-level Investor DNA review.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              EXPLICIT REVIEW REQUIRED
            </Text>

            <Text style={styles.title}>
              Review what may have changed
            </Text>

            <Text style={styles.body}>
              Review each field below. Nothing changes unless you enter a new value, explicitly confirm that field, and then approve the review.
            </Text>
          </View>

          {fields.map((field) => {
            const confirmed =
              field?.status === "CONFIRMED";

            return (
              <View
                key={field.fieldKey}
                style={styles.card}
              >
                <Text style={styles.fieldTitle}>
                  {field.fieldLabel}
                </Text>

                <Text style={styles.label}>Current</Text>

                <View style={styles.currentBox}>
                  <Text style={styles.currentText}>
                    {String(
                      field?.currentValue ??
                      "Not currently set"
                    )}
                  </Text>
                </View>

                <Text style={styles.label}>
                  Proposed new value
                </Text>

                <TextInput
                  style={styles.input}
                  value={field?.proposedValue || ""}
                  onChangeText={(value) =>
                    updateField(
                      field.fieldKey,
                      value
                    )
                  }
                  placeholder="Enter the value you want Coach G to use..."
                  placeholderTextColor="#64748b"
                />

                {field?.reason ? (
                  <Text style={styles.reason}>
                    Why this is being reviewed: {field.reason}
                  </Text>
                ) : null}

                <Pressable
                  style={[
                    styles.confirmField,
                    confirmed &&
                      styles.confirmFieldActive
                  ]}
                  onPress={() => toggleField(field)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      confirmed &&
                        styles.checkboxActive
                    ]}
                  />

                  <Text style={styles.confirmFieldText}>
                    {confirmed
                      ? "Confirmed for update review"
                      : "I confirm this proposed field value"}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.card}>
            <Pressable
              style={styles.finalConfirm}
              onPress={() =>
                setConfirmAll(!confirmAll)
              }
            >
              <View
                style={[
                  styles.checkbox,
                  confirmAll &&
                    styles.checkboxActive
                ]}
              />

              <Text style={styles.finalConfirmText}>
                I understand that I am explicitly confirming the selected field changes for my Investor DNA. Practice activity was not used, and no portfolio trade is being placed.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                (!confirmAll || submitting) &&
                  styles.disabled
              ]}
              disabled={!confirmAll || submitting}
              onPress={submit}
            >
              <Text style={styles.primaryText}>
                {submitting
                  ? "Saving..."
                  : "Confirm Investor DNA Review"}
              </Text>
            </Pressable>

            {message ? (
              <Text style={styles.message}>
                {message}
              </Text>
            ) : null}
          </View>

          <View style={styles.guardrail}>
            <Text style={styles.guardrailTitle}>
              Important
            </Text>

            <Text style={styles.muted}>
              PC-028Z saves your explicit field-level confirmation as a controlled update instruction. It does not automatically overwrite Investor DNA.
            </Text>
          </View>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
    padding: 24,
    gap: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  back: {
    color: "#67e8f9",
    fontWeight: "800",
    width: 46
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20
  },
  card: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 10
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
  body: {
    color: "#cbd5e1",
    lineHeight: 21
  },
  fieldTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900"
  },
  label: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800"
  },
  currentBox: {
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12
  },
  currentText: {
    color: "#e2e8f0"
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12,
    color: "#fff"
  },
  reason: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18
  },
  confirmField: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 12
  },
  confirmFieldActive: {
    borderColor: "#22d3ee",
    backgroundColor: "#0c2230"
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#64748b"
  },
  checkboxActive: {
    borderColor: "#22d3ee",
    backgroundColor: "#22d3ee"
  },
  confirmFieldText: {
    color: "#e2e8f0",
    flex: 1,
    fontWeight: "700"
  },
  finalConfirm: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  finalConfirmText: {
    color: "#cbd5e1",
    flex: 1,
    lineHeight: 20
  },
  primaryButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  disabled: {
    opacity: 0.45
  },
  primaryText: {
    color: "#fff",
    fontWeight: "900"
  },
  message: {
    color: "#86efac",
    lineHeight: 20,
    fontWeight: "700"
  },
  guardrail: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    padding: 14
  },
  guardrailTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    marginBottom: 6
  },
  muted: {
    color: "#94a3b8",
    lineHeight: 18,
    textAlign: "center"
  }
});

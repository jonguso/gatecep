import React, {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  buildBrokerResolutionWorkflow,
  resolveBrokerDiscrepancy,
  RESOLUTION_OPTIONS
} from "../src/features/broker-sync/brokerResolutionService";

export default function BrokerResolution() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    savingKey,
    setSavingKey
  ] = useState(null);

  const [
    workflow,
    setWorkflow
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadWorkflow();
  }, []);

  async function loadWorkflow() {
    try {
      setLoading(true);
      setError("");

      const result =
        await buildBrokerResolutionWorkflow();

      setWorkflow(result);
    } catch (err) {
      console.error(
        "Unable to load broker resolution workflow:",
        err
      );

      setError(
        err?.message ||
          "Unable to load reconciliation resolutions."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resolve(
    discrepancy,
    resolutionCode
  ) {
    try {
      setSavingKey(
        discrepancy.discrepancyKey
      );

      setError("");

      const updated =
        await resolveBrokerDiscrepancy({
          discrepancy,
          resolutionCode
        });

      setWorkflow(
        updated
      );
    } catch (err) {
      console.error(
        "Unable to save broker resolution:",
        err
      );

      setError(
        err?.message ||
          "Unable to save the resolution."
      );
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={styles.loadingText}
        >
          Coach G is preparing the
          reconciliation workflow...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={styles.eyebrow}
      >
        PC-010
      </Text>

      <Text
        style={styles.title}
      >
        Reconciliation Resolution
      </Text>

      <Text
        style={styles.subtitle}
      >
        Explain broker differences
        without automatically changing
        either portfolio.
      </Text>

      {error ? (
        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {workflow ? (
        <>
          <View
            style={styles.coachCard}
          >
            <Text
              style={styles.coachLabel}
            >
              COACH G
            </Text>

            <Text
              style={styles.coachText}
            >
              We should understand every
              broker discrepancy before
              changing an investor record.
              Choose the explanation that
              best describes each item.
            </Text>
          </View>

          <View
            style={styles.statusCard}
          >
            <Text
              style={styles.statusLabel}
            >
              RESOLUTION STATUS
            </Text>

            <Text
              style={styles.statusValue}
            >
              {
                workflow.workflowStatus
              }
            </Text>
          </View>

          <View
            style={styles.metricGrid}
          >
            <Metric
              label="Issues"
              value={
                workflow.summary
                  .total
              }
            />

            <Metric
              label="Resolved"
              value={
                workflow.summary
                  .resolved
              }
            />

            <Metric
              label="Open"
              value={
                workflow.summary
                  .open
              }
            />

            <Metric
              label="Matched Holdings"
              value={
                workflow
                  ?.reconciliation
                  ?.summary
                  ?.matched ||
                0
              }
            />
          </View>

          {workflow.discrepancies
            .length ? (
            workflow.discrepancies.map(
              (discrepancy) => (
                <DiscrepancyCard
                  key={
                    discrepancy
                      .discrepancyKey
                  }
                  discrepancy={
                    discrepancy
                  }
                  saving={
                    savingKey ===
                    discrepancy
                      .discrepancyKey
                  }
                  onResolve={
                    resolve
                  }
                />
              )
            )
          ) : (
            <View
              style={styles.goodCard}
            >
              <Text
                style={styles.goodTitle}
              >
                Everything Matches
              </Text>

              <Text
                style={styles.goodText}
              >
                There are currently no
                broker discrepancies that
                require resolution.
              </Text>
            </View>
          )}

          <View
            style={styles.protectionCard}
          >
            <Text
              style={styles.protectionTitle}
            >
              Resolution Does Not Move Money
            </Text>

            <Text
              style={styles.protectionText}
            >
              These selections document why
              a difference exists. They do
              not add, remove, buy, sell, or
              transfer any investment.
            </Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={styles.primaryButton}
        onPress={loadWorkflow}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Resolution Status
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-reconciliation-insight"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Coach G Insight
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-sync-history"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Broker Audit History
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.replace(
            "/(tabs)/dashboard"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Dashboard
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function DiscrepancyCard({
  discrepancy,
  saving,
  onResolve
}) {
  const resolved =
    discrepancy?.resolution
      ?.status ===
    "RESOLVED";

  return (
    <View
      style={[
        styles.card,
        resolved &&
          styles.resolvedCard
      ]}
    >
      <View
        style={styles.cardHeader}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={styles.cardTitle}
          >
            {discrepancy.title}
          </Text>

          <Text
            style={
              styles.issueType
            }
          >
            {discrepancy.type}
          </Text>
        </View>

        <Text
          style={[
            styles.resolutionStatus,
            resolved &&
              styles.resolutionStatusDone
          ]}
        >
          {resolved
            ? "RESOLVED"
            : "OPEN"}
        </Text>
      </View>

      <Text
        style={styles.description}
      >
        {discrepancy.description}
      </Text>

      {discrepancy.resolution ? (
        <View
          style={
            styles.currentResolution
          }
        >
          <Text
            style={
              styles.currentResolutionLabel
            }
          >
            Current Resolution
          </Text>

          <Text
            style={
              styles.currentResolutionValue
            }
          >
            {
              discrepancy
                .resolution
                .resolutionLabel
            }
          </Text>
        </View>
      ) : null}

      <Text
        style={styles.chooseLabel}
      >
        Choose Resolution
      </Text>

      {RESOLUTION_OPTIONS.map(
        (option) => {
          const selected =
            discrepancy
              ?.resolution
              ?.resolutionCode ===
            option.code;

          return (
            <Pressable
              key={option.code}
              disabled={saving}
              style={[
                styles.option,
                selected &&
                  styles.optionSelected
              ]}
              onPress={() =>
                onResolve(
                  discrepancy,
                  option.code
                )
              }
            >
              <Text
                style={[
                  styles.optionTitle,
                  selected &&
                    styles.optionTitleSelected
                ]}
              >
                {option.label}
              </Text>

              <Text
                style={
                  styles.optionDescription
                }
              >
                {
                  option.description
                }
              </Text>
            </Pressable>
          );
        }
      )}

      {saving ? (
        <ActivityIndicator
          color="#67e8f9"
          style={{ marginTop: 14 }}
        />
      ) : null}
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View style={styles.metric}>
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {String(value)}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#020617"
    },

    content: {
      padding: 22,
      paddingTop: 70,
      paddingBottom: 110
    },

    center: {
      flex: 1,
      backgroundColor:
        "#020617",
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24
    },

    loadingText: {
      color: "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color: "#c084fc",
      fontSize: 13,
      fontWeight: "900"
    },

    title: {
      color: "white",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 8
    },

    subtitle: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 20
    },

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth: 1,
      borderRadius: 22,
      padding: 18
    },

    coachLabel: {
      color: "#c084fc",
      fontWeight: "900"
    },

    coachText: {
      color: "white",
      lineHeight: 23,
      marginTop: 8
    },

    statusCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginTop: 16
    },

    statusLabel: {
      color: "#94a3b8",
      fontSize: 12,
      fontWeight: "900"
    },

    statusValue: {
      color: "#facc15",
      fontSize: 22,
      fontWeight: "900",
      marginTop: 6
    },

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18
    },

    metric: {
      width: "47%",
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 18,
      padding: 15
    },

    metricLabel: {
      color: "#94a3b8",
      fontSize: 12
    },

    metricValue: {
      color: "white",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 6
    },

    card: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    resolvedCard: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    cardHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16
    },

    cardTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    issueType: {
      color: "#facc15",
      fontSize: 11,
      fontWeight: "900",
      marginTop: 5
    },

    resolutionStatus: {
      color: "#facc15",
      fontWeight: "900",
      fontSize: 12
    },

    resolutionStatusDone: {
      color: "#86efac"
    },

    description: {
      color: "#cbd5e1",
      lineHeight: 21,
      marginTop: 12
    },

    currentResolution: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderRadius: 14,
      padding: 12,
      marginTop: 14
    },

    currentResolutionLabel: {
      color: "#86efac",
      fontSize: 11,
      fontWeight: "900"
    },

    currentResolutionValue: {
      color: "white",
      fontWeight: "900",
      marginTop: 4
    },

    chooseLabel: {
      color: "#94a3b8",
      fontWeight: "900",
      marginTop: 18,
      marginBottom: 8
    },

    option: {
      backgroundColor:
        "#020617",
      borderColor:
        "#334155",
      borderWidth: 1,
      borderRadius: 14,
      padding: 13,
      marginTop: 8
    },

    optionSelected: {
      borderColor: "#22c55e",
      backgroundColor:
        "rgba(34,197,94,.08)"
    },

    optionTitle: {
      color: "white",
      fontWeight: "900"
    },

    optionTitleSelected: {
      color: "#86efac"
    },

    optionDescription: {
      color: "#94a3b8",
      lineHeight: 19,
      marginTop: 5
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",
      borderColor:
        "rgba(245,158,11,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 18
    },

    protectionTitle: {
      color: "#fde68a",
      fontSize: 18,
      fontWeight: "900"
    },

    protectionText: {
      color: "#fef3c7",
      lineHeight: 22,
      marginTop: 8
    },

    goodCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 18
    },

    goodTitle: {
      color: "#86efac",
      fontSize: 18,
      fontWeight: "900"
    },

    goodText: {
      color: "#bbf7d0",
      lineHeight: 22,
      marginTop: 8
    },

    primaryButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 18,
      marginTop: 22
    },

    primaryButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 17,
      borderRadius: 18,
      marginTop: 12
    },

    secondaryButtonText: {
      color: "#67e8f9",
      fontWeight: "900",
      textAlign: "center"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16
    },

    errorText: {
      color: "#fca5a5"
    }
  });
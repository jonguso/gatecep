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
  buildBrokerReconciliationCaseWorkflow
} from "../src/features/broker-sync/brokerReconciliationCaseService";

export default function BrokerReconciliationCase() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    workflow,
    setWorkflow
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadCase();
  }, []);

  async function loadCase() {
    try {
      setLoading(true);
      setError("");

      const result =
        await buildBrokerReconciliationCaseWorkflow();

      setWorkflow(result);
    } catch (err) {
      console.error(
        "Unable to load broker reconciliation case:",
        err
      );

      setError(
        err?.message ||
          "Unable to load the broker reconciliation case."
      );

      setWorkflow(null);
    } finally {
      setLoading(false);
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
          reconciliation case...
        </Text>
      </View>
    );
  }

  const currentCase =
    workflow?.case || null;

  const issues =
    Array.isArray(
      currentCase?.issues
    )
      ? currentCase.issues
      : [];

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
        PC-012
      </Text>

      <Text
        style={styles.title}
      >
        Broker Reconciliation Case
      </Text>

      <Text
        style={styles.subtitle}
      >
        Track one broker reconciliation
        cycle from detection through final
        resolution.
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

      {workflow?.workflowStatus ===
      "IN_SYNC" ? (
        <View
          style={styles.goodCard}
        >
          <Text
            style={styles.goodTitle}
          >
            Broker Account In Sync
          </Text>

          <Text
            style={styles.goodText}
          >
            There are currently no
            reconciliation discrepancies
            requiring a case.
          </Text>
        </View>
      ) : null}

      {currentCase ? (
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
              This case groups the broker
              discrepancy, the explanation,
              and the resolution history
              into one auditable workflow.
            </Text>
          </View>

          <View
            style={styles.caseHeaderCard}
          >
            <Text
              style={styles.caseLabel}
            >
              CASE
            </Text>

            <Text
              style={styles.caseId}
            >
              {currentCase.id}
            </Text>

            <View
              style={styles.statusRow}
            >
              <Text
                style={styles.statusLabel}
              >
                STATUS
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  statusStyle(
                    currentCase.status
                  )
                ]}
              >
                {currentCase.status}
              </Text>
            </View>
          </View>

          <View
            style={styles.metricGrid}
          >
            <Metric
              label="Issues"
              value={
                currentCase.issueCount ||
                0
              }
            />

            <Metric
              label="Resolved"
              value={
                currentCase.resolvedCount ||
                0
              }
            />

            <Metric
              label="Open"
              value={
                currentCase.openCount ||
                0
              }
            />

            <Metric
              label="Matched"
              value={
                currentCase.matched ||
                0
              }
            />
          </View>

          <View
            style={styles.card}
          >
            <Text
              style={styles.cardTitle}
            >
              Case Details
            </Text>

            <Row
              label="Broker"
              value={
                currentCase.broker ||
                "Unknown"
              }
            />

            <Row
              label="Account"
              value={
                currentCase.accountName ||
                "Unknown"
              }
            />

            <Row
              label="Initial Reconciliation"
              value={
                currentCase
                  .initialReconciliationStatus ||
                "Unknown"
              }
            />

            <Row
              label="Latest Reconciliation"
              value={
                currentCase
                  .latestReconciliationStatus ||
                "Unknown"
              }
            />

            <Row
              label="Opened"
              value={
                formatDate(
                  currentCase.openedAt
                )
              }
            />

            <Row
              label="Resolved"
              value={
                currentCase.resolvedAt
                  ? formatDate(
                      currentCase.resolvedAt
                    )
                  : "Not yet"
              }
            />
          </View>

          <View
            style={styles.card}
          >
            <Text
              style={styles.cardTitle}
            >
              Value Reconciliation
            </Text>

            <Row
              label="GateCEP Total"
              value={`KES ${money(
                currentCase.gatecepTotal
              )}`}
            />

            <Row
              label="Broker Total"
              value={`KES ${money(
                currentCase.brokerTotal
              )}`}
            />

            <Row
              label="Difference"
              value={`KES ${money(
                currentCase.difference
              )}`}
            />

            <Row
              label="Cash Difference"
              value={`KES ${money(
                currentCase.cashDifference
              )}`}
            />
          </View>

          <View
            style={styles.card}
          >
            <Text
              style={styles.cardTitle}
            >
              Case Issues
            </Text>

            {issues.length ? (
              issues.map(
                (issue) => (
                  <IssueCard
                    key={
                      issue.discrepancyKey ||
                      issue.id
                    }
                    issue={issue}
                  />
                )
              )
            ) : (
              <Text
                style={styles.emptyText}
              >
                No issues are currently
                associated with this case.
              </Text>
            )}
          </View>

          <View
            style={styles.protectionCard}
          >
            <Text
              style={styles.protectionTitle}
            >
              Case Resolution Is Explanatory
            </Text>

            <Text
              style={styles.protectionText}
            >
              Closing a reconciliation case
              means the discrepancy has been
              understood and documented. It
              does not change broker holdings,
              cash, or GateCEP portfolio
              positions.
            </Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={styles.primaryButton}
        onPress={loadCase}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Case
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-resolution"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Reconciliation Resolution
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-resolution-ledger"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Resolution Ledger
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
          Open Broker Sync History
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

function IssueCard({
  issue
}) {
  const resolved =
    issue?.resolutionStatus ===
    "RESOLVED";

  return (
    <View
      style={[
        styles.issueCard,
        resolved &&
          styles.issueCardResolved
      ]}
    >
      <View
        style={styles.issueHeader}
      >
        <View
          style={{ flex: 1 }}
        >
          <Text
            style={styles.issueSymbol}
          >
            {issue?.symbol ||
              "ACCOUNT"}
          </Text>

          <Text
            style={styles.issueType}
          >
            {issue?.discrepancyType ||
              "UNKNOWN"}
          </Text>
        </View>

        <Text
          style={[
            styles.issueStatus,
            resolved &&
              styles.issueStatusResolved
          ]}
        >
          {resolved
            ? "RESOLVED"
            : "OPEN"}
        </Text>
      </View>

      <View
        style={styles.issueComparison}
      >
        <Row
          label="GateCEP Qty"
          value={
            issue?.gatecepQuantity ||
            0
          }
        />

        <Row
          label="Broker Qty"
          value={
            issue?.brokerQuantity ||
            0
          }
        />

        <Row
          label="GateCEP Value"
          value={`KES ${money(
            issue?.gatecepValue
          )}`}
        />

        <Row
          label="Broker Value"
          value={`KES ${money(
            issue?.brokerValue
          )}`}
        />
      </View>

      {issue?.resolutionLabel ? (
        <View
          style={styles.resolutionCard}
        >
          <Text
            style={
              styles.resolutionLabel
            }
          >
            Resolution
          </Text>

          <Text
            style={
              styles.resolutionValue
            }
          >
            {issue.resolutionLabel}
          </Text>

          {issue?.resolvedAt ? (
            <Text
              style={
                styles.resolutionDate
              }
            >
              {formatDate(
                issue.resolvedAt
              )}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={styles.metric}
    >
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

function Row({
  label,
  value
}) {
  return (
    <View
      style={styles.row}
    >
      <Text
        style={styles.rowLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.rowValue}
      >
        {String(
          value ?? "N/A"
        )}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US"
  );
}

function statusStyle(status) {
  switch (status) {
    case "RESOLVED":
      return {
        color: "#86efac"
      };

    case "PARTIALLY_RESOLVED":
      return {
        color: "#fde68a"
      };

    case "OPEN":
      return {
        color: "#facc15"
      };

    default:
      return {
        color: "#cbd5e1"
      };
  }
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
      alignItems:
        "center",
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
      lineHeight: 22,
      marginTop: 8
    },

    caseHeaderCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    caseLabel: {
      color: "#94a3b8",
      fontSize: 11,
      fontWeight: "900"
    },

    caseId: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900",
      marginTop: 5
    },

    statusRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginTop: 16
    },

    statusLabel: {
      color: "#94a3b8",
      fontSize: 12,
      fontWeight: "900"
    },

    statusValue: {
      fontSize: 18,
      fontWeight: "900"
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

    cardTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    row: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 16,
      marginTop: 12
    },

    rowLabel: {
      color: "#94a3b8",
      flex: 1
    },

    rowValue: {
      color: "white",
      fontWeight: "900",
      textAlign: "right",
      flex: 1
    },

    issueCard: {
      backgroundColor:
        "#020617",
      borderColor:
        "#334155",
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginTop: 14
    },

    issueCardResolved: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    issueHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16
    },

    issueSymbol: {
      color: "white",
      fontSize: 18,
      fontWeight: "900"
    },

    issueType: {
      color: "#facc15",
      fontSize: 11,
      fontWeight: "900",
      marginTop: 4
    },

    issueStatus: {
      color: "#facc15",
      fontSize: 12,
      fontWeight: "900"
    },

    issueStatusResolved: {
      color: "#86efac"
    },

    issueComparison: {
      marginTop: 10
    },

    resolutionCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderRadius: 14,
      padding: 12,
      marginTop: 14
    },

    resolutionLabel: {
      color: "#86efac",
      fontSize: 11,
      fontWeight: "900"
    },

    resolutionValue: {
      color: "white",
      fontWeight: "900",
      marginTop: 5
    },

    resolutionDate: {
      color: "#94a3b8",
      fontSize: 12,
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
      padding: 18
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

    emptyText: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 10
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
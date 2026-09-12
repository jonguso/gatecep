import React, {
  useEffect,
  useMemo,
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
  loadBrokerReconciliationCases
} from "../src/features/broker-sync/brokerReconciliationCaseStore";

export default function BrokerReconciliationCases() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    cases,
    setCases
  ] = useState([]);

  const [
    filter,
    setFilter
  ] = useState("ALL");

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    try {
      setLoading(true);
      setError("");

      const result =
        await loadBrokerReconciliationCases();

      const safeCases =
        Array.isArray(result)
          ? result
          : [];

      const sorted =
        [...safeCases].sort(
          (a, b) =>
            new Date(
              b?.openedAt ||
              b?.createdAt ||
              0
            ).getTime() -
            new Date(
              a?.openedAt ||
              a?.createdAt ||
              0
            ).getTime()
        );

      setCases(sorted);
    } catch (err) {
      console.error(
        "Unable to load reconciliation cases:",
        err
      );

      setError(
        err?.message ||
          "Unable to load reconciliation case history."
      );

      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  const visibleCases =
    useMemo(() => {
      if (filter === "ALL") {
        return cases;
      }

      return cases.filter(
        (item) =>
          item?.status ===
          filter
      );
    }, [
      cases,
      filter
    ]);

  const summary =
    useMemo(() => {
      return {
        total:
          cases.length,

        open:
          cases.filter(
            (item) =>
              item?.status ===
              "OPEN"
          ).length,

        partiallyResolved:
          cases.filter(
            (item) =>
              item?.status ===
              "PARTIALLY_RESOLVED"
          ).length,

        resolved:
          cases.filter(
            (item) =>
              item?.status ===
              "RESOLVED"
          ).length
      };
    }, [cases]);

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
          Loading reconciliation cases...
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
        PC-012
      </Text>

      <Text
        style={styles.title}
      >
        Practice Reconciliation Cases
      </Text>

      <Text
        style={styles.subtitle}
      >
        PRACTICE ONLY — review sandbox reconciliation cases and their lifecycle status.
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
          Each reconciliation cycle is
          preserved as its own case. A
          resolved case stays in history,
          while a later broker discrepancy
          can create a new case.
        </Text>
      </View>

      <View
        style={styles.metricGrid}
      >
        <Metric
          label="Total Cases"
          value={summary.total}
        />

        <Metric
          label="Open"
          value={summary.open}
        />

        <Metric
          label="Partial"
          value={
            summary.partiallyResolved
          }
        />

        <Metric
          label="Resolved"
          value={summary.resolved}
        />
      </View>

      <View
        style={styles.filterRow}
      >
        {[
          {
            value: "ALL",
            label: "All"
          },
          {
            value: "OPEN",
            label: "Open"
          },
          {
            value:
              "PARTIALLY_RESOLVED",
            label: "Partial"
          },
          {
            value: "RESOLVED",
            label: "Resolved"
          }
        ].map((item) => (
          <Pressable
            key={item.value}
            style={[
              styles.filterButton,
              filter === item.value &&
                styles.filterButtonActive
            ]}
            onPress={() =>
              setFilter(
                item.value
              )
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === item.value &&
                  styles.filterTextActive
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {visibleCases.length ? (
        visibleCases.map(
          (item) => (
            <CaseCard
              key={item.id}
              item={item}
            />
          )
        )
      ) : (
        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.emptyTitle}
          >
            No Cases Found
          </Text>

          <Text
            style={styles.emptyText}
          >
            There are no reconciliation
            cases in this category yet.
          </Text>
        </View>
      )}

      <Pressable
        style={styles.primaryButton}
        onPress={loadCases}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Case Registry
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-reconciliation-case"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Current Case
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

function CaseCard({
  item
}) {
  return (
    <View
      style={styles.caseCard}
    >
      <View
        style={styles.caseHeader}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={styles.caseId}
          >
            {item?.id ||
              "Unknown Case"}
          </Text>

          <Text
            style={styles.brokerName}
          >
            {item?.broker ||
              "Unknown Broker"}
          </Text>
        </View>

        <Text
          style={[
            styles.caseStatus,
            statusStyle(
              item?.status
            )
          ]}
        >
          {item?.status ||
            "UNKNOWN"}
        </Text>
      </View>

      <View
        style={styles.caseSummary}
      >
        <Row
          label="Opened"
          value={formatDate(
            item?.openedAt
          )}
        />

        <Row
          label="Resolved"
          value={
            item?.resolvedAt
              ? formatDate(
                  item.resolvedAt
                )
              : "Not yet"
          }
        />

        <Row
          label="Initial Status"
          value={
            item
              ?.initialReconciliationStatus ||
            "Unknown"
          }
        />

        <Row
          label="Latest Status"
          value={
            item
              ?.latestReconciliationStatus ||
            "Unknown"
          }
        />

        <Row
          label="Issues"
          value={
            item?.issueCount ||
            0
          }
        />

        <Row
          label="Resolved Issues"
          value={
            item?.resolvedCount ||
            0
          }
        />

        <Row
          label="Open Issues"
          value={
            item?.openCount ||
            0
          }
        />

        <Row
          label="Matched Holdings"
          value={
            item?.matched ||
            0
          }
        />
      </View>

      <View
        style={styles.valueBlock}
      >
        <Row
          label="GateCEP Total"
          value={`KES ${money(
            item?.gatecepTotal
          )}`}
        />

        <Row
          label="Broker Total"
          value={`KES ${money(
            item?.brokerTotal
          )}`}
        />

        <Row
          label="Difference"
          value={`KES ${money(
            item?.difference
          )}`}
        />
      </View>

      {Array.isArray(
        item?.issues
      ) &&
      item.issues.length ? (
        <View
          style={styles.issueSummary}
        >
          <Text
            style={styles.issueTitle}
          >
            Issues
          </Text>

          {item.issues.map(
            (issue) => (
              <View
                key={
                  issue
                    ?.discrepancyKey ||
                  issue?.id
                }
                style={styles.issueRow}
              >
                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.issueSymbol
                    }
                  >
                    {issue?.symbol ||
                      "ACCOUNT"}
                  </Text>

                  <Text
                    style={
                      styles.issueType
                    }
                  >
                    {
                      issue
                        ?.discrepancyType
                    }
                  </Text>
                </View>

                <Text
                  style={[
                    styles.issueStatus,
                    issue
                      ?.resolutionStatus ===
                      "RESOLVED" &&
                      styles.issueStatusDone
                  ]}
                >
                  {issue
                    ?.resolutionStatus ||
                    "OPEN"}
                </Text>
              </View>
            )
          )}
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

    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 20
    },

    filterButton: {
      backgroundColor:
        "#1e293b",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14
    },

    filterButtonActive: {
      backgroundColor:
        "#9333ea"
    },

    filterText: {
      color: "#94a3b8",
      fontWeight: "900"
    },

    filterTextActive: {
      color: "white"
    },

    caseCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    caseHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16
    },

    caseId: {
      color: "#67e8f9",
      fontSize: 17,
      fontWeight: "900"
    },

    brokerName: {
      color: "#94a3b8",
      marginTop: 4
    },

    caseStatus: {
      fontSize: 12,
      fontWeight: "900"
    },

    caseSummary: {
      marginTop: 14
    },

    valueBlock: {
      backgroundColor:
        "#020617",
      borderRadius: 14,
      padding: 12,
      marginTop: 14
    },

    row: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16,
      marginTop: 10
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

    issueSummary: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "#1e293b"
    },

    issueTitle: {
      color: "#facc15",
      fontWeight: "900"
    },

    issueRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12
    },

    issueSymbol: {
      color: "white",
      fontWeight: "900"
    },

    issueType: {
      color: "#94a3b8",
      fontSize: 11,
      marginTop: 3
    },

    issueStatus: {
      color: "#facc15",
      fontSize: 11,
      fontWeight: "900"
    },

    issueStatusDone: {
      color: "#86efac"
    },

    emptyCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 18
    },

    emptyTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    emptyText: {
      color: "#94a3b8",
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

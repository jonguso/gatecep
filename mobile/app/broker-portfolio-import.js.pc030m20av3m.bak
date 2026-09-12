import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
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
  buildBrokerPortfolioImportPreview
} from "../src/features/broker-sync/brokerPortfolioImportService";

import {
  executeBrokerPortfolioImport
} from "../src/features/broker-sync/brokerPortfolioImportExecutionService";

import {
  backfillCompletedBrokerImportEvents
} from "../src/features/portfolio-ledger/portfolioEventBackfillService";


async function handleBackfillLedger() {
  try {
    const result =
      await backfillCompletedBrokerImportEvents();

    console.log(
      "PC-016 BACKFILL RESULT:",
      result
    );

    const message =
      `Completed requests: ${result.completedRequests}\n` +
      `Events created: ${result.created}\n` +
      `Skipped: ${result.skipped}`;

    if (
      Platform.OS === "web"
    ) {
      window.alert(
        message
      );
    } else {
      Alert.alert(
        "Ledger Backfill",
        message
      );
    }
  } catch (backfillError) {
    console.error(
      "Portfolio ledger backfill failed:",
      backfillError
    );
  }
}

export default function BrokerPortfolioImportScreen() {
  const [
    previews,
    setPreviews
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    processingId,
    setProcessingId
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const loadPreviews =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const result =
            await buildBrokerPortfolioImportPreview();

          setPreviews(
            Array.isArray(result)
              ? result
              : []
          );
        } catch (loadError) {
          console.error(
            "Unable to load controlled imports:",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load controlled portfolio imports."
          );

          setPreviews([]);
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  async function handleExecuteImport(
  request
) {
  if (!request?.id) {
    Alert.alert(
      "Controlled Import",
      "The import request ID is missing."
    );

    return;
  }

  const quantity =
    Number(
      request?.quantityToImport ||
      request?.brokerQuantity ||
      0
    );

  const message =
    `Import ${quantity} ${
      request?.symbol || ""
    } shares into the canonical REAL portfolio?`;

  /*
   * React Native Alert button callbacks are not reliable
   * on Expo Web, so use the browser confirmation dialog.
   */
  if (
    Platform.OS === "web"
  ) {
    const confirmed =
      window.confirm(
        message
      );

    if (!confirmed) {
      return;
    }

    await executeImport(
      request
    );

    return;
  }

  Alert.alert(
    "Execute Controlled Import",
    message,
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text:
          "Execute Import",

        onPress: () =>
          executeImport(
            request
          )
      }
    ]
  );
}

  async function executeImport(
    request
  ) {
    try {
      setProcessingId(
        request.id
      );

      setError("");

      const result =
        await executeBrokerPortfolioImport({
          requestId:
            request.id,

          executedBy:
            "CURRENT_USER"
        });

      console.log(
        "PC-015 IMPORT RESULT:",
        result
      );

      const reconciliationStatus =
        result?.reconciliation?.status ||
        "UPDATED";

      const successMessage =
  `${request.symbol} was processed successfully.\n\n` +
  `Reconciliation status: ${reconciliationStatus}`;

if (
  Platform.OS === "web"
) {
  window.alert(
    successMessage
  );
} else {
  Alert.alert(
    "Import Complete",
    successMessage
  );
}

      /*
       * Reload after execution.
       *
       * The completed PC-013 action will no longer qualify as
       * an approved import waiting for execution, so the card
       * should disappear from the pending preview list.
       */
      await loadPreviews();
    } catch (executionError) {
      console.error(
        "Controlled portfolio import failed:",
        executionError
      );

      const errorMessage =
  executionError?.message ||
  "Unable to execute the controlled portfolio import.";

if (
  Platform.OS === "web"
) {
  window.alert(
    `Import Failed\n\n${errorMessage}`
  );
} else {
  Alert.alert(
    "Import Failed",
    errorMessage
  );
}
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <View
        style={styles.centerScreen}
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={styles.loadingText}
        >
          Preparing controlled imports...
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
        PC-014 / PC-015
      </Text>

      <Text
        style={styles.title}
      >
        Controlled Portfolio Import
      </Text>

      <Text
        style={styles.subtitle}
      >
        Review and execute approved broker reconciliation imports.
        Every import is validated against the current broker mirror
        before the canonical REAL portfolio is updated.
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
          This controlled import aligns GateCEP with an approved
          broker position. It does not place a trade or modify the
          broker account.
        </Text>
      </View>

      {previews.map(
        (item) => {
          const processing =
            processingId ===
            item.id;

          const brokerQuantity =
            Number(
              item?.brokerQuantity ||
              0
            );

          const gatecepQuantity =
            Number(
              item?.gatecepQuantityBefore ||
              0
            );

          const quantityToImport =
            Number(
              item?.quantityToImport ||
              0
            );

          const estimatedValue =
            Number(
              item?.estimatedValue ||
              0
            );

          return (
            <View
              key={item.id}
              style={styles.card}
            >
              <View
                style={styles.cardHeader}
              >
                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={styles.symbol}
                  >
                    {item?.symbol ||
                      "Unknown"}
                  </Text>

                  <Text
                    style={styles.companyName}
                  >
                    {item?.companyName ||
                      item?.symbol ||
                      "Unknown security"}
                  </Text>
                </View>

                <Text
                  style={styles.status}
                >
                  {item?.status ||
                    "DRAFT"}
                </Text>
              </View>

              <View
                style={styles.detailsCard}
              >
                <Row
                  label="Broker"
                  value={
                    item?.broker ||
                    "Unknown"
                  }
                />

                <Row
                  label="Account"
                  value={
                    item?.accountName ||
                    "Unknown"
                  }
                />

                <Row
                  label="Case"
                  value={
                    item?.caseId ||
                    "Unknown"
                  }
                />

                <Row
                  label="Broker Quantity"
                  value={
                    brokerQuantity
                  }
                />

                <Row
                  label="GateCEP Quantity"
                  value={
                    gatecepQuantity
                  }
                />
              </View>

              <View
                style={styles.impactCard}
              >
                <Text
                  style={styles.impactTitle}
                >
                  Import Impact
                </Text>

                <Row
                  label="Quantity to Import"
                  value={`+${quantityToImport}`}
                  highlight
                />

                <Row
                  label="Estimated Value"
                  value={`KES ${money(
                    estimatedValue
                  )}`}
                  highlight
                />

                <Row
                  label="Market Price"
                  value={`KES ${money(
                    item?.marketPrice
                  )}`}
                />
              </View>

              <View
                style={styles.safetyCard}
              >
                <Text
                  style={styles.safetyTitle}
                >
                  Execution Protection
                </Text>

                <Text
                  style={styles.safetyText}
                >
                  PC-015 validates the approved action and current
                  broker holding before updating the canonical REAL portfolio.
                  Repeated execution will not add the same shares twice.
                </Text>
              </View>

              <Pressable
                disabled={
                  processing
                }
                style={[
                  styles.executeButton,
                  processing &&
                    styles.buttonDisabled
                ]}
                onPress={() =>
                  handleExecuteImport(
                    item
                  )
                }
              >
                {processing ? (
                  <ActivityIndicator
                    color="white"
                  />
                ) : (
                  <Text
                    style={
                      styles.executeButtonText
                    }
                  >
                    Execute Controlled Import
                  </Text>
                )}
              </Pressable>
            </View>
          );
        }
      )}

      {!previews.length ? (
        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.emptyTitle}
          >
            No Approved Imports Waiting
          </Text>

          <Text
            style={styles.emptyText}
          >
            Approved Queue Import Review actions will appear here.
            Completed actions are removed from the pending list.
          </Text>
        </View>
      ) : null}

      <Pressable
        style={styles.primaryButton}
        onPress={loadPreviews}
      >
        <Text
          style={styles.primaryButtonText}
        >
          Refresh Import Preview
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          router.push(
            "/broker-reconciliation-actions"
          )
        }
      >
        <Text
          style={styles.secondaryButtonText}
        >
          Back to Action Center
        </Text>
      </Pressable>

    <Pressable
  style={styles.secondaryButton}
  onPress={
    handleBackfillLedger
  }
>
  <Text
    style={styles.secondaryButtonText}
  >
    Backfill Portfolio Ledger
  </Text>
</Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          router.push(
            "/broker-reconciliation"
          )
        }
      >
        <Text
          style={styles.secondaryButtonText}
        >
          Open Broker Reconciliation
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          router.replace(
            "/(tabs)/dashboard"
          )
        }
      >
        <Text
          style={styles.secondaryButtonText}
        >
          Back to Dashboard
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  highlight = false
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
        style={[
          styles.rowValue,
          highlight &&
            styles.rowHighlight
        ]}
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

    centerScreen: {
      flex: 1,
      backgroundColor:
        "#020617",
      justifyContent:
        "center",
      alignItems:
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
      fontSize: 31,
      fontWeight: "900",
      marginTop: 8
    },

    subtitle: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 10,
      marginBottom: 20
    },

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginBottom: 18
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

    card: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginBottom: 18
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      gap: 14
    },

    symbol: {
      color: "#67e8f9",
      fontSize: 27,
      fontWeight: "900"
    },

    companyName: {
      color: "#cbd5e1",
      marginTop: 4
    },

    status: {
      color: "#fde68a",
      fontSize: 12,
      fontWeight: "900"
    },

    detailsCard: {
      backgroundColor:
        "#020617",
      borderRadius: 14,
      padding: 13,
      marginTop: 16
    },

    impactCard: {
      backgroundColor:
        "rgba(34,197,94,.08)",
      borderColor:
        "rgba(34,197,94,.25)",
      borderWidth: 1,
      borderRadius: 14,
      padding: 13,
      marginTop: 14
    },

    impactTitle: {
      color: "#86efac",
      fontWeight: "900",
      marginBottom: 3
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

    rowHighlight: {
      color: "#86efac"
    },

    safetyCard: {
      backgroundColor:
        "rgba(245,158,11,.09)",
      borderColor:
        "rgba(245,158,11,.30)",
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
      marginTop: 14
    },

    safetyTitle: {
      color: "#fde68a",
      fontWeight: "900"
    },

    safetyText: {
      color: "#fef3c7",
      lineHeight: 20,
      marginTop: 7
    },

    executeButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 16,
      marginTop: 18
    },

    executeButtonText: {
      color: "white",
      textAlign: "center",
      fontWeight: "900"
    },

    buttonDisabled: {
      opacity: 0.6
    },

    emptyCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18
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
      borderRadius: 17,
      marginTop: 20
    },

    primaryButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 16,
      borderRadius: 17,
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
      borderRadius: 16,
      padding: 14,
      marginBottom: 16
    },

    errorText: {
      color: "#fca5a5"
    }
  });

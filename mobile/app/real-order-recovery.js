import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { loadBasketExecution } from "../src/trade/basketExecutionStore";
import { userGetItem } from "../src/auth/userStorage";
import { buildVerifiedEvidenceMatchAudit } from "../src/features/broker-sync/realOrderExecutionEvidenceReconciliationService";
import { buildExecutionStatusReadModel } from "../src/services/trade/realExecutionStatusReadModel";

function parseStoredEvidence(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value;

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function auditValue(value) {
  if (value === null) {
    return "N/A";
  }

  return value
    ? "YES"
    : "NO";
}

export default function RealOrderRecovery() {
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidenceRecords, setEvidenceRecords] = useState([]);

  function statusViewFor(order) {
    return buildExecutionStatusReadModel(order, execution);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [
        saved,
        verifiedRaw,
        unverifiedRaw
      ] = await Promise.all([
        loadBasketExecution(),
        userGetItem("transactionHistory"),
        userGetItem("unverifiedTransactionHistory")
      ]);

      setExecution(saved || null);

      setEvidenceRecords([
        ...parseStoredEvidence(verifiedRaw),
        ...parseStoredEvidence(unverifiedRaw)
      ]);
    } catch (loadError) {
      setExecution(null);
      setError(
        loadError?.message ||
          "Unable to load REAL submission recovery state."
      );
    } finally {
      setLoading(false);
    }
  }

  const recoveryOrders = useMemo(() => {
    return (execution?.orders || []).filter((order) =>
      buildExecutionStatusReadModel(
        order,
        execution
      ).recoveryRequired
    );
  }, [execution]);


  const matchAuditByOrderId =
    useMemo(() => {
      const next = {};

      for (
        const order of recoveryOrders
      ) {
        next[order.id] =
          buildVerifiedEvidenceMatchAudit({
            order,
            records: evidenceRecords
          });
      }

      return next;
    }, [
      recoveryOrders,
      evidenceRecords
    ]);

  function openTransactionEvidence(order) {
    router.push({
      pathname: "/transactions-upload",
      params: {
        mode: "RECONCILE",
        recoveryOrderId: order?.id || "",
        recoverySymbol: order?.symbol || "",
        recoveryBrokerId: order?.brokerId || ""
      }
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>REAL Order Recovery</Text>
          <Text style={styles.subtitle}>
            Reconcile uncertain submissions and verified partial REAL fills
            using genuine broker evidence. GateCEP never guesses the remaining
            broker outcome and never resubmits a recovery order automatically.
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={load}
          disabled={loading}
        >
          <Text style={styles.refreshText}>
            {loading ? "Loading…" : "Refresh"}
          </Text>
        </Pressable>
      </View>

      <ActiveUserBanner />

      <View style={styles.safetyCard}>
        <Text style={styles.safetyTitle}>
          Verified broker evidence required
        </Text>

        <Text style={styles.body}>
          A broker statement or completed transaction history must establish
          what actually happened. Only verified completed broker execution
          evidence may affect REAL holdings, cash, cost basis, FIFO lots,
          profit/loss, or trade history.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Recovery state unavailable</Text>
          <Text style={styles.body}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && recoveryOrders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            No REAL submissions require reconciliation
          </Text>

          <Text style={styles.body}>
            There are no uncertain REAL submissions or verified partial REAL
            fills currently requiring broker-evidence reconciliation.
          </Text>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/queue-manager")}
          >
            <Text style={styles.secondaryText}>Return to Queue Manager</Text>
          </Pressable>
        </View>
      ) : null}

      {recoveryOrders.map((order) => (
        <View key={order.id} style={styles.card}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={styles.symbol}>
                {order.side || "ORDER"} {order.symbol || "—"}
              </Text>

              <Text style={styles.broker}>
                {order.brokerName ||
                  order.brokerId ||
                  "Assigned REAL broker"}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {statusViewFor(order).label}
              </Text>
            </View>
          </View>

          <Text style={styles.body}>
            {statusViewFor(order).explanation}
          </Text>

          <View style={styles.detailGrid}>
            <Detail
              label="Ordered Quantity"
              value={String(order.quantity || 0)}
            />

            {statusViewFor(order).phase === "PARTIAL_FILL" ? (
              <>
                <Detail
                  label="Verified Filled"
                  value={String(order.filledQuantity || 0)}
                />

                <Detail
                  label="Remaining"
                  value={String(order.remainingQuantity || 0)}
                />

                <Detail
                  label="Fill Progress"
                  value={`${Number(order.fillPercent || 0).toFixed(2)}%`}
                />

                <Detail
                  label="Average Fill Price"
                  value={
                    Number(order.averageFillPrice || 0) > 0
                      ? `KES ${Number(order.averageFillPrice).toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}`
                      : "Unavailable"
                  }
                />

                <Detail
                  label="Verified Fills"
                  value={String(
                    order?.verifiedExecutionEvidence?.fillCount || 0
                  )}
                />
              </>
            ) : null}

            <Detail
              label="Broker Account"
              value={
                order.brokerAccountId ||
                "Unavailable"
              }
            />

            <Detail
              label="Broker Status"
              value={
                statusViewFor(order).brokerStatus ||
                "Unavailable"
              }
            />

            <Detail
              label="Submission Attempt"
              value={String(order.submissionAttemptCount || 0)}
            />

            <Detail
              label="Attempt ID"
              value={
                order.submissionAttemptId ||
                "Unavailable"
              }
            />

            <Detail
              label="Last Attempt"
              value={
                order.lastSubmissionAttemptAt ||
                "Unavailable"
              }
            />

            <Detail
              label="Broker Order ID"
              value={
                order.brokerOrderId ||
                "Not confirmed"
              }
            />
          </View>

          <RecoveryMatchAudit
            audit={
              matchAuditByOrderId[
                order.id
              ]
            }
          />

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              {statusViewFor(order).phase === "PARTIAL_FILL"
                ? `${String(order.filledQuantity || 0)} of ${String(
                    order.quantity || 0
                  )} shares are confirmed executed from verified broker evidence. ${String(
                    order.remainingQuantity || 0
                  )} remain open or unresolved in GateCEP. Do not manually fill, retry, or resubmit the remainder. Upload current authoritative broker evidence to reconcile what actually happened.`
                : "Do not retry this REAL order until broker evidence proves that the previous submission was not accepted."}
            </Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => openTransactionEvidence(order)}
          >
            <Text style={styles.primaryText}>
              {statusViewFor(order).phase === "PARTIAL_FILL"
                ? "Upload Current Broker Evidence"
                : "Upload Broker Transaction Evidence"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/portfolio-sync-center")}
          >
            <Text style={styles.secondaryText}>
              Open Sync & Reconcile
            </Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/queue-manager")}
      >
        <Text style={styles.secondaryText}>Back to Queue Manager</Text>
      </Pressable>
    </ScrollView>
  );
}


function RecoveryMatchAudit({
  audit
}) {
  if (!audit) {
    return null;
  }

  const decision =
    String(
      audit.status ||
      "NO_VERIFIED_MATCH"
    ).replaceAll("_", " ");

  return (
    <View style={styles.warningBox}>
      <Text style={styles.cardTitle}>
        Recovery Match Audit
      </Text>

      <Text style={styles.body}>
        Read-only comparison of stored broker
        evidence against the exact PC-031A10
        reconciliation rules. This audit does not
        route, retry, fill, or mutate the order.
      </Text>

      <View style={styles.detailGrid}>
        <Detail
          label="Decision"
          value={decision}
        />

        <Detail
          label="Match Mode"
          value={String(
            audit.matchMode ||
            "STRICT_IDENTITY_WINDOW"
          ).replaceAll("_", " ")}
        />

        <Detail
          label="Evidence Records"
          value={String(
            audit.evidenceCount || 0
          )}
        />

        <Detail
          label="Verified Records"
          value={String(
            audit.verifiedEvidenceCount ||
            0
          )}
        />

        <Detail
          label="Qualifying Matches"
          value={String(
            audit.matchCount || 0
          )}
        />

        <Detail
          label="Relevant Evidence"
          value={String(
            audit.relevantEvidenceCount ||
            0
          )}
        />

        <Detail
          label="Hidden Irrelevant"
          value={String(
            audit.hiddenIrrelevantEvidenceCount ||
            0
          )}
        />

        <Detail
          label="Broker Reference"
          value={
            audit.brokerOrderId ||
            "Not confirmed"
          }
        />
      </View>

      {audit.evidenceCount === 0 ? (
        <Text style={styles.warningText}>
          No stored broker transaction evidence is
          currently available for comparison.
        </Text>
      ) : null}

      {audit.evidenceCount > 0 &&
      audit.relevantEvidenceCount === 0 ? (
        <Text style={styles.warningText}>
          Stored broker evidence exists, but none is
          sufficiently related to this uncertain order
          to display as recovery evidence.
        </Text>
      ) : null}

      {(audit.relevantEvidence || [])
        .slice(0, 5)
        .map((item, index) => (
          <View
            key={
              item.id ||
              `AUDIT-${index}`
            }
            style={styles.detail}
          >
            <Text style={styles.detailLabel}>
              Evidence {index + 1}
              {item.brokerReference
                ? ` � ${item.brokerReference}`
                : ""}
            </Text>

            <Text style={styles.detailValue}>
              {item.qualifies
                ? "QUALIFIES"
                : "DOES NOT QUALIFY"}
            </Text>

            <Text style={styles.body}>
              Relevance score:{" "}
              {String(
                item.relevanceScore || 0
              )}
              {"  "}Identity signals:{" "}
              {String(
                item.identitySignalCount || 0
              )}
            </Text>

            <Text style={styles.body}>
              Verified:{" "}
              {auditValue(
                item.checks?.verified
              )}
              {"  "}Reference:{" "}
              {auditValue(
                item.checks?.referenceMatch
              )}
              {"  "}Symbol:{" "}
              {auditValue(
                item.checks?.symbolMatch
              )}
              {"  "}Side:{" "}
              {auditValue(
                item.checks?.sideMatch
              )}
              {"  "}Quantity:{" "}
              {auditValue(
                item.checks?.quantityMatch
              )}
              {"  "}Broker:{" "}
              {auditValue(
                item.checks?.brokerMatch
              )}
              {"  "}Window:{" "}
              {auditValue(
                item.checks
                  ?.submissionWindowMatch
              )}
            </Text>

            {item.missingEvidence?.length ? (
              <Text style={styles.warningText}>
                Missing verification evidence:{" "}
                {item.missingEvidence.join(
                  ", "
                )}
              </Text>
            ) : null}
          </View>
        ))}

      {audit.relevantEvidenceCount > 5 ? (
        <Text style={styles.body}>
          Showing the 5 most relevant of{" "}
          {audit.relevantEvidenceCount} related
          evidence records.
        </Text>
      ) : null}

      {audit.hiddenIrrelevantEvidenceCount > 0 ? (
        <Text style={styles.body}>
          {audit.hiddenIrrelevantEvidenceCount} stored
          evidence record
          {audit.hiddenIrrelevantEvidenceCount === 1
            ? " was"
            : "s were"} hidden because they did not
          share enough order identity signals. Hidden
          records remain stored and are not deleted.
        </Text>
      ) : null}
    </View>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111f"
  },
  content: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14
  },
  headerText: {
    flex: 1,
    minWidth: 260
  },
  title: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: "#a9b7c8",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  refreshText: {
    color: "#d8e4f0",
    fontWeight: "700"
  },
  safetyCard: {
    borderWidth: 1,
    borderColor: "#a16207",
    backgroundColor: "#221a09",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    marginBottom: 14
  },
  safetyTitle: {
    color: "#facc15",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#991b1b",
    backgroundColor: "#210b0b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14
  },
  errorTitle: {
    color: "#fecaca",
    fontWeight: "800",
    marginBottom: 6
  },
  card: {
    borderWidth: 1,
    borderColor: "#263449",
    backgroundColor: "#0d1929",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6
  },
  orderHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12
  },
  symbol: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800"
  },
  broker: {
    color: "#94a3b8",
    marginTop: 3
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#422006",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  statusText: {
    color: "#facc15",
    fontSize: 11,
    fontWeight: "800"
  },
  body: {
    color: "#b8c5d4",
    fontSize: 14,
    lineHeight: 20
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  detail: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 220,
    borderWidth: 1,
    borderColor: "#263449",
    borderRadius: 10,
    padding: 10
  },
  detailLabel: {
    color: "#7f8ea3",
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 4
  },
  detailValue: {
    color: "#e5edf6",
    fontSize: 13,
    fontWeight: "700"
  },
  warningBox: {
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    paddingLeft: 10,
    marginTop: 14,
    marginBottom: 14
  },
  warningText: {
    color: "#fbd38d",
    lineHeight: 19
  },
  primaryButton: {
    backgroundColor: "#0f766e",
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 4
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 10
  },
  secondaryText: {
    color: "#cbd5e1",
    fontWeight: "700"
  },
  backButton: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: "center"
  }
});

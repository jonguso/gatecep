import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { ContainedPanel } from "../src/components/mobile/MobileUI";
import {
  createBasketExecution,
  deleteExecutionOrder,
  loadBasketExecution,
  queueExecutionOrders,
  queueSingleOrder,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";
import { buildRealOrderBrokerEligibility } from "../src/services/trade/brokerExecutionEligibilityService";
import { buildExecutionStatusReadModel } from "../src/services/trade/realExecutionStatusReadModel";

export default function OrdersReview() {
  const [execution, setExecution] = useState(null);
  const [query, setQuery] = useState("");
  const [brokerEligibility, setBrokerEligibility] = useState({});
  const [brokerEligibilityLoading, setBrokerEligibilityLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    let saved = await loadBasketExecution();

    if (!saved) {
      saved = await createBasketExecution();
    }

    setExecution(saved);
    await refreshBrokerEligibility(saved);
  }

  const orders = execution?.orders || [];
  const executionMode = String(
    execution?.executionMode || orders[0]?.executionMode || "PRACTICE"
  ).toUpperCase();
  const isRealExecution = executionMode === "REAL";

  function statusViewFor(order) {
    return buildExecutionStatusReadModel(order, execution);
  }

  const recoveryOrders = orders.filter(
    (order) => statusViewFor(order).recoveryRequired
  );

  const reviewOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders
      .filter((order) =>
        [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(
          order.status
        )
      )
      .filter((order) => {
        if (!search) return true;

        const statusView = statusViewFor(order);

        return (
          String(order.symbol || "").toLowerCase().includes(search) ||
          String(order.name || "").toLowerCase().includes(search) ||
          String(order.side || "").toLowerCase().includes(search) ||
          String(statusView.label || "").toLowerCase().includes(search) ||
          String(statusView.phase || "").toLowerCase().includes(search) ||
          String(statusView.rawStatus || "").toLowerCase().includes(search) ||
          String(statusView.brokerStatus || "").toLowerCase().includes(search)
        );
      });
  }, [orders, query]);

  async function refreshBrokerEligibility(nextExecution = execution) {
    const nextOrders = nextExecution?.orders || [];
    const nextMode = String(
      nextExecution?.executionMode || nextOrders[0]?.executionMode || "PRACTICE"
    ).toUpperCase();

    if (nextMode !== "REAL") {
      setBrokerEligibility({});
      return;
    }

    setBrokerEligibilityLoading(true);

    try {
      const entries = await Promise.all(
        nextOrders
          .filter((order) =>
            [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(
              order.status
            )
          )
          .map(async (order) => [
            order.id,
            await buildRealOrderBrokerEligibility({
              order,
              executionOrders: nextOrders
            })
          ])
      );

      setBrokerEligibility(Object.fromEntries(entries));
    } finally {
      setBrokerEligibilityLoading(false);
    }
  }

  const totalAmount = reviewOrders.reduce(
    (sum, order) => sum + Number(order.amount || order.gross || 0),
    0
  );

  async function updateOrder(order, patch) {
    const updated = await updateExecutionOrder(order.id, patch);
    setExecution(updated);
    await refreshBrokerEligibility(updated);
  }

  async function deleteOrder(order) {
    Alert.alert("Delete Order", `Remove ${order.symbol} from this basket?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteExecutionOrder(order.id);
          setExecution(updated);
        }
      }
    ]);
  }

  async function queueOrder(order) {
    if (isRealExecution) {
      const result = brokerEligibility[order.id];
      const selected = (result?.candidates || []).find(
        (candidate) => candidate.brokerAccountId === order.brokerAccountId
      );

      if (!order.brokerAccountId || !selected || !selected.eligible) {
        Alert.alert(
          "Eligible Broker Required",
          !order.brokerAccountId
            ? "Choose an eligible connected broker for this REAL order before preparing it."
            : "The selected broker no longer has enough broker-specific trading space or holdings for this order."
        );
        return;
      }
    }

    const updated = await queueSingleOrder(order.id);
    setExecution(updated);
    await refreshBrokerEligibility(updated);
  }

  async function prepareHandoff() {
    if (!reviewOrders.length) {
      Alert.alert("No Orders", "There are no review orders to submit.");
      return;
    }

    if (isRealExecution) {
      const invalidRealOrders = reviewOrders.filter((order) => {
        const result = brokerEligibility[order.id];
        const selected = (result?.candidates || []).find(
          (candidate) => candidate.brokerAccountId === order.brokerAccountId
        );

        return !order.brokerAccountId || !selected || !selected.eligible;
      });

      if (invalidRealOrders.length) {
        Alert.alert(
          "Broker Assignment Required",
          `${invalidRealOrders.length} REAL order${invalidRealOrders.length === 1 ? "" : "s"} still need an eligible broker assignment. Review broker cash/trading space or broker-specific holdings before queueing.`
        );
        return;
      }
    }

    Alert.alert(
      "Prepare Order Handoff",
      isRealExecution
        ? `${reviewOrders.length} REAL order${reviewOrders.length === 1 ? "" : "s"} will be queued for broker routing. Queueing does not mean the broker has received or executed the order.`
        : `${reviewOrders.length} Practice order${reviewOrders.length === 1 ? "" : "s"} will be queued for GateCEP Broker.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            const updated = await queueExecutionOrders();
            setExecution(updated);
            router.push("/(tabs)/trading")
          }
        }
      ]
    );
  }

  if (!execution || !orders.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{isRealExecution ? "REAL Orders Review" : "Practice Orders Review"}</Text>

        <Text style={styles.subtitle}>
          No basket orders found. Create a Coach G trade basket first.
        </Text>

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/trade-basket")}
        >
          <Text style={styles.primaryText}>Open Trade Basket</Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.secondaryText}>Dashboard</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{isRealExecution ? "REAL Orders Review" : "Practice Orders Review"}</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {isRealExecution
          ? "Review REAL orders before queueing them for broker routing. Queueing does not create broker receipt or execution evidence."
          : "Review Practice orders before sending them through GateCEP Broker."}
      </Text>

      <ActiveUserBanner />

      {recoveryOrders.length > 0 ? (
        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryTitle}>
            REAL Broker Reconciliation Required
          </Text>

          <Text style={styles.recoveryText}>
            {recoveryOrders.length} REAL order
            {recoveryOrders.length === 1 ? "" : "s"} require broker-evidence
            reconciliation. This may include an uncertain submission or a
            verified partial execution. These orders are not editable review
            orders and must not be queued, manually filled, or resubmitted
            while recovery is required.
          </Text>

          <Pressable
            style={styles.recoveryButton}
            onPress={() => router.push("/real-order-recovery")}
          >
            <Text style={styles.recoveryButtonText}>
              Review REAL Submission Recovery
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Metric label="Review Orders" value={String(reviewOrders.length)} />
        <Metric label="Basket Orders" value={String(orders.length)} />
        <Metric label="Estimated Value" value={`KES ${money(totalAmount)}`} />
        <Metric label="Status" value={execution.status} />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, name, or side"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <ContainedPanel
        title="Orders Awaiting Review"
        subtitle={`${reviewOrders.length} editable order${reviewOrders.length === 1 ? "" : "s"}`}
        emptyMessage="All orders have already been prepared, submitted, filled, cancelled, or removed."
        minHeight={340}
        maxHeight={500}
        heightRatio={0.48}
        testID="orders-review-panel"
      >
      {reviewOrders.length === 0 ? null : (
        reviewOrders.map((order) => (
          <ReviewOrderCard
            key={order.id}
            order={order}
            executionMode={executionMode}
            statusView={statusViewFor(order)}
            brokerEligibility={brokerEligibility[order.id]}
            brokerEligibilityLoading={brokerEligibilityLoading}
            onChange={(patch) => updateOrder(order, patch)}
            onDelete={() => deleteOrder(order)}
            onQueue={() => queueOrder(order)}
          />
        ))
      )}
      </ContainedPanel>

      <Pressable
        style={[styles.primary, reviewOrders.length === 0 && styles.disabledButton]}
        disabled={reviewOrders.length === 0}
        onPress={prepareHandoff}
      >
        <Text style={styles.primaryText}>
          {reviewOrders.length > 0
            ? `Continue to Order Handoff (${reviewOrders.length})`
            : "No Orders to Submit"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ReviewOrderCard({
  order,
  executionMode,
  statusView,
  brokerEligibility,
  brokerEligibilityLoading,
  onChange,
  onDelete,
  onQueue
}) {
  const qty = String(order.quantity || "");
  const price = String(order.price || "");
  const amount = Number(order.quantity || 0) * Number(order.price || 0);
  const isRealOrder = statusView.isReal;
  const candidates = brokerEligibility?.candidates || [];
  const selectedCandidate = candidates.find(
    (candidate) => candidate.brokerAccountId === order.brokerAccountId
  );

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {order.side} {order.symbol}
          </Text>

          <Text style={styles.small}>
            {order.name || order.symbol} • {order.sector || "NSE"}
          </Text>
        </View>

        <Text style={styles.status}>{statusView.label}</Text>
      </View>

      <Text style={styles.reason}>
        {order.reason || statusView.explanation}
      </Text>

      {statusView.brokerStatus ? (
        <Text style={styles.brokerState}>
          Broker Status: {statusView.brokerStatus}
        </Text>
      ) : null}

      <View style={styles.sideRow}>
        {["BUY", "SELL"].map((side) => (
          <Pressable
            key={side}
            style={[styles.sideChip, order.side === side && styles.sideChipActive]}
            onPress={() => onChange({ side })}
          >
            <Text
              style={order.side === side ? styles.sideTextActive : styles.sideText}
            >
              {side}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.editGrid}>
        <View style={styles.editBox}>
          <Text style={styles.inputLabel}>Quantity</Text>

          <TextInput
            value={qty}
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const quantity = cleanNumber(value);
              const gross = quantity * Number(order.price || 0);

              onChange({
                quantity,
                gross,
                amount: gross
              });
            }}
          />
        </View>

        <View style={styles.editBox}>
          <Text style={styles.inputLabel}>Limit Price</Text>

          <TextInput
            value={price}
            keyboardType="numeric"
            placeholder="Price"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const nextPrice = cleanNumber(value);
              const gross = Number(order.quantity || 0) * nextPrice;

              onChange({
                price: nextPrice,
                gross,
                amount: gross
              });
            }}
          />
        </View>
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Estimated Value</Text>
        <Text style={styles.amountValue}>KES {money(amount)}</Text>
      </View>

      {isRealOrder ? (
        <View style={styles.brokerBox}>
          <Text style={styles.inputLabel}>Broker Route</Text>
          <Text style={styles.brokerHelp}>
            Choose one connected REAL broker for this order. GateCEP checks that broker's own cash/trading space for BUY orders and that broker's own holding quantity for SELL orders.
          </Text>

          {brokerEligibilityLoading && !candidates.length ? (
            <Text style={styles.brokerHelp}>Checking broker eligibility…</Text>
          ) : null}

          {!brokerEligibilityLoading && !candidates.length ? (
            <Text style={styles.brokerBlocked}>
              No connected REAL broker is currently eligible for review.
            </Text>
          ) : null}

          {candidates.map((candidate) => {
            const selected =
              candidate.brokerAccountId === order.brokerAccountId;
            const cashMode = String(order.side || "BUY").toUpperCase() === "BUY";

            return (
              <Pressable
                key={candidate.brokerAccountId}
                disabled={!candidate.eligible}
                style={[
                  styles.brokerOption,
                  selected && styles.brokerOptionSelected,
                  !candidate.eligible && styles.brokerOptionDisabled
                ]}
                onPress={() =>
                  onChange({
                    brokerAccountId: candidate.brokerAccountId,
                    brokerId: candidate.brokerId,
                    brokerName: candidate.brokerName,
                    estimatedCharges: candidate.estimatedCharges,
                    estimatedTotalCost: cashMode
                      ? candidate.requiredCash
                      : candidate.gross,
                    executionEligibility: {
                      checked: true,
                      side: candidate.side,
                      reason: candidate.reason,
                      requiredCash: cashMode ? candidate.requiredCash : null,
                      availableCash: cashMode ? candidate.availableCash : null,
                      reservedCash: cashMode ? candidate.reservedCash : null,
                      projectedAvailableCash: cashMode
                        ? candidate.projectedAvailableCash
                        : null,
                      requiredQuantity: cashMode
                        ? null
                        : candidate.requiredQuantity,
                      heldQuantity: cashMode ? null : candidate.heldQuantity,
                      reservedQuantity: cashMode
                        ? null
                        : candidate.reservedQuantity,
                      projectedAvailableQuantity: cashMode
                        ? null
                        : candidate.projectedAvailableQuantity,
                      feeEvidenceAvailable:
                        candidate.feeEvidenceAvailable === true,
                      feeEvidenceSource: candidate.feeEvidenceSource || null,
                      feeVerifiedAt: candidate.feeVerifiedAt || null
                    }
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.brokerName}>
                    {candidate.brokerName}
                    {candidate.defaultBroker ? " • Default" : ""}
                  </Text>

                  {cashMode ? (
                    <Text style={styles.brokerMeta}>
                      Cash KES {money(candidate.availableCash)} • Reserved KES {money(candidate.reservedCash)} • Available KES {money(candidate.projectedAvailableCash)}
                    </Text>
                  ) : (
                    <Text style={styles.brokerMeta}>
                      Holding {candidate.heldQuantity} • Reserved {candidate.reservedQuantity} • Available {candidate.projectedAvailableQuantity}
                    </Text>
                  )}

                  <Text style={styles.brokerMeta}>
                    {candidate.estimatedCharges == null
                      ? "Verified broker charges unavailable"
                      : `Verified est. charges KES ${money(candidate.estimatedCharges)}`}
                  </Text>
                </View>

                <Text
                  style={
                    candidate.eligible
                      ? styles.brokerEligible
                      : styles.brokerBlocked
                  }
                >
                  {candidate.eligible
                    ? selected
                      ? "SELECTED"
                      : "ELIGIBLE"
                    : candidate.reason === "INSUFFICIENT_TRADING_SPACE"
                    ? "INSUFFICIENT CASH"
                    : "INSUFFICIENT HOLDING"}
                </Text>
              </Pressable>
            );
          })}

          {selectedCandidate ? (
            <Text
              style={
                selectedCandidate.eligible
                  ? styles.brokerEligibleSummary
                  : styles.brokerBlocked
              }
            >
              {selectedCandidate.eligible
                ? `Route selected: ${selectedCandidate.brokerName}`
                : "Selected broker is no longer eligible. Choose another broker."}
            </Text>
          ) : (
            <Text style={styles.brokerBlocked}>
              Select an eligible broker before preparing this REAL order.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable style={styles.queueButton} onPress={onQueue}>
          <Text style={styles.queueText}>Prepare This Order</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
    </View>
  );
}

function cleanNumber(value) {
  const number = Number(
    String(value || "")
      .replaceAll(",", "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  recoveryCard: {
    borderWidth: 1,
    borderColor: "#a16207",
    backgroundColor: "#221a09",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 14
  },
  recoveryTitle: {
    color: "#facc15",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6
  },
  recoveryText: {
    color: "#d6c9a4",
    lineHeight: 19,
    marginBottom: 10
  },
  recoveryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#854d0e"
  },
  recoveryButtonText: {
    color: "#fef3c7",
    fontWeight: "800"
  },
  brokerState: {
    color: "#94a3b8",
    marginBottom: 10,
    fontSize: 12
  },
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { /* PC-030M20AV3AL RESPONSIVE UAT CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  summaryCard: {
    marginTop: 20,
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
  metricLabel: { color: "#94a3b8", fontSize: 12 },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6,
    fontSize: 13
  },
  search: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    color: "white",
    padding: 16,
    borderRadius: 16
  },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  orderCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  orderTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 18
  },
  small: {
    color: "#94a3b8",
    marginTop: 5
  },
  status: {
    color: "#fbbf24",
    fontWeight: "900",
    fontSize: 12
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 12,
    lineHeight: 20
  },
  sideRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  sideChip: {
    flexGrow: 1,
    flexBasis: 120,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },
  sideChipActive: {
    backgroundColor: "#9333ea",
    borderColor: "#c084fc"
  },
  sideText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "900"
  },
  sideTextActive: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  editGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  editBox: {
    flexGrow: 1,
    flexBasis: 140
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6
  },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  amountBox: {
    marginTop: 16,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  amountLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  amountValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4
  },
  brokerBox: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12
  },
  brokerHelp: { color: "#94a3b8", marginTop: 6, lineHeight: 18, fontSize: 12 },
  brokerOption: {
    marginTop: 10,
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  brokerOptionSelected: {
    borderColor: "#67e8f9",
    backgroundColor: "rgba(103,232,249,.08)"
  },
  brokerOptionDisabled: { opacity: 0.48 },
  brokerName: { color: "white", fontWeight: "900" },
  brokerMeta: { color: "#94a3b8", marginTop: 4, fontSize: 11, lineHeight: 16 },
  brokerEligible: { color: "#86efac", fontWeight: "900", fontSize: 10 },
  brokerEligibleSummary: { color: "#86efac", fontWeight: "900", marginTop: 10 },
  brokerBlocked: { color: "#fbbf24", fontWeight: "800", marginTop: 8, fontSize: 11 },

  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  queueButton: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: "#9333ea",
    padding: 14,
    borderRadius: 16
  },
  queueText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  deleteButton: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16
  },
  deleteText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});

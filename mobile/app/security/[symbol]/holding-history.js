import React, {
  useCallback,
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
  router,
  useFocusEffect,
  useLocalSearchParams
} from "expo-router";

import {
  aggregateUnifiedHoldingsBySymbol,
  loadUnifiedPortfolioRuntime
} from "../../../src/portfolio/unifiedPortfolioApi";

import {
  loadBrokerLotHistoryEvidence
} from "../../../src/features/trading/brokerLotHistoryEvidenceService";

import {
  buildAccountAwareFifoLedger
} from "../../../src/features/trading/accountAwareFifoLedgerService";

export default function SecurityHoldingHistory() {
  const { symbol } = useLocalSearchParams();

  const targetSymbol =
    String(symbol || "")
      .trim()
      .toUpperCase();

  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);

      Promise.all([
        loadUnifiedPortfolioRuntime({
          broker: "ALL"
        }),
        loadBrokerLotHistoryEvidence()
      ])
        .then(([runtime, evidence]) => {
          if (!active) return;

          setHoldings(
            Array.isArray(runtime?.holdings)
              ? runtime.holdings
              : []
          );

          setTransactions(
            Array.isArray(evidence?.records)
              ? evidence.records
              : []
          );
        })
        .catch(() => {
          if (!active) return;

          setHoldings([]);
          setTransactions([]);
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [targetSymbol])
  );

  const holding = useMemo(() => {
    return (
      aggregateUnifiedHoldingsBySymbol(
        holdings
      ).find(
        (row) =>
          String(row?.symbol || "")
            .trim()
            .toUpperCase() === targetSymbol
      ) || null
    );
  }, [holdings, targetSymbol]);

  const ledger = useMemo(() => {
    if (!holding) return null;

    return buildAccountAwareFifoLedger({
      holding,
      transactions,
      symbol: targetSymbol
    });
  }, [
    holding,
    transactions,
    targetSymbol
  ]);

  const quantity =
    Number(holding?.quantity || 0);

  const averageCost =
    Number(
      holding?.averagePrice ??
      holding?.averageCost ??
      holding?.weightedAveragePrice ??
      0
    );

  const openLots =
    Array.isArray(ledger?.openLots)
      ? ledger.openLots
      : [];

  const historicalSales =
    Array.isArray(ledger?.historicalSales)
      ? ledger.historicalSales
      : [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text style={styles.loading}>
          Loading holding history...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹ Back to Security
          </Text>
        </Pressable>

        <Text style={styles.title}>
          {targetSymbol} Holding History
        </Text>

        <Text style={styles.subtitle}>
          Broker-evidenced acquisition history and
          reconciled FIFO lots. Read-only.
        </Text>

        {!holding || quantity <= 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No REAL Position
            </Text>

            <Text style={styles.body}>
              No current broker-evidenced holding is
              available for {targetSymbol}.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Current Position
              </Text>

              <Metric
                label="Shares owned"
                value={formatNumber(quantity)}
              />

              <Metric
                label="Average cost"
                value={
                  averageCost > 0
                    ? `KES ${money(averageCost)}`
                    : "N/A"
                }
              />

              <Metric
                label="Source accounts"
                value={String(
                  holding?.sourceAccountCount ??
                  holding?.brokerAccounts?.length ??
                  1
                )}
              />

              <Text style={styles.evidence}>
                REAL READ-ONLY | Broker-evidenced
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                FIFO Reconciliation
              </Text>

              <Metric
                label="Status"
                value={
                  ledger?.available
                    ? "Reconciled"
                    : String(
                        ledger?.status ||
                        "Evidence unavailable"
                      )
                }
              />

              <Metric
                label="Ledger quantity"
                value={formatNumber(
                  ledger?.reconstructedQuantity || 0
                )}
              />

              {ledger?.available ? (
                <Text style={styles.good}>
                  Transaction evidence reconciles to
                  the current broker position.
                </Text>
              ) : (
                <Text style={styles.warning}>
                  GateCEP will not fabricate FIFO
                  history when broker evidence does
                  not reconcile.
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Open FIFO Lots
              </Text>

              {!ledger?.available ? (
                <Text style={styles.body}>
                  Reconciled acquisition-lot history
                  is unavailable.
                </Text>
              ) : openLots.length === 0 ? (
                <Text style={styles.body}>
                  No open acquisition lots remain.
                </Text>
              ) : (
                openLots.map((lot, index) => (
                  <View
                    key={[
                      lot?.brokerAccountKey,
                      lot?.brokerReference,
                      lot?.acquisitionDate,
                      index
                    ].join("|")}
                    style={styles.lot}
                  >
                    <Text style={styles.lotTitle}>
                      {lot?.acquisitionDate ||
                       lot?.date ||
                       "Date unavailable"}
                    </Text>

                    <Metric
                      label="Remaining shares"
                      value={formatNumber(
                        lot?.quantity ??
                        lot?.remainingQuantity ??
                        0
                      )}
                    />

                    <Metric
                      label="FIFO cost"
                      value={
                        Number(
                          lot?.unitCost || 0
                        ) > 0
                          ? `KES ${money(
                              lot.unitCost
                            )}`
                          : "N/A"
                      }
                    />

                    {Number(
                      lot?.originalUnitPrice || 0
                    ) > 0 ? (
                      <Metric
                        label="Original price"
                        value={`KES ${money(
                          lot.originalUnitPrice
                        )}`}
                      />
                    ) : null}

                    {lot?.brokerAccountKey ? (
                      <Metric
                        label="Broker account"
                        value={
                          lot.brokerAccountKey
                        }
                      />
                    ) : null}

                    {lot?.brokerReference ? (
                      <Metric
                        label="Broker reference"
                        value={
                          lot.brokerReference
                        }
                      />
                    ) : null}
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Historical Sales
              </Text>

              {!ledger?.available ? (
                <Text style={styles.body}>
                  Historical sales cannot be shown
                  as reconciled FIFO evidence.
                </Text>
              ) : historicalSales.length === 0 ? (
                <Text style={styles.body}>
                  No historical completed sales were
                  found in the reconciled evidence.
                </Text>
              ) : (
                historicalSales.map(
                  (sale, index) => (
                    <View
                      key={[
                        sale?.brokerAccountKey,
                        sale?.saleBrokerReference,
                        sale?.saleDate,
                        index
                      ].join("|")}
                      style={styles.lot}
                    >
                      <Text style={styles.lotTitle}>
                        {sale?.saleDate ||
                         "Date unavailable"}
                      </Text>

                      <Metric
                        label="Shares sold"
                        value={formatNumber(
                          sale?.saleQuantity || 0
                        )}
                      />

                      {sale?.brokerAccountKey ? (
                        <Metric
                          label="Broker account"
                          value={
                            sale.brokerAccountKey
                          }
                        />
                      ) : null}

                      {sale?.saleBrokerReference ? (
                        <Metric
                          label="Broker reference"
                          value={
                            sale.saleBrokerReference
                          }
                        />
                      ) : null}
                    </View>
                  )
                )
              )}
            </View>

            <Text style={styles.disclaimer}>
              FIFO history is analytical evidence
              only. Viewing this page does not create,
              consume or modify broker lots.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },

  content: {
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    padding: 22,
    paddingTop: 28,
    paddingBottom: 72
  },

  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center"
  },

  loading: {
    color: "#cbd5e1",
    marginTop: 12
  },

  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 22
  },

  backText: {
    color: "#67e8f9",
    fontWeight: "900"
  },

  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900"
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 6,
    marginBottom: 22,
    lineHeight: 20
  },

  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16
  },

  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },

  body: {
    color: "#cbd5e1",
    lineHeight: 20
  },

  metric: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 10
  },

  metricLabel: {
    color: "#94a3b8",
    flex: 1
  },

  metricValue: {
    color: "#f8fafc",
    flex: 1,
    textAlign: "right",
    fontWeight: "800"
  },

  evidence: {
    color: "#67e8f9",
    fontWeight: "800",
    marginTop: 14
  },

  good: {
    color: "#86efac",
    marginTop: 14,
    lineHeight: 20
  },

  warning: {
    color: "#fbbf24",
    marginTop: 14,
    lineHeight: 20
  },

  lot: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 10
  },

  lotTitle: {
    color: "#f8fafc",
    fontWeight: "900",
    marginBottom: 4
  },

  disclaimer: {
    color: "#64748b",
    lineHeight: 20,
    marginTop: 4
  }
});

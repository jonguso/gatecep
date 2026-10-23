import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import CompanyLogo from "../../src/components/markets/CompanyLogo";
import useMarketData from "../../src/services/markets/useMarketData";
import {
  aggregateUnifiedHoldingsBySymbol,
  loadUnifiedPortfolioRuntime
} from "../../src/portfolio/unifiedPortfolioApi";
import MarketDepthModal from "../../src/components/markets/MarketDepthModal";
import { useAuth } from "../../src/features/auth/hooks/useAuth";
import { loadPublishedFundamental } from "../../src/features/fundamentals/api/fundamentalReadApi";
import { buildSecurityEducationModel } from "../../src/services/markets/securityEducationService";
import { buildWatchlistScores } from "../../src/watchlist/watchlistScoring";
import { generateWatchlistSignals } from "../../src/utils/watchlistSignals";

export default function SecurityDetail() {
  const { symbol } = useLocalSearchParams();
  const { width: windowWidth } = useWindowDimensions();
  const { accessToken } = useAuth();
  const isCompactViewport = windowWidth < 720;
  const isNarrowViewport = windowWidth < 480;
  const wideWeb = Platform.OS === "web" && windowWidth >= 1100;
  const targetSymbol = String(symbol || "").toUpperCase();

  const { rows, connected, loading, lastUpdated, reload } = useMarketData();

  const [fundamentals, setFundamentals] = useState(null);
  const [realHoldings, setRealHoldings] = useState([]);
  const [marketDepthOpen, setMarketDepthOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPublishedFundamental({
        accessToken,
        symbol: targetSymbol
      })
        .then(setFundamentals)
        .catch(() => setFundamentals(null));

      loadUnifiedPortfolioRuntime({ broker: "ALL" })
        .then((runtime) => {
          setRealHoldings(
            Array.isArray(runtime?.holdings)
              ? runtime.holdings
              : []
          );
        })
        .catch(() => setRealHoldings([]));
    }, [accessToken, targetSymbol])
  );

  const security = useMemo(() => {
    return rows.find(
      (item) => String(item.symbol || "").toUpperCase() === targetSymbol
    );
  }, [rows, targetSymbol]);

  const verifiedPrice = Number(security?.price ?? security?.lastPrice);
  const hasVerifiedPrice =
    security?.hasVerifiedPrice === true &&
    Number.isFinite(verifiedPrice) &&
    verifiedPrice > 0;

  const hasVerifiedChange =
    hasVerifiedPrice &&
    security?.changePct !== null &&
    security?.changePct !== undefined &&
    security?.changePct !== "" &&
    Number.isFinite(Number(security.changePct));

  const scored = useMemo(() => {
    if (!security || !hasVerifiedPrice) return null;

    const generated = generateWatchlistSignals([
      {
        ...security,
        currentPrice: verifiedPrice,
        changePct: hasVerifiedChange
          ? Number(security.changePct)
          : null
      }
    ]);

    return buildWatchlistScores(generated)[0] || null;
  }, [
    security,
    hasVerifiedPrice,
    verifiedPrice,
    hasVerifiedChange
  ]);

  const realHolding = useMemo(() => {
    return (
      aggregateUnifiedHoldingsBySymbol(realHoldings).find(
        (item) =>
          String(item?.symbol || "")
            .trim()
            .toUpperCase() === targetSymbol
      ) || null
    );
  }, [realHoldings, targetSymbol]);

  const realQuantity = Number(realHolding?.quantity || 0);
  const ownsSecurity = realQuantity > 0;

  const realAverageCost = Number(
    realHolding?.averagePrice ??
    realHolding?.averageCost ??
    realHolding?.weightedAveragePrice ??
    0
  );

  const brokerMarketValue =
    realHolding?.marketValue ??
    realHolding?.value;

  const hasBrokerMarketValue =
    brokerMarketValue !== null &&
    brokerMarketValue !== undefined &&
    brokerMarketValue !== "" &&
    Number.isFinite(Number(brokerMarketValue));

  const realMarketValue = hasBrokerMarketValue
    ? Number(brokerMarketValue)
    : hasVerifiedPrice
      ? realQuantity * verifiedPrice
      : null;

  const education = useMemo(() => buildSecurityEducationModel(security || {}, fundamentals), [security, fundamentals]);
  const price = hasVerifiedPrice ? verifiedPrice : null;
  const changePct = hasVerifiedChange ? Number(security.changePct) : null;
  const positive = hasVerifiedChange ? changePct >= 0 : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loading}>Loading security...</Text>
      </View>
    );
  }

  if (!security) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{targetSymbol || "Security"} not found.</Text>

        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Go Back</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={reload}>
          <Text style={styles.secondaryText}>Refresh Market Feed</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          wideWeb && styles.contentWideWeb,
          isCompactViewport && styles.contentCompact,
          isNarrowViewport && styles.contentNarrow
        ]}
      >
      <View
        style={[
          styles.headerRow,
          isCompactViewport && styles.headerRowCompact
        ]}
      >
        <Pressable style={styles.backButton} onPress={() => router.replace("/(tabs)/markets")}>
          <Text style={styles.backText}>‹ Back to Markets</Text>
        </Pressable>


      </View>

      <View style={styles.hero}>
        <CompanyLogo security={{ ...security, logoUrl: education.profile.logoUrl }} size={64} />

        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>{targetSymbol}</Text>
          <Text style={styles.name}>{security.name || targetSymbol}</Text>
          <Text style={styles.sector}>{security.sector || "NSE"}</Text>
        </View>
      </View>

      <Text style={connected ? styles.connected : styles.disconnected}>
        {connected ? "Market connected" : "Market fallback"} • Updated{" "}
        {lastUpdated ? new Date(lastUpdated).toLocaleString() : "N/A"}
      </Text>

      <ActiveUserBanner />

      <View style={styles.priceCard}>
        <Text style={styles.price}>
          {hasVerifiedPrice ? `KES ${money(price)}` : "Price unavailable"}
        </Text>

        <Text
          style={
            hasVerifiedChange
              ? positive
                ? styles.green
                : styles.red
              : styles.muted
          }
        >
          {hasVerifiedChange
            ? `${positive ? "▲" : "▼"} ${changePct.toFixed(2)}%`
            : "—"}
        </Text>

        <Text style={styles.muted}>
          Change:{" "}
          {hasVerifiedPrice &&
          security.change !== null &&
          security.change !== undefined &&
          security.change !== "" &&
          Number.isFinite(Number(security.change))
            ? `KES ${money(security.change)}`
            : "—"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your REAL Position</Text>

        {ownsSecurity ? (
          <>
            <MetricLine
              label="Shares owned"
              value={number(realQuantity)}
            />

            <MetricLine
              label="Average cost"
              value={
                realAverageCost > 0
                  ? `KES ${money(realAverageCost)}`
                  : "N/A"
              }
            />

            <MetricLine
              label="Market value"
              value={
                realMarketValue !== null
                  ? `KES ${money(realMarketValue)}`
                  : "N/A"
              }
            />

            <Text style={styles.positionEvidence}>
              REAL READ-ONLY | Broker-evidenced portfolio
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.body}>
              You do not currently own {targetSymbol} in the verified REAL portfolio.
            </Text>

            <Text style={styles.positionEvidence}>
              REAL READ-ONLY | No sellable position
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach G Rating</Text>

        {hasVerifiedPrice && scored ? (
          <>
            <View style={styles.ratingRow}>
              <View>
                <Text style={styles.ratingAction}>
                  {scored.action || "WATCH"}
                </Text>
                <Text style={styles.body}>
                  Confidence: {scored.confidence || 0}%
                </Text>
              </View>

              <Text style={styles.confidence}>
                {scored.confidence || 0}/100
              </Text>
            </View>

            <Text style={styles.body}>
              {scored.reason || "Coach G is monitoring this security."}
            </Text>
          </>
        ) : (
          <Text style={styles.body}>
            Current verified price evidence is unavailable. Coach G is not
            assigning a price-action rating.
          </Text>
        )}
      </View>

      <Pressable
        style={styles.depthButton}
        onPress={() => setMarketDepthOpen(true)}
      >
        <Text style={styles.depthButtonText}>View Market Depth</Text>
        <Text style={styles.depthButtonHint}>
          Inspect bid / ask evidence before making a decision
        </Text>
      </Pressable>

      {ownsSecurity ? (
        <Pressable
          style={styles.companyDetailsButton}
          onPress={() =>
            router.push({
              pathname: "/security/[symbol]/holding-history",
              params: {
                symbol: targetSymbol
              }
            })
          }
        >
          <View style={styles.companyDetailsCopy}>
            <Text style={styles.companyDetailsTitle}>
              Holding History
            </Text>
            <Text style={styles.companyDetailsHint}>
              Review reconciled FIFO lots, acquisitions and historical sales
            </Text>
          </View>

          <Text style={styles.companyDetailsArrow}>
            ›
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.companyDetailsButton}
        onPress={() =>
          router.push({
            pathname: "/company/[symbol]",
            params: {
              symbol: targetSymbol
            }
          })
        }
      >
        <View style={styles.companyDetailsCopy}>
          <Text style={styles.companyDetailsTitle}>Company Details</Text>
          <Text style={styles.companyDetailsHint}>
            Review valuation, profitability, income and financial position
          </Text>
        </View>

        <Text style={styles.companyDetailsArrow}>›</Text>
      </Pressable>

      <MarketDepthModal
        visible={marketDepthOpen}
        security={security}
        onClose={() => setMarketDepthOpen(false)}
      />
      </ScrollView>

      <View style={styles.decisionDock}>
        <View
          style={[
            styles.decisionDockInner,
            wideWeb && styles.decisionDockInnerWide
          ]}
        >
          <Pressable
            style={styles.buyButton}
            onPress={() =>
              router.push({
                pathname: "/trade",
                params: {
                  symbol: targetSymbol,
                  side: "BUY",
                  mode: "AVERAGE_COST"
                }
              })
            }
          >
            <Text style={styles.decisionButtonText}>BUY</Text>
          </Pressable>

          <Pressable
            disabled={!ownsSecurity}
            style={[
              styles.sellButton,
              !ownsSecurity && styles.sellButtonDisabled
            ]}
            onPress={() => {
              if (!ownsSecurity) return;

              router.push({
                pathname: "/trade",
                params: {
                  symbol: targetSymbol,
                  side: "SELL",
                  mode: "AVERAGE_COST"
                }
              });
            }}
          >
            <Text
              style={[
                styles.decisionButtonText,
                !ownsSecurity && styles.sellButtonDisabledText
              ]}
            >
              SELL
            </Text>
          </Pressable>
        </View>

        {!ownsSecurity ? (
          <Text style={styles.sellGuardDock}>
            SELL unavailable - no verified REAL position is owned.
          </Text>
        ) : null}
      </View>
    </View>
  );
}


function MetricLine({ label, value }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

function hasMarketMetric(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}





const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  scroll: {
    flex: 1
  },
  content: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 22,
    paddingTop: 76,
    paddingBottom: 36
  },
  contentWideWeb: {
    maxWidth: 1240,
    paddingHorizontal: 28,
    paddingTop: 24
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 128
  },
  contentNarrow: {
    paddingHorizontal: 12
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  loading: {
    color: "#cbd5e1",
    marginTop: 12
  },
  notFound: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerRowCompact: {
    paddingLeft: 68
  },
  backButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  backText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  hero: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18
  },
  symbol: {
    color: "white",
    fontSize: 36,
    fontWeight: "900"
  },
  name: {
    color: "#cbd5e1",
    marginTop: 4,
    fontSize: 15
  },
  sector: {
    color: "#94a3b8",
    marginTop: 3
  },
  connected: {
    color: "#86efac",
    marginTop: 12,
    fontSize: 12,
    fontWeight: "900"
  },
  disconnected: {
    color: "#fca5a5",
    marginTop: 12,
    fontSize: 12,
    fontWeight: "900"
  },
  priceCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20
  },
  price: {
    color: "white",
    fontSize: 34,
    fontWeight: "900"
  },
  green: {
    color: "#86efac",
    fontWeight: "900",
    marginTop: 8,
    fontSize: 17
  },
  red: {
    color: "#fca5a5",
    fontWeight: "900",
    marginTop: 8,
    fontSize: 17
  },
  muted: {
    color: "#94a3b8",
    marginTop: 6
  },
  card: {
    marginTop: 18,
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
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  ratingAction: {
    color: "#fbbf24",
    fontSize: 24,
    fontWeight: "900"
  },
  confidence: {
    color: "white",
    fontWeight: "900",
    fontSize: 22
  },
  body: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginTop: 8
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12
  },
  lineLabel: {
    color: "#94a3b8",
    flex: 1
  },
  lineValue: {
    color: "white",
    fontWeight: "900",
    textAlign: "right"
  },
  educationMetric: { borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingVertical: 12 },
  educationMetricTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  metricHelp: { color: "#94a3b8", fontSize: 12, lineHeight: 18, marginTop: 7 },
  lesson: { color: "#cbd5e1", lineHeight: 20, marginTop: 8 },
  evidenceCard: { marginTop: 18, backgroundColor: "#082f49", borderWidth: 1, borderColor: "#0891b2", borderRadius: 22, padding: 18 },
  missingCard: { marginTop: 18, backgroundColor: "#1c1917", borderWidth: 1, borderColor: "#92400e", borderRadius: 22, padding: 18 },
  watchButton: {
    marginTop: 10,
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 14
  },
  watchButtonText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  watchSelected: {
    marginTop: 10,
    backgroundColor: "rgba(34,197,94,.14)",
    borderColor: "rgba(34,197,94,.35)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 14
  },
  watchSelectedText: {
    color: "#86efac",
    textAlign: "center",
    fontWeight: "900"
  },
  companyDetailsButton: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16
  },
  companyDetailsCopy: {
    flex: 1
  },
  companyDetailsTitle: {
    color: "#67e8f9",
    fontSize: 16,
    fontWeight: "900"
  },
  companyDetailsHint: {
    color: "#94a3b8",
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18
  },
  companyDetailsArrow: {
    color: "#67e8f9",
    fontSize: 28,
    fontWeight: "700"
  },

  depthButton: {
    marginTop: 18,
    backgroundColor: "#082f49",
    borderColor: "#0891b2",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  depthButtonText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 16
  },
  depthButtonHint: {
    color: "#94a3b8",
    marginTop: 5,
    fontSize: 12
  },
  positionEvidence: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12
  },
  decisionDock: {
    backgroundColor: "rgba(2,6,23,0.97)",
    borderTopColor: "#1e293b",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12
  },
  decisionDockInner: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    flexDirection: "row",
    gap: 12
  },
  decisionDockInnerWide: {
    maxWidth: 760
  },
  buyButton: {
    flex: 1,
    backgroundColor: "#15803d",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center"
  },
  sellButton: {
    flex: 1,
    backgroundColor: "#b91c1c",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center"
  },
  sellButtonDisabled: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1
  },
  sellButtonDisabledText: {
    color: "#64748b"
  },
  decisionButtonText: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },
  sellGuardDock: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 6,
    textAlign: "center"
  },
  actions: {
    marginTop: 22
  },
  primary: {
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
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

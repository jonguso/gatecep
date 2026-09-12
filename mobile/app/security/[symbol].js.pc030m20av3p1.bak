import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import CompanyLogo from "../../src/components/markets/CompanyLogo";
import useMarketData from "../../src/services/markets/useMarketData";
import { loadFundamentalRecord } from "../../src/features/fundamentals/fundamentalRepository";
import { buildSecurityEducationModel, explainMetric } from "../../src/services/markets/securityEducationService";
import { buildWatchlistScores } from "../../src/watchlist/watchlistScoring";
import { generateWatchlistSignals } from "../../src/utils/watchlistSignals";
import {
  loadWatchlists,
  saveWatchlists,
  WATCHLIST_NAMES
} from "../../src/watchlist/watchlistStore";

export default function SecurityDetail() {
  const { symbol } = useLocalSearchParams();
  const targetSymbol = String(symbol || "").toUpperCase();

  const { rows, connected, loading, lastUpdated, reload } = useMarketData();

  const [watchlists, setWatchlists] = useState({});
  const [fundamentals, setFundamentals] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadUserWatchlists();
      loadFundamentalRecord(targetSymbol).then(setFundamentals).catch(() => setFundamentals(null));
    }, [targetSymbol])
  );

  async function loadUserWatchlists() {
    const saved = await loadWatchlists();
    setWatchlists(saved);
  }

  const security = useMemo(() => {
    return rows.find(
      (item) => String(item.symbol || "").toUpperCase() === targetSymbol
    );
  }, [rows, targetSymbol]);

  const scored = useMemo(() => {
    if (!security) return null;

    const generated = generateWatchlistSignals([
      {
        ...security,
        currentPrice: Number(security.price || security.lastPrice || 0),
        changePct: Number(security.changePct || 0)
      }
    ]);

    return buildWatchlistScores(generated)[0] || null;
  }, [security]);

  const education = useMemo(() => buildSecurityEducationModel(security || {}, fundamentals), [security, fundamentals]);
  const dividendYield = education.fields.dividendYield;
  const price = Number(security?.price || security?.lastPrice || 0);
  const changePct = Number(security?.changePct || 0);
  const positive = changePct >= 0;

  async function addToWatchlist(listName) {
    const current = watchlists[listName] || [];

    if (current.includes(targetSymbol)) {
      router.push("/watchlist");
      return;
    }

    const next = {
      ...watchlists,
      [listName]: [...current, targetSymbol]
    };

    setWatchlists(next);
    await saveWatchlists(next);
  }

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.replace("/(tabs)/markets")}>
          <Text style={styles.backText}>‹ Back to Markets</Text>
        </Pressable>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
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
        <Text style={styles.price}>KES {money(price)}</Text>

        <Text style={positive ? styles.green : styles.red}>
          {positive ? "▲" : "▼"} {changePct.toFixed(2)}%
        </Text>

        <Text style={styles.muted}>
          Change: KES {money(security.change || 0)}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.compactAction} onPress={() => addToWatchlist(WATCHLIST_NAMES[0])}><Text style={styles.compactActionText}>+ Watchlist</Text></Pressable>
      </View>

      <View style={styles.grid}>
        <Metric label="Bid" value={`KES ${money(security.bid || 0)}`} />
        <Metric label="Ask" value={`KES ${money(security.ask || 0)}`} />
        <Metric label="Volume" value={number(security.volume || 0)} />
        <Metric label="Turnover" value={`KES ${money(security.turnover || 0)}`} />
        <Metric label="High" value={`KES ${money(security.high || 0)}`} />
        <Metric label="Low" value={`KES ${money(security.low || 0)}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach G Rating</Text>

        <View style={styles.ratingRow}>
          <View>
            <Text style={styles.ratingAction}>
              {scored?.action || "WATCH"}
            </Text>
            <Text style={styles.body}>
              Confidence: {scored?.confidence || 0}%
            </Text>
          </View>

          <Text style={styles.confidence}>{scored?.confidence || 0}/100</Text>
        </View>

        <Text style={styles.body}>
          {scored?.reason || "Coach G is monitoring this security."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Understand the company</Text>
        <Text style={styles.body}>{education.profile.description || "A verified company description has not been imported yet."}</Text>
        <MetricLine label="Sector" value={education.profile.sector || "N/A"} />
        <MetricLine label="Industry" value={education.profile.industry || "N/A"} />
        <MetricLine label="Fiscal period" value={education.fiscalPeriod || "N/A"} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Valuation — what the market is paying</Text>
        <EducationMetric label="Market capitalisation" value={largeMoney(education.fields.marketCap)} />
        <EducationMetric label="P/E ratio" value={ratio(education.fields.pe)} help={explainMetric("pe")} />
        <EducationMetric label="Price / book" value={ratio(education.fields.pb)} help={explainMetric("pb")} />
        <EducationMetric label="Earnings per share" value={kes(education.fields.eps)} help={explainMetric("eps")} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Income & shareholder return</Text>
        <EducationMetric label="Dividend per share" value={kes(education.fields.dps)} />
        <EducationMetric label="Dividend yield" value={percent(education.fields.dividendYield)} help={explainMetric("dividendYield")} />
        <Text style={styles.lesson}>Dividends are not guaranteed. Confirm declaration, book-closure, ex-dividend and payment dates before relying on expected income.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Financial strength</Text>
        <EducationMetric label="Revenue" value={largeMoney(education.fields.revenue)} />
        <EducationMetric label="Net income" value={largeMoney(education.fields.netIncome)} />
        <EducationMetric label="Total assets" value={largeMoney(education.fields.assets)} />
        <EducationMetric label="Shareholders’ equity" value={largeMoney(education.fields.equity)} />
        <EducationMetric label="Debt / borrowings" value={largeMoney(education.fields.debt)} help={explainMetric("debt")} />
      </View>

      <View style={education.evidence.available ? styles.evidenceCard : styles.missingCard}>
        <Text style={styles.cardTitle}>{education.evidence.available ? "Fundamental evidence" : "Fundamentals not yet available"}</Text>
        {education.evidence.available ? <>
          <MetricLine label="Verified metrics" value={String(education.evidence.count)} />
          <MetricLine label="Provider" value={education.evidence.provider || "Imported verified filing"} />
          <MetricLine label="Reference" value={education.evidence.reference || "Stored source record"} />
          <MetricLine label="Verified at" value={education.evidence.verifiedAt || "N/A"} />
        </> : <>
          <Text style={styles.body}>GateCEP will not estimate P/E, dividends, revenue or debt from the share price. Import an approved issuer filing to unlock evidence-based analysis.</Text>
          <Pressable style={styles.watchButton} onPress={() => router.push("/fundamental-data-hub")}><Text style={styles.watchButtonText}>Open Fundamental Data Hub</Text></Pressable>
        </>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Investor learning checklist</Text>
        <Text style={styles.lesson}>1. Understand how the company earns money.</Text>
        <Text style={styles.lesson}>2. Compare several years of earnings and cash flow.</Text>
        <Text style={styles.lesson}>3. Compare valuation with similar NSE companies.</Text>
        <Text style={styles.lesson}>4. Check debt, dilution, governance and sector risks.</Text>
        <Text style={styles.lesson}>5. Decide whether the security fits your goal, horizon and portfolio concentration.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Investment Profile</Text>

        <MetricLine label="Dividend Yield" value={percent(dividendYield)} />
        <MetricLine
          label="Income Suitability"
          value={dividendYield === null ? "Not enough evidence" : dividendYield >= 5 ? "Review for income" : dividendYield > 0 ? "Moderate reported yield" : "No reported yield"}
        />
        <MetricLine
          label="Growth Signal"
          value={Number(scored?.confidence || 0) >= 75 ? "High" : "Watch"}
        />
        <MetricLine
          label="Risk View"
          value={Math.abs(changePct) >= 3 ? "Elevated volatility" : "Normal"}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach G Opinion</Text>

        <Text style={styles.body}>
          {buildOpinion({
            symbol: targetSymbol,
            name: security.name,
            sector: security.sector,
            dividendYield,
            action: scored?.action,
            confidence: scored?.confidence,
            changePct
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add To Strategy Watchlist</Text>

        {WATCHLIST_NAMES.map((name) => {
          const selected = (watchlists[name] || []).includes(targetSymbol);

          return (
            <Pressable
              key={name}
              style={selected ? styles.watchSelected : styles.watchButton}
              onPress={() => addToWatchlist(name)}
            >
              <Text style={selected ? styles.watchSelectedText : styles.watchButtonText}>
                {selected ? `✓ ${name}` : `+ ${name}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.secondary}
          onPress={() => router.push("/watchlist")}
        >
          <Text style={styles.secondaryText}>Open Watchlist</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function buildOpinion({
  symbol,
  name,
  sector,
  dividendYield,
  action,
  confidence,
  changePct
}) {
  const parts = [];

  parts.push(
    `${name || symbol} is classified under ${sector || "the NSE market"}.`
  );

  if (dividendYield >= 5) {
    parts.push(
      "It appears suitable for Dividend Income investors because of its stronger estimated yield."
    );
  } else if (dividendYield > 0) {
    parts.push(
      "It may fit Balanced Growth investors where income is useful but not the only objective."
    );
  } else {
    parts.push(
      "It is more suitable for growth or tactical monitoring than income generation."
    );
  }

  if (action) {
    parts.push(
      `Coach G currently marks it as ${action} with ${confidence || 0}% confidence.`
    );
  }

  if (Math.abs(Number(changePct || 0)) >= 3) {
    parts.push(
      "Recent movement is elevated, so avoid chasing price action without confirming your risk level."
    );
  }

  return parts.join(" ");
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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

function EducationMetric({ label, value, help }) {
  return <View style={styles.educationMetric}>
    <View style={styles.educationMetricTop}><Text style={styles.lineLabel}>{label}</Text><Text style={styles.lineValue}>{value}</Text></View>
    {help ? <Text style={styles.metricHelp}>{help}</Text> : null}
  </View>;
}

function nullable(value) { if (value === null || value === undefined || value === "") return null; return Number.isFinite(Number(value)) ? Number(value) : null; }
function ratio(value) { const n = nullable(value); return n === null ? "N/A" : `${n.toFixed(2)}×`; }
function percent(value) { const n = nullable(value); return n === null ? "N/A" : `${n.toFixed(2)}%`; }
function kes(value) { const n = nullable(value); return n === null ? "N/A" : `KES ${money(n)}`; }
function largeMoney(value) { const n = nullable(value); if (n === null) return "N/A"; const abs = Math.abs(n); if (abs >= 1e9) return `KES ${(n / 1e9).toFixed(2)}B`; if (abs >= 1e6) return `KES ${(n / 1e6).toFixed(2)}M`; return `KES ${money(n)}`; }

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function number(value) {
  return Number(value || 0).toLocaleString();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 120
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
  actionsRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  compactAction: { flex: 1, backgroundColor: "#0e7490", borderRadius: 14, padding: 13, alignItems: "center" },
  compactActionText: { color: "white", fontWeight: "900" },
  grid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "47%",
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 7
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

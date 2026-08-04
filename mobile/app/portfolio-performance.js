import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import {
  buildCoachGPerformanceAdvice
} from "../src/features/performance/performanceAdvisorService";

const INSIGHT_FILTERS = ["ALL", "HIGH", "MEDIUM", "INFO", "LOW"];
const CONTRIBUTOR_FILTERS = ["HOLDINGS", "SECTORS"];
const ROLLING_WINDOWS = ["5", "20", "60"];

export default function PortfolioPerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [error, setError] = useState("");
  const [insightFilter, setInsightFilter] = useState("ALL");
  const [contributorFilter, setContributorFilter] = useState("HOLDINGS");
  const [rollingWindow, setRollingWindow] = useState("20");

  const loadData = useCallback(async ({ fullLoader = true } = {}) => {
    try {
      fullLoader ? setLoading(true) : setRefreshing(true);
      setError("");
      const result = await buildCoachGPerformanceAdvice();
      setAdvice(result || null);
    } catch (loadError) {
      console.error("Unable to load portfolio performance:", loadError);
      setError(
        loadError?.message || "Unable to load portfolio performance analytics."
      );
      setAdvice(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const performance = advice?.sources?.performance || null;
  const benchmark = advice?.sources?.benchmark || null;
  const attribution = advice?.sources?.attribution || null;
  const charts = advice?.sources?.charts || null;

  const visibleInsights = useMemo(() => {
    const items = Array.isArray(advice?.insights) ? advice.insights : [];
    if (insightFilter === "ALL") return items;
    return items.filter(
      (item) => String(item?.severity || "").toUpperCase() === insightFilter
    );
  }, [advice, insightFilter]);

  const contributorItems = useMemo(() => {
    if (contributorFilter === "SECTORS") {
      return Array.isArray(attribution?.sectorAttribution)
        ? attribution.sectorAttribution
        : [];
    }

    return Array.isArray(attribution?.holdingAttribution?.holdings)
      ? attribution.holdingAttribution.holdings
      : [];
  }, [attribution, contributorFilter]);

  const rollingReturnSeries = charts?.rollingReturns?.series?.[rollingWindow] || null;
  const rollingVolatilitySeries =
    charts?.rollingVolatility?.series?.[rollingWindow] || null;

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>Analyzing portfolio performance...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PC-021</Text>
      <Text style={styles.title}>Portfolio Performance</Text>
      <Text style={styles.subtitle}>
        Review return history, benchmark comparison, attribution, trend data,
        drawdown, and Coach G performance guidance.
      </Text>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{advice?.health?.overallScore || 0}</Text>
          <Text style={styles.scoreMaximum}>/100</Text>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>Coach G Performance Score</Text>
          <Text style={styles.heroGrade}>
            {advice?.health?.grade?.label || "Not Available"}
          </Text>
          <Text style={styles.heroLevel}>
            {formatLabel(advice?.health?.grade?.performanceLevel || "UNKNOWN")}
          </Text>
          <Text style={styles.heroDescription}>
            {advice?.health?.grade?.description ||
              "Performance guidance is currently unavailable."}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <Metric
          label="Ending Value"
          value={nullableMoney(advice?.portfolio?.endingValue)}
        />
        <Metric
          label="Total Gain / Loss"
          value={nullableMoney(advice?.portfolio?.totalGainLoss)}
          danger={Number(advice?.portfolio?.totalGainLoss || 0) < 0}
          positive={Number(advice?.portfolio?.totalGainLoss || 0) > 0}
        />
        <Metric
          label="Time-Weighted Return"
          value={nullablePercent(advice?.performance?.timeWeightedReturnPercentage)}
        />
        <Metric
          label="Money-Weighted Return"
          value={nullablePercent(advice?.performance?.moneyWeightedReturnPercentage)}
        />
        <Metric
          label="Benchmark Status"
          value={formatLabel(advice?.benchmark?.status || "NOT_AVAILABLE")}
        />
        <Metric
          label="Current Drawdown"
          value={nullablePercent(advice?.trends?.currentDrawdownPercentage)}
          danger={
            Math.abs(Number(advice?.trends?.currentDrawdownPercentage || 0)) >= 10
          }
        />
      </View>

      <Section
        title="Coach G Performance Assessment"
        description="A consolidated evaluation of returns, consistency, benchmark results, attribution, and trend behavior."
      >
        <View style={styles.grid}>
          <ScoreMetric label="Return" value={advice?.health?.components?.return} />
          <ScoreMetric
            label="Consistency"
            value={advice?.health?.components?.consistency}
          />
          <ScoreMetric
            label="Benchmark"
            value={advice?.health?.components?.benchmark}
            unavailableLabel="No benchmark history"
          />
          <ScoreMetric
            label="Attribution"
            value={advice?.health?.components?.attribution}
          />
          <ScoreMetric label="Trend" value={advice?.health?.components?.trend} />
        </View>

        <View style={styles.darkCard}>
          <Row
            label="Advisor Status"
            value={formatLabel(advice?.status || "NOT_READY")}
            danger={advice?.status === "ACTION_REQUIRED"}
          />
          <Row
            label="Performance Status"
            value={formatLabel(advice?.performance?.status || "NOT_READY")}
          />
          <Row
            label="Return Observations"
            value={advice?.performance?.returnObservations || 0}
          />
          <Row
            label="Benchmark Matches"
            value={advice?.benchmark?.matchedObservations || 0}
          />
          <Row
            label="Chart Status"
            value={formatLabel(advice?.trends?.status || "NOT_READY")}
          />
        </View>

        <View
          style={[
            styles.priorityCard,
            advice?.priorityIssue?.severity === "HIGH" && styles.priorityHigh
          ]}
        >
          <Text style={styles.priorityLabel}>Highest-Priority Performance Issue</Text>
          <Text style={styles.priorityTitle}>
            {advice?.priorityIssue?.title || "No material performance issue"}
          </Text>
          <Text style={styles.cardText}>
            {advice?.priorityIssue?.message ||
              "The available performance checks did not identify a material issue."}
          </Text>
          <Text style={styles.prioritySeverity}>
            Severity: {formatLabel(advice?.priorityIssue?.severity || "NONE")}
          </Text>
        </View>

        <View style={styles.coachCard}>
          <Text style={styles.coachLabel}>Coach G Summary</Text>
          <Text style={styles.coachText}>
            {advice?.summary || "No performance summary is currently available."}
          </Text>
        </View>
      </Section>

      <Section
        title="Return Overview"
        description="Performance is calculated from genuine portfolio valuation and external cash-flow history."
      >
        <View style={styles.darkCard}>
          <Row
            label="Beginning Value"
            value={nullableMoney(advice?.portfolio?.beginningValue)}
          />
          <Row
            label="Ending Value"
            value={nullableMoney(advice?.portfolio?.endingValue)}
          />
          <Row
            label="Total Inflows"
            value={`KES ${money(advice?.portfolio?.totalInflows)}`}
          />
          <Row
            label="Total Outflows"
            value={`KES ${money(advice?.portfolio?.totalOutflows)}`}
          />
          <Row
            label="Net Cash Flow"
            value={`KES ${money(advice?.portfolio?.netCashFlow)}`}
          />
          <Row
            label="Winning Periods"
            value={nullablePercent(advice?.performance?.winningPercentage)}
          />
        </View>

        <View style={styles.grid}>
          <Metric
            label="1 Month"
            value={nullablePercent(advice?.performance?.oneMonthReturnPercentage)}
          />
          <Metric
            label="Year to Date"
            value={nullablePercent(advice?.performance?.yearToDateReturnPercentage)}
          />
          <Metric
            label="1 Year"
            value={nullablePercent(advice?.performance?.oneYearReturnPercentage)}
          />
          <Metric
            label="Since Inception"
            value={nullablePercent(
              advice?.performance?.sinceInceptionReturnPercentage
            )}
          />
          <Metric
            label="Annualized TWR"
            value={nullablePercent(
              advice?.performance?.annualizedTimeWeightedReturnPercentage
            )}
          />
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Performance Data Integrity</Text>
          <Text style={styles.noticeText}>
            GateCEP does not fabricate valuation history. Return measures remain
            unavailable or preliminary until enough genuine observations exist.
          </Text>
        </View>
      </Section>

      <Section
        title="Benchmark Comparison"
        description="Relative analytics remain unavailable until genuine NSE benchmark history is configured."
      >
        <View style={styles.darkCard}>
          <Row
            label="Benchmark"
            value={advice?.benchmark?.label || "Not configured"}
          />
          <Row
            label="Status"
            value={formatLabel(
              advice?.benchmark?.status || "BENCHMARK_NOT_AVAILABLE"
            )}
          />
          <Row
            label="Portfolio Return"
            value={nullablePercent(advice?.benchmark?.portfolioReturnPercentage)}
          />
          <Row
            label="Benchmark Return"
            value={nullablePercent(advice?.benchmark?.benchmarkReturnPercentage)}
          />
          <Row
            label="Active Return"
            value={nullablePercent(advice?.benchmark?.activeReturnPercentage)}
          />
          <Row
            label="Annualized Alpha"
            value={nullablePercent(advice?.benchmark?.alphaPercentage)}
          />
          <Row label="Beta" value={nullableMetric(advice?.benchmark?.beta)} />
          <Row
            label="Tracking Error"
            value={nullablePercent(advice?.benchmark?.trackingErrorPercentage)}
          />
          <Row
            label="Information Ratio"
            value={nullableMetric(advice?.benchmark?.informationRatio)}
          />
        </View>
      </Section>

      <Section
        title="Performance Attribution"
        description="Shows which holdings and sectors contributed most to portfolio gains and losses."
      >
        <FilterRow
          values={CONTRIBUTOR_FILTERS}
          selected={contributorFilter}
          onSelect={setContributorFilter}
        />

        {contributorItems.length ? (
          contributorItems.slice(0, 12).map((item, index) => (
            <ContributorCard
              key={item?.symbol || item?.sector || `CONTRIBUTOR-${index}`}
              item={item}
              type={contributorFilter}
            />
          ))
        ) : (
          <EmptyState
            title="No Attribution Data"
            message="No contributor information is available."
          />
        )}

        <View style={styles.darkCard}>
          <Row
            label="Positive Holdings"
            value={advice?.attribution?.positiveHoldings || 0}
          />
          <Row
            label="Negative Holdings"
            value={advice?.attribution?.negativeHoldings || 0}
          />
          <Row
            label="Allocation Effect"
            value={nullablePercent(
              advice?.attribution?.allocationEffectPercentage
            )}
          />
          <Row
            label="Selection Effect"
            value={nullablePercent(
              advice?.attribution?.selectionEffectPercentage
            )}
          />
          <Row
            label="Interaction Effect"
            value={nullablePercent(
              advice?.attribution?.interactionEffectPercentage
            )}
          />
        </View>
      </Section>

      <Section
        title="Trend and Chart Data"
        description="Chart-ready performance series generated from genuine return history."
      >
        <View style={styles.darkCard}>
          <Row
            label="Valuation Observations"
            value={advice?.trends?.valuationObservations || 0}
          />
          <Row
            label="Growth Observations"
            value={advice?.trends?.growthObservations || 0}
          />
          <Row
            label="Portfolio Growth Index"
            value={nullableMetric(advice?.trends?.portfolioGrowthEndingValue, 2)}
          />
          <Row
            label="Benchmark Growth Index"
            value={nullableMetric(advice?.trends?.benchmarkGrowthEndingValue, 2)}
          />
          <Row
            label="Maximum Drawdown"
            value={nullablePercent(advice?.trends?.maximumDrawdownPercentage)}
          />
          <Row
            label="Current Drawdown"
            value={nullablePercent(advice?.trends?.currentDrawdownPercentage)}
          />
        </View>

        <Text style={styles.subheading}>Rolling Window</Text>
        <FilterRow
          values={ROLLING_WINDOWS}
          selected={rollingWindow}
          onSelect={setRollingWindow}
          labelFormatter={(value) => `${value} Periods`}
        />

        <TrendCard
          title={`${rollingWindow}-Period Rolling Return`}
          series={rollingReturnSeries}
          suffix="%"
        />
        <TrendCard
          title={`${rollingWindow}-Period Rolling Volatility`}
          series={rollingVolatilitySeries}
          suffix="%"
        />
      </Section>

      <Section
        title="Coach G Insights"
        description="Structured observations generated from return, benchmark, attribution, and trend results."
      >
        <FilterRow
          values={INSIGHT_FILTERS}
          selected={insightFilter}
          onSelect={setInsightFilter}
        />

        {visibleInsights.length ? (
          visibleInsights.map((insight, index) => (
            <InsightCard
              key={insight?.code || `INSIGHT-${index}`}
              insight={insight}
            />
          ))
        ) : (
          <SuccessCard
            title="No Matching Insights"
            message="No Coach G performance insights match this filter."
          />
        )}

        <Text style={styles.subheading}>Recommended Review Actions</Text>
        {Array.isArray(advice?.recommendedActions) &&
        advice.recommendedActions.length ? (
          advice.recommendedActions.map((action, index) => (
            <ActionCard
              key={action?.code || `ACTION-${index}`}
              action={action}
            />
          ))
        ) : (
          <SuccessCard
            title="No Immediate Actions"
            message="No additional performance review action is currently required."
          />
        )}
      </Section>

      <View style={styles.protectionCard}>
        <Text style={styles.protectionTitle}>Analytics Only</Text>
        <Text style={styles.protectionText}>
          PC-021 does not place trades, change holdings, modify cash, or submit
          broker instructions. Performance results are analytical estimates based
          on available valuation, cash-flow, benchmark, and attribution data.
        </Text>
      </View>

      <Pressable
        disabled={refreshing}
        style={[styles.primaryButton, refreshing && styles.disabled]}
        onPress={() => loadData({ fullLoader: false })}
      >
        {refreshing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>Refresh Performance Analytics</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, description, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
}

function Metric({ label, value, danger = false, positive = false }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          danger && styles.danger,
          positive && styles.positive
        ]}
      >
        {String(value)}
      </Text>
    </View>
  );
}

function Row({ label, value, danger = false, highlight = false }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          danger && styles.danger,
          highlight && styles.positive
        ]}
      >
        {String(value ?? "N/A")}
      </Text>
    </View>
  );
}

function ScoreMetric({ label, value, unavailableLabel = "Not available" }) {
  const available = value !== null && value !== undefined;
  const score = available
    ? Math.min(Math.max(Number(value || 0), 0), 100)
    : 0;

  return (
    <View style={styles.scoreMetric}>
      <Text
        style={available ? styles.scoreMetricValue : styles.scoreMetricUnavailable}
      >
        {available ? score : "N/A"}
      </Text>
      {available ? <Text style={styles.scoreMetricMaximum}>/100</Text> : null}
      <Text style={styles.scoreMetricLabel}>{label}</Text>
      {available ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${score}%` }]} />
        </View>
      ) : (
        <Text style={styles.smallMuted}>{unavailableLabel}</Text>
      )}
    </View>
  );
}

function ContributorCard({ item, type }) {
  const title = type === "SECTORS" ? item?.sector : item?.symbol;
  const subtitle =
    type === "SECTORS"
      ? `${item?.holdingsCount || 0} holding(s)`
      : item?.name;

  return (
    <View
      style={[
        styles.contributorCard,
        Number(item?.gainLoss || 0) < 0 && styles.negativeBorder
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title || "Unknown"}</Text>
          <Text style={styles.cardSubtitle}>{subtitle || "No description"}</Text>
        </View>
        <Text
          style={[
            styles.contributorGain,
            Number(item?.gainLoss || 0) < 0 ? styles.danger : styles.positive
          ]}
        >
          KES {money(item?.gainLoss)}
        </Text>
      </View>

      <Row label="Return" value={nullablePercent(item?.returnPercentage)} />
      <Row
        label="Contribution"
        value={nullablePercent(item?.contributionPercentage)}
      />
      <Row
        label="Current Weight"
        value={nullablePercent(item?.currentWeightPercentage)}
      />
    </View>
  );
}

function TrendCard({ title, series, suffix = "" }) {
  return (
    <View style={styles.trendCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Row label="Status" value={formatLabel(series?.status || "NOT_AVAILABLE")} />
      <Row label="Observations" value={series?.observations || 0} />
      <Row label="Latest" value={formatSeriesValue(series?.endingValue, suffix)} />
      <Row label="Minimum" value={formatSeriesValue(series?.minimumValue, suffix)} />
      <Row label="Maximum" value={formatSeriesValue(series?.maximumValue, suffix)} />
    </View>
  );
}

function InsightCard({ insight }) {
  const severity = String(insight?.severity || "INFO").toUpperCase();

  return (
    <View
      style={[
        styles.messageCard,
        severity === "HIGH" && styles.highBorder,
        severity === "MEDIUM" && styles.mediumBorder,
        severity === "INFO" && styles.infoBorder
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.messageTitle}>
          {insight?.title || "Performance Insight"}
        </Text>
        <Text
          style={[
            styles.badge,
            severity === "HIGH" && styles.danger,
            severity === "MEDIUM" && styles.warning,
            severity === "INFO" && styles.info,
            severity === "LOW" && styles.positive
          ]}
        >
          {formatLabel(severity)}
        </Text>
      </View>
      <Text style={styles.cardText}>
        {insight?.message || "No additional information is available."}
      </Text>
    </View>
  );
}

function ActionCard({ action }) {
  const priority = String(action?.priority || "LOW").toUpperCase();

  return (
    <View
      style={[
        styles.messageCard,
        priority === "HIGH" && styles.highBorder,
        priority === "MEDIUM" && styles.mediumBorder
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.messageTitle}>
          {action?.title || "Performance Review Action"}
        </Text>
        <Text
          style={[
            styles.badge,
            priority === "HIGH" ? styles.danger : styles.warning
          ]}
        >
          {formatLabel(priority)}
        </Text>
      </View>
      <Text style={styles.cardText}>
        {action?.message || "No action details are available."}
      </Text>
      <View style={styles.advisoryBadge}>
        <Text style={styles.info}>Advisory Only</Text>
      </View>
    </View>
  );
}

function FilterRow({
  values,
  selected,
  onSelect,
  labelFormatter = formatLabel
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {values.map((value) => (
        <Pressable
          key={value}
          style={[
            styles.filterButton,
            selected === value && styles.filterActive
          ]}
          onPress={() => onSelect(value)}
        >
          <Text
            style={[
              styles.filterText,
              selected === value && styles.filterTextActive
            ]}
          >
            {labelFormatter(value)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function EmptyState({ title, message }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{message}</Text>
    </View>
  );
}

function SuccessCard({ title, message }) {
  return (
    <View style={styles.successCard}>
      <Text style={styles.successTitle}>{title}</Text>
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

function nullablePercent(value) {
  if (value === null || value === undefined) return "Not available";
  return `${Number(value).toFixed(2)}%`;
}

function nullableMoney(value) {
  if (value === null || value === undefined) return "Not available";
  return `KES ${money(value)}`;
}

function nullableMetric(value, decimals = 4) {
  if (value === null || value === undefined) return "Not available";
  return Number(value).toFixed(decimals);
}

function formatSeriesValue(value, suffix) {
  if (value === null || value === undefined) return "Not available";
  return `${Number(value).toFixed(2)}${suffix}`;
}

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 110 },
  centerScreen: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  loadingText: { color: "#94a3b8", marginTop: 14 },
  eyebrow: { color: "#22d3ee", fontWeight: "900" },
  title: { color: "white", fontSize: 31, fontWeight: "900", marginTop: 8 },
  subtitle: {
    color: "#94a3b8",
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 20
  },
  hero: {
    backgroundColor: "rgba(34,211,238,.08)",
    borderColor: "rgba(34,211,238,.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 17
  },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 6,
    borderColor: "#22d3ee",
    alignItems: "center",
    justifyContent: "center"
  },
  scoreValue: { color: "#86efac", fontSize: 29, fontWeight: "900" },
  scoreMaximum: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  heroContent: { flex: 1 },
  heroLabel: { color: "#67e8f9", fontWeight: "900" },
  heroGrade: { color: "white", fontSize: 23, fontWeight: "900", marginTop: 5 },
  heroLevel: { color: "#c084fc", fontWeight: "900", marginTop: 4 },
  heroDescription: { color: "#cbd5e1", lineHeight: 20, marginTop: 7 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  metricCard: {
    width: "47%",
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },
  metricLabel: { color: "#94a3b8", fontSize: 11 },
  metricValue: { color: "white", fontWeight: "900", marginTop: 6 },
  section: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginTop: 20
  },
  sectionTitle: { color: "#67e8f9", fontSize: 19, fontWeight: "900" },
  sectionDescription: {
    color: "#94a3b8",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 5
  },
  darkCard: { backgroundColor: "#020617", borderRadius: 15, padding: 14, marginTop: 13 },
  scoreMetric: { width: "47%", backgroundColor: "#020617", borderRadius: 14, padding: 13 },
  scoreMetricValue: { color: "white", fontSize: 22, fontWeight: "900" },
  scoreMetricUnavailable: { color: "#64748b", fontSize: 22, fontWeight: "900" },
  scoreMetricMaximum: { color: "#64748b", fontSize: 10 },
  scoreMetricLabel: { color: "#94a3b8", marginTop: 5 },
  smallMuted: { color: "#64748b", fontSize: 11, marginTop: 7 },
  progressTrack: {
    height: 7,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10
  },
  progressFill: { height: "100%", backgroundColor: "#22c55e", borderRadius: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14, marginTop: 10 },
  rowLabel: { color: "#94a3b8", flex: 1 },
  rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1 },
  priorityCard: {
    backgroundColor: "rgba(245,158,11,.09)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  priorityHigh: {
    backgroundColor: "rgba(239,68,68,.09)",
    borderColor: "rgba(239,68,68,.45)"
  },
  priorityLabel: { color: "#fde68a", fontSize: 11, fontWeight: "900" },
  priorityTitle: { color: "white", fontSize: 18, fontWeight: "900", marginTop: 7 },
  prioritySeverity: { color: "#fca5a5", fontWeight: "900", marginTop: 10 },
  coachCard: {
    backgroundColor: "rgba(147,51,234,.09)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  coachLabel: { color: "#c084fc", fontWeight: "900" },
  coachText: { color: "#e9d5ff", lineHeight: 22, marginTop: 8 },
  noticeCard: {
    backgroundColor: "rgba(59,130,246,.09)",
    borderColor: "rgba(59,130,246,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14
  },
  noticeTitle: { color: "#93c5fd", fontWeight: "900" },
  noticeText: { color: "#dbeafe", lineHeight: 20, marginTop: 7 },
  filterRow: { gap: 8, paddingVertical: 14 },
  filterButton: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12
  },
  filterActive: { backgroundColor: "#0891b2" },
  filterText: { color: "#94a3b8", fontWeight: "900" },
  filterTextActive: { color: "white" },
  contributorCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginTop: 11
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  cardTitle: { color: "#67e8f9", fontSize: 16, fontWeight: "900" },
  cardSubtitle: { color: "#94a3b8", marginTop: 3 },
  contributorGain: { fontWeight: "900", textAlign: "right" },
  negativeBorder: { borderColor: "rgba(239,68,68,.45)" },
  trendCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginTop: 12
  },
  messageCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 11
  },
  messageTitle: { color: "white", fontWeight: "900", flex: 1 },
  badge: { fontSize: 10, fontWeight: "900" },
  cardText: { color: "#cbd5e1", lineHeight: 20, marginTop: 8 },
  highBorder: { borderColor: "rgba(239,68,68,.50)" },
  mediumBorder: { borderColor: "rgba(245,158,11,.45)" },
  infoBorder: { borderColor: "rgba(59,130,246,.40)" },
  advisoryBadge: {
    backgroundColor: "rgba(59,130,246,.10)",
    borderRadius: 9,
    padding: 8,
    marginTop: 11,
    alignItems: "center"
  },
  subheading: { color: "#c084fc", fontSize: 16, fontWeight: "900", marginTop: 19 },
  emptyCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  successCard: { backgroundColor: "rgba(34,197,94,.08)", borderRadius: 14, padding: 14, marginTop: 13 },
  successTitle: { color: "#86efac", fontWeight: "900" },
  successText: { color: "#d1fae5", lineHeight: 20, marginTop: 7 },
  protectionCard: {
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
    marginTop: 20
  },
  protectionTitle: { color: "#fde68a", fontWeight: "900" },
  protectionText: { color: "#fef3c7", lineHeight: 21, marginTop: 7 },
  primaryButton: { backgroundColor: "#0891b2", padding: 17, borderRadius: 17, marginTop: 15 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondaryButton: { backgroundColor: "#1e293b", padding: 16, borderRadius: 17, marginTop: 12 },
  secondaryButtonText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  errorCard: {
    backgroundColor: "rgba(239,68,68,.10)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 15
  },
  errorText: { color: "#fca5a5" },
  danger: { color: "#fca5a5" },
  positive: { color: "#86efac" },
  warning: { color: "#fde68a" },
  info: { color: "#93c5fd" },
  disabled: { opacity: 0.6 }
});

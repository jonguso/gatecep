import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { buildUnifiedPortfolioAnalytics } from "../src/features/analytics/unifiedPortfolioAnalyticsService";
import { buildPortfolioHealthScore } from "../src/features/analytics/portfolioHealthScoreService";
import { buildExecutiveActionQueue } from "../src/features/analytics/executiveActionQueueService";

const ALERT_FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const ACTION_FILTERS = [
  "ALL",
  "RISK",
  "PERFORMANCE",
  "REBALANCING",
  "BROKER_RECONCILIATION",
  "LIQUIDITY",
  "OPERATIONS",
  "DATA_QUALITY",
  "DIVIDENDS"
];

const ANALYTICS_SECTIONS = [
  { id: "health", title: "Executive Health", summary: "Review the weighted portfolio-health classification and component scores." },
  { id: "scorecard", title: "Analytics Scorecard", summary: "Compare risk, performance, rebalancing, liquidity, and operations." },
  { id: "actions", title: "Executive Actions", summary: "Inspect ranked advisory priorities and estimated financial impact." },
  { id: "alerts", title: "Portfolio Alerts", summary: "Review unified risk, performance, and rebalancing alerts." },
  { id: "holdings", title: "Holdings Analytics", summary: "Inspect security allocation, contribution, return, and risk status." },
  { id: "operations", title: "Broker & Operations", summary: "Review broker, reconciliation, dividends, income, and rebalance status." },
  { id: "specialists", title: "Specialist Analysis", summary: "Open Risk, Performance, Rebalancing, or the canonical Home." }
];

export default function UnifiedPortfolioAnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");
  const params = useLocalSearchParams();
  const initialSection = ANALYTICS_SECTIONS.some((item) => item.id === params?.section)
    ? params.section
    : null;
  const [alertFilter, setAlertFilter] = useState("CRITICAL");
  const [actionFilter, setActionFilter] = useState("RISK");
  const [activeSection, setActiveSection] = useState(initialSection);
  const scrollRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();

  const loadData = useCallback(async ({ fullLoader = true } = {}) => {
    try {
      fullLoader ? setLoading(true) : setRefreshing(true);
      setError("");

      const [analyticsResult, healthResult, queueResult] = await Promise.all([
        buildUnifiedPortfolioAnalytics(),
        buildPortfolioHealthScore(),
        buildExecutiveActionQueue()
      ]);

      setAnalytics(analyticsResult || null);
      setHealth(healthResult || null);
      setQueue(queueResult || null);
    } catch (loadError) {
      console.error("Unable to load unified portfolio analytics:", loadError);
      setError(loadError?.message || "Unable to load unified portfolio analytics.");
      setAnalytics(null);
      setHealth(null);
      setQueue(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleAlerts = useMemo(() => {
    const alerts = Array.isArray(analytics?.alerts) ? analytics.alerts : [];
    return alertFilter === "ALL"
      ? alerts
      : alerts.filter(
          (item) => String(item?.severity || "").toUpperCase() === alertFilter
        );
  }, [analytics, alertFilter]);

  const visibleActions = useMemo(() => {
    const actions = Array.isArray(queue?.actions) ? queue.actions : [];
    return actionFilter === "ALL"
      ? actions
      : actions.filter(
          (item) => String(item?.type || "").toUpperCase() === actionFilter
        );
  }, [queue, actionFilter]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>Building unified portfolio analytics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorTitle}>REAL analytics unavailable</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.loadingText}>
          GateCEP will not substitute Practice data or retain stale analytics scores.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/login")}>
          <Text style={styles.primaryButtonText}>Sign In Again</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.secondaryButtonText}>Back to REAL Portfolio</Text>
        </Pressable>
      </View>
    );
  }

  const score = health?.score ?? analytics?.scores?.overall ?? 0;
  const grade = health?.grade?.label || analytics?.scores?.grade?.label || "Not Available";
  const activeSectionIndex = ANALYTICS_SECTIONS.findIndex(
    (section) => section.id === activeSection
  );
  const previousSection = activeSectionIndex > 0
    ? ANALYTICS_SECTIONS[activeSectionIndex - 1]
    : null;
  const nextSection = activeSectionIndex >= 0 && activeSectionIndex < ANALYTICS_SECTIONS.length - 1
    ? ANALYTICS_SECTIONS[activeSectionIndex + 1]
    : null;

  function moveToSection(sectionId) {
    setActiveSection(sectionId);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  function returnToAnalysis() {
    setActiveSection(null);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PC-022</Text>
          <Text style={styles.title}>Portfolio Analysis</Text>
          <Text style={styles.subtitle}>{activeSection
            ? ANALYTICS_SECTIONS.find((section) => section.id === activeSection)?.title
            : "Executive health, risk, performance, operations, alerts, and priorities."}</Text>
        </View>
        <Pressable
          style={styles.headerButton}
          onPress={() => activeSection ? returnToAnalysis() : router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.headerButtonText}>{activeSection ? "Analysis Overview" : "Home"}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.hero, activeSection && styles.hidden]}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreMaximum}>/100</Text>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>Portfolio Health Score</Text>
          <Text style={styles.heroGrade}>{grade}</Text>
          <Text style={styles.heroStatus}>
            {formatLabel(health?.status || analytics?.status || "NOT_READY")}
          </Text>
          <Text style={styles.heroDescription}>
            {health?.grade?.description ||
              analytics?.scores?.grade?.description ||
              "Portfolio health guidance is not currently available."}
          </Text>
        </View>
      </View>

      <View style={[styles.grid, activeSection && styles.hidden]}>
        <Metric
          label="Net Worth"
          value={`KES ${money(
            analytics?.portfolio?.netWorth ??
            analytics?.portfolio?.totalValue
          )}`}
        />

        <Metric
          label="Holdings Value"
          value={`KES ${money(
            analytics?.portfolio?.holdingsValue
          )}`}
        />

        <Metric
          label="Invested Value"
          value={`KES ${money(
            analytics?.portfolio?.investedValue ??
            analytics?.portfolio?.investedAmount
          )}`}
        />

        <Metric
          label="Available Cash"
          value={`KES ${money(
            analytics?.portfolio?.availableCash
          )}`}
        />

        <Metric
          label="Unrealized Gain / Loss"
          value={nullableMoney(
            analytics?.portfolio?.totalGainLoss
          )}
          danger={
            Number(
              analytics?.portfolio?.totalGainLoss || 0
            ) < 0
          }
          positive={
            Number(
              analytics?.portfolio?.totalGainLoss || 0
            ) > 0
          }
        />

        <Metric
          label="Holdings"
          value={
            analytics?.portfolio?.holdingsCount || 0
          }
        />

        <Metric
          label="Priorities"
          value={
            analytics?.summary?.priorities || 0
          }
        />

        <Metric
          label="Open Actions"
          value={
            queue?.summary?.actionable || 0
          }
        />
      </View>

      <View style={[styles.analysisMenu, activeSection && styles.hidden]}>
        <Text style={styles.analysisMenuTitle}>Analysis Details</Text>
        <Text style={styles.analysisMenuText}>Choose one area to inspect. Each opens as a focused mobile screen.</Text>
        <View style={styles.analysisMenuList}>
          {ANALYTICS_SECTIONS.map((section) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${section.title}`}
              key={section.id}
              style={({ pressed }) => [styles.analysisMenuButton, windowWidth < 600 && styles.analysisMenuButtonCompact, pressed && styles.analysisMenuButtonPressed]}
              onPress={() => moveToSection(section.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.analysisMenuButtonTitle}>{section.title}</Text>
                {windowWidth >= 600 ? <Text style={styles.analysisMenuButtonText}>{section.summary}</Text> : null}
              </View>
              <Text style={styles.analysisMenuArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeSection ? (
        <View style={styles.detailNavigation}>
          <Pressable
            disabled={!previousSection}
            style={[styles.detailBackButton, !previousSection && styles.disabled]}
            onPress={() => previousSection && moveToSection(previousSection.id)}
          >
            <Text style={styles.detailBackText} numberOfLines={1}>
              {previousSection ? `‹ Previous: ${previousSection.title}` : "‹ Previous"}
            </Text>
          </Pressable>
          <Text style={styles.detailPosition}>{activeSectionIndex + 1} of {ANALYTICS_SECTIONS.length}</Text>
        </View>
      ) : null}

      <Section
        style={activeSection !== "health" && styles.hidden}
        title="Executive Health Classification"
        description="Weighted across risk, performance, allocation alignment, liquidity, and operational integrity."
      >
        <View style={styles.grid}>
          {(health?.components || []).map((component) => (
            <ScoreMetric
              key={component.code}
              label={component.label}
              value={component.score}
              unavailableLabel={component.message}
            />
          ))}
        </View>

        <View style={styles.darkCard}>
          <Row label="Executive Status" value={formatLabel(health?.classification?.status || "NOT_READY")} />
          <Row label="Action Level" value={formatLabel(health?.classification?.actionLevel || "UNKNOWN")} />
          <Row label="Available Weight" value={nullablePercent(health?.weighting?.availableWeightPercentage)} />
          <Row label="Critical Flags" value={health?.classification?.criticalFlags || 0} danger />
          <Row label="High Flags" value={health?.classification?.highFlags || 0} danger />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Executive Summary</Text>
          <Text style={styles.summaryText}>
            {health?.message || analytics?.message || "No executive summary is available."}
          </Text>
        </View>
      </Section>

      <Section
        style={activeSection !== "scorecard" && styles.hidden}
        title="Analytics Scorecard"
        description="Combined scores and statuses from risk, performance, and rebalancing."
      >
        <View style={styles.grid}>
          <Metric label="Risk" value={nullableScore(analytics?.scores?.risk)} />
          <Metric label="Performance" value={nullableScore(analytics?.scores?.performance)} />
          <Metric label="Rebalancing" value={nullableScore(analytics?.scores?.rebalancing)} />
          <Metric label="Liquidity" value={nullableScore(componentScore(health, "LIQUIDITY"))} />
          <Metric label="Operations" value={nullableScore(componentScore(health, "OPERATIONS"))} />
        </View>

        <View style={styles.darkCard}>
          <Row label="Risk Status" value={formatLabel(analytics?.statuses?.risk || "NOT_READY")} />
          <Row label="Performance Status" value={formatLabel(analytics?.statuses?.performance || "NOT_READY")} />
          <Row label="Rebalancing Status" value={formatLabel(analytics?.statuses?.rebalancing || "NOT_READY")} />
          <Row label="Broker Reconciliation" value={formatLabel(analytics?.statuses?.reconciliation || "NOT_READY")} />
          <Row label="Dividend Status" value={formatLabel(analytics?.statuses?.dividends || "NOT_READY")} />
        </View>
      </Section>

      <Section
        style={activeSection !== "actions" && styles.hidden}
        title="Executive Action Queue"
        description="Ranked advisory actions from portfolio health, risk, performance, rebalancing, operations, and data quality."
      >
        <View style={styles.darkCard}>
          <Row label="Queue Status" value={formatLabel(queue?.status || "NOT_READY")} />
          <Row label="Action Level" value={formatLabel(queue?.actionLevel || "UNKNOWN")} />
          <Row label="Critical" value={queue?.summary?.critical || 0} danger />
          <Row label="High" value={queue?.summary?.high || 0} danger />
          <Row label="Estimated Impact" value={`KES ${money(queue?.summary?.estimatedFinancialImpact)}`} />
        </View>

        <FilterRow values={ACTION_FILTERS} selected={actionFilter} onSelect={setActionFilter} />

        {visibleActions.length ? (
          visibleActions.slice(0, 20).map((action, index) => (
            <MessageCard
              key={action?.id || `ACTION-${index}`}
              title={action?.title || "Executive Action"}
              source={action?.type || action?.source}
              severity={action?.priority}
              message={action?.message}
              footer={`Priority Score: ${action?.priorityScore || 0}`}
            />
          ))
        ) : (
          <SuccessCard title="No Matching Actions" message="No executive actions match this category." />
        )}
      </Section>

      <Section
        style={activeSection !== "alerts" && styles.hidden}
        title="Portfolio Alerts"
        description="Unified alerts from risk, performance, and rebalancing analytics."
      >
        <FilterRow values={ALERT_FILTERS} selected={alertFilter} onSelect={setAlertFilter} />

        {visibleAlerts.length ? (
          visibleAlerts.slice(0, 20).map((alert, index) => (
            <MessageCard
              key={alert?.id || `ALERT-${index}`}
              title={alert?.title || "Portfolio Alert"}
              source={alert?.source}
              severity={alert?.severity}
              message={alert?.message}
            />
          ))
        ) : (
          <SuccessCard title="No Matching Alerts" message="No alerts match this severity." />
        )}
      </Section>

      <Section
        style={activeSection !== "holdings" && styles.hidden}
        title="Holdings Overview"
        description="Current holding value, allocation, contribution, and risk-limit status."
      >
        {(analytics?.holdings || []).length ? (
          analytics.holdings.map((holding, index) => (
            <View key={holding?.symbol || `HOLDING-${index}`} style={styles.messageCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{holding?.symbol || "Unknown"}</Text>
                  <Text style={styles.cardSubtitle}>{holding?.name || holding?.sector || "No description"}</Text>
                </View>
                <Text style={styles.cardValue}>KES {money(holding?.marketValue)}</Text>
              </View>
              <Row label="Allocation" value={nullablePercent(holding?.allocationPercentage)} />
              <Row label="Gain / Loss" value={nullableMoney(holding?.gainLoss)} />
              <Row label="Return" value={nullablePercent(holding?.returnPercentage)} />
              <Row label="Contribution" value={nullablePercent(holding?.contributionPercentage)} />
              <Row label="Risk Status" value={formatLabel(holding?.riskStatus || "NOT_AVAILABLE")} />
            </View>
          ))
        ) : (
          <EmptyState title="No Holdings" message="No holding analytics are available." />
        )}
      </Section>

      <Section
        style={activeSection !== "operations" && styles.hidden}
        title="Broker, Dividends, and Operations"
        description="Operational portfolio status beyond market analytics."
      >
        <View style={styles.darkCard}>
          <Row label="Broker Connected" value={analytics?.broker?.connected ? "Yes" : "No"} />
          <Row label="Broker" value={analytics?.broker?.broker || "Not connected"} />
          <Row label="Broker Account" value={analytics?.broker?.accountName || "Not available"} />
          <Row label="Reconciliation" value={formatLabel(analytics?.broker?.reconciliationStatus || "NOT_READY")} />
          <Row label="Upcoming Dividends" value={analytics?.dividends?.upcomingCount || 0} />
          <Row label="Estimated Annual Income" value={`KES ${money(analytics?.dividends?.estimatedAnnualIncome)}`} />
          <Row label="Rebalance Recommendations" value={analytics?.rebalancing?.recommendationCount || 0} />
        </View>
      </Section>

      <Section
        style={activeSection !== "specialists" && styles.hidden}
        title="Specialist Analysis"
        description="Open the detailed engines behind the executive portfolio view."
      >
        <View style={styles.specialistGrid}>
          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push({ pathname: "/portfolio-risk", params: { returnTo: "analysis" } })
            }
          >
            <Text style={styles.specialistButtonText}>
              Risk Analytics
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push({ pathname: "/performance", params: { returnTo: "analysis" } })
            }
          >
            <Text style={styles.specialistButtonText}>
              Performance
            </Text>
          </Pressable>

          <Pressable
            style={styles.specialistButton}
            onPress={() =>
              router.push({ pathname: "/portfolio-rebalancing", params: { returnTo: "analysis" } })
            }
          >
            <Text style={styles.specialistButtonText}>
              Rebalancing
            </Text>
          </Pressable>

        </View>
      </Section>

      <View style={[styles.protectionCard, activeSection && styles.hidden]}>
        <Text style={styles.protectionTitle}>Executive Analytics Only</Text>
        <Text style={styles.protectionText}>
          PC-022 consolidates analytics and advisory priorities. It does not
          place trades, modify holdings, change cash, execute rebalancing, or
          update broker accounts.
        </Text>
      </View>

      <Pressable
        disabled={refreshing}
        style={[styles.primaryButton, activeSection && styles.hidden, refreshing && styles.disabled]}
        onPress={() => loadData({ fullLoader: false })}
      >
        {refreshing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>Refresh Unified Analytics</Text>
        )}
      </Pressable>

      {activeSection ? (
        <Pressable
          style={styles.journeyNextButton}
          onPress={() => nextSection ? moveToSection(nextSection.id) : returnToAnalysis()}
        >
          <Text style={styles.journeyNextText}>
            {nextSection ? `Next: ${nextSection.title} ›` : "Finish: Analysis Overview ›"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Section({ title, description, children, style }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}

function Metric({ label, value, danger = false, positive = false }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, danger && styles.danger, positive && styles.positive]}>
        {String(value)}
      </Text>
    </View>
  );
}

function Row({ label, value, danger = false }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, danger && styles.danger]}>{String(value ?? "N/A")}</Text>
    </View>
  );
}

function ScoreMetric({ label, value, unavailableLabel = "Not available" }) {
  const available = value !== null && value !== undefined;
  const score = available ? Math.min(Math.max(Number(value || 0), 0), 100) : 0;

  return (
    <View style={styles.scoreMetric}>
      <Text style={available ? styles.scoreMetricValue : styles.scoreMetricUnavailable}>
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

function MessageCard({ title, source, severity = "INFO", message, footer = null }) {
  const normalized = String(severity || "INFO").toUpperCase();

  return (
    <View style={[styles.messageCard, borderStyle(normalized)]}>
      <View style={styles.cardHeader}>
        <Text style={styles.messageTitle}>{title}</Text>
        <Text style={[styles.badge, severityTextStyle(normalized)]}>{formatLabel(normalized)}</Text>
      </View>
      <Text style={styles.sourceLabel}>{formatLabel(source || "UNIFIED_ANALYTICS")}</Text>
      <Text style={styles.cardText}>{message || "No additional details are available."}</Text>
      {footer ? <Text style={styles.footerText}>{footer}</Text> : null}
    </View>
  );
}

function FilterRow({ values, selected, onSelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {values.map((value) => (
        <Pressable
          key={value}
          style={[styles.filterButton, selected === value && styles.filterActive]}
          onPress={() => onSelect(value)}
        >
          <Text style={[styles.filterText, selected === value && styles.filterTextActive]}>
            {formatLabel(value)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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

function EmptyState({ title, message }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{message}</Text>
    </View>
  );
}

function componentScore(health, code) {
  return health?.components?.find((item) => item?.code === code)?.score ?? null;
}

function nullablePercent(value) {
  return value === null || value === undefined
    ? "Not available"
    : `${Number(value).toFixed(2)}%`;
}

function nullableMoney(value) {
  return value === null || value === undefined
    ? "Not available"
    : `KES ${money(value)}`;
}

function nullableScore(value) {
  return value === null || value === undefined
    ? "Not available"
    : `${Math.round(Number(value))}/100`;
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

function borderStyle(severity) {
  if (severity === "CRITICAL") return styles.criticalBorder;
  if (severity === "HIGH") return styles.highBorder;
  if (severity === "MEDIUM") return styles.mediumBorder;
  if (severity === "INFO") return styles.infoBorder;
  return null;
}

function severityTextStyle(severity) {
  if (["CRITICAL", "HIGH"].includes(severity)) return styles.danger;
  if (severity === "MEDIUM") return styles.warning;
  if (severity === "LOW") return styles.positive;
  return styles.info;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 18, paddingTop: 54, paddingBottom: 110, width: "100%", maxWidth: 900, alignSelf: "center" },
  hidden: { display: "none" },
  centerScreen: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  loadingText: { color: "#94a3b8", marginTop: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerButton: { minHeight: 44, borderRadius: 14, backgroundColor: "#1e293b", borderColor: "#334155", borderWidth: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  headerButtonText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  eyebrow: { color: "#22d3ee", fontWeight: "900" },
  title: { color: "white", fontSize: 31, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#94a3b8", lineHeight: 22, marginTop: 10, marginBottom: 20 },
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
  heroStatus: { color: "#c084fc", fontWeight: "900", marginTop: 4 },
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
  analysisMenu: { marginTop: 18, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 20, padding: 14 },
  analysisMenuTitle: { color: "#67e8f9", fontSize: 20, fontWeight: "900" },
  analysisMenuText: { color: "#94a3b8", fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 5 },
  analysisMenuList: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  analysisMenuButton: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#020617", borderColor: "#1e293b", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 9 },
  analysisMenuButtonCompact: { width: "48%", minHeight: 78, marginTop: 0 },
  analysisMenuButtonPressed: { backgroundColor: "#1e293b", borderColor: "#67e8f9" },
  analysisMenuButtonTitle: { color: "white", fontWeight: "900", fontSize: 14 },
  analysisMenuButtonText: { color: "#94a3b8", fontSize: 10, lineHeight: 15, marginTop: 3 },
  analysisMenuArrow: { color: "#c084fc", fontSize: 25, fontWeight: "900" },
  detailNavigation: { marginTop: 16, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  detailBackButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: "#1e293b", justifyContent: "center", paddingHorizontal: 14 },
  detailBackText: { color: "#67e8f9", fontWeight: "900" },
  detailPosition: { color: "#c084fc", fontWeight: "900", fontSize: 11 },
  section: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginTop: 20
  },
  sectionTitle: { color: "#67e8f9", fontSize: 19, fontWeight: "900" },
  sectionDescription: { color: "#94a3b8", lineHeight: 20, marginTop: 7, marginBottom: 5 },
  darkCard: { backgroundColor: "#020617", borderRadius: 15, padding: 14, marginTop: 13 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14, marginTop: 10 },
  rowLabel: { color: "#94a3b8", flex: 1 },
  rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1 },
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
  summaryCard: {
    backgroundColor: "rgba(147,51,234,.09)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  summaryLabel: { color: "#c084fc", fontWeight: "900" },
  summaryText: { color: "#e9d5ff", lineHeight: 22, marginTop: 8 },
  messageCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 11
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  messageTitle: { color: "white", fontWeight: "900", flex: 1 },
  cardTitle: { color: "#67e8f9", fontSize: 16, fontWeight: "900" },
  cardSubtitle: { color: "#94a3b8", marginTop: 3 },
  cardValue: { color: "white", fontWeight: "900", textAlign: "right" },
  sourceLabel: { color: "#c084fc", fontSize: 10, fontWeight: "900", marginTop: 5 },
  cardText: { color: "#cbd5e1", lineHeight: 20, marginTop: 8 },
  footerText: { color: "#94a3b8", fontSize: 11, marginTop: 10 },
  badge: { fontSize: 10, fontWeight: "900" },
  criticalBorder: { borderColor: "rgba(248,113,113,.75)" },
  highBorder: { borderColor: "rgba(239,68,68,.50)" },
  mediumBorder: { borderColor: "rgba(245,158,11,.45)" },
  infoBorder: { borderColor: "rgba(59,130,246,.40)" },
  filterRow: { gap: 8, paddingVertical: 14 },
  filterButton: { backgroundColor: "#1e293b", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 },
  filterActive: { backgroundColor: "#0891b2" },
  filterText: { color: "#94a3b8", fontWeight: "900" },
  filterTextActive: { color: "white" },
  successCard: { backgroundColor: "rgba(34,197,94,.08)", borderRadius: 14, padding: 14, marginTop: 13 },
  successTitle: { color: "#86efac", fontWeight: "900" },
  successText: { color: "#d1fae5", lineHeight: 20, marginTop: 7 },
  emptyCard: { backgroundColor: "#020617", borderColor: "#1e293b", borderWidth: 1, borderRadius: 15, padding: 15, marginTop: 13 },
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
  journeyNextButton: {
    minHeight: 52,
    backgroundColor: "#9333ea",
    borderRadius: 17,
    marginTop: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  journeyNextText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  errorCard: {
    backgroundColor: "rgba(239,68,68,.10)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 15
  },
  errorText: { color: "#fca5a5" },
  errorTitle: { color: "#fecaca", fontSize: 24, fontWeight: "900" },
  danger: { color: "#fca5a5" },
  positive: { color: "#86efac" },
  warning: { color: "#fde68a" },
  info: { color: "#93c5fd" },
  disabled: { opacity: 0.6 },

  specialistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },

  specialistButton: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14
  },

  specialistButtonText: {
    color: "#e2e8f0",
    fontWeight: "800"
  }
});

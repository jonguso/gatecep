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
import { buildCoachGInvestmentAdvice } from "../src/features/investment-intelligence/investmentAdvisorService";

const RECOMMENDATION_FILTERS = [
  "ALL",
  "STRONG_BUY",
  "BUY",
  "ACCUMULATE",
  "HOLD",
  "REDUCE",
  "SELL",
  "AVOID",
  "NOT_RATED"
];

const INSIGHT_FILTERS = [
  "ALL",
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO"
];

export default function InvestmentIntelligenceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [error, setError] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState("ALL");
  const [insightFilter, setInsightFilter] = useState("ALL");

  const loadData = useCallback(async ({ fullLoader = true } = {}) => {
    try {
      fullLoader ? setLoading(true) : setRefreshing(true);
      setError("");
      setAdvice(await buildCoachGInvestmentAdvice());
    } catch (loadError) {
      console.error("Unable to load Coach G investment intelligence:", loadError);
      setError(loadError?.message || "Unable to load Coach G investment intelligence.");
      setAdvice(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recommendations = advice?.recommendations?.recommendations || [];

  const visibleRecommendations = useMemo(() => {
    if (recommendationFilter === "ALL") return recommendations;
    return recommendations.filter(
      (item) =>
        String(item?.rating?.code || item?.action || "").toUpperCase() ===
        recommendationFilter
    );
  }, [recommendations, recommendationFilter]);

  const visibleInsights = useMemo(() => {
    const insights = Array.isArray(advice?.insights) ? advice.insights : [];
    if (insightFilter === "ALL") return insights;
    return insights.filter(
      (item) => String(item?.severity || "").toUpperCase() === insightFilter
    );
  }, [advice, insightFilter]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>Coach G is analyzing your portfolio...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PC-023A</Text>
      <Text style={styles.title}>Coach G Investment Intelligence</Text>
      <Text style={styles.subtitle}>
        Explainable portfolio ratings, holding recommendations, cash deployment,
        capital allocation, dividend reinvestment, and executive investment priorities.
      </Text>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.hero}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>{advice?.intelligenceScore || 0}</Text>
          <Text style={styles.scoreMaximum}>/100</Text>
        </View>
        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>Investment Intelligence Score</Text>
          <Text style={styles.heroGrade}>
            {advice?.portfolioQuality?.rating?.label || "Not Rated"}
          </Text>
          <Text style={styles.heroStatus}>{formatLabel(advice?.status || "NOT_READY")}</Text>
          <Text style={styles.heroDescription}>
            {advice?.portfolioQuality?.rating?.description ||
              "Investment intelligence is not currently available."}
          </Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <Metric label="Portfolio Value" value={`KES ${money(advice?.portfolio?.totalValue)}`} />
        <Metric label="Available Cash" value={`KES ${money(advice?.portfolio?.availableCash)}`} />
        <Metric
          label="Total Gain / Loss"
          value={nullableMoney(advice?.portfolio?.totalGainLoss)}
          positive={Number(advice?.portfolio?.totalGainLoss || 0) > 0}
          danger={Number(advice?.portfolio?.totalGainLoss || 0) < 0}
        />
        <Metric label="Rated Holdings" value={advice?.recommendations?.rated || 0} />
        <Metric label="Portfolio Quality" value={nullableScore(advice?.scores?.portfolioQuality)} />
        <Metric label="Portfolio Health" value={nullableScore(advice?.scores?.portfolioHealth)} />
      </View>

      <Section
        title="Coach G Executive View"
        description="The highest-priority conclusions from the full investment-intelligence pipeline."
      >
        <View style={styles.summaryCard}>
          <Row label="Advisor Status" value={formatLabel(advice?.status || "NOT_READY")} />
          <Row
            label="Action Level"
            value={formatLabel(advice?.actionLevel || "UNKNOWN")}
            danger={["HIGH", "IMMEDIATE"].includes(advice?.actionLevel)}
          />
          <Row
            label="Portfolio Rating"
            value={advice?.portfolioQuality?.rating?.label || "Not Rated"}
          />
          <Row
            label="Recommended Posture"
            value={formatLabel(
              advice?.portfolioQuality?.rating?.action || "BUILD_MORE_EVIDENCE"
            )}
          />
          <Row
            label="Critical Actions"
            value={advice?.executive?.criticalActions || 0}
            danger={Number(advice?.executive?.criticalActions || 0) > 0}
          />
          <Row
            label="High Actions"
            value={advice?.executive?.highActions || 0}
            danger={Number(advice?.executive?.highActions || 0) > 0}
          />
        </View>

        <View style={styles.narrativeCard}>
          <Text style={styles.narrativeLabel}>Coach G Narrative</Text>
          <Text style={styles.narrativeText}>
            {advice?.narrative || advice?.message || "No narrative is available."}
          </Text>
        </View>
      </Section>

      <Section
        title="Investment Scorecard"
        description="The scoring layers supporting the overall assessment."
      >
        <View style={styles.componentGrid}>
          <ScoreMetric label="Portfolio Quality" value={advice?.scores?.portfolioQuality} />
          <ScoreMetric label="Portfolio Health" value={advice?.scores?.portfolioHealth} />
          <ScoreMetric label="Risk" value={advice?.scores?.risk} />
          <ScoreMetric label="Performance" value={advice?.scores?.performance} />
          <ScoreMetric label="Rebalancing" value={advice?.scores?.rebalancing} />
          <ScoreMetric label="Liquidity" value={advice?.scores?.liquidity} />
          <ScoreMetric label="Operations" value={advice?.scores?.operations} />
          <ScoreMetric label="Recommendation Avg." value={advice?.scores?.recommendationAverage} />
          <ScoreMetric label="Cash Readiness" value={advice?.scores?.cashDeploymentReadiness} />
          <ScoreMetric label="Dividend Readiness" value={advice?.scores?.dividendReinvestmentReadiness} />
        </View>
      </Section>

      <Section
        title="Executive Investment Priorities"
        description="Coach G's ranked portfolio-level decisions."
      >
        <PriorityResult label="Best Stock to Buy" item={advice?.priorities?.bestStockToBuy} />
        <PriorityResult label="Best Stock to Add" item={advice?.priorities?.bestStockToAdd} />
        <PriorityResult label="Best Stock to Trim" item={advice?.priorities?.bestStockToTrim} />
        <PriorityResult label="Highest Portfolio Risk" item={advice?.priorities?.highestPortfolioRisk} />
        <PriorityResult label="Best Dividend Opportunity" item={advice?.priorities?.bestDividendOpportunity} />
        <PriorityResult label="Strongest Capital Allocation" item={advice?.priorities?.strongestCapitalAllocation} />
        <PriorityResult label="Biggest Portfolio Weakness" item={advice?.priorities?.biggestPortfolioWeakness} />
        <PriorityResult label="Strongest Portfolio Quality" item={advice?.priorities?.strongestPortfolioQuality} />
        <PriorityResult label="Top Executive Action" item={advice?.priorities?.topExecutiveAction} />
      </Section>

      <Section
        title="Holding Recommendations"
        description="Explainable advisory ratings for portfolio holdings."
      >
        <FilterRow
          values={RECOMMENDATION_FILTERS}
          selected={recommendationFilter}
          onSelect={setRecommendationFilter}
        />

        {visibleRecommendations.length ? (
          visibleRecommendations.map((item, index) => (
            <RecommendationCard
              key={item?.symbol || `RECOMMENDATION-${index}`}
              recommendation={item}
            />
          ))
        ) : (
          <EmptyState
            title="No Matching Recommendations"
            message="No recommendations match the selected rating."
          />
        )}
      </Section>

      <Section
        title="Cash Deployment"
        description="Whether available cash should be deployed, held, or reserved."
      >
        <View style={styles.decisionCard}>
          <Text style={styles.decisionLabel}>Coach G Cash Guidance</Text>
          <Text style={styles.decisionTitle}>
            {advice?.cashDeployment?.action?.label || "Not Available"}
          </Text>
          <Text style={styles.cardText}>
            {advice?.cashDeployment?.action?.description ||
              advice?.cashDeployment?.message ||
              "No cash deployment guidance is available."}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Row label="Readiness Score" value={nullableScore(advice?.cashDeployment?.readinessScore)} />
          <Row label="Confidence" value={nullablePercent(advice?.cashDeployment?.confidencePercentage)} />
          <Row label="Available Cash" value={`KES ${money(advice?.cashDeployment?.portfolio?.availableCash)}`} />
          <Row label="Deployable Cash" value={`KES ${money(advice?.cashDeployment?.portfolio?.deployableCash)}`} />
          <Row
            label="Recommended Deployment"
            value={`KES ${money(advice?.cashDeployment?.portfolio?.recommendedDeploymentAmount)}`}
            highlight={Number(advice?.cashDeployment?.portfolio?.recommendedDeploymentAmount || 0) > 0}
          />
          <Row label="Remaining Cash" value={`KES ${money(advice?.cashDeployment?.portfolio?.remainingCash)}`} />
          <Row label="Eligible Opportunities" value={advice?.cashDeployment?.opportunities?.eligible || 0} />
        </View>

        {(advice?.capitalAllocation?.allocations || []).map((allocation, index) => (
          <AllocationCard
            key={allocation?.symbol || `CAPITAL-${index}`}
            allocation={allocation}
            mode="CAPITAL"
          />
        ))}
      </Section>

      <Section
        title="Dividend Reinvestment"
        description="Income quality and selective dividend-reinvestment guidance."
      >
        <View style={styles.summaryCard}>
          <Row
            label="Dividend Guidance"
            value={advice?.dividendReinvestment?.action?.label || "Not Available"}
          />
          <Row
            label="Readiness Score"
            value={nullableScore(advice?.dividendReinvestment?.readinessScore)}
          />
          <Row
            label="Net Dividend Income"
            value={`KES ${money(advice?.dividendReinvestment?.income?.totalNetIncome)}`}
          />
          <Row
            label="Portfolio Yield"
            value={nullablePercent(advice?.dividendReinvestment?.income?.portfolioYieldPercentage)}
          />
          <Row
            label="Income Quality"
            value={advice?.dividendReinvestment?.quality?.classification?.label || "Not Rated"}
          />
          <Row
            label="Reinvestment Amount"
            value={`KES ${money(advice?.dividendReinvestment?.reinvestment?.amount)}`}
          />
          <Row
            label="Retained Cash"
            value={`KES ${money(advice?.dividendReinvestment?.reinvestment?.retainedCash)}`}
          />
        </View>

        {(advice?.dividendReinvestment?.reinvestment?.allocations || []).map(
          (allocation, index) => (
            <AllocationCard
              key={allocation?.symbol || `DIVIDEND-${index}`}
              allocation={allocation}
              mode="DIVIDENDS"
            />
          )
        )}
      </Section>

      <Section
        title="Coach G Investment Insights"
        description="Portfolio-level observations from scores, recommendations, deployment, and dividend analysis."
      >
        <FilterRow
          values={INSIGHT_FILTERS}
          selected={insightFilter}
          onSelect={setInsightFilter}
        />

        {visibleInsights.length ? (
          visibleInsights.map((insight, index) => (
            <InsightCard key={insight?.code || `INSIGHT-${index}`} insight={insight} />
          ))
        ) : (
          <SuccessCard
            title="No Matching Insights"
            message="No Coach G insights match the selected severity."
          />
        )}
      </Section>

      <Section
        title="Portfolio Quality"
        description="Strengths, weaknesses, and quality flags supporting the overall rating."
      >
        <Text style={styles.subheading}>Strengths</Text>
        {(advice?.portfolioQuality?.strengths || []).length ? (
          advice.portfolioQuality.strengths.map((item, index) => (
            <QualityCard key={item?.code || `STRENGTH-${index}`} item={item} positive />
          ))
        ) : (
          <EmptyState title="No Confirmed Strengths" message="Additional evidence may be required." />
        )}

        <Text style={styles.subheading}>Weaknesses</Text>
        {(advice?.portfolioQuality?.weaknesses || []).length ? (
          advice.portfolioQuality.weaknesses.map((item, index) => (
            <QualityCard key={item?.code || `WEAKNESS-${index}`} item={item} />
          ))
        ) : (
          <SuccessCard
            title="No Material Weaknesses"
            message="No material portfolio-quality weakness is currently identified."
          />
        )}

        <Text style={styles.subheading}>Quality Flags</Text>
        {(advice?.portfolioQuality?.flags || []).length ? (
          advice.portfolioQuality.flags.slice(0, 15).map((flag, index) => (
            <InsightCard
              key={`${flag?.source || "QUALITY"}-${flag?.code || index}`}
              insight={flag}
            />
          ))
        ) : (
          <SuccessCard title="No Quality Flags" message="No quality flags are active." />
        )}
      </Section>

      <View style={styles.protectionCard}>
        <Text style={styles.protectionTitle}>Advisory Intelligence Only</Text>
        <Text style={styles.protectionText}>
          PC-023A does not place trades, change holdings, modify cash, submit broker
          instructions, or invent missing data. Review recommendations against current
          market prices, objectives, risk tolerance, and broker information.
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
          <Text style={styles.primaryButtonText}>Refresh Coach G Intelligence</Text>
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

function Row({ label, value, danger = false, highlight = false }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, danger && styles.danger, highlight && styles.positive]}>
        {String(value ?? "N/A")}
      </Text>
    </View>
  );
}

function ScoreMetric({ label, value }) {
  const available = value !== null && value !== undefined;
  const score = available ? Math.min(Math.max(Number(value || 0), 0), 100) : 0;

  return (
    <View style={styles.scoreMetric}>
      <Text style={available ? styles.scoreMetricValue : styles.scoreMetricUnavailable}>
        {available ? Math.round(score) : "N/A"}
      </Text>
      {available ? <Text style={styles.scoreMetricMaximum}>/100</Text> : null}
      <Text style={styles.scoreMetricLabel}>{label}</Text>
      {available ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${score}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function PriorityResult({ label, item }) {
  const title = item?.title || item?.name || item?.symbol || item?.code || "Not Available";
  const detail =
    item?.message || item?.explanation || item?.rating?.label || item?.action?.label || null;

  return (
    <View style={styles.priorityCard}>
      <Text style={styles.priorityLabel}>{label}</Text>
      <Text style={styles.priorityTitle}>{title}</Text>
      {item?.score !== null && item?.score !== undefined ? (
        <Text style={styles.priorityScore}>{Math.round(Number(item.score))}/100</Text>
      ) : null}
      {detail ? <Text style={styles.cardText}>{detail}</Text> : null}
    </View>
  );
}

function RecommendationCard({ recommendation }) {
  const rating = String(
    recommendation?.rating?.code || recommendation?.action || "NOT_RATED"
  ).toUpperCase();

  return (
    <View
      style={[
        styles.messageCard,
        ["SELL", "AVOID"].includes(rating) && styles.criticalBorder,
        rating === "REDUCE" && styles.highBorder,
        rating === "HOLD" && styles.mediumBorder,
        ["STRONG_BUY", "BUY", "ACCUMULATE"].includes(rating) && styles.positiveBorder
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{recommendation?.symbol || "Unknown"}</Text>
          <Text style={styles.cardSubtitle}>
            {recommendation?.name || recommendation?.sector || "No description"}
          </Text>
        </View>
        <View style={styles.ratingBlock}>
          <Text style={ratingTextStyle(rating)}>{formatLabel(rating)}</Text>
          <Text style={styles.ratingScore}>
            {recommendation?.score === null || recommendation?.score === undefined
              ? "N/A"
              : `${Math.round(Number(recommendation.score))}/100`}
          </Text>
        </View>
      </View>

      <Row label="Category" value={formatLabel(recommendation?.category || "NOT_AVAILABLE")} />
      <Row label="Confidence" value={nullablePercent(recommendation?.confidencePercentage)} />
      <Row label="Risk Level" value={recommendation?.riskLevel?.label || "Unknown"} />
      <Row label="Time Horizon" value={formatLabel(recommendation?.timeHorizon || "WATCH")} />
      <Row label="Allocation" value={nullablePercent(recommendation?.portfolio?.allocationPercentage)} />
      <Row label="Return" value={nullablePercent(recommendation?.portfolio?.returnPercentage)} />
      <Text style={styles.cardText}>{recommendation?.explanation || "No explanation is available."}</Text>

      {(recommendation?.positiveFactors || []).length ? (
        <>
          <Text style={styles.factorHeadingPositive}>Strengths</Text>
          {recommendation.positiveFactors.slice(0, 4).map((factor, index) => (
            <Text key={`${factor?.code || "POS"}-${index}`} style={styles.factorText}>
              • {factor?.title}
            </Text>
          ))}
        </>
      ) : null}

      {(recommendation?.negativeFactors || []).length ? (
        <>
          <Text style={styles.factorHeadingNegative}>Concerns</Text>
          {recommendation.negativeFactors.slice(0, 4).map((factor, index) => (
            <Text key={`${factor?.code || "NEG"}-${index}`} style={styles.factorText}>
              • {factor?.title}
            </Text>
          ))}
        </>
      ) : null}

      <View style={styles.advisoryBadge}>
        <Text style={styles.info}>Advisory Only</Text>
      </View>
    </View>
  );
}

function AllocationCard({ allocation, mode }) {
  return (
    <View style={styles.messageCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{allocation?.symbol || "Unknown"}</Text>
          <Text style={styles.cardSubtitle}>
            {allocation?.name || allocation?.sector || "No description"}
          </Text>
        </View>
        <Text style={styles.allocationAmount}>KES {money(allocation?.allocationAmount)}</Text>
      </View>
      <Row label="Allocation Share" value={nullablePercent(allocation?.allocationPercentage)} />
      <Row label="Investment Score" value={nullableScore(allocation?.investmentScore ?? allocation?.score)} />
      <Row label="Confidence" value={nullablePercent(allocation?.confidencePercentage)} />
      {mode === "DIVIDENDS" ? (
        <>
          <Row label="Dividend Yield" value={nullablePercent(allocation?.dividendYieldPercentage)} />
          <Row
            label="Estimated Shares"
            value={
              allocation?.estimatedShares === null || allocation?.estimatedShares === undefined
                ? "Not available"
                : Number(allocation.estimatedShares).toFixed(4)
            }
          />
        </>
      ) : (
        <Row label="Current Allocation" value={nullablePercent(allocation?.currentAllocationPercentage)} />
      )}
    </View>
  );
}

function InsightCard({ insight }) {
  const severity = String(insight?.severity || "INFO").toUpperCase();
  return (
    <View
      style={[
        styles.messageCard,
        severity === "CRITICAL" && styles.criticalBorder,
        severity === "HIGH" && styles.highBorder,
        severity === "MEDIUM" && styles.mediumBorder,
        severity === "INFO" && styles.infoBorder
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.messageTitle}>{insight?.title || "Investment Insight"}</Text>
        <Text style={severityTextStyle(severity)}>{formatLabel(severity)}</Text>
      </View>
      <Text style={styles.cardText}>{insight?.message || "No insight details are available."}</Text>
    </View>
  );
}

function QualityCard({ item, positive = false }) {
  return (
    <View style={[styles.messageCard, positive ? styles.positiveBorder : styles.highBorder]}>
      <Text style={positive ? styles.qualityTitlePositive : styles.qualityTitleNegative}>
        {item?.title || "Portfolio Quality"}
      </Text>
      <Text style={styles.cardText}>{item?.message || "No details are available."}</Text>
      {item?.score !== null && item?.score !== undefined ? (
        <Row label="Score" value={`${Math.round(Number(item.score))}/100`} />
      ) : null}
    </View>
  );
}

function FilterRow({ values, selected, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

function ratingTextStyle(rating) {
  if (["STRONG_BUY", "BUY", "ACCUMULATE"].includes(rating)) {
    return [styles.ratingLabel, styles.positive];
  }
  if (rating === "HOLD") return [styles.ratingLabel, styles.warning];
  if (["REDUCE", "SELL", "AVOID"].includes(rating)) {
    return [styles.ratingLabel, styles.danger];
  }
  return [styles.ratingLabel, styles.info];
}

function severityTextStyle(severity) {
  if (["CRITICAL", "HIGH"].includes(severity)) return [styles.badge, styles.danger];
  if (severity === "MEDIUM") return [styles.badge, styles.warning];
  if (severity === "LOW") return [styles.badge, styles.positive];
  return [styles.badge, styles.info];
}

function nullablePercent(value) {
  if (value === null || value === undefined) return "Not available";
  return `${Number(value).toFixed(2)}%`;
}

function nullableMoney(value) {
  if (value === null || value === undefined) return "Not available";
  return `KES ${money(value)}`;
}

function nullableScore(value) {
  if (value === null || value === undefined) return "Not available";
  return `${Math.round(Number(value))}/100`;
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
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
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
  sectionDescription: { color: "#94a3b8", lineHeight: 20, marginTop: 7, marginBottom: 5 },
  componentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 13 },
  scoreMetric: { width: "47%", backgroundColor: "#020617", borderRadius: 14, padding: 13 },
  scoreMetricValue: { color: "white", fontSize: 22, fontWeight: "900" },
  scoreMetricUnavailable: { color: "#64748b", fontSize: 22, fontWeight: "900" },
  scoreMetricMaximum: { color: "#64748b", fontSize: 10 },
  scoreMetricLabel: { color: "#94a3b8", marginTop: 5 },
  progressTrack: {
    height: 7,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10
  },
  progressFill: { height: "100%", backgroundColor: "#22c55e", borderRadius: 8 },
  summaryCard: { backgroundColor: "#020617", borderRadius: 15, padding: 14, marginTop: 13 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14, marginTop: 10 },
  rowLabel: { color: "#94a3b8", flex: 1 },
  rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1 },
  narrativeCard: {
    backgroundColor: "rgba(147,51,234,.09)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  narrativeLabel: { color: "#c084fc", fontWeight: "900" },
  narrativeText: { color: "#e9d5ff", lineHeight: 22, marginTop: 8 },
  priorityCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 11
  },
  priorityLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "900" },
  priorityTitle: { color: "white", fontSize: 17, fontWeight: "900", marginTop: 6 },
  priorityScore: { color: "#86efac", fontWeight: "900", marginTop: 5 },
  messageCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
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
  messageTitle: { color: "white", fontWeight: "900", flex: 1 },
  cardText: { color: "#cbd5e1", lineHeight: 20, marginTop: 8 },
  ratingBlock: { alignItems: "flex-end" },
  ratingLabel: { fontSize: 11, fontWeight: "900" },
  ratingScore: { color: "white", fontWeight: "900", marginTop: 4 },
  factorHeadingPositive: { color: "#86efac", fontWeight: "900", marginTop: 12 },
  factorHeadingNegative: { color: "#fca5a5", fontWeight: "900", marginTop: 12 },
  factorText: { color: "#cbd5e1", marginTop: 5 },
  decisionCard: {
    backgroundColor: "rgba(14,165,233,.08)",
    borderColor: "rgba(14,165,233,.35)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  decisionLabel: { color: "#7dd3fc", fontWeight: "900" },
  decisionTitle: { color: "white", fontSize: 21, fontWeight: "900", marginTop: 6 },
  allocationAmount: { color: "#86efac", fontWeight: "900", textAlign: "right" },
  badge: { fontSize: 10, fontWeight: "900" },
  advisoryBadge: {
    backgroundColor: "rgba(59,130,246,.10)",
    borderRadius: 9,
    padding: 8,
    marginTop: 11,
    alignItems: "center"
  },
  qualityTitlePositive: { color: "#86efac", fontWeight: "900" },
  qualityTitleNegative: { color: "#fca5a5", fontWeight: "900" },
  filterRow: { gap: 8, paddingVertical: 14 },
  filterButton: { backgroundColor: "#1e293b", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12 },
  filterActive: { backgroundColor: "#0891b2" },
  filterText: { color: "#94a3b8", fontWeight: "900" },
  filterTextActive: { color: "white" },
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
  criticalBorder: { borderColor: "rgba(248,113,113,.75)" },
  highBorder: { borderColor: "rgba(239,68,68,.50)" },
  mediumBorder: { borderColor: "rgba(245,158,11,.45)" },
  infoBorder: { borderColor: "rgba(59,130,246,.40)" },
  positiveBorder: { borderColor: "rgba(34,197,94,.45)" },
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  applyRiskProfile,
  getOrCreateRiskConfiguration
} from "../src/features/risk/riskStore";
import {
  listRiskProfiles,
  RISK_PROFILE_TYPES
} from "../src/features/risk/riskProfiles";
import {
  buildCoachGRiskAdvice
} from "../src/features/risk/riskAdvisorService";
import { calculateResponsivePanelHeight } from "../src/components/mobile/MobileUI";

const PROFILE_ORDER = [
  RISK_PROFILE_TYPES.CONSERVATIVE,
  RISK_PROFILE_TYPES.MODERATE,
  RISK_PROFILE_TYPES.BALANCED,
  RISK_PROFILE_TYPES.GROWTH,
  RISK_PROFILE_TYPES.AGGRESSIVE
];

const ALERT_FILTERS = ["ALL", "HIGH", "MEDIUM", "INFO"];
const SCENARIO_FILTERS = [
  "ALL",
  "MARKET_SHOCK",
  "SECTOR_SHOCK",
  "SINGLE_HOLDING_SHOCK",
  "INFLATION_SHOCK",
  "INTEREST_RATE_SHOCK"
];

const RISK_SECTIONS = [
  {
    id: "assessment",
    title: "Coach G Risk Assessment",
    description: "Review the consolidated risk score, priority issue, insights, and actions."
  },
  {
    id: "profile",
    title: "Risk Profile & Limits",
    description: "Inspect or change the active policy and its saved risk thresholds."
  },
  {
    id: "concentration",
    title: "Concentration Analysis",
    description: "Inspect individual holding, top-position, and sector exposure."
  },
  {
    id: "diversification",
    title: "Diversification",
    description: "Review diversification components and improvement actions."
  },
  {
    id: "history",
    title: "Historical Risk Metrics",
    description: "Inspect genuine return history, volatility, drawdown, and risk ratios."
  },
  {
    id: "stress",
    title: "Stress Testing",
    description: "Review modeled losses without changing holdings, cash, or orders."
  },
  {
    id: "alerts",
    title: "Risk Alerts",
    description: "Review policy-based concentration and historical risk warnings."
  }
];

export default function PortfolioRiskScreen() {
  const params = useLocalSearchParams();
  const scrollRef = useRef(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(null);
  const [advisor, setAdvisor] = useState(null);
  const [configuration, setConfiguration] = useState(null);
  const [concentration, setConcentration] = useState(null);
  const [diversification, setDiversification] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [stressTests, setStressTests] = useState(null);
  const [error, setError] = useState("");
  const [alertFilter, setAlertFilter] = useState("ALL");
  const [scenarioFilter, setScenarioFilter] = useState("MARKET_SHOCK");
  const [activeSection, setActiveSection] = useState(null);
  const [selectedSector, setSelectedSector] = useState(null);

  const profiles = useMemo(() => {
    const all = listRiskProfiles();

    return PROFILE_ORDER
      .map((code) => all.find((profile) => profile.code === code))
      .filter(Boolean);
  }, []);

  const loadData = useCallback(async ({ showFullLoader = true } = {}) => {
    try {
      showFullLoader ? setLoading(true) : setRefreshing(true);
      setError("");

      await getOrCreateRiskConfiguration();
      const result = await buildCoachGRiskAdvice();

      setAdvisor(result || null);
      setConfiguration(result?.sources?.configuration || null);
      setConcentration(result?.sources?.concentration || null);
      setDiversification(result?.sources?.diversification || null);
      setMetrics(result?.sources?.metrics || null);
      setStressTests(result?.sources?.stressTests || null);
    } catch (loadError) {
      console.error("Unable to load Portfolio Risk Dashboard:", loadError);
      setError(loadError?.message || "Unable to load portfolio risk analytics.");
      setAdvisor(null);
      setConfiguration(null);
      setConcentration(null);
      setDiversification(null);
      setMetrics(null);
      setStressTests(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const alerts = useMemo(() => {
    const values = [
      ...(Array.isArray(concentration?.alerts) ? concentration.alerts : []),
      ...(Array.isArray(metrics?.alerts) ? metrics.alerts : [])
    ];

    const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, INFO: 1, LOW: 0 };

    return values.sort(
      (a, b) =>
        Number(rank[String(b?.severity || "").toUpperCase()] || 0) -
        Number(rank[String(a?.severity || "").toUpperCase()] || 0)
    );
  }, [concentration, metrics]);

  const visibleAlerts = useMemo(() => {
    if (alertFilter === "ALL") return alerts;

    return alerts.filter(
      (item) => String(item?.severity || "").toUpperCase() === alertFilter
    );
  }, [alerts, alertFilter]);

  const visibleScenarios = useMemo(() => {
    const values = Array.isArray(stressTests?.scenarios)
      ? stressTests.scenarios
      : [];

    if (scenarioFilter === "ALL") return values;

    return values.filter((item) => item?.scenarioType === scenarioFilter);
  }, [stressTests, scenarioFilter]);

  const selectedSectorHoldings = useMemo(() => {
    if (!selectedSector) return [];
    if (Array.isArray(selectedSector?.holdings)) return selectedSector.holdings;

    const selectedName = String(selectedSector?.sector || "").trim().toUpperCase();
    return Array.isArray(concentration?.holdings)
      ? concentration.holdings.filter((holding) =>
          String(holding?.sector || holding?.industry || "Unknown")
            .trim()
            .toUpperCase() === selectedName
        )
      : [];
  }, [concentration?.holdings, selectedSector]);

  async function handleApplyProfile(profile) {
    if (!profile?.code) return;

    const confirmed = await confirmAction({
      title: "Apply Risk Profile",
      message:
        `Apply the ${profile.label} risk profile?\n\n` +
        `${formatRiskLimitSummary(profile.limits)}\n\n` +
        "This updates saved risk thresholds only. It does not change holdings, cash, or place trades.",
      confirmLabel: "Apply Profile"
    });

    if (!confirmed) return;

    try {
      setSwitchingProfile(profile.code);
      await applyRiskProfile(profile.code);
      await loadData({ showFullLoader: false });
      showMessage(
        "Portfolio Risk",
        `${profile.label} risk profile applied successfully.`
      );
    } catch (profileError) {
      showMessage(
        "Portfolio Risk",
        profileError?.message || "Unable to apply the selected risk profile."
      );
    } finally {
      setSwitchingProfile(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loadingText}>Analyzing portfolio risk...</Text>
      </View>
    );
  }

  const portfolio =
    concentration?.portfolio || metrics?.portfolio || stressTests?.portfolio || {};
  const limits = configuration?.limits || {};
  const largestSector = concentration?.sectorConcentration?.largestSector || null;
  const worstScenario = stressTests?.summary?.worstScenario || null;
  const activeSectionIndex = RISK_SECTIONS.findIndex(
    (section) => section.id === activeSection
  );
  const previousSection = activeSectionIndex > 0 ? RISK_SECTIONS[activeSectionIndex - 1] : null;
  const nextSection = activeSectionIndex >= 0 && activeSectionIndex < RISK_SECTIONS.length - 1
    ? RISK_SECTIONS[activeSectionIndex + 1]
    : null;
  const detailPanelHeight = calculateResponsivePanelHeight(windowHeight);
  const moveToSection = (sectionId) => {
    setActiveSection(sectionId);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  };
  const exitRisk = () => router.canGoBack?.()
    ? router.back()
    : router.replace("/(tabs)/dashboard");
  const isCompact = windowWidth < 600;

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderText}>
          <Text style={styles.eyebrow}>PC-020</Text>
          <Text style={styles.title}>Portfolio Risk</Text>
          <Text style={styles.subtitle}>
            Review current REAL portfolio risk, then open one focused detail.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerButton} onPress={() => activeSection ? moveToSection(null) : exitRisk()}>
            <Text style={styles.headerButtonText}>{activeSection ? "Overview" : "‹ Back"}</Text>
          </Pressable>
          <Pressable style={styles.headerButton} onPress={() => router.replace("/(tabs)/dashboard")}>
            <Text style={styles.headerButtonText}>Home</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={activeSection ? styles.hidden : styles.hero}>
        <ScoreCircle value={diversification?.score} color="#f97316" />
        <View style={styles.heroText}>
          <Text style={styles.heroLabel}>Diversification Score</Text>
          <Text style={styles.heroGrade}>
            {diversification?.grade?.label || "Not Available"}
          </Text>
          <Text style={styles.heroDescription}>
            {diversification?.grade?.description ||
              "Portfolio diversification information is unavailable."}
          </Text>
        </View>
      </View>

      <View style={activeSection ? styles.hidden : styles.grid}>
        <Metric
  label="Holdings Market Value"
  value={`KES ${money(
    portfolio?.holdingsValue ??
    portfolio?.totalValue
  )}`}
/>
        <Metric label="Holdings" value={portfolio?.holdingsCount || 0} />
                <Metric
          label="Concentration Alerts"
          value={
            concentration?.status === "LIMIT_BREACH"
              ? `${concentration?.summary?.breached || 0} Breach${
                  Number(concentration?.summary?.breached || 0) === 1
                    ? ""
                    : "es"
                }`
              : Number(concentration?.summary?.warnings || 0) > 0
              ? `${concentration?.summary?.warnings || 0} Warning${
                  Number(concentration?.summary?.warnings || 0) === 1
                    ? ""
                    : "s"
                }`
              : "Within Limits"
          }
          danger={
            concentration?.status === "LIMIT_BREACH"
          }
        />
        <Metric label="Risk Metrics" value={formatLabel(metrics?.status || "NOT_READY")} />
        <Metric
          label="Stress Exposure"
          value={formatLabel(stressTests?.status || "NOT_READY")}
          danger={["HIGH_EXPOSURE", "CRITICAL_EXPOSURE"].includes(stressTests?.status)}
        />
        <Metric
          label="Active Profile"
          value={configuration?.profileLabel || "Not configured"}
        />
      </View>

      {!activeSection ? (
        <Section
          title="Risk Details"
          description="Choose one area to inspect. Each detail opens as a focused mobile screen."
        >
          <View style={[styles.detailMenu, isCompact && styles.detailMenuCompact]}>
            {RISK_SECTIONS.map((section) => (
              <Pressable
                key={section.id}
                style={[styles.detailButton, isCompact && styles.detailButtonCompact]}
                onPress={() => moveToSection(section.id)}
              >
                <View style={styles.detailButtonText}>
                  <Text style={styles.detailButtonTitle}>{section.title}</Text>
                  <Text style={styles.detailButtonDescription}>
                    {section.description}
                  </Text>
                </View>
                <Text style={styles.detailChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : (
        <View style={styles.detailNavigation}>
          <Pressable onPress={() => moveToSection(previousSection?.id || null)}>
            <Text style={styles.detailBack}>{previousSection ? `‹ Previous: ${previousSection.title}` : "‹ Risk Overview"}</Text>
          </Pressable>
          <Text style={styles.detailPosition}>
            {activeSectionIndex + 1} of {RISK_SECTIONS.length}
          </Text>
        </View>
      )}

      {activeSection ? (
      <View style={[styles.detailPanel, { height: detailPanelHeight }]}>
      <ScrollView style={styles.detailPanelScroll} contentContainerStyle={styles.detailPanelContent} nestedScrollEnabled showsVerticalScrollIndicator>
      <Section
        style={activeSection === "assessment" ? null : styles.hidden}
        title="Coach G Risk Assessment"
        description="A consolidated assessment of concentration, diversification, stress resilience, and available historical evidence."
      >
        <View style={styles.heroDark}>
          <ScoreCircle value={advisor?.health?.overallScore} color="#c084fc" />
          <View style={styles.heroText}>
            <Text style={styles.advisorGrade}>
              {advisor?.health?.grade?.label || "Not Available"}
            </Text>
            <Text style={styles.riskLevel}>
              Risk Level: {formatLabel(advisor?.health?.grade?.riskLevel || "UNKNOWN")}
            </Text>
            <Text style={styles.heroDescription}>
              {advisor?.health?.grade?.description ||
                "Coach G risk guidance is not currently available."}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <ScoreMetric
            label="Diversification"
            value={advisor?.health?.components?.diversification}
          />
          <ScoreMetric
            label="Concentration"
            value={advisor?.health?.components?.concentration}
          />
          <ScoreMetric
            label="Stress Resilience"
            value={advisor?.health?.components?.stressResilience}
          />
          <ScoreMetric
            label="Historical Risk"
            value={advisor?.health?.components?.historicalRisk}
            unavailableLabel="Not enough history"
          />
        </View>

        <View style={styles.darkCard}>
          <Row
            label="Advisor Status"
            value={formatLabel(advisor?.status || "NOT_READY")}
            danger={["ACTION_REQUIRED", "CRITICAL_REVIEW"].includes(advisor?.status)}
          />
          <Row
            label="Concentration Breaches"
            value={advisor?.concentration?.breached || 0}
            danger={Number(advisor?.concentration?.breached || 0) > 0}
          />
          <Row
            label="Concentration Warnings"
            value={advisor?.concentration?.warnings || 0}
          />
          <Row
            label="Historical Observations"
            value={advisor?.historicalRisk?.returnObservations || 0}
          />
          <Row
            label="Stress Status"
            value={formatLabel(advisor?.stress?.status || "UNKNOWN")}
            danger={["HIGH_EXPOSURE", "CRITICAL_EXPOSURE"].includes(
              advisor?.stress?.status
            )}
          />
        </View>

        <View
          style={[
            styles.priorityCard,
            advisor?.priorityIssue?.severity === "HIGH" && styles.priorityHigh,
            advisor?.priorityIssue?.severity === "CRITICAL" &&
              styles.priorityCritical
          ]}
        >
          <Text style={styles.priorityLabel}>Highest-Priority Risk Issue</Text>
          <Text style={styles.priorityTitle}>
            {advisor?.priorityIssue?.title || "No material risk issue"}
          </Text>
          <Text style={styles.cardText}>
            {advisor?.priorityIssue?.message ||
              "The available portfolio risk checks did not identify a material issue."}
          </Text>
          <Text style={styles.prioritySeverity}>
            Severity: {formatLabel(advisor?.priorityIssue?.severity || "NONE")}
          </Text>
        </View>

        <View style={styles.summaryCardPurple}>
          <Text style={styles.summaryLabel}>Coach G Summary</Text>
          <Text style={styles.summaryText}>
            {advisor?.summary || "No Coach G risk summary is currently available."}
          </Text>
        </View>

        <Text style={styles.subheading}>Risk Insights</Text>
        {Array.isArray(advisor?.insights) && advisor.insights.length ? (
          advisor.insights.map((insight, index) => (
            <InsightCard
              key={insight?.code || `RISK-INSIGHT-${index}`}
              insight={insight}
            />
          ))
        ) : (
          <SuccessCard
            title="No Material Risk Insights"
            message="Coach G did not identify an additional risk issue."
          />
        )}

        <Text style={styles.subheading}>Recommended Review Actions</Text>
        {Array.isArray(advisor?.recommendedActions) &&
        advisor.recommendedActions.length ? (
          advisor.recommendedActions.map((action, index) => (
            <ActionCard
              key={action?.code || `RISK-ACTION-${index}`}
              action={action}
            />
          ))
        ) : (
          <SuccessCard
            title="No Immediate Review Actions"
            message="No additional Coach G risk-review action is currently required."
          />
        )}
      </Section>

      <Section
        style={activeSection === "profile" ? null : styles.hidden}
        title="Risk Profile"
        description="The active policy controls concentration, volatility, drawdown, liquidity, and alert thresholds."
      >
        <View style={styles.darkCard}>
          <Row
            label="Profile"
            value={configuration?.profileLabel || "Not configured"}
            highlight
          />
          <Row label="Status" value={formatLabel(configuration?.status || "UNKNOWN")} />
          <Row label="Source" value={formatLabel(configuration?.source || "UNKNOWN")} />
          <Row label="Updated" value={formatDateTime(configuration?.updatedAt)} />
        </View>

        {profiles.map((profile) => {
          const active = configuration?.profileType === profile.code;
          const processing = switchingProfile === profile.code;

          return (
            <Pressable
              key={profile.code}
              disabled={processing}
              style={[
                styles.profileCard,
                active && styles.profileActive,
                processing && styles.disabled
              ]}
              onPress={() => handleApplyProfile(profile)}
            >
              <Text style={[styles.profileTitle, active && styles.profileTitleActive]}>
                {profile.label}
              </Text>
              <Text style={styles.cardText}>{profile.description}</Text>
              <Row
                label="Single Holding"
                value={`${Number(
                  profile?.limits?.maximumSingleHoldingPercentage || 0
                ).toFixed(0)}% max`}
              />
              <Row
                label="Sector"
                value={`${Number(
                  profile?.limits?.maximumSectorPercentage || 0
                ).toFixed(0)}% max`}
              />
              <Row
                label="Cash"
                value={`${Number(
                  profile?.limits?.minimumCashPercentage || 0
                ).toFixed(0)}% min`}
              />
              <Row
                label="Drawdown"
                value={`${Number(
                  profile?.limits?.maximumDrawdownPercentage || 0
                ).toFixed(0)}% max`}
              />
              <View style={styles.profileButton}>
                {processing ? (
                  <ActivityIndicator color="#67e8f9" />
                ) : (
                  <Text style={styles.profileButtonText}>
                    {active ? "Active Profile" : "Apply Profile"}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </Section>

      <Section
        style={activeSection === "profile" ? null : styles.hidden}
        title="Configured Risk Limits"
        description="Current portfolio analytics are evaluated against these thresholds."
      >
        <LimitGrid limits={limits} />
      </Section>

      <Section
        style={activeSection === "concentration" ? null : styles.hidden}
        title="Concentration Analysis"
        description="Review sector exposure first, then tap a sector to inspect its securities."
      >
        <View style={styles.darkCard}>
          <Row label="Largest Sector" value={largestSector?.sector || "Not available"} />
          <Row
            label="Largest Sector %"
            value={`${Number(
              concentration?.sectorConcentration?.largestSectorPercentage || 0
            ).toFixed(2)}%`}
            danger={
              Number(
                concentration?.sectorConcentration?.largestSectorPercentage || 0
              ) > Number(limits?.maximumSectorPercentage || 0)
            }
          />
          <Row
            label="Effective Sectors"
            value={Number(
              concentration?.sectorConcentration?.effectiveSectors || 0
            ).toFixed(2)}
          />
          <Row
            label="Sector Limit"
            value={`${Number(limits?.maximumSectorPercentage || 0).toFixed(2)}%`}
          />
        </View>

        <Text style={styles.subheading}>Sector Exposure</Text>
        {Array.isArray(concentration?.sectors) && concentration.sectors.length ? (
          concentration.sectors.map((sector) => (
            <ExposureCard
              key={sector.sector}
              title={sector.sector}
              subtitle={`${sector.holdingsCount} holding(s)`}
              percentage={sector.percentage}
              value={sector.value}
              status={sector?.limit?.status}
              limit={sector?.limit?.limitValue}
              onPress={() => setSelectedSector(sector)}
              actionLabel="View securities"
            />
          ))
        ) : (
          <EmptyState
            title="No Sector Exposure"
            message="No sector-level concentration data is available."
          />
        )}
      </Section>

      <Modal
        visible={Boolean(selectedSector)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSector(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>SECTOR SECURITIES</Text>
                <Text style={styles.modalTitle}>{selectedSector?.sector || "Sector"}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedSectorHoldings.length} security{selectedSectorHoldings.length === 1 ? "" : "ies"} • KES {money(selectedSector?.value)}
                </Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setSelectedSector(null)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedSectorHoldings.length ? selectedSectorHoldings.map((holding) => (
                <ExposureCard
                  key={holding?.symbol || holding?.name}
                  title={holding?.symbol || "Security"}
                  subtitle={holding?.name || holding?.symbol || "Security"}
                  percentage={holding?.allocationPercentage ?? holding?.percentage}
                  value={holding?.marketValue ?? holding?.value}
                  status={holding?.limit?.status}
                  limit={holding?.limit?.limitValue ?? limits?.maximumSingleHoldingPercentage}
                />
              )) : (
                <EmptyState
                  title="No Securities Available"
                  message="The selected sector has no security-level concentration evidence."
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Section
        style={activeSection === "diversification" ? null : styles.hidden}
        title="Diversification"
        description="Combines holding count, concentration, HHI, effective holdings, and sector distribution."
      >
        <View style={styles.scoreHero}>
          <Text style={styles.scoreHeroValue}>{diversification?.score || 0}</Text>
          <Text style={styles.muted}>/100</Text>
          <Text style={styles.scoreHeroGrade}>
            {diversification?.grade?.label || "Not Available"}
          </Text>
        </View>

        <View style={styles.grid}>
          <ScoreMetric
            label="Holding Count"
            value={diversification?.components?.holdingCount}
          />
          <ScoreMetric
            label="Effective Holdings"
            value={diversification?.components?.effectiveHoldings}
          />
          <ScoreMetric
            label="Largest Holding"
            value={diversification?.components?.largestHolding}
          />
          <ScoreMetric
            label="Top Three"
            value={diversification?.components?.topThree}
          />
          <ScoreMetric
            label="Holding HHI"
            value={diversification?.components?.holdingHhi}
          />
          <ScoreMetric
            label="Sector Diversity"
            value={diversification?.components?.sectorDiversification}
          />
        </View>

        {Array.isArray(diversification?.improvementActions) &&
        diversification.improvementActions.length ? (
          <>
            <Text style={styles.subheading}>Improvement Actions</Text>
            {diversification.improvementActions.map((action, index) => (
              <ActionCard
                key={action?.code || `DIVERSIFICATION-${index}`}
                action={action}
              />
            ))}
          </>
        ) : (
          <SuccessCard
            title="No Diversification Actions"
            message="No immediate diversification improvement actions were generated."
          />
        )}
      </Section>

      <Section
        style={activeSection === "history" ? null : styles.hidden}
        title="Historical Risk Metrics"
        description="Calculated only from genuine Portfolio Event Ledger valuation history."
      >
        <View style={styles.darkCard}>
          <Row
            label="History Status"
            value={formatLabel(metrics?.history?.status || "NOT_AVAILABLE")}
          />
          <Row
            label="Return Observations"
            value={metrics?.history?.returnObservations || 0}
          />
          <Row
            label="Required for Preliminary"
            value={metrics?.history?.minimumPreliminaryReturns || 0}
          />
          <Row
            label="Required for Reliable"
            value={metrics?.history?.minimumReliableReturns || 0}
          />
        </View>

        <View style={styles.grid}>
          <Metric
            label="Annualized Return"
            value={nullablePercent(metrics?.returns?.annualizedReturnPercentage)}
          />
          <Metric
            label="Annualized Volatility"
            value={nullablePercent(
              metrics?.volatility?.annualizedVolatilityPercentage
            )}
          />
          <Metric
            label="Downside Deviation"
            value={nullablePercent(metrics?.volatility?.downsideDeviationPercentage)}
          />
          <Metric
            label="Maximum Drawdown"
            value={nullablePercent(metrics?.drawdown?.maximumDrawdownPercentage)}
          />
          <Metric
            label="Sharpe Ratio"
            value={nullableMetric(metrics?.ratios?.sharpeRatio)}
          />
          <Metric
            label="Sortino Ratio"
            value={nullableMetric(metrics?.ratios?.sortinoRatio)}
          />
          <Metric
            label="Historical VaR"
            value={nullablePercent(metrics?.valueAtRisk?.valueAtRiskPercentage)}
          />
          <Metric
            label="Historical CVaR"
            value={nullablePercent(
              metrics?.valueAtRisk?.conditionalValueAtRiskPercentage
            )}
          />
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Historical Data Integrity</Text>
          <Text style={styles.noticeText}>
            GateCEP does not fabricate historical returns. Metrics remain
            unavailable or preliminary until sufficient genuine portfolio
            valuation observations exist.
          </Text>
        </View>
      </Section>

      <Section
        style={activeSection === "stress" ? null : styles.hidden}
        title="Stress Testing"
        description="Models portfolio losses without modifying holdings, cash, or orders."
      >
        <View style={styles.worstCard}>
          <Text style={styles.priorityLabel}>Worst Modeled Scenario</Text>
          <Text style={styles.priorityTitle}>
            {worstScenario?.label || "No scenario available"}
          </Text>
          <Row
            label="Estimated Loss"
            value={`KES ${money(worstScenario?.lossAmount)}`}
            danger
          />
          <Row
            label="Loss Percentage"
            value={`${Number(worstScenario?.lossPercentage || 0).toFixed(2)}%`}
            danger
          />
          <Row
            label="Stressed Value"
            value={`KES ${money(worstScenario?.stressedPortfolioValue)}`}
          />
          <Row
            label="Severity"
            value={formatLabel(worstScenario?.severity || "NONE")}
          />
          <Row
            label="Largest Contributor"
            value={
              worstScenario?.largestContributor?.symbol ||
              worstScenario?.largestContributor?.sector ||
              "Not available"
            }
          />
        </View>

        <FilterRow
          values={SCENARIO_FILTERS}
          selected={scenarioFilter}
          onSelect={setScenarioFilter}
        />

        {visibleScenarios.length ? (
          visibleScenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))
        ) : (
          <EmptyState
            title="No Stress Scenarios"
            message="No scenarios are available for the selected category."
          />
        )}
      </Section>

      <Section
        style={activeSection === "alerts" ? null : styles.hidden}
        title="Risk Alerts"
        description="Combined concentration and historical risk warnings generated against the active policy."
      >
        <FilterRow
          values={ALERT_FILTERS}
          selected={alertFilter}
          onSelect={setAlertFilter}
        />

        {visibleAlerts.length ? (
          visibleAlerts.map((alert, index) => (
            <InsightCard key={alert?.id || `ALERT-${index}`} insight={alert} />
          ))
        ) : (
          <SuccessCard
            title="No Alerts"
            message="No risk alerts match the selected filter."
          />
        )}
      </Section>
      </ScrollView>
      </View>
      ) : null}

      <View style={activeSection ? styles.protectionCard : styles.hidden}>
        <Text style={styles.protectionTitle}>Analytics Only</Text>
        <Text style={styles.protectionText}>
          PC-020 does not place trades, change holdings, modify cash, or submit
          broker instructions. Risk results and stress losses are planning
          estimates produced from the current portfolio, saved limits, and
          available history.
        </Text>
      </View>

      {!activeSection ? (
        <Pressable
          disabled={refreshing}
          style={[styles.primaryButton, refreshing && styles.disabled]}
          onPress={() => loadData({ showFullLoader: false })}
        >
          {refreshing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Refresh Risk Analytics</Text>
          )}
        </Pressable>
      ) : null}

      <Pressable
        style={styles.secondaryButton}
        onPress={() =>
          activeSection
            ? moveToSection(nextSection?.id || null)
            : exitRisk()
        }
      >
        <Text style={styles.secondaryButtonText}>
          {activeSection
            ? nextSection ? `Next: ${nextSection.title} ›` : "Finish: Risk Overview"
            : "Back to Previous Page"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, description, children, style }) {
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? (
        <Text style={styles.sectionDescription}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
}

function ScoreCircle({ value, color }) {
  return (
    <View style={[styles.scoreCircle, { borderColor: color }]}>
      <Text style={styles.scoreCircleValue}>{Number(value || 0)}</Text>
      <Text style={styles.scoreCircleMax}>/100</Text>
    </View>
  );
}

function Metric({ label, value, danger = false }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, danger && styles.danger]}>
        {String(value)}
      </Text>
    </View>
  );
}

function Row({ label, value, highlight = false, danger = false }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          highlight && styles.highlight,
          danger && styles.danger
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
      <Text style={available ? styles.scoreMetricValue : styles.mutedValue}>
        {available ? score : "N/A"}
      </Text>
      {available ? <Text style={styles.smallMuted}>/100</Text> : null}
      <Text style={styles.scoreMetricLabel}>{label}</Text>
      {available ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressGreen, { width: `${score}%` }]} />
        </View>
      ) : (
        <Text style={styles.smallMuted}>{unavailableLabel}</Text>
      )}
    </View>
  );
}

function LimitGrid({ limits }) {
  const entries = [
    ["Single Holding Maximum", `${numberText(limits?.maximumSingleHoldingPercentage)}%`],
    ["Sector Maximum", `${numberText(limits?.maximumSectorPercentage)}%`],
    ["Cash Minimum", `${numberText(limits?.minimumCashPercentage)}%`],
    ["Equity Maximum", `${numberText(limits?.maximumEquityPercentage)}%`],
    ["Target Volatility", `${numberText(limits?.targetVolatilityPercentage)}%`],
    ["Drawdown Maximum", `${numberText(limits?.maximumDrawdownPercentage)}%`],
    ["Minimum Holdings", limits?.minimumHoldingsCount || 0],
    ["Top Three Maximum", `${numberText(limits?.maximumTopThreePercentage)}%`],
    ["Illiquid Maximum", `${numberText(limits?.maximumIlliquidPercentage)}%`],
    [
      "Liquidity Coverage",
      `${Number(limits?.minimumLiquidityCoverageMonths || 0).toFixed(1)} months`
    ],
    ["Warning Threshold", `${numberText(limits?.alertWarningThresholdPercentage)}%`],
    ["Critical Threshold", `${numberText(limits?.alertCriticalThresholdPercentage)}%`]
  ];

  return (
    <View style={styles.grid}>
      {entries.map(([label, value]) => (
        <Metric key={label} label={label} value={value} />
      ))}
    </View>
  );
}

function ExposureCard({
  title,
  subtitle,
  percentage,
  value,
  status,
  limit,
  onPress,
  actionLabel
}) {
  const progress = Math.min(Math.max(Number(percentage || 0), 0), 100);

  const Card = onPress ? Pressable : View;

  return (
    <Card
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={[
        styles.exposureCard,
        status === "BREACHED" && styles.borderHigh,
        status === "WARNING" && styles.borderMedium
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Text
          style={[
            styles.badge,
            status === "BREACHED" && styles.danger,
            status === "WARNING" && styles.warning,
            status === "WITHIN_LIMIT" && styles.highlight
          ]}
        >
          {formatLabel(status || "UNKNOWN")}
        </Text>
      </View>

      <Row
        label="Portfolio Allocation"
        value={`${Number(percentage || 0).toFixed(2)}%`}
      />
      <Row
        label="Configured Limit"
        value={`${Number(limit || 0).toFixed(2)}%`}
      />
      <Row label="Market Value" value={`KES ${money(value)}`} />

      <View style={styles.progressTrack}>
        <View style={[styles.progressOrange, { width: `${progress}%` }]} />
      </View>
      {onPress ? (
        <View style={styles.exposureAction}>
          <Text style={styles.exposureActionText}>{actionLabel || "Open details"}</Text>
          <Text style={styles.exposureActionChevron}>›</Text>
        </View>
      ) : null}
    </Card>
  );
}

function InsightCard({ insight }) {
  const severity = String(insight?.severity || "INFO").toUpperCase();

  return (
    <View
      style={[
        styles.messageCard,
        ["CRITICAL", "HIGH"].includes(severity) && styles.borderHigh,
        severity === "MEDIUM" && styles.borderMedium,
        severity === "INFO" && styles.borderInfo
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.messageTitle}>
          {insight?.title ||
            insight?.label ||
            formatLabel(insight?.type || "RISK_ALERT")}
        </Text>
        <Text
          style={[
            styles.badge,
            ["CRITICAL", "HIGH"].includes(severity) && styles.danger,
            severity === "MEDIUM" && styles.warning,
            severity === "INFO" && styles.info
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
        priority === "HIGH" && styles.borderHigh,
        priority === "MEDIUM" && styles.borderMedium
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.messageTitle}>
          {action?.title || "Risk Review Action"}
        </Text>
        <Text style={[styles.badge, priority === "HIGH" ? styles.danger : styles.warning]}>
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

function ScenarioCard({ scenario }) {
  return (
    <View
      style={[
        styles.messageCard,
        ["CRITICAL", "HIGH"].includes(scenario?.severity) && styles.borderHigh,
        scenario?.severity === "MEDIUM" && styles.borderMedium
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{scenario.label}</Text>
          <Text style={styles.cardSubtitle}>
            {formatLabel(scenario?.scenarioType)}
          </Text>
        </View>
        <Text style={[styles.badge, styles.warning]}>
          {formatLabel(scenario?.severity || "NONE")}
        </Text>
      </View>

      <Text style={styles.cardText}>{scenario.description}</Text>
      <Row
        label="Current Value"
        value={`KES ${money(scenario?.currentPortfolioValue)}`}
      />
      <Row
        label="Stressed Value"
        value={`KES ${money(scenario?.stressedPortfolioValue)}`}
      />
      <Row
        label="Estimated Loss"
        value={`KES ${money(scenario?.lossAmount)}`}
        danger={Number(scenario?.lossAmount || 0) > 0}
      />
      <Row
        label="Loss Percentage"
        value={`${Number(scenario?.lossPercentage || 0).toFixed(2)}%`}
        danger={Number(scenario?.lossPercentage || 0) > 0}
      />
      <Row
        label="Largest Contributor"
        value={
          scenario?.largestContributor?.symbol ||
          scenario?.largestContributor?.sector ||
          "Not available"
        }
      />
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
          <Text
            style={[
              styles.filterText,
              selected === value && styles.filterTextActive
            ]}
          >
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
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.cardText}>{message}</Text>
    </View>
  );
}

function formatRiskLimitSummary(limits = {}) {
  return [
    `Single holding: ${Number(
      limits?.maximumSingleHoldingPercentage || 0
    ).toFixed(0)}% maximum`,
    `Sector: ${Number(limits?.maximumSectorPercentage || 0).toFixed(0)}% maximum`,
    `Cash: ${Number(limits?.minimumCashPercentage || 0).toFixed(0)}% minimum`,
    `Volatility: ${Number(
      limits?.targetVolatilityPercentage || 0
    ).toFixed(0)}% target`,
    `Drawdown: ${Number(
      limits?.maximumDrawdownPercentage || 0
    ).toFixed(0)}% maximum`
  ].join("\n");
}

function numberText(value) {
  return Number(value || 0).toFixed(2);
}

function nullablePercent(value) {
  return value === null || value === undefined
    ? "Not available"
    : `${Number(value).toFixed(2)}%`;
}

function nullableMetric(value) {
  return value === null || value === undefined
    ? "Not available"
    : Number(value).toFixed(4);
}

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString("en-US");
}

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function showMessage(title, message) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

async function confirmAction({ title, message, confirmLabel }) {
  if (Platform.OS === "web") {
    return window.confirm(message);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      title,
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => finish(false)
        },
        {
          text: confirmLabel || "Confirm",
          onPress: () => finish(true)
        }
      ],
      {
        cancelable: true,
        onDismiss: () => finish(false)
      }
    );
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 110,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center"
  },
  detailPanel: { marginTop: 14, overflow: "hidden" },
  detailPanelScroll: { flex: 1 },
  detailPanelContent: { paddingBottom: 8 },
  hidden: {
    display: "none"
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14
  },
  pageHeaderText: {
    flex: 1
  },
  headerActions: { flexDirection: "row", gap: 6 },
  headerButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  detailMenu: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  detailMenuCompact: {
    flexDirection: "column"
  },
  detailButton: {
    width: "48%",
    minHeight: 84,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#020617",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  detailButtonCompact: {
    width: "100%"
  },
  detailButtonText: {
    flex: 1
  },
  detailButtonTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "900"
  },
  detailButtonDescription: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5
  },
  detailChevron: {
    color: "#c084fc",
    fontSize: 26,
    fontWeight: "900"
  },
  detailNavigation: {
    marginTop: 18,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  detailBack: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  detailPosition: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800"
  },
  centerScreen: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 14
  },
  eyebrow: {
    color: "#f97316",
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
  hero: {
    backgroundColor: "rgba(249,115,22,.10)",
    borderColor: "rgba(249,115,22,.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 17
  },
  heroDark: {
    backgroundColor: "#020617",
    borderRadius: 17,
    padding: 16,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  scoreCircleValue: {
    color: "#86efac",
    fontSize: 29,
    fontWeight: "900"
  },
  scoreCircleMax: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "900"
  },
  heroText: {
    flex: 1
  },
  heroLabel: {
    color: "#fdba74",
    fontWeight: "900"
  },
  heroGrade: {
    color: "white",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 5
  },
  advisorGrade: {
    color: "#c084fc",
    fontSize: 22,
    fontWeight: "900"
  },
  riskLevel: {
    color: "#fdba74",
    fontWeight: "900",
    marginTop: 5
  },
  heroDescription: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginTop: 7
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 13
  },
  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 11
  },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6
  },
  section: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
    marginTop: 20
  },
  sectionTitle: {
    color: "#67e8f9",
    fontSize: 19,
    fontWeight: "900"
  },
  sectionDescription: {
    color: "#94a3b8",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 5
  },
  darkCard: {
    backgroundColor: "#020617",
    borderRadius: 15,
    padding: 14,
    marginTop: 13
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
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
  highlight: {
    color: "#86efac"
  },
  danger: {
    color: "#fca5a5"
  },
  warning: {
    color: "#fde68a"
  },
  info: {
    color: "#93c5fd"
  },
  advisorStatusCard: {
    backgroundColor: "#020617",
    borderRadius: 15,
    padding: 14,
    marginTop: 13
  },
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
    borderColor: "rgba(239,68,68,.40)"
  },
  priorityCritical: {
    backgroundColor: "rgba(127,29,29,.24)",
    borderColor: "rgba(248,113,113,.65)"
  },
  priorityLabel: {
    color: "#fde68a",
    fontSize: 11,
    fontWeight: "900"
  },
  priorityTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 7
  },
  prioritySeverity: {
    color: "#fca5a5",
    fontWeight: "900",
    marginTop: 10
  },
  summaryCardPurple: {
    backgroundColor: "rgba(147,51,234,.09)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  summaryLabel: {
    color: "#c084fc",
    fontWeight: "900"
  },
  summaryText: {
    color: "#e9d5ff",
    lineHeight: 22,
    marginTop: 8
  },
  subheading: {
    color: "#67e8f9",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 19
  },
  scoreMetric: {
    width: "47%",
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 13
  },
  scoreMetricValue: {
    color: "white",
    fontSize: 22,
    fontWeight: "900"
  },
  mutedValue: {
    color: "#64748b",
    fontSize: 22,
    fontWeight: "900"
  },
  scoreMetricLabel: {
    color: "#94a3b8",
    marginTop: 5
  },
  smallMuted: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 4
  },
  muted: {
    color: "#64748b",
    fontWeight: "900"
  },
  progressTrack: {
    height: 7,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10
  },
  progressGreen: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 8
  },
  progressOrange: {
    height: "100%",
    backgroundColor: "#f97316",
    borderRadius: 8
  },
  profileCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginTop: 12
  },
  profileActive: {
    borderColor: "#f97316",
    backgroundColor: "rgba(249,115,22,.08)"
  },
  profileTitle: {
    color: "#67e8f9",
    fontSize: 17,
    fontWeight: "900"
  },
  profileTitleActive: {
    color: "#fdba74"
  },
  profileButton: {
    backgroundColor: "#1e293b",
    borderRadius: 11,
    padding: 10,
    marginTop: 13,
    minHeight: 39,
    justifyContent: "center"
  },
  profileButtonText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  exposureCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginTop: 12
  },

  exposureAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopColor: "#1e293b",
    borderTopWidth: 1,
    marginTop: 13,
    paddingTop: 12
  },

  exposureActionText: {
    color: "#67e8f9",
    fontWeight: "900"
  },

  exposureActionChevron: {
    color: "#e879f9",
    fontSize: 24,
    fontWeight: "900"
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,.78)"
  },

  modalSheet: {
    maxHeight: "88%",
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomColor: "#263247",
    borderBottomWidth: 1
  },

  modalEyebrow: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },

  modalTitle: {
    color: "white",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3
  },

  modalSubtitle: {
    color: "#94a3b8",
    marginTop: 4
  },

  modalClose: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginLeft: 12
  },

  modalCloseText: {
    color: "#67e8f9",
    fontWeight: "900"
  },

  modalContent: {
    padding: 16,
    paddingBottom: 30
  },
  messageCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 11
  },
  borderHigh: {
    borderColor: "rgba(239,68,68,.50)"
  },
  borderMedium: {
    borderColor: "rgba(245,158,11,.45)"
  },
  borderInfo: {
    borderColor: "rgba(59,130,246,.40)"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 17,
    fontWeight: "900"
  },
  cardSubtitle: {
    color: "#94a3b8",
    marginTop: 3
  },
  cardText: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginTop: 8
  },
  messageTitle: {
    color: "white",
    fontWeight: "900",
    flex: 1
  },
  badge: {
    fontSize: 10,
    fontWeight: "900"
  },
  advisoryBadge: {
    backgroundColor: "rgba(59,130,246,.10)",
    borderRadius: 9,
    padding: 8,
    marginTop: 11,
    alignItems: "center"
  },
  scoreHero: {
    backgroundColor: "#020617",
    borderRadius: 15,
    padding: 18,
    marginTop: 14,
    alignItems: "center"
  },
  scoreHeroValue: {
    color: "#86efac",
    fontSize: 38,
    fontWeight: "900"
  },
  scoreHeroGrade: {
    color: "#c084fc",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 7
  },
  noticeCard: {
    backgroundColor: "rgba(59,130,246,.09)",
    borderColor: "rgba(59,130,246,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14
  },
  noticeTitle: {
    color: "#93c5fd",
    fontWeight: "900"
  },
  noticeText: {
    color: "#dbeafe",
    lineHeight: 20,
    marginTop: 7
  },
  worstCard: {
    backgroundColor: "rgba(239,68,68,.08)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginTop: 14
  },
  filterRow: {
    gap: 8,
    paddingVertical: 14
  },
  filterButton: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12
  },
  filterActive: {
    backgroundColor: "#f97316"
  },
  filterText: {
    color: "#94a3b8",
    fontWeight: "900"
  },
  filterTextActive: {
    color: "white"
  },
  successCard: {
    backgroundColor: "rgba(34,197,94,.08)",
    borderRadius: 14,
    padding: 14,
    marginTop: 13
  },
  successTitle: {
    color: "#86efac",
    fontWeight: "900"
  },
  successText: {
    color: "#d1fae5",
    lineHeight: 20,
    marginTop: 7
  },
  emptyCard: {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginTop: 13
  },
  protectionCard: {
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
    marginTop: 20
  },
  protectionTitle: {
    color: "#fde68a",
    fontWeight: "900"
  },
  protectionText: {
    color: "#fef3c7",
    lineHeight: 21,
    marginTop: 7
  },
  primaryButton: {
    backgroundColor: "#f97316",
    padding: 17,
    borderRadius: 17,
    marginTop: 15
  },
  primaryButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 17,
    marginTop: 12
  },
  secondaryButtonText: {
    color: "#67e8f9",
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
  errorText: {
    color: "#fca5a5"
  },
  disabled: {
    opacity: 0.6
  }
});

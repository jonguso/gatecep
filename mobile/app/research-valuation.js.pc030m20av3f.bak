import React, {
  useCallback,
  useEffect,
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
  router
} from "expo-router";

import {
  buildUnifiedPortfolioAnalytics
} from "../src/features/analytics/unifiedPortfolioAnalyticsService";

import {
  buildResearchMarketIntelligence
} from "../src/features/research-valuation/researchReportService";

/*
 * ============================================================
 * PC-023B7
 * RESEARCH AND VALUATION DASHBOARD
 * ============================================================
 *
 * This screen:
 *
 * - loads portfolio holdings,
 * - runs the PC-023B research pipeline,
 * - ranks stock research reports,
 * - displays valuation, forecasts, thesis, confidence,
 * - exposes bull case, bear case, catalysts, risks,
 * - shows buy-under and sell-over price levels,
 * - remains advisory only.
 * ============================================================
 */

const REPORT_FILTERS = [
  "ALL",
  "VERY_ATTRACTIVE",
  "ATTRACTIVE",
  "MODERATELY_ATTRACTIVE",
  "BALANCED",
  "CAUTIOUS",
  "UNATTRACTIVE",
  "HIGH_RISK",
  "NOT_RATED"
];

const DETAIL_TABS = [
  "OVERVIEW",
  "VALUATION",
  "FORECAST",
  "THESIS",
  "RISKS"
];

export default function ResearchValuationScreen() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const [
    analytics,
    setAnalytics
  ] = useState(null);

  const [
    intelligence,
    setIntelligence
  ] = useState(null);

  const [
    selectedSymbol,
    setSelectedSymbol
  ] = useState(null);

  const [
    reportFilter,
    setReportFilter
  ] = useState("ALL");

  const [
    detailTab,
    setDetailTab
  ] = useState("OVERVIEW");

  const loadData =
    useCallback(
      async ({
        fullLoader = true
      } = {}) => {
        try {
          if (fullLoader) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          const portfolioAnalytics =
            await buildUnifiedPortfolioAnalytics();

          const holdings =
            Array.isArray(
              portfolioAnalytics?.holdings
            )
              ? portfolioAnalytics.holdings
              : [];

          const securities =
            holdings.map(
              (holding) => ({
                ...holding,

                currentPrice:
                  holding?.currentPrice ??
                  holding?.marketPrice ??
                  holding?.price,

                earningsPerShare:
                  holding?.earningsPerShare ??
                  holding?.eps,

                currentEarningsPerShare:
                  holding?.currentEarningsPerShare ??
                  holding?.earningsPerShare ??
                  holding?.eps,

                currentDividendPerShare:
                  holding?.currentDividendPerShare ??
                  holding?.dividendPerShare,

                currentFreeCashFlow:
                  holding?.currentFreeCashFlow ??
                  holding?.freeCashFlow,

                currentRevenue:
                  holding?.currentRevenue ??
                  holding?.revenue,

                currentEarnings:
                  holding?.currentEarnings ??
                  holding?.netIncome
              })
            );

          const research =
            buildResearchMarketIntelligence({
              securities
            });

          setAnalytics(
            portfolioAnalytics
          );

          setIntelligence(
            research
          );

          const firstSymbol =
            research
              ?.reports?.[0]
              ?.symbol ||
            securities?.[0]
              ?.symbol ||
            null;

          setSelectedSymbol(
            (current) =>
              current ||
              firstSymbol
          );
        } catch (
          loadError
        ) {
          console.error(
            "Unable to load PC-023B research intelligence:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load research and valuation intelligence."
          );

          setAnalytics(null);
          setIntelligence(null);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadData();
    },
    [
      loadData
    ]
  );

  const reports =
    useMemo(
      () =>
        Array.isArray(
          intelligence?.reports
        )
          ? intelligence.reports
          : [],
      [
        intelligence
      ]
    );

  const visibleReports =
    useMemo(
      () => {
        if (
          reportFilter ===
          "ALL"
        ) {
          return reports;
        }

        return reports.filter(
          (report) =>
            String(
              report
                ?.thesis
                ?.classification
                ?.code ||
              "NOT_RATED"
            ).toUpperCase() ===
            reportFilter
        );
      },
      [
        reports,
        reportFilter
      ]
    );

  const selectedReport =
    useMemo(
      () =>
        reports.find(
          (report) =>
            report?.symbol ===
            selectedSymbol
        ) ||
        reports[0] ||
        null,
      [
        reports,
        selectedSymbol
      ]
    );

  if (loading) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#22d3ee"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Coach G is building research reports...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        PC-023B
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Research & Valuation
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Fair value, peer comparison, growth forecasts,
        dividend forecasts, research quality, thesis scoring,
        catalysts, risks, and Coach G investment conclusions.
      </Text>

      {error ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.hero
        }
      >
        <View
          style={
            styles.heroScore
          }
        >
          <Text
            style={
              styles.heroScoreValue
            }
          >
            {
              roundWhole(
                intelligence
                  ?.summary
                  ?.averageThesisScore
              )
            }
          </Text>

          <Text
            style={
              styles.heroScoreMaximum
            }
          >
            /100
          </Text>
        </View>

        <View
          style={
            styles.heroContent
          }
        >
          <Text
            style={
              styles.heroLabel
            }
          >
            Average Research Thesis Score
          </Text>

          <Text
            style={
              styles.heroTitle
            }
          >
            {
              intelligence
                ?.status ===
              "AVAILABLE"
                ? "Research Intelligence Active"
                : "Limited Research Evidence"
            }
          </Text>

          <Text
            style={
              styles.heroText
            }
          >
            {
              intelligence
                ?.universe
                ?.researched ||
              0
            }{" "}
            securities currently have a generated research
            report.
          </Text>
        </View>
      </View>

      <View
        style={
          styles.metricGrid
        }
      >
        <Metric
          label="Portfolio Holdings"
          value={
            analytics
              ?.portfolio
              ?.holdingsCount ??
            intelligence
              ?.universe
              ?.securities ??
            0
          }
        />

        <Metric
          label="Valued"
          value={
            intelligence
              ?.universe
              ?.valued ||
            0
          }
        />

        <Metric
          label="Peer Valued"
          value={
            intelligence
              ?.universe
              ?.relativelyValued ||
            0
          }
        />

        <Metric
          label="Forecasted"
          value={
            intelligence
              ?.universe
              ?.forecasted ||
            0
          }
        />

        <Metric
          label="Avg. Conviction"
          value={
            nullablePercent(
              intelligence
                ?.summary
                ?.averageConvictionPercentage
            )
          }
        />

        <Metric
          label="Avg. Research Quality"
          value={
            nullableScore(
              intelligence
                ?.summary
                ?.averageResearchQualityScore
            )
          }
        />

        <Metric
          label="Avg. Valuation Confidence"
          value={
            nullableScore(
              intelligence
                ?.summary
                ?.averageValuationConfidencePercentage
            )
          }
        />

        <Metric
          label="Avg. Report Coverage"
          value={
            nullablePercent(
              intelligence
                ?.summary
                ?.averageReportCoveragePercentage
            )
          }
        />
      </View>

      <Section
        title="Research Universe"
        description="Select a stock research report to view complete valuation and thesis details."
      >
        <FilterRow
          values={
            REPORT_FILTERS
          }
          selected={
            reportFilter
          }
          onSelect={
            setReportFilter
          }
        />

        {visibleReports.length ? (
          visibleReports.map(
            (
              report,
              index
            ) => (
              <ReportCard
                key={
                  report?.symbol ||
                  `REPORT-${index}`
                }
                report={
                  report
                }
                selected={
                  selectedReport
                    ?.symbol ===
                  report?.symbol
                }
                onPress={() => {
                  setSelectedSymbol(
                    report?.symbol
                  );

                  setDetailTab(
                    "OVERVIEW"
                  );
                }}
              />
            )
          )
        ) : (
          <EmptyState
            title="No Matching Research Reports"
            message="No reports match the selected thesis classification."
          />
        )}
      </Section>

      {selectedReport ? (
        <>
          <Section
            title={`${selectedReport.symbol} Research Report`}
            description={
              selectedReport
                ?.thesis
                ?.narrative ||
              selectedReport?.message ||
              "No report narrative is available."
            }
          >
            <FilterRow
              values={
                DETAIL_TABS
              }
              selected={
                detailTab
              }
              onSelect={
                setDetailTab
              }
            />

            {detailTab ===
            "OVERVIEW" ? (
              <OverviewPanel
                report={
                  selectedReport
                }
              />
            ) : null}

            {detailTab ===
            "VALUATION" ? (
              <ValuationPanel
                report={
                  selectedReport
                }
              />
            ) : null}

            {detailTab ===
            "FORECAST" ? (
              <ForecastPanel
                report={
                  selectedReport
                }
              />
            ) : null}

            {detailTab ===
            "THESIS" ? (
              <ThesisPanel
                report={
                  selectedReport
                }
              />
            ) : null}

            {detailTab ===
            "RISKS" ? (
              <RiskPanel
                report={
                  selectedReport
                }
              />
            ) : null}
          </Section>

          <Section
            title="Price Levels"
            description="Explainable advisory entry, fair-value, and exit review levels."
          >
            <PriceLevelGrid
              report={
                selectedReport
              }
            />
          </Section>
        </>
      ) : (
        <Section
          title="Research Report"
          description="Select a security to review its complete report."
        >
          <EmptyState
            title="No Research Report Selected"
            message="No stock research report is currently available."
          />
        </Section>
      )}

      <Section
        title="Market Research Rankings"
        description="Rankings generated from the full PC-023B research pipeline."
      >
        <RankingBlock
          title="Most Attractive Theses"
          items={
            intelligence
              ?.rankings
              ?.mostAttractiveTheses
          }
          scoreField="score"
        />

        <RankingBlock
          title="Highest Expected Return"
          items={
            intelligence
              ?.rankings
              ?.highestExpectedTotalReturn
          }
          scoreField="expected.totalReturnCagrPercentage"
          suffix="%"
        />

        <RankingBlock
          title="Most Undervalued"
          items={
            intelligence
              ?.rankings
              ?.mostUndervalued
          }
          scoreField="classification.upsidePercentage"
          suffix="%"
        />

        <RankingBlock
          title="Largest Peer Discounts"
          items={
            intelligence
              ?.rankings
              ?.largestPeerDiscounts
          }
          scoreField="classification.upsidePercentage"
          suffix="%"
        />

        <RankingBlock
          title="Highest Research Quality"
          items={
            intelligence
              ?.rankings
              ?.highestResearchQuality
          }
          scoreField="researchQuality.score"
        />
      </Section>

      <Section
        title="Classification Distribution"
        description="How the current research universe is classified."
      >
        <ClassificationDistribution
          counts={
            intelligence
              ?.summary
              ?.classifications ||
            {}
          }
        />
      </Section>

      <View
        style={
          styles.protectionCard
        }
      >
        <Text
          style={
            styles.protectionTitle
          }
        >
          Advisory Research Only
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          PC-023B does not place trades, modify holdings,
          change cash, submit broker orders, or invent missing
          financial data. Reports with incomplete fundamentals
          are explicitly marked partial or insufficient.
        </Text>
      </View>

      <Pressable
        disabled={
          refreshing
        }
        style={[
          styles.primaryButton,

          refreshing &&
            styles.disabled
        ]}
        onPress={() =>
          loadData({
            fullLoader:
              false
          })
        }
      >
        {refreshing ? (
          <ActivityIndicator
            color="white"
          />
        ) : (
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Refresh Research Intelligence
          </Text>
        )}
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.back()
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function OverviewPanel({
  report
}) {
  return (
    <>
      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="Thesis Score"
          value={
            nullableScore(
              report
                ?.thesis
                ?.score
            )
          }
        />

        <Row
          label="Classification"
          value={
            report
              ?.thesis
              ?.classification
              ?.label ||
            "Not Rated"
          }
        />

        <Row
          label="Recommended Posture"
          value={
            formatLabel(
              report
                ?.thesis
                ?.classification
                ?.action ||
              "BUILD_MORE_EVIDENCE"
            )
          }
        />

        <Row
          label="Conviction"
          value={
            nullablePercent(
              report
                ?.thesis
                ?.conviction
                ?.score
            )
          }
        />

        <Row
          label="Research Quality"
          value={
            nullableScore(
              report
                ?.scorecard
                ?.researchQuality
            )
          }
        />

        <Row
          label="Report Coverage"
          value={
            nullablePercent(
              report
                ?.coverage
                ?.percentage
            )
          }
        />
      </View>

      <Text
        style={
          styles.subheading
        }
      >
        Coach G Executive Summary
      </Text>

      <View
        style={
          styles.narrativeCard
        }
      >
        <Text
          style={
            styles.narrativeText
          }
        >
          {
            report
              ?.executiveSummary
              ?.narrative ||
            report?.message ||
            "No narrative is available."
          }
        </Text>
      </View>

      <Text
        style={
          styles.subheading
        }
      >
        Top Bull Case
      </Text>

      <SignalCard
        item={
          report
            ?.thesis
            ?.bullCase?.[0]
        }
        positive
      />

      <Text
        style={
          styles.subheading
        }
      >
        Top Bear Case
      </Text>

      <SignalCard
        item={
          report
            ?.thesis
            ?.bearCase?.[0]
        }
      />

      <Text
        style={
          styles.subheading
        }
      >
        Top Catalyst
      </Text>

      <SignalCard
        item={
          report
            ?.thesis
            ?.catalysts?.[0]
        }
        positive
      />

      <Text
        style={
          styles.subheading
        }
      >
        Top Risk
      </Text>

      <SignalCard
        item={
          report
            ?.thesis
            ?.risks?.[0]
        }
      />
    </>
  );
}

function ValuationPanel({
  report
}) {
  const models =
    report
      ?.valuation
      ?.models ||
    {};

  return (
    <>
      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="Current Price"
          value={
            nullableCurrency(
              report
                ?.priceLevels
                ?.currentPrice
            )
          }
        />

        <Row
          label="Absolute Fair Value"
          value={
            nullableCurrency(
              report
                ?.valuation
                ?.fairValue
            )
          }
        />

        <Row
          label="Relative Fair Value"
          value={
            nullableCurrency(
              report
                ?.relativeValuation
                ?.fairValue
            )
          }
        />

        <Row
          label="Blended Fair Value"
          value={
            nullableCurrency(
              report
                ?.priceLevels
                ?.fairValue
            )
          }
        />

        <Row
          label="Expected Upside"
          value={
            nullablePercent(
              report
                ?.executiveSummary
                ?.expectedUpsidePercentage
            )
          }
        />

        <Row
          label="Absolute Confidence"
          value={
            nullablePercent(
              report
                ?.scorecard
                ?.absoluteValuationConfidence
            )
          }
        />

        <Row
          label="Relative Confidence"
          value={
            nullablePercent(
              report
                ?.scorecard
                ?.relativeValuationConfidence
            )
          }
        />
      </View>

      <Text
        style={
          styles.subheading
        }
      >
        Absolute Valuation Models
      </Text>

      {Object.entries(
        models
      ).map(
        (
          [
            key,
            model
          ]
        ) => (
          <View
            key={
              key
            }
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              {formatLabel(
                model?.model ||
                key
              )}
            </Text>

            <Row
              label="Status"
              value={
                formatLabel(
                  model?.status ||
                  "NOT_AVAILABLE"
                )
              }
            />

            <Row
              label="Fair Value"
              value={
                nullableCurrency(
                  model?.fairValue
                )
              }
            />

            <Text
              style={
                styles.cardText
              }
            >
              {
                model?.message ||
                "No model explanation is available."
              }
            </Text>
          </View>
        )
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Peer Comparison
      </Text>

      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="Relative Score"
          value={
            nullableScore(
              report
                ?.relativeValuation
                ?.relativeScore
            )
          }
        />

        <Row
          label="Peer Count"
          value={
            report
              ?.relativeValuation
              ?.peerGroup
              ?.peerCount ??
            0
          }
        />

        <Row
          label="Peer Rank"
          value={
            report
              ?.relativeValuation
              ?.ranking
              ?.target
              ?.rank ??
            "Not ranked"
          }
        />
      </View>

      {safeArray(
        report
          ?.relativeValuation
          ?.metrics
      ).map(
        (
          metric,
          index
        ) => (
          <View
            key={
              metric?.metric ||
              `METRIC-${index}`
            }
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              {
                metric?.label ||
                formatLabel(
                  metric?.metric
                )
              }
            </Text>

            <Row
              label="Target"
              value={
                metric
                  ?.targetMetric ??
                "Not available"
              }
            />

            <Row
              label="Peer Benchmark"
              value={
                metric
                  ?.peerBenchmark ??
                "Not available"
              }
            />

            <Row
              label="Premium / Discount"
              value={
                nullablePercent(
                  metric
                    ?.premiumDiscountPercentage
                )
              }
            />

            <Row
              label="Implied Fair Value"
              value={
                nullableCurrency(
                  metric
                    ?.impliedFairValue
                )
              }
            />
          </View>
        )
      )}
    </>
  );
}

function ForecastPanel({
  report
}) {
  const forecast =
    report?.forecast;

  return (
    <>
      <View
        style={
          styles.summaryCard
        }
      >
        <Row
          label="Revenue CAGR"
          value={
            nullablePercent(
              forecast
                ?.expected
                ?.revenueCagrPercentage
            )
          }
        />

        <Row
          label="Earnings CAGR"
          value={
            nullablePercent(
              forecast
                ?.expected
                ?.earningsCagrPercentage
            )
          }
        />

        <Row
          label="FCF CAGR"
          value={
            nullablePercent(
              forecast
                ?.expected
                ?.freeCashFlowCagrPercentage
            )
          }
        />

        <Row
          label="Dividend CAGR"
          value={
            nullablePercent(
              forecast
                ?.expected
                ?.dividendCagrPercentage
            )
          }
        />

        <Row
          label="Price CAGR"
          value={
            nullablePercent(
              forecast
                ?.expected
                ?.priceCagrPercentage
            )
          }
        />

        <Row
          label="Total Return CAGR"
          value={
            nullablePercent(
              forecast
                ?.expected
                ?.totalReturnCagrPercentage
            )
          }
        />

        <Row
          label="Forecast Confidence"
          value={
            nullablePercent(
              forecast
                ?.confidence
                ?.score
            )
          }
        />
      </View>

      <Text
        style={
          styles.subheading
        }
      >
        Forecast Scenarios
      </Text>

      {safeArray(
        forecast?.scenarios
      ).map(
        (
          scenario,
          index
        ) => (
          <View
            key={
              scenario?.scenario ||
              `SCENARIO-${index}`
            }
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              {formatLabel(
                scenario?.scenario
              )}
            </Text>

            <Row
              label="Terminal Fair Value"
              value={
                nullableCurrency(
                  scenario
                    ?.terminal
                    ?.fairValue
                )
              }
            />

            <Row
              label="Price CAGR"
              value={
                nullablePercent(
                  scenario
                    ?.priceCagr
                    ?.priceCagrPercentage
                )
              }
            />

            <Row
              label="Total Return CAGR"
              value={
                nullablePercent(
                  scenario
                    ?.totalReturn
                    ?.totalReturnCagrPercentage
                )
              }
            />

            <Row
              label="Dividend Sustainability"
              value={
                scenario
                  ?.dividends
                  ?.sustainability
                  ?.classification
                  ?.label ||
                "Not Rated"
              }
            />
          </View>
        )
      )}
    </>
  );
}

function ThesisPanel({
  report
}) {
  return (
    <>
      <Text
        style={
          styles.subheading
        }
      >
        Thesis Components
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.components
      ).map(
        (
          component,
          index
        ) => (
          <ScoreBar
            key={
              component?.code ||
              `COMPONENT-${index}`
            }
            label={
              component?.label ||
              formatLabel(
                component?.code
              )
            }
            score={
              component?.score
            }
          />
        )
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Bull Case
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.bullCase
      ).length ? (
        safeArray(
          report
            ?.thesis
            ?.bullCase
        ).map(
          (
            item,
            index
          ) => (
            <SignalCard
              key={
                item?.code ||
                `BULL-${index}`
              }
              item={
                item
              }
              positive
            />
          )
        )
      ) : (
        <EmptyState
          title="No Confirmed Bull Case"
          message="Additional research evidence may be required."
        />
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Catalysts
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.catalysts
      ).length ? (
        safeArray(
          report
            ?.thesis
            ?.catalysts
        ).map(
          (
            item,
            index
          ) => (
            <SignalCard
              key={
                item?.code ||
                `CATALYST-${index}`
              }
              item={
                item
              }
              positive
            />
          )
        )
      ) : (
        <EmptyState
          title="No Confirmed Catalysts"
          message="No explicit catalyst is currently supported by the available evidence."
        />
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Action Conditions
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.actionConditions
      ).map(
        (
          item,
          index
        ) => (
          <ConditionCard
            key={
              item?.code ||
              `ACTION-${index}`
            }
            item={
              item
            }
          />
        )
      )}
    </>
  );
}

function RiskPanel({
  report
}) {
  return (
    <>
      <Text
        style={
          styles.subheading
        }
      >
        Bear Case
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.bearCase
      ).length ? (
        safeArray(
          report
            ?.thesis
            ?.bearCase
        ).map(
          (
            item,
            index
          ) => (
            <SignalCard
              key={
                item?.code ||
                `BEAR-${index}`
              }
              item={
                item
              }
            />
          )
        )
      ) : (
        <EmptyState
          title="No Material Bear Case"
          message="No material bear-case item is currently identified."
        />
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Risks and Limitations
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.risks
      ).length ? (
        safeArray(
          report
            ?.thesis
            ?.risks
        ).map(
          (
            item,
            index
          ) => (
            <SignalCard
              key={
                item?.code ||
                `RISK-${index}`
              }
              item={
                item
              }
            />
          )
        )
      ) : (
        <EmptyState
          title="No Material Risks"
          message="No material risk item is currently identified."
        />
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Invalidation Conditions
      </Text>

      {safeArray(
        report
          ?.thesis
          ?.invalidationConditions
      ).map(
        (
          item,
          index
        ) => (
          <ConditionCard
            key={
              item?.code ||
              `INVALIDATION-${index}`
            }
            item={
              item
            }
          />
        )
      )}

      <Text
        style={
          styles.subheading
        }
      >
        Research Warnings
      </Text>

      {safeArray(
        report?.warnings
      ).length ? (
        safeArray(
          report?.warnings
        ).map(
          (
            warning,
            index
          ) => (
            <SignalCard
              key={
                warning?.code ||
                `WARNING-${index}`
              }
              item={{
                ...warning,

                title:
                  warning?.title ||
                  formatLabel(
                    warning?.code ||
                    "Research Warning"
                  )
              }}
            />
          )
        )
      ) : (
        <EmptyState
          title="No Research Warnings"
          message="No research-quality warning is currently active."
        />
      )}
    </>
  );
}

function PriceLevelGrid({
  report
}) {
  const levels =
    report?.priceLevels ||
    {};

  return (
    <View
      style={
        styles.metricGrid
      }
    >
      <Metric
        label="Current Price"
        value={
          nullableCurrency(
            levels?.currentPrice
          )
        }
      />

      <Metric
        label="Strong Buy Below"
        value={
          nullableCurrency(
            levels?.strongBuyBelow
          )
        }
      />

      <Metric
        label="Buy Under"
        value={
          nullableCurrency(
            levels?.buyUnder
          )
        }
      />

      <Metric
        label="Fair Value Low"
        value={
          nullableCurrency(
            levels?.fairValueLow
          )
        }
      />

      <Metric
        label="Fair Value"
        value={
          nullableCurrency(
            levels?.fairValue
          )
        }
      />

      <Metric
        label="Fair Value High"
        value={
          nullableCurrency(
            levels?.fairValueHigh
          )
        }
      />

      <Metric
        label="Sell Over"
        value={
          nullableCurrency(
            levels?.sellOver
          )
        }
      />
    </View>
  );
}

function ReportCard({
  report,
  selected,
  onPress
}) {
  const classification =
    report
      ?.thesis
      ?.classification
      ?.code ||
    "NOT_RATED";

  return (
    <Pressable
      style={[
        styles.reportCard,

        selected &&
          styles.reportCardSelected
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View
          style={{
            flex:
              1
          }}
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            {
              report?.symbol ||
              "Unknown"
            }
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            {
              report?.name ||
              report?.sector ||
              "No description"
            }
          </Text>
        </View>

        <View
          style={
            styles.ratingBlock
          }
        >
          <Text
            style={
              thesisColorStyle(
                classification
              )
            }
          >
            {formatLabel(
              classification
            )}
          </Text>

          <Text
            style={
              styles.ratingScore
            }
          >
            {
              report
                ?.thesis
                ?.score ===
                null ||
              report
                ?.thesis
                ?.score ===
                undefined
                ? "N/A"
                : `${Math.round(
                    Number(
                      report
                        .thesis
                        .score
                    )
                  )}/100`
            }
          </Text>
        </View>
      </View>

      <View
        style={
          styles.reportMetrics
        }
      >
        <MiniMetric
          label="Fair Value"
          value={
            nullableCurrency(
              report
                ?.priceLevels
                ?.fairValue
            )
          }
        />

        <MiniMetric
          label="Upside"
          value={
            nullablePercent(
              report
                ?.executiveSummary
                ?.expectedUpsidePercentage
            )
          }
        />

        <MiniMetric
          label="Conviction"
          value={
            nullablePercent(
              report
                ?.thesis
                ?.conviction
                ?.score
            )
          }
        />

        <MiniMetric
          label="Coverage"
          value={
            nullablePercent(
              report
                ?.coverage
                ?.percentage
            )
          }
        />
      </View>
    </Pressable>
  );
}

function RankingBlock({
  title,
  items,
  scoreField,
  suffix = ""
}) {
  const rows =
    safeArray(items).slice(
      0,
      5
    );

  return (
    <View
      style={
        styles.rankingBlock
      }
    >
      <Text
        style={
          styles.subheading
        }
      >
        {title}
      </Text>

      {rows.length ? (
        rows.map(
          (
            item,
            index
          ) => {
            const value =
              getNestedValue(
                item,
                scoreField
              );

            return (
              <View
                key={
                  `${title}-${item?.symbol || index}`
                }
                style={
                  styles.rankingRow
                }
              >
                <Text
                  style={
                    styles.rankingNumber
                  }
                >
                  #{index + 1}
                </Text>

                <Text
                  style={
                    styles.rankingSymbol
                  }
                >
                  {
                    item?.symbol ||
                    "Unknown"
                  }
                </Text>

                <Text
                  style={
                    styles.rankingValue
                  }
                >
                  {value ===
                    null ||
                  value ===
                    undefined
                    ? "N/A"
                    : `${Number(
                        value
                      ).toFixed(
                        2
                      )}${suffix}`}
                </Text>
              </View>
            );
          }
        )
      ) : (
        <EmptyState
          title="No Ranking Data"
          message="Insufficient evidence is available for this ranking."
        />
      )}
    </View>
  );
}

function ClassificationDistribution({
  counts
}) {
  const rows = [
    [
      "Very Attractive",
      counts?.veryAttractive
    ],
    [
      "Attractive",
      counts?.attractive
    ],
    [
      "Moderately Attractive",
      counts?.moderatelyAttractive
    ],
    [
      "Balanced",
      counts?.balanced
    ],
    [
      "Cautious",
      counts?.cautious
    ],
    [
      "Unattractive",
      counts?.unattractive
    ],
    [
      "High Risk",
      counts?.highRisk
    ]
  ];

  const maximum =
    Math.max(
      ...rows.map(
        (
          [
            ,
            value
          ]
        ) =>
          number(value)
      ),
      1
    );

  return (
    <>
      {rows.map(
        (
          [
            label,
            value
          ]
        ) => (
          <View
            key={
              label
            }
            style={
              styles.distributionRow
            }
          >
            <View
              style={
                styles.distributionHeader
              }
            >
              <Text
                style={
                  styles.rowLabel
                }
              >
                {label}
              </Text>

              <Text
                style={
                  styles.rowValue
                }
              >
                {number(value)}
              </Text>
            </View>

            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,

                  {
                    width:
                      `${
                        (
                          number(
                            value
                          ) /
                          maximum
                        ) *
                        100
                      }%`
                  }
                ]}
              />
            </View>
          </View>
        )
      )}
    </>
  );
}

function Section({
  title,
  description,
  children
}) {
  return (
    <View
      style={
        styles.section
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      {description ? (
        <Text
          style={
            styles.sectionDescription
          }
        >
          {description}
        </Text>
      ) : null}

      {children}
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.metricCard
      }
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {String(
          value
        )}
      </Text>
    </View>
  );
}

function MiniMetric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.miniMetric
      }
    >
      <Text
        style={
          styles.miniMetricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.miniMetricValue
        }
      >
        {String(
          value
        )}
      </Text>
    </View>
  );
}

function Row({
  label,
  value
}) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.rowValue
        }
      >
        {String(
          value ??
          "N/A"
        )}
      </Text>
    </View>
  );
}

function ScoreBar({
  label,
  score
}) {
  const available =
    score !==
      null &&
    score !==
      undefined;

  const value =
    available
      ? clamp(
          score,
          0,
          100
        )
      : 0;

  return (
    <View
      style={
        styles.scoreBarCard
      }
    >
      <View
        style={
          styles.distributionHeader
        }
      >
        <Text
          style={
            styles.rowLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.rowValue
          }
        >
          {available
            ? `${Math.round(
                value
              )}/100`
            : "N/A"}
        </Text>
      </View>

      <View
        style={
          styles.progressTrack
        }
      >
        <View
          style={[
            styles.progressFill,

            {
              width:
                `${value}%`
            }
          ]}
        />
      </View>
    </View>
  );
}

function SignalCard({
  item,
  positive = false
}) {
  if (!item) {
    return (
      <EmptyState
        title="Not Available"
        message="No supported research evidence is currently available."
      />
    );
  }

  return (
    <View
      style={[
        styles.messageCard,

        positive
          ? styles.positiveBorder
          : styles.riskBorder
      ]}
    >
      <Text
        style={
          positive
            ? styles.signalTitlePositive
            : styles.signalTitleRisk
        }
      >
        {
          item?.title ||
          formatLabel(
            item?.code
          )
        }
      </Text>

      <Text
        style={
          styles.cardText
        }
      >
        {
          item?.message ||
          "No explanation is available."
        }
      </Text>

      {item?.severity ? (
        <Text
          style={
            styles.signalSeverity
          }
        >
          Severity:{" "}
          {formatLabel(
            item.severity
          )}
        </Text>
      ) : null}
    </View>
  );
}

function ConditionCard({
  item
}) {
  return (
    <View
      style={
        styles.messageCard
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {
          item?.title ||
          formatLabel(
            item?.code
          )
        }
      </Text>

      <Text
        style={
          styles.cardText
        }
      >
        {
          item?.condition ||
          item?.message ||
          "No condition is available."
        }
      </Text>
    </View>
  );
}

function FilterRow({
  values,
  selected,
  onSelect
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={
        false
      }
      contentContainerStyle={
        styles.filterRow
      }
    >
      {values.map(
        (value) => (
          <Pressable
            key={
              value
            }
            style={[
              styles.filterButton,

              selected ===
                value &&
                styles.filterActive
            ]}
            onPress={() =>
              onSelect(
                value
              )
            }
          >
            <Text
              style={[
                styles.filterText,

                selected ===
                  value &&
                  styles.filterTextActive
              ]}
            >
              {formatLabel(
                value
              )}
            </Text>
          </Pressable>
        )
      )}
    </ScrollView>
  );
}

function EmptyState({
  title,
  message
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <Text
        style={
          styles.cardTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.cardText
        }
      >
        {message}
      </Text>
    </View>
  );
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function number(value) {
  const parsed =
    Number(
      value ??
      0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      number(value),
      minimum
    ),
    maximum
  );
}

function nullablePercent(value) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "Not available";
  }

  return `${Number(
    value
  ).toFixed(2)}%`;
}

function nullableScore(value) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "Not available";
  }

  return `${Math.round(
    Number(
      value
    )
  )}/100`;
}

function nullableCurrency(value) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "Not available";
  }

  return `KES ${Number(
    value
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2
    }
  )}`;
}

function roundWhole(value) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return 0;
  }

  return Math.round(
    Number(
      value
    )
  );
}

function formatLabel(value) {
  return String(
    value ||
    ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getNestedValue(
  object,
  path
) {
  return String(
    path ||
    ""
  )
    .split(".")
    .reduce(
      (
        current,
        key
      ) =>
        current?.[key],
      object
    );
}

function thesisColorStyle(
  classification
) {
  if (
    [
      "VERY_ATTRACTIVE",
      "ATTRACTIVE",
      "MODERATELY_ATTRACTIVE"
    ].includes(
      classification
    )
  ) {
    return [
      styles.ratingLabel,
      styles.positive
    ];
  }

  if (
    [
      "BALANCED",
      "CAUTIOUS"
    ].includes(
      classification
    )
  ) {
    return [
      styles.ratingLabel,
      styles.warning
    ];
  }

  if (
    [
      "UNATTRACTIVE",
      "HIGH_RISK"
    ].includes(
      classification
    )
  ) {
    return [
      styles.ratingLabel,
      styles.danger
    ];
  }

  return [
    styles.ratingLabel,
    styles.info
  ];
}

const styles =
  StyleSheet.create({
    screen: {
      flex:
        1,

      backgroundColor:
        "#020617"
    },

    content: {
      padding:
        22,

      paddingTop:
        70,

      paddingBottom:
        110
    },

    centerScreen: {
      flex:
        1,

      backgroundColor:
        "#020617",

      alignItems:
        "center",

      justifyContent:
        "center",

      padding:
        24
    },

    loadingText: {
      color:
        "#94a3b8",

      marginTop:
        14
    },

    eyebrow: {
      color:
        "#22d3ee",

      fontWeight:
        "900"
    },

    title: {
      color:
        "white",

      fontSize:
        31,

      fontWeight:
        "900",

      marginTop:
        8
    },

    subtitle: {
      color:
        "#94a3b8",

      lineHeight:
        22,

      marginTop:
        10,

      marginBottom:
        20
    },

    hero: {
      backgroundColor:
        "rgba(34,211,238,.08)",

      borderColor:
        "rgba(34,211,238,.35)",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        18,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        17
    },

    heroScore: {
      width:
        96,

      height:
        96,

      borderRadius:
        48,

      borderWidth:
        6,

      borderColor:
        "#22d3ee",

      alignItems:
        "center",

      justifyContent:
        "center"
    },

    heroScoreValue: {
      color:
        "#86efac",

      fontSize:
        29,

      fontWeight:
        "900"
    },

    heroScoreMaximum: {
      color:
        "#94a3b8",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    heroContent: {
      flex:
        1
    },

    heroLabel: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    heroTitle: {
      color:
        "white",

      fontSize:
        21,

      fontWeight:
        "900",

      marginTop:
        6
    },

    heroText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    metricGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        14
    },

    metricCard: {
      width:
        "47%",

      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        13
    },

    metricLabel: {
      color:
        "#94a3b8",

      fontSize:
        11
    },

    metricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        6
    },

    section: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        17,

      marginTop:
        20
    },

    sectionTitle: {
      color:
        "#67e8f9",

      fontSize:
        19,

      fontWeight:
        "900"
    },

    sectionDescription: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        7,

      marginBottom:
        5
    },

    reportCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        11
    },

    reportCardSelected: {
      borderColor:
        "#22d3ee",

      borderWidth:
        2
    },

    cardHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",

      gap:
        12
    },

    cardTitle: {
      color:
        "#67e8f9",

      fontSize:
        16,

      fontWeight:
        "900"
    },

    cardSubtitle: {
      color:
        "#94a3b8",

      marginTop:
        3
    },

    cardText: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        8
    },

    ratingBlock: {
      alignItems:
        "flex-end"
    },

    ratingLabel: {
      fontSize:
        11,

      fontWeight:
        "900"
    },

    ratingScore: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        4
    },

    reportMetrics: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        8,

      marginTop:
        13
    },

    miniMetric: {
      width:
        "47%",

      backgroundColor:
        "#0f172a",

      borderRadius:
        10,

      padding:
        10
    },

    miniMetricLabel: {
      color:
        "#64748b",

      fontSize:
        10
    },

    miniMetricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        4
    },

    summaryCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        13
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        14,

      marginTop:
        10
    },

    rowLabel: {
      color:
        "#94a3b8",

      flex:
        1
    },

    rowValue: {
      color:
        "white",

      fontWeight:
        "900",

      textAlign:
        "right",

      flex:
        1
    },

    subheading: {
      color:
        "#c084fc",

      fontSize:
        16,

      fontWeight:
        "900",

      marginTop:
        19
    },

    narrativeCard: {
      backgroundColor:
        "rgba(147,51,234,.09)",

      borderColor:
        "rgba(147,51,234,.35)",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        11
    },

    narrativeText: {
      color:
        "#e9d5ff",

      lineHeight:
        22
    },

    messageCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        11
    },

    positiveBorder: {
      borderColor:
        "rgba(34,197,94,.50)"
    },

    riskBorder: {
      borderColor:
        "rgba(239,68,68,.50)"
    },

    signalTitlePositive: {
      color:
        "#86efac",

      fontWeight:
        "900"
    },

    signalTitleRisk: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    signalSeverity: {
      color:
        "#94a3b8",

      fontSize:
        11,

      marginTop:
        8
    },

    scoreBarCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        13,

      padding:
        13,

      marginTop:
        10
    },

    progressTrack: {
      height:
        7,

      backgroundColor:
        "#1e293b",

      borderRadius:
        8,

      overflow:
        "hidden",

      marginTop:
        10
    },

    progressFill: {
      height:
        "100%",

      backgroundColor:
        "#22c55e",

      borderRadius:
        8
    },

    filterRow: {
      gap:
        8,

      paddingVertical:
        14
    },

    filterButton: {
      backgroundColor:
        "#1e293b",

      paddingHorizontal:
        13,

      paddingVertical:
        10,

      borderRadius:
        12
    },

    filterActive: {
      backgroundColor:
        "#0891b2"
    },

    filterText: {
      color:
        "#94a3b8",

      fontWeight:
        "900"
    },

    filterTextActive: {
      color:
        "white"
    },

    rankingBlock: {
      marginTop:
        6
    },

    rankingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#020617",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        8
    },

    rankingNumber: {
      color:
        "#64748b",

      width:
        34,

      fontWeight:
        "900"
    },

    rankingSymbol: {
      color:
        "white",

      flex:
        1,

      fontWeight:
        "900"
    },

    rankingValue: {
      color:
        "#86efac",

      fontWeight:
        "900"
    },

    distributionRow: {
      marginTop:
        13
    },

    distributionHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12
    },

    emptyCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        13
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.35)",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        17,

      marginTop:
        20
    },

    protectionTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    protectionText: {
      color:
        "#fef3c7",

      lineHeight:
        21,

      marginTop:
        7
    },

    primaryButton: {
      backgroundColor:
        "#0891b2",

      padding:
        17,

      borderRadius:
        17,

      marginTop:
        15
    },

    primaryButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",

      padding:
        16,

      borderRadius:
        17,

      marginTop:
        12
    },

    secondaryButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",

      borderColor:
        "rgba(239,68,68,.35)",

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        14,

      marginBottom:
        15
    },

    errorText: {
      color:
        "#fca5a5"
    },

    positive: {
      color:
        "#86efac"
    },

    warning: {
      color:
        "#fde68a"
    },

    danger: {
      color:
        "#fca5a5"
    },

    info: {
      color:
        "#93c5fd"
    },

    disabled: {
      opacity:
        0.6
    }
  });

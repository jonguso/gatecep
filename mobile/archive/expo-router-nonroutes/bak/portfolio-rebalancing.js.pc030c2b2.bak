import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
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
  applyRebalanceTemplate,
  getOrCreateRebalanceTarget
} from "../src/features/rebalancing/rebalanceStore";

import {
  listAllocationTemplates,
  REBALANCE_PROFILE_TYPES
} from "../src/features/rebalancing/allocationTemplates";

import {
  getRebalanceModeGuidance
} from "../src/features/rebalancing/rebalanceRecommendationService";

import {
  buildCoachGRebalancingAdvice
} from "../src/features/rebalancing/rebalanceAdvisorService";

const PROFILE_ORDER = [
  REBALANCE_PROFILE_TYPES.CONSERVATIVE,
  REBALANCE_PROFILE_TYPES.BALANCED,
  REBALANCE_PROFILE_TYPES.GROWTH,
  REBALANCE_PROFILE_TYPES.AGGRESSIVE
];

export default function PortfolioRebalancingScreen() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    switchingProfile,
    setSwitchingProfile
  ] = useState(null);

  const [
    result,
    setResult
  ] = useState(null);

  const [
    advisor,
    setAdvisor
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const [
    recommendationFilter,
    setRecommendationFilter
  ] = useState("ACTIONABLE");

  const templates =
    useMemo(
      () => {
        const all =
          listAllocationTemplates();

        return PROFILE_ORDER
          .map(
            (profileType) =>
              all.find(
                (template) =>
                  template.code ===
                  profileType
              )
          )
          .filter(Boolean);
      },
      []
    );

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          await getOrCreateRebalanceTarget();

          const advisorResult =
            await buildCoachGRebalancingAdvice();

          setAdvisor(
            advisorResult ||
            null
          );

          setResult(
            advisorResult
              ?.recommendations ||
            null
          );
        } catch (loadError) {
          console.error(
            "Unable to load Portfolio Rebalancing:",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load the portfolio rebalancing analysis."
          );

          setAdvisor(null);
          setResult(null);
        } finally {
          setLoading(false);
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

  const target =
    result
      ?.driftAnalysis
      ?.target ||
    null;

  const currentAllocation =
    result
      ?.driftAnalysis
      ?.allocation ||
    null;

  const driftItems =
    Array.isArray(
      result
        ?.driftAnalysis
        ?.items
    )
      ? result
          .driftAnalysis
          .items
      : [];

  const visibleRecommendations =
    useMemo(
      () => {
        switch (
          recommendationFilter
        ) {
          case "ALL":
            return Array.isArray(
              result?.recommendations
            )
              ? result.recommendations
              : [];

          case "EXCLUDED":
            return Array.isArray(
              result
                ?.excludedRecommendations
            )
              ? result
                  .excludedRecommendations
              : [];

          case "HOLD":
            return Array.isArray(
              result
                ?.holdRecommendations
            )
              ? result
                  .holdRecommendations
              : [];

          case "ACTIONABLE":
          default:
            return Array.isArray(
              result
                ?.actionableRecommendations
            )
              ? result
                  .actionableRecommendations
              : [];
        }
      },
      [
        result,
        recommendationFilter
      ]
    );

  async function handleApplyProfile(
    template
  ) {
    if (
      !template?.code
    ) {
      return;
    }

    const message =
      `Apply the ${template.label} allocation profile?\n\n` +
      `${formatTargetSummary(
        template.targets
      )}\n\n` +
      `Tolerance: ${Number(
        template
          ?.tolerancePercentage ||
        0
      ).toFixed(2)}%\n\n` +
      "This changes only the saved rebalancing target. It does not modify holdings, cash, or place trades.";

    const confirmed =
      await confirmAction({
        title:
          "Apply Rebalancing Profile",

        message,

        confirmLabel:
          "Apply Profile"
      });

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setSwitchingProfile(
        template.code
      );

      await applyRebalanceTemplate(
        template.code
      );

      await loadData();

      showMessage(
        "Portfolio Rebalancing",
        `${template.label} target applied successfully.`
      );
    } catch (profileError) {
      console.error(
        "Unable to apply rebalancing profile:",
        profileError
      );

      showMessage(
        "Portfolio Rebalancing",
        profileError?.message ||
          "Unable to apply the selected rebalancing profile."
      );
    } finally {
      setSwitchingProfile(null);
    }
  }

  if (
    loading
  ) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Analyzing portfolio allocation...
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
        PC-019
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Portfolio Rebalancing
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Compare the current portfolio against a saved target
        allocation and review non-executing rebalancing guidance.
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
          styles.coachCard
        }
      >
        <Text
          style={
            styles.coachLabel
          }
        >
          COACH G
        </Text>

        <Text
          style={
            styles.coachText
          }
        >
          {result?.message ||
            "Portfolio rebalancing guidance is not currently available."}
        </Text>

        <Text
          style={
            styles.coachFootnote
          }
        >
          {getRebalanceModeGuidance(
            result?.mode
          )}
        </Text>
      </View>

      <View
        style={
          styles.statusCard
        }
      >
        <Text
          style={
            styles.statusLabel
          }
        >
          Recommendation Status
        </Text>

        <Text
          style={[
            styles.statusValue,

            result?.status ===
              "READY" &&
              styles.statusReady,

            result?.status ===
              "FUNDING_GAP" &&
              styles.statusWarning,

            result?.status ===
              "NO_ACTION_REQUIRED" &&
              styles.statusReady
          ]}
        >
          {formatLabel(
            result?.status ||
            "NOT_READY"
          )}
        </Text>
      </View>

      <View
        style={
          styles.metricGrid
        }
      >
        <Metric
          label="Portfolio Value"
          value={`KES ${money(
            result
              ?.portfolio
              ?.totalValue
          )}`}
        />

        <Metric
          label="Available Cash"
          value={`KES ${money(
            result
              ?.portfolio
              ?.availableCash
          )}`}
        />

        <Metric
          label="Holdings"
          value={
            result
              ?.portfolio
              ?.holdingsCount ||
            0
          }
        />

        <Metric
          label="Absolute Drift"
          value={`${Number(
            result
              ?.drift
              ?.totalAbsoluteDrift ||
            0
          ).toFixed(2)}%`}
        />

        <Metric
          label="Estimated Turnover"
          value={`KES ${money(
            result
              ?.summary
              ?.estimatedTurnover
          )}`}
        />

        <Metric
          label="Turnover %"
          value={`${Number(
            result
              ?.summary
              ?.turnoverPercentage ||
            0
          ).toFixed(2)}%`}
        />
      </View>

      <Section
        title="Coach G Portfolio Health"
        description="A structured assessment of target alignment, diversification, liquidity, and funding readiness."
      >
        <View
          style={
            styles.healthHero
          }
        >
          <View
            style={
              styles.healthScoreCircle
            }
          >
            <Text
              style={
                styles.healthScoreValue
              }
            >
              {advisor
                ?.health
                ?.overallScore ||
                0}
            </Text>

            <Text
              style={
                styles.healthScoreMaximum
              }
            >
              /100
            </Text>
          </View>

          <View
            style={
              styles.healthGradeContainer
            }
          >
            <Text
              style={
                styles.healthGradeLabel
              }
            >
              {
                advisor
                  ?.health
                  ?.grade
                  ?.label ||
                "Not Available"
              }
            </Text>

            <Text
              style={
                styles.healthGradeDescription
              }
            >
              {
                advisor
                  ?.health
                  ?.grade
                  ?.description ||
                "Portfolio health information is not currently available."
              }
            </Text>
          </View>
        </View>

        <View
          style={
            styles.healthComponentGrid
          }
        >
          <HealthMetric
            label="Alignment"
            value={
              advisor
                ?.health
                ?.components
                ?.alignment ||
              0
            }
          />

          <HealthMetric
            label="Diversification"
            value={
              advisor
                ?.health
                ?.components
                ?.diversification ||
              0
            }
          />

          <HealthMetric
            label="Liquidity"
            value={
              advisor
                ?.health
                ?.components
                ?.liquidity ||
              0
            }
          />

          <HealthMetric
            label="Funding"
            value={
              advisor
                ?.health
                ?.components
                ?.funding ||
              0
            }
          />
        </View>

        <View
          style={
            styles.advisorDetailCard
          }
        >
          <Row
            label="Concentration Risk"
            value={
              formatLabel(
                advisor
                  ?.concentration
                  ?.level ||
                "UNKNOWN"
              )
            }
            danger={
              advisor
                ?.concentration
                ?.level ===
              "HIGH"
            }
          />

          <Row
            label="Largest Holding"
            value={
              advisor
                ?.concentration
                ?.largestHolding
                ?.symbol ||
              advisor
                ?.concentration
                ?.largestHolding
                ?.name ||
              "Not available"
            }
          />

          <Row
            label="Largest Holding %"
            value={`${Number(
              advisor
                ?.concentration
                ?.largestHoldingPercentage ||
              0
            ).toFixed(2)}%`}
          />

          <Row
            label="Top Three Concentration"
            value={`${Number(
              advisor
                ?.concentration
                ?.topThreePercentage ||
              0
            ).toFixed(2)}%`}
          />

          <Row
            label="Largest Sector"
            value={
              advisor
                ?.concentration
                ?.largestSector
                ?.sector ||
              "Not available"
            }
          />

          <Row
            label="Largest Sector %"
            value={`${Number(
              advisor
                ?.concentration
                ?.largestSectorPercentage ||
              0
            ).toFixed(2)}%`}
          />

          <Row
            label="Cash Status"
            value={
              formatLabel(
                advisor
                  ?.liquidity
                  ?.status ||
                "UNKNOWN"
              )
            }
          />

          <Row
            label="Current Cash %"
            value={`${Number(
              advisor
                ?.liquidity
                ?.cashPercentage ||
              0
            ).toFixed(2)}%`}
          />

          <Row
            label="Target Cash %"
            value={`${Number(
              advisor
                ?.liquidity
                ?.targetCashPercentage ||
              0
            ).toFixed(2)}%`}
          />
        </View>

        <View
          style={
            styles.priorityCard
          }
        >
          <Text
            style={
              styles.priorityLabel
            }
          >
            Highest-Priority Guidance
          </Text>

          <Text
            style={
              styles.priorityTitle
            }
          >
            {
              advisor
                ?.priorityAction
                ?.title ||
              "No immediate action"
            }
          </Text>

          <Text
            style={
              styles.priorityMessage
            }
          >
            {
              advisor
                ?.priorityAction
                ?.message ||
              "The portfolio does not currently require an immediate rebalancing action."
            }
          </Text>
        </View>

        <View
          style={
            styles.advisorySummaryCard
          }
        >
          <Text
            style={
              styles.advisorySummaryLabel
            }
          >
            Coach G Assessment
          </Text>

          <Text
            style={
              styles.advisorySummaryText
            }
          >
            {
              advisor?.summary ||
              "No Coach G assessment is currently available."
            }
          </Text>
        </View>

        {Array.isArray(
          advisor?.insights
        ) &&
        advisor.insights.length ? (
          <View
            style={
              styles.insightsContainer
            }
          >
            <Text
              style={
                styles.insightsHeading
              }
            >
              Portfolio Insights
            </Text>

            {advisor.insights.map(
              (
                insight,
                index
              ) => (
                <AdvisorInsightCard
                  key={
                    insight?.code ||
                    `INSIGHT-${index}`
                  }
                  insight={
                    insight
                  }
                />
              )
            )}
          </View>
        ) : (
          <View
            style={
              styles.noInsightsCard
            }
          >
            <Text
              style={
                styles.noInsightsTitle
              }
            >
              No Material Warnings
            </Text>

            <Text
              style={
                styles.noInsightsText
              }
            >
              Coach G did not identify any additional risk or
              funding warnings.
            </Text>
          </View>
        )}
      </Section>

      <Section
        title="Target Profile"
        description="Choose a predefined asset-class allocation target."
      >
        <View
          style={
            styles.activeProfileCard
          }
        >
          <Row
            label="Current Profile"
            value={
              target?.profileLabel ||
              "Not configured"
            }
            highlight
          />

          <Row
            label="Mode"
            value={
              formatLabel(
                target?.mode
              )
            }
          />

          <Row
            label="Tolerance"
            value={`${Number(
              target
                ?.tolerancePercentage ||
              0
            ).toFixed(2)}%`}
          />

          <Row
            label="Target Total"
            value={`${Number(
              target
                ?.targetTotalPercentage ||
              0
            ).toFixed(2)}%`}
          />

          <Row
            label="Minimum Trade"
            value={`KES ${money(
              target
                ?.minimumTradeValue
            )}`}
          />

          <Row
            label="Cash Floor"
            value={`KES ${money(
              target
                ?.preserveCashFloor
            )}`}
          />
        </View>

        <View
          style={
            styles.profileGrid
          }
        >
          {templates.map(
            (template) => {
              const active =
                target
                  ?.profileType ===
                template.code;

              const processing =
                switchingProfile ===
                template.code;

              return (
                <Pressable
                  key={
                    template.code
                  }
                  disabled={
                    processing
                  }
                  style={[
                    styles.profileCard,

                    active &&
                      styles.profileCardActive,

                    processing &&
                      styles.buttonDisabled
                  ]}
                  onPress={() =>
                    handleApplyProfile(
                      template
                    )
                  }
                >
                  <Text
                    style={[
                      styles.profileTitle,

                      active &&
                        styles.profileTitleActive
                    ]}
                  >
                    {template.label}
                  </Text>

                  <Text
                    style={
                      styles.profileDescription
                    }
                  >
                    {template.description}
                  </Text>

                  {template.targets.map(
                    (item) => (
                      <View
                        key={
                          item.key
                        }
                        style={
                          styles.profileTargetRow
                        }
                      >
                        <Text
                          style={
                            styles.profileTargetLabel
                          }
                        >
                          {item.label}
                        </Text>

                        <Text
                          style={
                            styles.profileTargetValue
                          }
                        >
                          {Number(
                            item.percentage
                          ).toFixed(0)}
                          %
                        </Text>
                      </View>
                    )
                  )}

                  <View
                    style={
                      styles.profileFooter
                    }
                  >
                    {processing ? (
                      <ActivityIndicator
                        color="#67e8f9"
                      />
                    ) : (
                      <Text
                        style={
                          styles.profileFooterText
                        }
                      >
                        {active
                          ? "Active Profile"
                          : "Apply Profile"}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            }
          )}
        </View>

        <View
          style={
            styles.customTargetNotice
          }
        >
          <Text
            style={
              styles.customTargetTitle
            }
          >
            Custom Targets
          </Text>

          <Text
            style={
              styles.customTargetText
            }
          >
            Custom symbol and sector target editors can use the
            PC-019B storage services. This screen currently focuses
            on the controlled predefined profiles.
          </Text>
        </View>
      </Section>

      <Section
        title="Current Allocation"
        description="The current distribution of portfolio holdings and cash."
      >
        <AllocationList
          items={
            currentAllocation
              ?.assetClasses
          }
          emptyMessage="No current asset-class allocation is available."
        />
      </Section>

      <Section
        title="Target Allocation"
        description="The saved allocation percentages used for drift analysis."
      >
        <TargetList
          targets={
            target?.targets
          }
        />
      </Section>

      <Section
        title="Drift Analysis"
        description="Positive drift is overweight. Negative drift is underweight."
      >
        <View
          style={
            styles.driftSummaryGrid
          }
        >
          <MiniMetric
            label="Overweight"
            value={
              result
                ?.drift
                ?.overweight ||
              0
            }
          />

          <MiniMetric
            label="Underweight"
            value={
              result
                ?.drift
                ?.underweight ||
              0
            }
          />

          <MiniMetric
            label="Within Tolerance"
            value={
              result
                ?.drift
                ?.withinTolerance ||
              0
            }
          />
        </View>

        {driftItems.length ? (
          driftItems.map(
            (item) => (
              <DriftCard
                key={
                  item.key
                }
                item={
                  item
                }
              />
            )
          )
        ) : (
          <EmptyState
            title="No Drift Analysis"
            message="A funded Practice Portfolio and valid target allocation are required."
          />
        )}
      </Section>

      <Section
        title="Funding Analysis"
        description="Estimated liquidity available for the recommendation set."
      >
        <View
          style={
            styles.fundingCard
          }
        >
          <Row
            label="Current Cash"
            value={`KES ${money(
              result
                ?.funding
                ?.currentCash
            )}`}
          />

          <Row
            label="Preserved Cash Floor"
            value={`KES ${money(
              result
                ?.funding
                ?.preserveCashFloor
            )}`}
          />

          <Row
            label="Spendable Cash"
            value={`KES ${money(
              result
                ?.funding
                ?.spendableCurrentCash
            )}`}
          />

          <Row
            label="Cash Generated"
            value={`KES ${money(
              result
                ?.funding
                ?.estimatedCashGenerated
            )}`}
            highlight
          />

          <Row
            label="Cash Required"
            value={`KES ${money(
              result
                ?.funding
                ?.estimatedCashRequired
            )}`}
          />

          <Row
            label="Funding Gap"
            value={`KES ${money(
              result
                ?.funding
                ?.fundingGap
            )}`}
            danger={
              Number(
                result
                  ?.funding
                  ?.fundingGap ||
                0
              ) > 0
            }
          />

          <Row
            label="Surplus After Recommendations"
            value={`KES ${money(
              result
                ?.funding
                ?.surplusAfterRecommendations
            )}`}
          />

          <View
            style={[
              styles.fundingStatus,

              result
                ?.funding
                ?.fullyFunded
                ? styles.fundingStatusReady
                : styles.fundingStatusGap
            ]}
          >
            <Text
              style={[
                styles.fundingStatusText,

                result
                  ?.funding
                  ?.fullyFunded
                  ? styles.fundingStatusTextReady
                  : styles.fundingStatusTextGap
              ]}
            >
              {result
                ?.funding
                ?.fullyFunded
                ? "Recommendation set is fully funded"
                : "Additional funding or fewer purchases are required"}
            </Text>
          </View>
        </View>
      </Section>

      <Section
        title="Rebalancing Recommendations"
        description="Recommendations are analytical only and do not modify the portfolio."
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          {[
            "ACTIONABLE",
            "ALL",
            "EXCLUDED",
            "HOLD"
          ].map(
            (item) => (
              <Pressable
                key={
                  item
                }
                style={[
                  styles.filterButton,

                  recommendationFilter ===
                    item &&
                    styles.filterButtonActive
                ]}
                onPress={() =>
                  setRecommendationFilter(
                    item
                  )
                }
              >
                <Text
                  style={[
                    styles.filterButtonText,

                    recommendationFilter ===
                      item &&
                      styles.filterButtonTextActive
                  ]}
                >
                  {formatLabel(
                    item
                  )}
                </Text>
              </Pressable>
            )
          )}
        </ScrollView>

        {visibleRecommendations.length ? (
          visibleRecommendations.map(
            (recommendation) => (
              <RecommendationCard
                key={
                  recommendation.id
                }
                item={
                  recommendation
                }
              />
            )
          )
        ) : (
          <EmptyState
            title="No Recommendations"
            message="There are no recommendations in the selected category."
          />
        )}
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
          Recommendation Only
        </Text>

        <Text
          style={
            styles.protectionText
          }
        >
          PC-019 does not place trades, change holdings, reserve
          cash, or submit broker instructions. All displayed values
          are planning estimates based on the current portfolio and
          saved target allocation.
        </Text>
      </View>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={
          loadData
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Refresh Rebalancing Analysis
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.replace(
            "/(tabs)/dashboard"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Dashboard
        </Text>
      </Pressable>
    </ScrollView>
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

function AllocationList({
  items,
  emptyMessage
}) {
  const safeItems =
    Array.isArray(items)
      ? items
      : [];

  if (
    !safeItems.length
  ) {
    return (
      <EmptyState
        title="No Allocation"
        message={
          emptyMessage
        }
      />
    );
  }

  return safeItems.map(
    (item) => (
      <View
        key={
          item.key
        }
        style={
          styles.allocationCard
        }
      >
        <Row
          label={
            item.label ||
            item.key
          }
          value={`${Number(
            item.percentage ||
            0
          ).toFixed(2)}%`}
          highlight
        />

        <ProgressBar
          percentage={
            item.percentage
          }
        />

        <Row
          label="Value"
          value={`KES ${money(
            item.value
          )}`}
        />
      </View>
    )
  );
}

function TargetList({
  targets
}) {
  const safeTargets =
    Array.isArray(targets)
      ? targets
      : [];

  if (
    !safeTargets.length
  ) {
    return (
      <EmptyState
        title="No Target Allocation"
        message="Apply or create a valid rebalancing target."
      />
    );
  }

  return safeTargets.map(
    (item) => (
      <View
        key={
          item.key
        }
        style={
          styles.allocationCard
        }
      >
        <Row
          label={
            item.label ||
            item.key
          }
          value={`${Number(
            item.percentage ||
            0
          ).toFixed(2)}%`}
          highlight
        />

        <ProgressBar
          percentage={
            item.percentage
          }
        />
      </View>
    )
  );
}

function DriftCard({
  item
}) {
  const classification =
    item
      ?.classification ||
    "WITHIN_TOLERANCE";

  return (
    <View
      style={[
        styles.driftCard,

        classification ===
          "OVERWEIGHT" &&
          styles.driftCardOverweight,

        classification ===
          "UNDERWEIGHT" &&
          styles.driftCardUnderweight
      ]}
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View
          style={{
            flex: 1
          }}
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            {item.label}
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            {item.key}
          </Text>
        </View>

        <Text
          style={[
            styles.classification,

            classification ===
              "OVERWEIGHT" &&
              styles.classificationOverweight,

            classification ===
              "UNDERWEIGHT" &&
              styles.classificationUnderweight,

            classification ===
              "WITHIN_TOLERANCE" &&
              styles.classificationWithin
          ]}
        >
          {formatLabel(
            classification
          )}
        </Text>
      </View>

      <Row
        label="Current"
        value={`${Number(
          item.currentPercentage ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Target"
        value={`${Number(
          item.targetPercentage ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Drift"
        value={`${signedNumber(
          Number(
            item.driftPercentage ||
            0
          ).toFixed(2)
        )}%`}
        highlight={
          classification ===
          "WITHIN_TOLERANCE"
        }
        danger={
          classification !==
          "WITHIN_TOLERANCE"
        }
      />

      <Row
        label="Current Value"
        value={`KES ${money(
          item.currentValue
        )}`}
      />

      <Row
        label="Target Value"
        value={`KES ${money(
          item.targetValue
        )}`}
      />

      <Row
        label="Value Difference"
        value={`KES ${signedMoney(
          item.valueDifference
        )}`}
      />

      <Row
        label="Guidance"
        value={
          formatLabel(
            item.action
          )
        }
      />
    </View>
  );
}

function RecommendationCard({
  item
}) {
  const action =
    item?.action ||
    "HOLD";

  return (
    <View
      style={[
        styles.recommendationCard,

        action ===
          "BUY" &&
          styles.recommendationBuy,

        action ===
          "SELL" &&
          styles.recommendationSell,

        (
          action ===
            "DEPLOY_CASH" ||
          action ===
            "INCREASE_CASH"
        ) &&
          styles.recommendationCash
      ]}
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View
          style={{
            flex: 1
          }}
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            {item.label}
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            {item.key}
          </Text>
        </View>

        <View
          style={
            styles.actionBadge
          }
        >
          <Text
            style={
              styles.actionBadgeText
            }
          >
            {formatLabel(
              action
            )}
          </Text>
        </View>
      </View>

      <Row
        label="Priority"
        value={
          formatLabel(
            item.priority
          )
        }
      />

      <Row
        label="Current Allocation"
        value={`${Number(
          item.currentPercentage ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Target Allocation"
        value={`${Number(
          item.targetPercentage ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Drift"
        value={`${signedNumber(
          Number(
            item.driftPercentage ||
            0
          ).toFixed(2)
        )}%`}
      />

      <Row
        label="Estimated Value"
        value={`KES ${money(
          item.estimatedValue
        )}`}
        highlight={
          item.eligible
        }
      />

      {item.estimatedQuantity !==
        null &&
      item.estimatedQuantity !==
        undefined ? (
        <Row
          label="Estimated Quantity"
          value={
            item.estimatedQuantity
          }
        />
      ) : null}

      {Number(
        item.marketPrice ||
        0
      ) > 0 ? (
        <Row
          label="Market Price"
          value={`KES ${money(
            item.marketPrice
          )}`}
        />
      ) : null}

      <Row
        label="Cash Required"
        value={`KES ${money(
          item.cashRequired
        )}`}
      />

      <Row
        label="Cash Generated"
        value={`KES ${money(
          item.cashGenerated
        )}`}
      />

      <View
        style={
          styles.recommendationTextCard
        }
      >
        <Text
          style={
            styles.recommendationText
          }
        >
          {item.recommendation}
        </Text>
      </View>

      {!item.eligible &&
      item.action !==
        "HOLD" ? (
        <View
          style={
            styles.excludedCard
          }
        >
          <Text
            style={
              styles.excludedText
            }
          >
            Excluded:{" "}
            {formatLabel(
              item.eligibilityReason
            )}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function HealthMetric({
  label,
  value
}) {
  const safeValue =
    Math.min(
      Math.max(
        Number(
          value ||
          0
        ),
        0
      ),
      100
    );

  return (
    <View
      style={
        styles.healthMetric
      }
    >
      <View
        style={
          styles.healthMetricValueRow
        }
      >
        <Text
          style={
            styles.healthMetricValue
          }
        >
          {safeValue}
        </Text>

        <Text
          style={
            styles.healthMetricMaximum
          }
        >
          /100
        </Text>
      </View>

      <Text
        style={
          styles.healthMetricLabel
        }
      >
        {label}
      </Text>

      <View
        style={
          styles.healthProgressTrack
        }
      >
        <View
          style={[
            styles.healthProgressFill,

            {
              width:
                `${safeValue}%`
            }
          ]}
        />
      </View>
    </View>
  );
}

function AdvisorInsightCard({
  insight
}) {
  const severity =
    String(
      insight?.severity ||
      "INFO"
    ).toUpperCase();

  return (
    <View
      style={[
        styles.insightCard,

        severity ===
          "HIGH" &&
          styles.insightCardHigh,

        severity ===
          "MEDIUM" &&
          styles.insightCardMedium,

        severity ===
          "INFO" &&
          styles.insightCardInfo
      ]}
    >
      <View
        style={
          styles.insightHeader
        }
      >
        <Text
          style={
            styles.insightTitle
          }
        >
          {
            insight?.title ||
            "Portfolio Insight"
          }
        </Text>

        <Text
          style={[
            styles.insightSeverity,

            severity ===
              "HIGH" &&
              styles.insightSeverityHigh,

            severity ===
              "MEDIUM" &&
              styles.insightSeverityMedium,

            severity ===
              "INFO" &&
              styles.insightSeverityInfo
          ]}
        >
          {formatLabel(
            severity
          )}
        </Text>
      </View>

      <Text
        style={
          styles.insightMessage
        }
      >
        {
          insight?.message ||
          "No additional information is available."
        }
      </Text>
    </View>
  );
}

function ProgressBar({
  percentage
}) {
  const width =
    Math.min(
      Math.max(
        Number(
          percentage ||
          0
        ),
        0
      ),
      100
    );

  return (
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
              `${width}%`
          }
        ]}
      />
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
        styles.metric
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
          styles.miniMetricValue
        }
      >
        {String(
          value
        )}
      </Text>

      <Text
        style={
          styles.miniMetricLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  highlight = false,
  danger = false
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
        style={[
          styles.rowValue,

          highlight &&
            styles.rowHighlight,

          danger &&
            styles.rowDanger
        ]}
      >
        {String(
          value ??
          "N/A"
        )}
      </Text>
    </View>
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
          styles.emptyTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        {message}
      </Text>
    </View>
  );
}

function formatTargetSummary(
  targets
) {
  const safeTargets =
    Array.isArray(targets)
      ? targets
      : [];

  return safeTargets
    .map(
      (target) =>
        `${target.label}: ${Number(
          target.percentage ||
          0
        ).toFixed(0)}%`
    )
    .join("\n");
}

function formatLabel(
  value
) {
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

function signedNumber(
  value
) {
  const parsed =
    Number(
      value ||
      0
    );

  return parsed > 0
    ? `+${parsed}`
    : String(
        parsed
      );
}

function signedMoney(
  value
) {
  const parsed =
    Number(
      value ||
      0
    );

  const formatted =
    money(
      Math.abs(
        parsed
      )
    );

  if (
    parsed > 0
  ) {
    return `+${formatted}`;
  }

  if (
    parsed < 0
  ) {
    return `-${formatted}`;
  }

  return formatted;
}

function money(
  value
) {
  return Number(
    value ||
    0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2
    }
  );
}

function showMessage(
  title,
  message
) {
  if (
    Platform.OS ===
    "web"
  ) {
    window.alert(
      `${title}\n\n${message}`
    );

    return;
  }

  Alert.alert(
    title,
    message
  );
}

async function confirmAction({
  title,
  message,
  confirmLabel
}) {
  if (
    Platform.OS ===
    "web"
  ) {
    return window.confirm(
      message
    );
  }

  return new Promise(
    (resolve) => {
      let settled =
        false;

      function finish(
        value
      ) {
        if (
          settled
        ) {
          return;
        }

        settled =
          true;

        resolve(
          value
        );
      }

      Alert.alert(
        title,
        message,
        [
          {
            text:
              "Cancel",

            style:
              "cancel",

            onPress:
              () =>
                finish(
                  false
                )
          },
          {
            text:
              confirmLabel ||
              "Confirm",

            onPress:
              () =>
                finish(
                  true
                )
          }
        ],
        {
          cancelable:
            true,

          onDismiss:
            () =>
              finish(
                false
              )
        }
      );
    }
  );
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
        "#c084fc",

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

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",

      borderColor:
        "rgba(147,51,234,.35)",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        18
    },

    coachLabel: {
      color:
        "#c084fc",

      fontWeight:
        "900"
    },

    coachText: {
      color:
        "white",

      lineHeight:
        22,

      marginTop:
        8
    },

    coachFootnote: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        12,

      fontSize:
        12
    },

    statusCard: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        17,

      padding:
        15,

      marginTop:
        18
    },

    statusLabel: {
      color:
        "#94a3b8",

      fontSize:
        11
    },

    statusValue: {
      color:
        "#cbd5e1",

      fontSize:
        20,

      fontWeight:
        "900",

      marginTop:
        5
    },

    statusReady: {
      color:
        "#86efac"
    },

    statusWarning: {
      color:
        "#fde68a"
    },

    metricGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        18
    },

    metric: {
      width:
        "47%",

      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        17,

      padding:
        14
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

    healthHero: {
      backgroundColor:
        "#020617",

      borderRadius:
        17,

      padding:
        16,

      marginTop:
        14,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        16
    },

    healthScoreCircle: {
      width:
        95,

      height:
        95,

      borderRadius:
        48,

      borderWidth:
        6,

      borderColor:
        "#9333ea",

      alignItems:
        "center",

      justifyContent:
        "center"
    },

    healthScoreValue: {
      color:
        "#86efac",

      fontSize:
        30,

      fontWeight:
        "900"
    },

    healthScoreMaximum: {
      color:
        "#94a3b8",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    healthGradeContainer: {
      flex:
        1
    },

    healthGradeLabel: {
      color:
        "#c084fc",

      fontSize:
        22,

      fontWeight:
        "900"
    },

    healthGradeDescription: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        7
    },

    healthComponentGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        13
    },

    healthMetric: {
      width:
        "47%",

      backgroundColor:
        "#020617",

      borderRadius:
        14,

      padding:
        13
    },

    healthMetricValueRow: {
      flexDirection:
        "row",

      alignItems:
        "baseline",

      gap:
        3
    },

    healthMetricValue: {
      color:
        "white",

      fontSize:
        22,

      fontWeight:
        "900"
    },

    healthMetricMaximum: {
      color:
        "#64748b",

      fontSize:
        10
    },

    healthMetricLabel: {
      color:
        "#94a3b8",

      marginTop:
        5
    },

    healthProgressTrack: {
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

    healthProgressFill: {
      height:
        "100%",

      backgroundColor:
        "#22c55e",

      borderRadius:
        8
    },

    advisorDetailCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        13
    },

    priorityCard: {
      backgroundColor:
        "rgba(147,51,234,.11)",

      borderColor:
        "rgba(147,51,234,.35)",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        13
    },

    priorityLabel: {
      color:
        "#c084fc",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    priorityTitle: {
      color:
        "white",

      fontSize:
        18,

      fontWeight:
        "900",

      marginTop:
        7
    },

    priorityMessage: {
      color:
        "#cbd5e1",

      lineHeight:
        21,

      marginTop:
        7
    },

    advisorySummaryCard: {
      backgroundColor:
        "rgba(34,197,94,.08)",

      borderColor:
        "rgba(34,197,94,.30)",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        15,

      marginTop:
        13
    },

    advisorySummaryLabel: {
      color:
        "#86efac",

      fontWeight:
        "900"
    },

    advisorySummaryText: {
      color:
        "#d1fae5",

      lineHeight:
        22,

      marginTop:
        8
    },

    insightsContainer: {
      marginTop:
        14
    },

    insightsHeading: {
      color:
        "#67e8f9",

      fontWeight:
        "900",

      fontSize:
        16
    },

    insightCard: {
      backgroundColor:
        "#020617",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        11
    },

    insightCardHigh: {
      borderColor:
        "rgba(239,68,68,.45)"
    },

    insightCardMedium: {
      borderColor:
        "rgba(245,158,11,.45)"
    },

    insightCardInfo: {
      borderColor:
        "rgba(59,130,246,.40)"
    },

    insightHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",

      gap:
        12
    },

    insightTitle: {
      color:
        "white",

      fontWeight:
        "900",

      flex:
        1
    },

    insightSeverity: {
      fontSize:
        10,

      fontWeight:
        "900"
    },

    insightSeverityHigh: {
      color:
        "#fca5a5"
    },

    insightSeverityMedium: {
      color:
        "#fde68a"
    },

    insightSeverityInfo: {
      color:
        "#93c5fd"
    },

    insightMessage: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        8
    },

    noInsightsCard: {
      backgroundColor:
        "rgba(34,197,94,.08)",

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        13
    },

    noInsightsTitle: {
      color:
        "#86efac",

      fontWeight:
        "900"
    },

    noInsightsText: {
      color:
        "#d1fae5",

      lineHeight:
        20,

      marginTop:
        7
    },

    activeProfileCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        14
    },

    profileGrid: {
      marginTop:
        4
    },

    profileCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        17,

      padding:
        15,

      marginTop:
        12
    },

    profileCardActive: {
      borderColor:
        "#9333ea",

      backgroundColor:
        "rgba(147,51,234,.10)"
    },

    profileTitle: {
      color:
        "#67e8f9",

      fontSize:
        17,

      fontWeight:
        "900"
    },

    profileTitleActive: {
      color:
        "#c084fc"
    },

    profileDescription: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        7,

      marginBottom:
        5
    },

    profileTargetRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      marginTop:
        8
    },

    profileTargetLabel: {
      color:
        "#cbd5e1"
    },

    profileTargetValue: {
      color:
        "white",

      fontWeight:
        "900"
    },

    profileFooter: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        11,

      padding:
        10,

      marginTop:
        13,

      minHeight:
        39,

      justifyContent:
        "center"
    },

    profileFooterText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    customTargetNotice: {
      backgroundColor:
        "rgba(245,158,11,.09)",

      borderColor:
        "rgba(245,158,11,.30)",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        14
    },

    customTargetTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    customTargetText: {
      color:
        "#fef3c7",

      lineHeight:
        20,

      marginTop:
        7
    },

    allocationCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        14,

      padding:
        13,

      marginTop:
        12
    },

    progressTrack: {
      height:
        8,

      backgroundColor:
        "#1e293b",

      borderRadius:
        10,

      overflow:
        "hidden",

      marginTop:
        10
    },

    progressFill: {
      height:
        "100%",

      backgroundColor:
        "#9333ea",

      borderRadius:
        10
    },

    driftSummaryGrid: {
      flexDirection:
        "row",

      gap:
        8,

      marginTop:
        13
    },

    miniMetric: {
      flex:
        1,

      backgroundColor:
        "#020617",

      borderRadius:
        13,

      padding:
        12,

      alignItems:
        "center"
    },

    miniMetricValue: {
      color:
        "white",

      fontSize:
        19,

      fontWeight:
        "900"
    },

    miniMetricLabel: {
      color:
        "#94a3b8",

      fontSize:
        10,

      textAlign:
        "center",

      marginTop:
        4
    },

    driftCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        15,

      marginTop:
        13
    },

    driftCardOverweight: {
      borderColor:
        "rgba(239,68,68,.35)"
    },

    driftCardUnderweight: {
      borderColor:
        "rgba(245,158,11,.35)"
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
        18,

      fontWeight:
        "900"
    },

    cardSubtitle: {
      color:
        "#94a3b8",

      marginTop:
        3
    },

    classification: {
      fontSize:
        10,

      fontWeight:
        "900"
    },

    classificationOverweight: {
      color:
        "#fca5a5"
    },

    classificationUnderweight: {
      color:
        "#fde68a"
    },

    classificationWithin: {
      color:
        "#86efac"
    },

    fundingCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        14
    },

    fundingStatus: {
      borderRadius:
        12,

      padding:
        12,

      marginTop:
        14
    },

    fundingStatusReady: {
      backgroundColor:
        "rgba(34,197,94,.12)"
    },

    fundingStatusGap: {
      backgroundColor:
        "rgba(245,158,11,.12)"
    },

    fundingStatusText: {
      textAlign:
        "center",

      fontWeight:
        "900"
    },

    fundingStatusTextReady: {
      color:
        "#86efac"
    },

    fundingStatusTextGap: {
      color:
        "#fde68a"
    },

    filterRow: {
      gap:
        8,

      paddingVertical:
        13
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

    filterButtonActive: {
      backgroundColor:
        "#9333ea"
    },

    filterButtonText: {
      color:
        "#94a3b8",

      fontWeight:
        "900"
    },

    filterButtonTextActive: {
      color:
        "white"
    },

    recommendationCard: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        15,

      marginTop:
        13
    },

    recommendationBuy: {
      borderColor:
        "rgba(34,197,94,.35)"
    },

    recommendationSell: {
      borderColor:
        "rgba(239,68,68,.35)"
    },

    recommendationCash: {
      borderColor:
        "rgba(59,130,246,.35)"
    },

    actionBadge: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        10,

      paddingHorizontal:
        10,

      paddingVertical:
        7
    },

    actionBadgeText: {
      color:
        "#c084fc",

      fontSize:
        10,

      fontWeight:
        "900"
    },

    recommendationTextCard: {
      backgroundColor:
        "#0f172a",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        13
    },

    recommendationText: {
      color:
        "#cbd5e1",

      lineHeight:
        20
    },

    excludedCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderRadius:
        11,

      padding:
        11,

      marginTop:
        11
    },

    excludedText: {
      color:
        "#fde68a",

      textAlign:
        "center",

      fontWeight:
        "900"
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

    rowHighlight: {
      color:
        "#86efac"
    },

    rowDanger: {
      color:
        "#fca5a5"
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

    emptyTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    emptyText: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        7
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

    buttonDisabled: {
      opacity:
        0.6
    }
  });
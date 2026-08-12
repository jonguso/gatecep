from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
APP = ROOT / "app"
SRC = ROOT / "src"

ARCHIVE = (
    ROOT /
    "archive" /
    "expo-router-nonroutes" /
    "bak"
)

SERVICE = (
    SRC /
    "features" /
    "performance" /
    "performanceBenchmarkGoalIntelligenceService.js"
)

PERFORMANCE = APP / "performance.js"


def backup(path):
    b = path.with_suffix(
        path.suffix + ".pc030c2c7.bak"
    )

    shutil.copy2(
        path,
        b
    )

    return b


def archive_backup(path):
    try:
        rel = path.relative_to(APP)

    except ValueError:
        rel = (
            Path("src") /
            path.relative_to(SRC)
        )

    dest = ARCHIVE / rel

    dest.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    if dest.exists():
        i = 1

        while True:
            candidate = dest.with_name(
                f"{dest.stem}-{i}{dest.suffix}"
            )

            if not candidate.exists():
                dest = candidate
                break

            i += 1

    shutil.move(
        str(path),
        str(dest)
    )

    return dest


def commit(path, original, text):
    if text == original:
        print(
            f"UNCHANGED {path.relative_to(ROOT)}"
        )
        return

    b = backup(path)

    path.write_text(
        text,
        encoding="utf-8"
    )

    archived = archive_backup(b)

    print(
        f"PATCHED {path.relative_to(ROOT)}"
    )

    print(
        "  backup -> "
        f"{archived.relative_to(ROOT)}"
    )


try:

    #
    # ==========================================================
    # 1. PERFORMANCE BENCHMARK + GOAL INTELLIGENCE SERVICE
    # ==========================================================
    #

    SERVICE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    service_content = r'''/**
 * ============================================================
 * GateCEP Performance Benchmark + Goal Intelligence
 * PC-030C2C7
 * ============================================================
 *
 * This is an adapter layer only.
 *
 * It does NOT create:
 *   - a new benchmark engine
 *   - a new goal engine
 *   - synthetic benchmark history
 *   - synthetic portfolio history
 *   - Practice Portfolio performance
 *
 * Existing GateCEP contracts remain authoritative:
 *
 * Benchmark:
 *   benchmarkComparisonService.js
 *
 * Goals:
 *   realWealthJourneyRuntime.js
 *   goalProgressIntelligenceEngine.js
 *
 * Financial current-value truth:
 *   canonicalRealWealthMetricsService.js
 * ============================================================
 */

import {
  buildPortfolioBenchmarkSummary,
  DEFAULT_BENCHMARK_CODE
} from "./benchmarkComparisonService";

import {
  loadRealCurrentInvestorWealthJourney
} from "../wealth-journey/realWealthJourneyRuntime";

import {
  loadCanonicalRealWealthMetrics
} from "../wealth-journey/canonicalRealWealthMetricsService";


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}


function roundMoney(value) {
  const parsed =
    n(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(2)
      );
}


function roundPercent(value) {
  const parsed =
    n(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(4)
      );
}


function normalizeStatus(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value)
    .trim()
    .toUpperCase();
}


/*
 * ============================================================
 * BENCHMARK INTELLIGENCE
 * ============================================================
 */

function buildBenchmarkIntelligence(
  benchmark = {}
) {
  const status =
    normalizeStatus(
      benchmark?.status ??
      benchmark
        ?.benchmark
        ?.status
    ) ||
    "BENCHMARK_NOT_AVAILABLE";

  const portfolioReturn =
    n(
      benchmark
        ?.portfolioReturnPercentage
    );

  const benchmarkReturn =
    n(
      benchmark
        ?.benchmarkReturnPercentage
    );

  const activeReturn =
    n(
      benchmark
        ?.activeReturnPercentage
    );

  const alpha =
    n(
      benchmark
        ?.annualizedAlphaPercentage ??
      benchmark
        ?.alphaPercentage
    );

  const trackingError =
    n(
      benchmark
        ?.annualizedTrackingErrorPercentage ??
      benchmark
        ?.trackingErrorPercentage
    );

  const beta =
    n(
      benchmark?.beta
    );

  const informationRatio =
    n(
      benchmark
        ?.informationRatio
    );

  const matchedObservations =
    n(
      benchmark
        ?.matchedObservations ??
      benchmark
        ?.observations ??
      benchmark
        ?.matching
        ?.count ??
      benchmark
        ?.matchedReturns
        ?.length
    );

  /*
   * Relative comparison is only displayed as available when
   * the existing benchmark engine actually produced both
   * portfolio and benchmark return evidence.
   */
  const available =
    status !==
      "BENCHMARK_NOT_AVAILABLE" &&
    portfolioReturn !== null &&
    benchmarkReturn !== null &&
    activeReturn !== null;

  let relativeStatus =
    "NOT_AVAILABLE";

  if (available) {
    if (activeReturn > 0) {
      relativeStatus =
        "AHEAD";
    } else if (activeReturn < 0) {
      relativeStatus =
        "BEHIND";
    } else {
      relativeStatus =
        "MATCHING";
    }
  }

  return {
    available,

    status,

    relativeStatus,

    benchmarkCode:
      benchmark
        ?.benchmarkCode ??
      benchmark
        ?.benchmark
        ?.code ??
      DEFAULT_BENCHMARK_CODE,

    benchmarkLabel:
      benchmark
        ?.benchmarkLabel ??
      benchmark
        ?.benchmark
        ?.label ??
      null,

    matchedObservations,

    portfolioReturnPercentage:
      roundPercent(
        portfolioReturn
      ),

    benchmarkReturnPercentage:
      roundPercent(
        benchmarkReturn
      ),

    activeReturnPercentage:
      roundPercent(
        activeReturn
      ),

    alphaPercentage:
      roundPercent(
        alpha
      ),

    beta:
      beta,

    trackingErrorPercentage:
      roundPercent(
        trackingError
      ),

    informationRatio:
      informationRatio,

    message:
      available
        ? (
            relativeStatus === "AHEAD"
              ? "Portfolio return is ahead of the configured benchmark over the matched historical evidence."
              : relativeStatus === "BEHIND"
                ? "Portfolio return is behind the configured benchmark over the matched historical evidence."
                : "Portfolio return matches the configured benchmark over the matched historical evidence."
          )
        : (
            benchmark?.message ||
            "N/A — insufficient genuine benchmark history."
          ),

    safeguards: {
      syntheticBenchmarkUsed:
        false,

      zeroReturnSubstituted:
        false,

      requiresGenuineBenchmarkHistory:
        true
    }
  };
}


/*
 * ============================================================
 * GOAL INTELLIGENCE
 * ============================================================
 */

function extractTopGoal(
  wealthJourney = {}
) {
  const journey =
    wealthJourney
      ?.experience
      ?.journey ??
    wealthJourney
      ?.journey ??
    {};

  return (
    journey
      ?.topPriorityGoal ??
    journey
      ?.goalAdvice
      ?.[0] ??
    null
  );
}


function buildGoalIntelligence({
  wealthJourney,
  realMetrics
}) {
  const top =
    extractTopGoal(
      wealthJourney
    );

  const progress =
    top?.progress ??
    top ??
    null;

  const goal =
    progress?.goal ??
    top?.goal ??
    null;

  const trajectory =
    progress?.trajectory ??
    top?.trajectory ??
    null;

  const classification =
    progress?.classification ??
    top?.classification ??
    null;

  const nextBestAction =
    progress?.nextBestAction ??
    top?.nextBestAction ??
    null;

  const targetAmount =
    n(
      goal?.targetAmount ??
      goal?.targetValue
    );

  const targetDate =
    goal?.targetDate ??
    null;

  /*
   * Canonical REAL Net Worth is the current goal-value truth
   * already used by GateCEP Dashboard.
   */
  const currentNetWorth =
    realMetrics?.active
      ? n(
          realMetrics?.netWorth
        )
      : null;

  const currentProgressPercentage =
    (
      targetAmount !== null &&
      targetAmount > 0 &&
      currentNetWorth !== null
    )
      ? roundPercent(
          (
            currentNetWorth /
            targetAmount
          ) *
          100
        )
      : null;

  const remainingAmount =
    (
      targetAmount !== null &&
      currentNetWorth !== null
    )
      ? roundMoney(
          Math.max(
            targetAmount -
            currentNetWorth,
            0
          )
        )
      : null;

  const achieved =
    (
      targetAmount !== null &&
      currentNetWorth !== null &&
      currentNetWorth >=
        targetAmount
    );

  /*
   * A target amount by itself supports progress.
   *
   * It does NOT support an "on track" judgment without a
   * target date unless the goal has already been achieved.
   */
  const hasTrajectoryEvidence =
    Boolean(
      targetDate &&
      trajectory?.valid
    );

  let status =
    "NOT_ENOUGH_DATA";

  let statusLabel =
    "Not enough data";

  if (achieved) {
    status =
      "ACHIEVED";

    statusLabel =
      "Goal achieved";
  }

  else if (
    hasTrajectoryEvidence
  ) {
    status =
      normalizeStatus(
        classification?.status
      ) ||
      "NOT_ENOUGH_DATA";

    statusLabel =
      classification?.label ||
      status;
  }

  else if (
    targetAmount !== null &&
    targetAmount > 0 &&
    !targetDate
  ) {
    status =
      "TARGET_DATE_REQUIRED";

    statusLabel =
      "Target date required";
  }

  const requiredMonthlyContribution =
    hasTrajectoryEvidence
      ? n(
          trajectory
            ?.requiredMonthlyContribution
        )
      : null;

  const projectedValue =
    hasTrajectoryEvidence
      ? n(
          trajectory
            ?.projectedValue
        )
      : null;

  const projectedGap =
    hasTrajectoryEvidence
      ? n(
          trajectory
            ?.projectedGap
        )
      : null;

  return {
    available:
      Boolean(
        goal &&
        targetAmount !== null &&
        targetAmount > 0 &&
        currentNetWorth !== null
      ),

    goalId:
      goal?.id ??
      null,

    goalName:
      goal?.name ??
      goal?.title ??
      "Financial Goal",

    currency:
      goal?.currency ||
      "KES",

    targetAmount:
      roundMoney(
        targetAmount
      ),

    targetDate,

    currentNetWorth:
      roundMoney(
        currentNetWorth
      ),

    currentProgressPercentage,

    remainingAmount,

    achieved,

    hasTargetDate:
      Boolean(
        targetDate
      ),

    hasTrajectoryEvidence,

    status,

    statusLabel,

    monthsRemaining:
      hasTrajectoryEvidence
        ? n(
            trajectory
              ?.monthsRemaining
          )
        : null,

    projectedValue:
      roundMoney(
        projectedValue
      ),

    projectedGap:
      roundMoney(
        projectedGap
      ),

    requiredMonthlyContribution:
      roundMoney(
        requiredMonthlyContribution
      ),

    annualReturnAssumption:
      hasTrajectoryEvidence
        ? n(
            trajectory
              ?.annualReturnAssumption
          )
        : null,

    nextBestAction: {
      action:
        nextBestAction
          ?.action ??
        null,

      label:
        nextBestAction
          ?.label ??
        null,

      reason:
        nextBestAction
          ?.reason ??
        null
    },

    message:
      achieved
        ? "The current canonical real Net Worth has reached or exceeded this goal."
        : !goal
          ? "N/A — no active Wealth Journey goal is available."
          : targetAmount === null ||
            targetAmount <= 0
            ? "N/A — a valid goal target amount is required."
            : !targetDate
              ? "Progress can be measured, but GateCEP will not classify the goal as on track or behind until a target date is available."
              : !hasTrajectoryEvidence
                ? "N/A — the existing Wealth Journey engine does not yet have enough planning evidence to classify this goal trajectory."
                : (
                    classification
                      ?.label ||
                    "Goal trajectory is available."
                  ),

    safeguards: {
      source:
        "REAL_WEALTH_JOURNEY",

      currentValueSource:
        "CANONICAL_REAL_NET_WORTH",

      practiceIncluded:
        false,

      trackStatusRequiresTargetDate:
        true,

      syntheticGoalUsed:
        false
    }
  };
}


/*
 * ============================================================
 * MAIN CONTRACT
 * ============================================================
 */

export async function buildPerformanceBenchmarkGoalIntelligence() {
  const [
    benchmark,
    wealthJourney,
    realMetrics
  ] =
    await Promise.all([
      buildPortfolioBenchmarkSummary()
        .catch(
          (error) => ({
            status:
              "BENCHMARK_NOT_AVAILABLE",

            message:
              error?.message ||
              "Benchmark history is unavailable."
          })
        ),

      loadRealCurrentInvestorWealthJourney()
        .catch(
          () => ({
            ready:
              false,

            experience: {
              journey: {
                goalAdvice:
                  [],

                topPriorityGoal:
                  null
              }
            }
          })
        ),

      loadCanonicalRealWealthMetrics()
        .catch(
          () => ({
            active:
              false,

            netWorth:
              null
          })
        )
    ]);

  return {
    generatedAt:
      new Date()
        .toISOString(),

    benchmark:
      buildBenchmarkIntelligence(
        benchmark
      ),

    goal:
      buildGoalIntelligence({
        wealthJourney,
        realMetrics
      }),

    safeguards: {
      canonicalRealPortfolio:
        true,

      practiceIncluded:
        false,

      syntheticHistory:
        false,

      syntheticBenchmark:
        false,

      missingDataBecomesZero:
        false
    },

    sources: {
      benchmark,
      wealthJourneyStatus:
        wealthJourney?.status ??
        null,

      realWealthActive:
        Boolean(
          realMetrics?.active
        )
    }
  };
}


export async function loadPerformanceBenchmarkGoalIntelligence() {
  return buildPerformanceBenchmarkGoalIntelligence();
}
'''

    if SERVICE.exists():
        original_service = SERVICE.read_text(
            encoding="utf-8"
        )

        commit(
            SERVICE,
            original_service,
            service_content
        )

    else:
        SERVICE.write_text(
            service_content,
            encoding="utf-8"
        )

        print(
            "CREATED "
            "src/features/performance/"
            "performanceBenchmarkGoalIntelligenceService.js"
        )

    #
    # ==========================================================
    # 2. PERFORMANCE IMPORT
    # ==========================================================
    #

    original = PERFORMANCE.read_text(
        encoding="utf-8"
    )

    text = original

    import_anchor = '''import {
  buildHistoricalPerformanceSummary
} from "../src/features/performance/historicalPerformanceSummaryService";'''

    import_new = '''import {
  buildHistoricalPerformanceSummary
} from "../src/features/performance/historicalPerformanceSummaryService";
import {
  buildPerformanceBenchmarkGoalIntelligence
} from "../src/features/performance/performanceBenchmarkGoalIntelligenceService";'''

    if (
        "buildPerformanceBenchmarkGoalIntelligence"
        not in text
    ):
        if import_anchor not in text:
            raise RuntimeError(
                "Performance historical import anchor not found."
            )

        text = text.replace(
            import_anchor,
            import_new,
            1
        )

    #
    # ==========================================================
    # 3. STATE
    # ==========================================================
    #

    state_anchor = '''const [historicalSummary, setHistoricalSummary] = useState(null);'''

    state_new = '''const [historicalSummary, setHistoricalSummary] = useState(null);
const [benchmarkGoalIntel, setBenchmarkGoalIntel] = useState(null);'''

    if (
        "const [benchmarkGoalIntel"
        not in text
    ):
        if state_anchor not in text:
            raise RuntimeError(
                "Historical summary state anchor not found."
            )

        text = text.replace(
            state_anchor,
            state_new,
            1
        )

    #
    # ==========================================================
    # 4. LOAD C7 INTELLIGENCE
    # ==========================================================
    #

    old_load = '''      const [
        data,
        realMetrics,
        health,
        historySummary
      ] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore(),
        buildHistoricalPerformanceSummary()
      ]);'''

    new_load = '''      const [
        data,
        realMetrics,
        health,
        historySummary,
        benchmarkGoalResult
      ] = await Promise.all([
        loadPortfolioSnapshots(),
        loadCanonicalRealWealthMetrics(),
        buildPortfolioHealthScore(),
        buildHistoricalPerformanceSummary(),
        buildPerformanceBenchmarkGoalIntelligence()
      ]);'''

    if (
        "benchmarkGoalResult"
        not in text
    ):
        if old_load not in text:
            raise RuntimeError(
                "Performance load Promise.all anchor not found."
            )

        text = text.replace(
            old_load,
            new_load,
            1
        )

    set_anchor = '''      setHistoricalSummary(
        historySummary || null
      );'''

    set_new = '''      setHistoricalSummary(
        historySummary || null
      );

      setBenchmarkGoalIntel(
        benchmarkGoalResult || null
      );'''

    if (
        "setBenchmarkGoalIntel("
        not in text
    ):
        if set_anchor not in text:
            raise RuntimeError(
                "Historical summary set-state anchor not found."
            )

        text = text.replace(
            set_anchor,
            set_new,
            1
        )

    catch_anchor = '''      setHistoricalSummary(null);'''

    catch_new = '''      setHistoricalSummary(null);
      setBenchmarkGoalIntel(null);'''

    if (
        "setBenchmarkGoalIntel(null);"
        not in text
    ):
        if catch_anchor not in text:
            raise RuntimeError(
                "Performance catch anchor not found."
            )

        text = text.replace(
            catch_anchor,
            catch_new,
            1
        )

    #
    # ==========================================================
    # 5. BENCHMARK + GOAL UI
    #
    # Insert before Performance Records.
    # ==========================================================
    #

    records_anchor = '''          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Performance Records
                </Text>'''

    intelligence_ui = '''          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Benchmark Comparison
                </Text>

                <Text style={styles.body}>
                  Relative performance against GateCEP&apos;s configured
                  genuine NSE benchmark history.
                </Text>
              </View>

              <View style={styles.observationBadge}>
                <Text style={styles.observationBadgeText}>
                  {formatPerformanceLabel(
                    benchmarkGoalIntel
                      ?.benchmark
                      ?.relativeStatus
                  ) || "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.analyticsGrid}>
              <AnalyticsMetric
                label="Benchmark"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.benchmarkLabel ||
                  formatPerformanceLabel(
                    benchmarkGoalIntel
                      ?.benchmark
                      ?.benchmarkCode
                  ) ||
                  "N/A"
                }
              />

              <AnalyticsMetric
                label="Benchmark Status"
                value={
                  formatPerformanceLabel(
                    benchmarkGoalIntel
                      ?.benchmark
                      ?.status
                  ) ||
                  "N/A"
                }
              />

              <AnalyticsMetric
                label="Portfolio Return"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.portfolioReturnPercentage !== null &&
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.portfolioReturnPercentage !== undefined
                    ? `${Number(
                        benchmarkGoalIntel
                          .benchmark
                          .portfolioReturnPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Benchmark Return"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.benchmarkReturnPercentage !== null &&
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.benchmarkReturnPercentage !== undefined
                    ? `${Number(
                        benchmarkGoalIntel
                          .benchmark
                          .benchmarkReturnPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Excess Return"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.activeReturnPercentage !== null &&
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.activeReturnPercentage !== undefined
                    ? `${Number(
                        benchmarkGoalIntel
                          .benchmark
                          .activeReturnPercentage
                      ) >= 0
                        ? "+"
                        : ""}${Number(
                        benchmarkGoalIntel
                          .benchmark
                          .activeReturnPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Matched Observations"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.matchedObservations !== null &&
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.matchedObservations !== undefined
                    ? String(
                        benchmarkGoalIntel
                          .benchmark
                          .matchedObservations
                      )
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Alpha"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.alphaPercentage !== null &&
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.alphaPercentage !== undefined
                    ? `${Number(
                        benchmarkGoalIntel
                          .benchmark
                          .alphaPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Tracking Error"
                value={
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.trackingErrorPercentage !== null &&
                  benchmarkGoalIntel
                    ?.benchmark
                    ?.trackingErrorPercentage !== undefined
                    ? `${Number(
                        benchmarkGoalIntel
                          .benchmark
                          .trackingErrorPercentage
                      ).toFixed(2)}%`
                    : "N/A"
                }
              />
            </View>

            {!benchmarkGoalIntel?.benchmark?.available ? (
              <View style={styles.performanceIntelNotice}>
                <Text style={styles.performanceIntelNoticeTitle}>
                  Benchmark History Required
                </Text>

                <Text style={styles.performanceIntelNoticeText}>
                  {benchmarkGoalIntel
                    ?.benchmark
                    ?.message ||
                    "N/A — insufficient genuine benchmark history. GateCEP will not substitute a synthetic or zero benchmark return."}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Goal Progress Intelligence
                </Text>

                <Text style={styles.body}>
                  Progress uses canonical REAL Net Worth and the existing
                  Wealth Journey goal contract.
                </Text>
              </View>

              <View style={styles.observationBadge}>
                <Text style={styles.observationBadgeText}>
                  {formatPerformanceLabel(
                    benchmarkGoalIntel
                      ?.goal
                      ?.status
                  ) || "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.analyticsGrid}>
              <AnalyticsMetric
                label="Goal"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.goalName ||
                  "N/A"
                }
              />

              <AnalyticsMetric
                label="Current Net Worth"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.currentNetWorth !== null &&
                  benchmarkGoalIntel
                    ?.goal
                    ?.currentNetWorth !== undefined
                    ? `KES ${money(
                        benchmarkGoalIntel
                          .goal
                          .currentNetWorth
                      )}`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Target Amount"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.targetAmount !== null &&
                  benchmarkGoalIntel
                    ?.goal
                    ?.targetAmount !== undefined
                    ? `KES ${money(
                        benchmarkGoalIntel
                          .goal
                          .targetAmount
                      )}`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Current Progress"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.currentProgressPercentage !== null &&
                  benchmarkGoalIntel
                    ?.goal
                    ?.currentProgressPercentage !== undefined
                    ? `${Number(
                        benchmarkGoalIntel
                          .goal
                          .currentProgressPercentage
                      ).toFixed(1)}%`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Remaining"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.remainingAmount !== null &&
                  benchmarkGoalIntel
                    ?.goal
                    ?.remainingAmount !== undefined
                    ? `KES ${money(
                        benchmarkGoalIntel
                          .goal
                          .remainingAmount
                      )}`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Target Date"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.targetDate ||
                  "N/A"
                }
              />

              <AnalyticsMetric
                label="Projected Value"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.projectedValue !== null &&
                  benchmarkGoalIntel
                    ?.goal
                    ?.projectedValue !== undefined
                    ? `KES ${money(
                        benchmarkGoalIntel
                          .goal
                          .projectedValue
                      )}`
                    : "N/A"
                }
              />

              <AnalyticsMetric
                label="Required Monthly Contribution"
                value={
                  benchmarkGoalIntel
                    ?.goal
                    ?.requiredMonthlyContribution !== null &&
                  benchmarkGoalIntel
                    ?.goal
                    ?.requiredMonthlyContribution !== undefined
                    ? `KES ${money(
                        benchmarkGoalIntel
                          .goal
                          .requiredMonthlyContribution
                      )}`
                    : "N/A"
                }
              />
            </View>

            <View style={styles.goalProgressTrack}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${Math.max(
                      0,
                      Math.min(
                        Number(
                          benchmarkGoalIntel
                            ?.goal
                            ?.currentProgressPercentage ||
                          0
                        ),
                        100
                      )
                    )}%`
                  }
                ]}
              />
            </View>

            <Text style={styles.performanceIntelMessage}>
              {benchmarkGoalIntel
                ?.goal
                ?.message ||
                "N/A — no active real-investor goal evidence is available."}
            </Text>

            {benchmarkGoalIntel
              ?.goal
              ?.nextBestAction
              ?.label ? (
              <View style={styles.goalActionBox}>
                <Text style={styles.goalActionTitle}>
                  Existing Wealth Journey Next Step
                </Text>

                <Text style={styles.goalActionLabel}>
                  {benchmarkGoalIntel
                    .goal
                    .nextBestAction
                    .label}
                </Text>

                {benchmarkGoalIntel
                  ?.goal
                  ?.nextBestAction
                  ?.reason ? (
                  <Text style={styles.goalActionReason}>
                    {benchmarkGoalIntel
                      .goal
                      .nextBestAction
                      .reason}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {!benchmarkGoalIntel?.goal?.hasTargetDate &&
            benchmarkGoalIntel?.goal?.targetAmount ? (
              <View style={styles.performanceIntelNotice}>
                <Text style={styles.performanceIntelNoticeTitle}>
                  Target Date Required for Track Status
                </Text>

                <Text style={styles.performanceIntelNoticeText}>
                  GateCEP can calculate current goal progress and the
                  remaining amount, but it will not claim the investor is
                  on track or behind without a target date.
                </Text>
              </View>
            ) : null}
          </View>

''' + records_anchor

    if (
        "Goal Progress Intelligence"
        not in text
    ):
        if records_anchor not in text:
            raise RuntimeError(
                "Performance Records UI anchor not found."
            )

        text = text.replace(
            records_anchor,
            intelligence_ui,
            1
        )

    #
    # ==========================================================
    # 6. STYLES
    # ==========================================================
    #

    if (
        "performanceIntelNotice:"
        not in text
    ):
        marker = "\n});"

        pos = text.rfind(
            marker
        )

        if pos == -1:
            raise RuntimeError(
                "Performance StyleSheet closing not found."
            )

        styles = ''',

  performanceIntelNotice: {
    marginTop: 15,
    backgroundColor: "rgba(245,158,11,.08)",
    borderColor: "rgba(245,158,11,.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },

  performanceIntelNoticeTitle: {
    color: "#fde68a",
    fontWeight: "900"
  },

  performanceIntelNoticeText: {
    color: "#fef3c7",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6
  },

  performanceIntelMessage: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 14
  },

  goalProgressTrack: {
    height: 10,
    backgroundColor: "#1e293b",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16
  },

  goalProgressFill: {
    height: "100%",
    backgroundColor: "#22d3ee",
    borderRadius: 999
  },

  goalActionBox: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#164e63",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },

  goalActionTitle: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },

  goalActionLabel: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 6
  },

  goalActionReason: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6
  }'''

        text = (
            text[:pos] +
            styles +
            text[pos:]
        )

    #
    # ==========================================================
    # 7. SAFETY
    # ==========================================================
    #

    required = [
        "buildPerformanceBenchmarkGoalIntelligence",
        "benchmarkGoalIntel",
        "Benchmark Comparison",
        "Goal Progress Intelligence",
        'label="Portfolio Return"',
        'label="Benchmark Return"',
        'label="Excess Return"',
        'label="Current Net Worth"',
        'label="Target Amount"',
        'label="Current Progress"',
        'label="Remaining"',
        'label="Target Date"',
        'label="Required Monthly Contribution"',
        "Target Date Required for Track Status",
        "Performance Records",
        "Portfolio Drawdown",
        "Portfolio Health Trend",
        "TimelineSnapshotInspector",
        "Building Timeline History"
    ]

    missing = [
        item
        for item in required
        if item not in text
    ]

    if missing:
        raise RuntimeError(
            f"Missing C7 Performance UI elements: {missing}"
        )

    commit(
        PERFORMANCE,
        original,
        text
    )

    print()
    print(
        "PC-030C2C7 applied successfully."
    )

    print()
    print(
        "C7 reuses existing GateCEP contracts:"
    )

    print(
        "  - benchmarkComparisonService"
    )

    print(
        "  - realWealthJourneyRuntime"
    )

    print(
        "  - goalProgressIntelligenceEngine"
    )

    print(
        "  - canonical REAL Net Worth"
    )

    print()
    print(
        "No synthetic benchmark or goal history introduced."
    )

except Exception as error:
    print(
        f"ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)

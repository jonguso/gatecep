/**
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
    status !==
      "INSUFFICIENT_HISTORY" &&
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
        true,

      insufficientHistoryBecomesAvailable:
        false
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

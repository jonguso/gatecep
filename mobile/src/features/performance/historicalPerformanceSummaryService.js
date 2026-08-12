/**
 * ============================================================
 * GateCEP Historical Performance Summary
 * PC-030C2C1
 * ============================================================
 *
 * Investor-facing historical summary derived exclusively from
 * canonical REAL portfolio snapshots.
 *
 * This service intentionally does NOT replace:
 *
 *   portfolioPerformanceService.js
 *   performanceChartService.js
 *   riskMetricsService.js
 *
 * Those services remain responsible for advanced analytics such
 * as TWR, volatility, benchmark comparison and risk analytics.
 *
 * This layer provides simple canonical snapshot-to-snapshot
 * portfolio-value history:
 *
 *   7D
 *   30D
 *   90D
 *   YTD
 *   1Y
 *   Since first snapshot
 *   Peak net worth
 *   Current drawdown
 *   Maximum drawdown
 *   Health-score trend
 *
 * IMPORTANT:
 *
 * Missing historical coverage is represented by null / N/A.
 * It must never be converted into a synthetic 0% return.
 * ============================================================
 */

import {
  loadPortfolioSnapshots
} from "../../services/portfolio/portfolioSnapshot";


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function nullableNumber(value) {
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
    nullableNumber(value);

  if (parsed === null) {
    return null;
  }

  return Number(
    parsed.toFixed(2)
  );
}


function roundPercent(value) {
  const parsed =
    nullableNumber(value);

  if (parsed === null) {
    return null;
  }

  return Number(
    parsed.toFixed(4)
  );
}


function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}


function dateKey(value) {
  const date =
    normalizeDate(value);

  return date
    ? date.toISOString().slice(0, 10)
    : null;
}


function snapshotNetWorth(snapshot) {
  return nullableNumber(
    snapshot?.netWorth ??
    snapshot?.totalValue
  );
}


function snapshotHoldingsValue(snapshot) {
  return nullableNumber(
    snapshot?.holdingsValue ??
    snapshot?.currentValue
  );
}


function snapshotCash(snapshot) {
  return nullableNumber(
    snapshot?.availableCash ??
    snapshot?.cash
  );
}


function snapshotHealth(snapshot) {
  return nullableNumber(
    snapshot?.healthScore
  );
}


function snapshotTimestamp(snapshot) {
  return normalizeDate(
    snapshot?.snapshotAt ??
    snapshot?.savedAt ??
    snapshot?.date
  );
}


/*
 * ============================================================
 * CANONICAL HISTORY
 * ============================================================
 */

function normalizeHistory(
  snapshots = []
) {
  const byDate =
    new Map();

  for (
    const snapshot of
    Array.isArray(snapshots)
      ? snapshots
      : []
  ) {
    const date =
      dateKey(
        snapshot?.date ??
        snapshot?.snapshotAt ??
        snapshot?.savedAt
      );

    const timestamp =
      snapshotTimestamp(
        snapshot
      );

    const netWorth =
      snapshotNetWorth(
        snapshot
      );

    if (
      !date ||
      !timestamp ||
      netWorth === null ||
      netWorth < 0
    ) {
      continue;
    }

    const candidate = {
      ...snapshot,

      date,

      netWorth,

      holdingsValue:
        snapshotHoldingsValue(
          snapshot
        ),

      availableCash:
        snapshotCash(
          snapshot
        ),

      healthScore:
        snapshotHealth(
          snapshot
        ),

      __timestamp:
        timestamp.getTime()
    };

    const existing =
      byDate.get(date);

    /*
     * Keep the newest observation if legacy history happens to
     * contain more than one record for a calendar day.
     */
    if (
      !existing ||
      candidate.__timestamp >
      existing.__timestamp
    ) {
      byDate.set(
        date,
        candidate
      );
    }
  }

  return Array.from(
    byDate.values()
  )
    .sort(
      (a, b) =>
        a.__timestamp -
        b.__timestamp
    )
    .map(
      ({
        __timestamp,
        ...snapshot
      }) =>
        snapshot
    );
}


/*
 * ============================================================
 * PERIOD BOUNDARIES
 * ============================================================
 */

function subtractDays(
  date,
  days
) {
  const result =
    new Date(
      date.getTime()
    );

  result.setUTCDate(
    result.getUTCDate() -
    days
  );

  return result;
}


function startOfYear(date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      0,
      1
    )
  );
}


/*
 * Find the latest snapshot on or before the requested boundary.
 *
 * We deliberately do not substitute a newer snapshot when the
 * requested historical period does not actually exist.
 */
function findBoundarySnapshot(
  history,
  boundaryDate
) {
  const boundaryTime =
    boundaryDate.getTime();

  let match =
    null;

  for (
    const snapshot of
    history
  ) {
    const timestamp =
      snapshotTimestamp(
        snapshot
      );

    if (!timestamp) {
      continue;
    }

    if (
      timestamp.getTime() <=
      boundaryTime
    ) {
      match =
        snapshot;
    } else {
      break;
    }
  }

  return match;
}


function buildPeriodResult({
  code,
  label,
  current,
  baseline,
  requestedStartDate
}) {
  if (
    !current ||
    !baseline
  ) {
    return {
      code,
      label,
      available: false,

      requestedStartDate:
        dateKey(
          requestedStartDate
        ),

      startDate:
        null,

      endDate:
        current?.date ??
        null,

      startNetWorth:
        null,

      endNetWorth:
        current
          ? roundMoney(
              current.netWorth
            )
          : null,

      change:
        null,

      returnPercentage:
        null
    };
  }

  const startValue =
    snapshotNetWorth(
      baseline
    );

  const endValue =
    snapshotNetWorth(
      current
    );

  if (
    startValue === null ||
    startValue <= 0 ||
    endValue === null
  ) {
    return {
      code,
      label,
      available: false,

      requestedStartDate:
        dateKey(
          requestedStartDate
        ),

      startDate:
        baseline?.date ??
        null,

      endDate:
        current?.date ??
        null,

      startNetWorth:
        startValue,

      endNetWorth:
        endValue,

      change:
        null,

      returnPercentage:
        null
    };
  }

  const change =
    endValue -
    startValue;

  return {
    code,
    label,
    available: true,

    requestedStartDate:
      dateKey(
        requestedStartDate
      ),

    startDate:
      baseline.date,

    endDate:
      current.date,

    startNetWorth:
      roundMoney(
        startValue
      ),

    endNetWorth:
      roundMoney(
        endValue
      ),

    change:
      roundMoney(
        change
      ),

    returnPercentage:
      roundPercent(
        (
          change /
          startValue
        ) * 100
      )
  };
}


/*
 * ============================================================
 * DRAWDOWN
 * ============================================================
 */

function buildDrawdownSummary(
  history
) {
  if (!history.length) {
    return {
      available: false,

      peakNetWorth:
        null,

      peakDate:
        null,

      currentDrawdown:
        null,

      currentDrawdownPercentage:
        null,

      maximumDrawdown:
        null,

      maximumDrawdownPercentage:
        null,

      maximumDrawdownPeakDate:
        null,

      maximumDrawdownTroughDate:
        null
    };
  }

  let peakValue =
    null;

  let peakDate =
    null;

  let maximumDrawdown =
    null;

  let maximumDrawdownPercentage =
    null;

  let maximumPeakDate =
    null;

  let maximumTroughDate =
    null;

  for (
    const snapshot of
    history
  ) {
    const value =
      snapshotNetWorth(
        snapshot
      );

    if (
      value === null ||
      value < 0
    ) {
      continue;
    }

    if (
      peakValue === null ||
      value > peakValue
    ) {
      peakValue =
        value;

      peakDate =
        snapshot.date;
    }

    if (
      peakValue === null ||
      peakValue <= 0
    ) {
      continue;
    }

    const drawdown =
      value -
      peakValue;

    const drawdownPercentage =
      (
        drawdown /
        peakValue
      ) * 100;

    if (
      maximumDrawdown === null ||
      drawdown <
      maximumDrawdown
    ) {
      maximumDrawdown =
        drawdown;

      maximumDrawdownPercentage =
        drawdownPercentage;

      maximumPeakDate =
        peakDate;

      maximumTroughDate =
        snapshot.date;
    }
  }

  const latest =
    history[
      history.length - 1
    ];

  const latestValue =
    snapshotNetWorth(
      latest
    );

  const currentDrawdown =
    peakValue !== null &&
    latestValue !== null
      ? latestValue -
        peakValue
      : null;

  const currentDrawdownPercentage =
    peakValue !== null &&
    peakValue > 0 &&
    currentDrawdown !== null
      ? (
          currentDrawdown /
          peakValue
        ) * 100
      : null;

  return {
    available:
      peakValue !== null,

    peakNetWorth:
      roundMoney(
        peakValue
      ),

    peakDate,

    currentDrawdown:
      roundMoney(
        currentDrawdown
      ),

    currentDrawdownPercentage:
      roundPercent(
        currentDrawdownPercentage
      ),

    maximumDrawdown:
      roundMoney(
        maximumDrawdown
      ),

    maximumDrawdownPercentage:
      roundPercent(
        maximumDrawdownPercentage
      ),

    maximumDrawdownPeakDate:
      maximumPeakDate,

    maximumDrawdownTroughDate:
      maximumTroughDate
  };
}


/*
 * ============================================================
 * HEALTH TREND
 * ============================================================
 */

function buildHealthTrend(
  history
) {
  const observations =
    history
      .map(
        (snapshot) => ({
          date:
            snapshot.date,

          score:
            snapshotHealth(
              snapshot
            )
        })
      )
      .filter(
        (item) =>
          item.score !== null
      );

  if (
    observations.length <
    2
  ) {
    return {
      available: false,

      observationCount:
        observations.length,

      firstScore:
        observations[0]
          ?.score ??
        null,

      latestScore:
        observations[
          observations.length - 1
        ]?.score ??
        null,

      change:
        null,

      direction:
        "INSUFFICIENT_HISTORY"
    };
  }

  const first =
    observations[0];

  const latest =
    observations[
      observations.length - 1
    ];

  const change =
    latest.score -
    first.score;

  return {
    available: true,

    observationCount:
      observations.length,

    firstScore:
      first.score,

    firstDate:
      first.date,

    latestScore:
      latest.score,

    latestDate:
      latest.date,

    change:
      roundPercent(
        change
      ),

    direction:
      change > 0
        ? "IMPROVING"
        : change < 0
          ? "DECLINING"
          : "STABLE"
  };
}


/*
 * ============================================================
 * PC-030C2C6
 * PERFORMANCE RECORDS + MILESTONES
 * ============================================================
 *
 * Records are derived only from genuine normalized snapshot
 * observations already accepted into historical performance.
 *
 * No synthetic dates.
 * No interpolated values.
 * No zero return substitution when history is missing.
 * ============================================================
 */

const PERFORMANCE_MILESTONES = [
  100000,
  250000,
  500000,
  1000000,
  2500000,
  5000000,
  10000000
];


function buildPerformanceRecords(
  history = []
) {
  const observations =
    Array.isArray(history)
      ? history
          .map(
            (snapshot) => ({
              date:
                snapshot?.date ??
                null,

              netWorth:
                snapshotNetWorth(
                  snapshot
                ),

              healthScore:
                snapshotHealth(
                  snapshot
                )
            })
          )
          .filter(
            (item) =>
              item.date &&
              item.netWorth !== null &&
              item.netWorth >= 0
          )
      : [];

  if (!observations.length) {
    return {
      available:
        false,

      observationCount:
        0,

      highestNetWorth:
        null,

      lowestNetWorth:
        null,

      bestSnapshotChange:
        null,

      worstSnapshotChange:
        null,

      bestHealthImprovement:
        null,

      worstHealthDecline:
        null,

      milestones:
        PERFORMANCE_MILESTONES.map(
          (threshold) => ({
            threshold,
            achieved:
              false,

            date:
              null,

            recordedNetWorth:
              null
          })
        )
    };
  }

  let highest =
    observations[0];

  let lowest =
    observations[0];

  for (
    const observation of
    observations
  ) {
    if (
      observation.netWorth >
      highest.netWorth
    ) {
      highest =
        observation;
    }

    if (
      observation.netWorth <
      lowest.netWorth
    ) {
      lowest =
        observation;
    }
  }

  let bestSnapshotChange =
    null;

  let worstSnapshotChange =
    null;

  let bestHealthImprovement =
    null;

  let worstHealthDecline =
    null;

  for (
    let index = 1;
    index < observations.length;
    index += 1
  ) {
    const previous =
      observations[
        index - 1
      ];

    const current =
      observations[
        index
      ];

    if (
      previous.netWorth !== null &&
      previous.netWorth > 0 &&
      current.netWorth !== null
    ) {
      const change =
        current.netWorth -
        previous.netWorth;

      const changePercentage =
        (
          change /
          previous.netWorth
        ) * 100;

      const movement = {
        fromDate:
          previous.date,

        toDate:
          current.date,

        startNetWorth:
          roundMoney(
            previous.netWorth
          ),

        endNetWorth:
          roundMoney(
            current.netWorth
          ),

        change:
          roundMoney(
            change
          ),

        changePercentage:
          roundPercent(
            changePercentage
          )
      };

      if (
        !bestSnapshotChange ||
        changePercentage >
        bestSnapshotChange
          .changePercentage
      ) {
        bestSnapshotChange =
          movement;
      }

      if (
        !worstSnapshotChange ||
        changePercentage <
        worstSnapshotChange
          .changePercentage
      ) {
        worstSnapshotChange =
          movement;
      }
    }

    if (
      previous.healthScore !== null &&
      current.healthScore !== null
    ) {
      const healthChange =
        current.healthScore -
        previous.healthScore;

      const healthMovement = {
        fromDate:
          previous.date,

        toDate:
          current.date,

        startScore:
          previous.healthScore,

        endScore:
          current.healthScore,

        change:
          roundPercent(
            healthChange
          )
      };

      if (
        healthChange > 0 &&
        (
          !bestHealthImprovement ||
          healthChange >
          bestHealthImprovement.change
        )
      ) {
        bestHealthImprovement =
          healthMovement;
      }

      if (
        healthChange < 0 &&
        (
          !worstHealthDecline ||
          healthChange <
          worstHealthDecline.change
        )
      ) {
        worstHealthDecline =
          healthMovement;
      }
    }
  }

  const milestones =
    PERFORMANCE_MILESTONES.map(
      (threshold) => {
        const achieved =
          observations.find(
            (observation) =>
              observation.netWorth >=
              threshold
          ) ||
          null;

        return {
          threshold,

          achieved:
            Boolean(
              achieved
            ),

          date:
            achieved?.date ??
            null,

          recordedNetWorth:
            achieved
              ? roundMoney(
                  achieved.netWorth
                )
              : null
        };
      }
    );

  return {
    available:
      true,

    observationCount:
      observations.length,

    highestNetWorth: {
      value:
        roundMoney(
          highest.netWorth
        ),

      date:
        highest.date
    },

    lowestNetWorth: {
      value:
        roundMoney(
          lowest.netWorth
        ),

      date:
        lowest.date
    },

    /*
     * Snapshot-to-snapshot records require at least two
     * genuine observations.
     */
    bestSnapshotChange:
      observations.length >= 2
        ? bestSnapshotChange
        : null,

    worstSnapshotChange:
      observations.length >= 2
        ? worstSnapshotChange
        : null,

    bestHealthImprovement:
      observations.length >= 2
        ? bestHealthImprovement
        : null,

    worstHealthDecline:
      observations.length >= 2
        ? worstHealthDecline
        : null,

    milestones
  };
}


/*
 * ============================================================
 * MAIN CONTRACT
 * ============================================================
 */

export async function buildHistoricalPerformanceSummary() {
  const snapshots =
    await loadPortfolioSnapshots();

  const history =
    normalizeHistory(
      snapshots
    );

  if (!history.length) {
    return {
      status:
        "NO_HISTORY",

      observationCount:
        0,

      firstSnapshotDate:
        null,

      latestSnapshotDate:
        null,

      current:
        null,

      periods: {
        sevenDay: null,
        thirtyDay: null,
        ninetyDay: null,
        yearToDate: null,
        oneYear: null,
        sinceFirstSnapshot: null
      },

      records:
        buildPerformanceRecords([]),

      drawdown:
        buildDrawdownSummary([]),

      healthTrend:
        buildHealthTrend([])
    };
  }

  const first =
    history[0];

  const current =
    history[
      history.length - 1
    ];

  const currentDate =
    normalizeDate(
      current.date
    );

  const sevenDayBoundary =
    subtractDays(
      currentDate,
      7
    );

  const thirtyDayBoundary =
    subtractDays(
      currentDate,
      30
    );

  const ninetyDayBoundary =
    subtractDays(
      currentDate,
      90
    );

  const oneYearBoundary =
    subtractDays(
      currentDate,
      365
    );

  const ytdBoundary =
    startOfYear(
      currentDate
    );

  const sevenDay =
    buildPeriodResult({
      code: "7D",
      label: "7 Day",
      current,

      baseline:
        findBoundarySnapshot(
          history,
          sevenDayBoundary
        ),

      requestedStartDate:
        sevenDayBoundary
    });

  const thirtyDay =
    buildPeriodResult({
      code: "30D",
      label: "30 Day",
      current,

      baseline:
        findBoundarySnapshot(
          history,
          thirtyDayBoundary
        ),

      requestedStartDate:
        thirtyDayBoundary
    });

  const ninetyDay =
    buildPeriodResult({
      code: "90D",
      label: "90 Day",
      current,

      baseline:
        findBoundarySnapshot(
          history,
          ninetyDayBoundary
        ),

      requestedStartDate:
        ninetyDayBoundary
    });

  const yearToDate =
    buildPeriodResult({
      code: "YTD",
      label: "Year to Date",
      current,

      baseline:
        findBoundarySnapshot(
          history,
          ytdBoundary
        ),

      requestedStartDate:
        ytdBoundary
    });

  const oneYear =
    buildPeriodResult({
      code: "1Y",
      label: "1 Year",
      current,

      baseline:
        findBoundarySnapshot(
          history,
          oneYearBoundary
        ),

      requestedStartDate:
        oneYearBoundary
    });

  const sinceFirstSnapshot =
    history.length >= 2
      ? buildPeriodResult({
          code:
            "SINCE_FIRST_SNAPSHOT",

          label:
            "Since First Snapshot",

          current,

          baseline:
            first,

          requestedStartDate:
            normalizeDate(
              first.date
            )
        })
      : {
          code:
            "SINCE_FIRST_SNAPSHOT",

          label:
            "Since First Snapshot",

          available:
            false,

          requestedStartDate:
            first.date,

          startDate:
            first.date,

          endDate:
            current.date,

          startNetWorth:
            roundMoney(
              first.netWorth
            ),

          endNetWorth:
            roundMoney(
              current.netWorth
            ),

          change:
            null,

          returnPercentage:
            null
        };

  const performanceRecords =
    buildPerformanceRecords(
      history
    );

  return {
    status:
      history.length >= 2
        ? "READY"
        : "INSUFFICIENT_HISTORY",

    observationCount:
      history.length,

    firstSnapshotDate:
      first.date,

    latestSnapshotDate:
      current.date,

    records:
      performanceRecords,

    current: {
      date:
        current.date,

      netWorth:
        roundMoney(
          current.netWorth
        ),

      holdingsValue:
        roundMoney(
          current.holdingsValue
        ),

      availableCash:
        roundMoney(
          current.availableCash
        ),

      healthScore:
        current.healthScore
    },

    periods: {
      sevenDay,
      thirtyDay,
      ninetyDay,
      yearToDate,
      oneYear,
      sinceFirstSnapshot
    },

    drawdown:
      buildDrawdownSummary(
        history
      ),

    healthTrend:
      buildHealthTrend(
        history
      ),

    /*
     * Keep the normalized history available for future chart/UI
     * consumers without forcing them to reinterpret legacy fields.
     */
    history
  };
}


export async function loadHistoricalPerformanceSummary() {
  return buildHistoricalPerformanceSummary();
}

import {
  normalizeCompanyFundamentals
} from "../fundamentalDataEngine";

import {
  buildFilingExtractionWorkspace,
  buildFilingReadyJson,
  validateExtractionPeriod
} from "./filingExtractionService";

/*
 * ============================================================
 * PC-025E
 * MULTI-PERIOD FILING EXTRACTION AND COMPARISON SERVICE
 * ============================================================
 *
 * Supports:
 *
 * - several fiscal years in one extraction workspace,
 * - duplicate-period detection,
 * - year-over-year financial comparisons,
 * - growth and trend validation,
 * - source-reference coverage by year,
 * - cross-period consistency checks,
 * - one combined filing-ready record.
 *
 * Safeguards:
 *
 * - missing values remain null,
 * - unsupported values are never invented,
 * - unusual changes are flagged rather than silently corrected,
 * - filing approval still occurs in PC-025C.
 * ============================================================
 */

export const MULTI_PERIOD_EXTRACTION_STATUSES = {
  READY: "READY",
  PARTIAL: "PARTIAL",
  INVALID: "INVALID",
  EMPTY: "EMPTY"
};

export const MULTI_PERIOD_CHECK_TYPES = {
  DUPLICATE_PERIOD: "DUPLICATE_PERIOD",
  YEAR_SEQUENCE: "YEAR_SEQUENCE",
  GROWTH_OUTLIER: "GROWTH_OUTLIER",
  SHARE_COUNT: "SHARE_COUNT",
  DIVIDEND: "DIVIDEND",
  MARGIN: "MARGIN",
  SOURCE_REFERENCE: "SOURCE_REFERENCE"
};

export const MULTI_PERIOD_SEVERITIES = {
  ERROR: "ERROR",
  WARNING: "WARNING",
  INFO: "INFO"
};

export const DEFAULT_MULTI_PERIOD_POLICY = {
  maximumAbsoluteGrowthPercentage: 250,
  maximumShareCountChangePercentage: 35,
  maximumMarginChangePercentagePoints: 25,
  minimumPeriodsForTrend: 2,
  requireSequentialYears: false
};

const TREND_FIELDS = [
  "revenue",
  "grossProfit",
  "operatingIncome",
  "ebitda",
  "netIncome",
  "operatingCashFlow",
  "freeCashFlow",
  "totalAssets",
  "totalLiabilities",
  "totalEquity",
  "earningsPerShare",
  "bookValuePerShare",
  "dividendPerShare",
  "sharesOutstanding"
];

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function number(value) {
  return nullableNumber(value) ?? 0;
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function roundMetric(
  value,
  decimals = 2
) {
  const parsed =
    nullableNumber(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(decimals)
      );
}

function calculateGrowthPercentage(
  previous,
  current
) {
  const first =
    nullableNumber(previous);

  const second =
    nullableNumber(current);

  if (
    first === null ||
    second === null ||
    first === 0
  ) {
    return null;
  }

  return (
    (
      second -
      first
    ) /
    Math.abs(first)
  ) *
  100;
}

function buildCheck({
  code,
  type,
  severity,
  passed,
  message,
  fiscalYear = null,
  field = null,
  previousValue = null,
  currentValue = null,
  changePercentage = null
}) {
  return {
    code,
    type,
    severity,
    passed,
    message,
    fiscalYear,
    field,
    previousValue,
    currentValue,
    changePercentage
  };
}

function sortPeriods(periods = []) {
  return safeArray(periods)
    .slice()
    .sort(
      (first, second) =>
        number(
          first?.fiscalYear
        ) -
        number(
          second?.fiscalYear
        )
    );
}

function buildDuplicatePeriodChecks(
  periods
) {
  const checks = [];
  const seen =
    new Map();

  safeArray(periods).forEach(
    (period) => {
      const key =
        `${period?.fiscalYear ?? "UNKNOWN"}-${normalizeCode(
          period?.periodType ||
          "ANNUAL"
        )}`;

      if (seen.has(key)) {
        checks.push(
          buildCheck({
            code:
              `DUPLICATE_${key}`,

            type:
              MULTI_PERIOD_CHECK_TYPES
                .DUPLICATE_PERIOD,

            severity:
              MULTI_PERIOD_SEVERITIES
                .ERROR,

            passed:
              false,

            message:
              `Duplicate fiscal period detected for ${key}.`,

            fiscalYear:
              period?.fiscalYear ??
              null
          })
        );
      } else {
        seen.set(
          key,
          true
        );
      }
    }
  );

  return checks;
}

function buildYearSequenceChecks({
  periods,
  policy
}) {
  const checks = [];
  const sorted =
    sortPeriods(periods);

  for (
    let index = 1;
    index < sorted.length;
    index += 1
  ) {
    const previousYear =
      nullableNumber(
        sorted[index - 1]
          ?.fiscalYear
      );

    const currentYear =
      nullableNumber(
        sorted[index]
          ?.fiscalYear
      );

    if (
      previousYear === null ||
      currentYear === null
    ) {
      continue;
    }

    const sequential =
      currentYear -
      previousYear ===
      1;

    checks.push(
      buildCheck({
        code:
          `YEAR_SEQUENCE_${previousYear}_${currentYear}`,

        type:
          MULTI_PERIOD_CHECK_TYPES
            .YEAR_SEQUENCE,

        severity:
          !sequential &&
          policy
            .requireSequentialYears
            ? MULTI_PERIOD_SEVERITIES
                .WARNING
            : MULTI_PERIOD_SEVERITIES
                .INFO,

        passed:
          sequential ||
          !policy
            .requireSequentialYears,

        message:
          sequential
            ? `${previousYear} and ${currentYear} are sequential fiscal years.`
            : `A fiscal-year gap exists between ${previousYear} and ${currentYear}.`,

        fiscalYear:
          currentYear
      })
    );
  }

  return checks;
}

function buildTrendSeries({
  periods,
  field
}) {
  const sorted =
    sortPeriods(periods);

  const series =
    sorted.map(
      (period) => ({
        fiscalYear:
          period?.fiscalYear ??
          null,

        value:
          nullableNumber(
            period?.[field]
          )
      })
    );

  const changes = [];

  for (
    let index = 1;
    index < series.length;
    index += 1
  ) {
    const previous =
      series[index - 1];

    const current =
      series[index];

    const growth =
      calculateGrowthPercentage(
        previous.value,
        current.value
      );

    changes.push({
      fiscalYear:
        current.fiscalYear,

      previousFiscalYear:
        previous.fiscalYear,

      previousValue:
        previous.value,

      currentValue:
        current.value,

      changePercentage:
        roundMetric(
          growth
        )
    });
  }

  return {
    field,
    series,
    changes
  };
}

function buildGrowthOutlierChecks({
  trends,
  policy
}) {
  const checks = [];

  safeArray(trends).forEach(
    (trend) => {
      safeArray(
        trend?.changes
      ).forEach(
        (change) => {
          if (
            change
              ?.changePercentage ===
              null ||
            change
              ?.changePercentage ===
              undefined
          ) {
            return;
          }

          const outlier =
            Math.abs(
              change
                .changePercentage
            ) >
            policy
              .maximumAbsoluteGrowthPercentage;

          checks.push(
            buildCheck({
              code:
                `GROWTH_${normalizeCode(
                  trend.field
                )}_${change.fiscalYear}`,

              type:
                MULTI_PERIOD_CHECK_TYPES
                  .GROWTH_OUTLIER,

              severity:
                outlier
                  ? MULTI_PERIOD_SEVERITIES
                      .WARNING
                  : MULTI_PERIOD_SEVERITIES
                      .INFO,

              passed:
                !outlier,

              message:
                outlier
                  ? `${trend.field} changed by ${change.changePercentage}% and exceeds the configured threshold.`
                  : `${trend.field} year-over-year change is within the configured threshold.`,

              fiscalYear:
                change.fiscalYear,

              field:
                trend.field,

              previousValue:
                change.previousValue,

              currentValue:
                change.currentValue,

              changePercentage:
                change.changePercentage
            })
          );
        }
      );
    }
  );

  return checks;
}

function buildShareCountChecks({
  periods,
  policy
}) {
  const trend =
    buildTrendSeries({
      periods,

      field:
        "sharesOutstanding"
    });

  return safeArray(
    trend.changes
  )
    .filter(
      (change) =>
        change
          ?.changePercentage !==
          null &&
        change
          ?.changePercentage !==
          undefined
    )
    .map(
      (change) => {
        const unusual =
          Math.abs(
            change
              .changePercentage
          ) >
          policy
            .maximumShareCountChangePercentage;

        return buildCheck({
          code:
            `SHARES_${change.fiscalYear}`,

          type:
            MULTI_PERIOD_CHECK_TYPES
              .SHARE_COUNT,

          severity:
            unusual
              ? MULTI_PERIOD_SEVERITIES
                  .WARNING
              : MULTI_PERIOD_SEVERITIES
                  .INFO,

          passed:
            !unusual,

          message:
            unusual
              ? `Shares outstanding changed by ${change.changePercentage}% and should be reviewed for splits, rights issues, or restatements.`
              : "Shares outstanding change is within the configured threshold.",

          fiscalYear:
            change.fiscalYear,

          field:
            "sharesOutstanding",

          previousValue:
            change.previousValue,

          currentValue:
            change.currentValue,

          changePercentage:
            change.changePercentage
        });
      }
    );
}

function buildDividendChecks(
  periods
) {
  const sorted =
    sortPeriods(periods);

  const checks = [];

  sorted.forEach(
    (period) => {
      const eps =
        nullableNumber(
          period
            ?.earningsPerShare
        );

      const dps =
        nullableNumber(
          period
            ?.dividendPerShare
        );

      if (
        eps === null ||
        dps === null
      ) {
        return;
      }

      const payout =
        eps === 0
          ? null
          : (
              dps /
              eps
            ) *
            100;

      const unusual =
        payout !== null &&
        payout > 150;

      checks.push(
        buildCheck({
          code:
            `DIVIDEND_PAYOUT_${period.fiscalYear}`,

          type:
            MULTI_PERIOD_CHECK_TYPES
              .DIVIDEND,

          severity:
            unusual
              ? MULTI_PERIOD_SEVERITIES
                  .WARNING
              : MULTI_PERIOD_SEVERITIES
                  .INFO,

          passed:
            !unusual,

          message:
            unusual
              ? `Dividend payout is approximately ${roundMetric(
                  payout
                )}% of EPS and should be reviewed.`
              : "Dividend payout is within the configured review range.",

          fiscalYear:
            period?.fiscalYear ??
            null,

          field:
            "dividendPerShare"
        })
      );
    }
  );

  return checks;
}

function buildMarginChecks({
  periods,
  policy
}) {
  const sorted =
    sortPeriods(periods);

  const marginFields = [
    "grossMarginPercentage",
    "operatingMarginPercentage",
    "netMarginPercentage"
  ];

  const checks = [];

  marginFields.forEach(
    (field) => {
      const trend =
        buildTrendSeries({
          periods:
            sorted,

          field
        });

      safeArray(
        trend.changes
      ).forEach(
        (change) => {
          if (
            change
              ?.previousValue ===
              null ||
            change
              ?.currentValue ===
              null
          ) {
            return;
          }

          const pointChange =
            change.currentValue -
            change.previousValue;

          const unusual =
            Math.abs(
              pointChange
            ) >
            policy
              .maximumMarginChangePercentagePoints;

          checks.push(
            buildCheck({
              code:
                `MARGIN_${normalizeCode(
                  field
                )}_${change.fiscalYear}`,

              type:
                MULTI_PERIOD_CHECK_TYPES
                  .MARGIN,

              severity:
                unusual
                  ? MULTI_PERIOD_SEVERITIES
                      .WARNING
                  : MULTI_PERIOD_SEVERITIES
                      .INFO,

              passed:
                !unusual,

              message:
                unusual
                  ? `${field} changed by ${roundMetric(
                      pointChange
                    )} percentage points and should be reviewed.`
                  : `${field} change is within the configured threshold.`,

              fiscalYear:
                change.fiscalYear,

              field,

              previousValue:
                change.previousValue,

              currentValue:
                change.currentValue,

              changePercentage:
                roundMetric(
                  pointChange
                )
            })
          );
        }
      );
    }
  );

  return checks;
}

function buildSourceCoverage({
  periods,
  sourceReferences
}) {
  const references =
    safeArray(
      sourceReferences
    );

  const results =
    safeArray(periods).map(
      (period) => {
        const year =
          period?.fiscalYear ??
          null;

        const yearReferences =
          references.filter(
            (reference) =>
              reference
                ?.fiscalYear ===
                year ||
              (
                reference
                  ?.fiscalYear ===
                  null ||
                reference
                  ?.fiscalYear ===
                  undefined
              )
          );

        const referencedFields =
          new Set(
            yearReferences
              .map(
                (reference) =>
                  reference?.field
              )
              .filter(Boolean)
          );

        const availableFields =
          TREND_FIELDS.filter(
            (field) =>
              period?.[field] !==
                null &&
              period?.[field] !==
                undefined
          );

        const covered =
          availableFields.filter(
            (field) =>
              referencedFields.has(
                field
              )
          );

        const percentage =
          availableFields.length
            ? (
                covered.length /
                availableFields.length
              ) *
              100
            : 0;

        return {
          fiscalYear:
            year,

          availableFieldCount:
            availableFields.length,

          referencedFieldCount:
            covered.length,

          coveragePercentage:
            roundMetric(
              percentage
            )
        };
      }
    );

  const averageCoverage =
    results.length
      ? results.reduce(
          (total, item) =>
            total +
            number(
              item
                .coveragePercentage
            ),
          0
        ) /
        results.length
      : 0;

  return {
    periods:
      results,

    averageCoveragePercentage:
      roundMetric(
        averageCoverage
      )
  };
}

export function buildMultiPeriodExtractionComparison({
  filing,
  periods = [],
  sourceReferences = [],
  policy = {}
} = {}) {
  const config = {
    ...DEFAULT_MULTI_PERIOD_POLICY,
    ...policy
  };

  const sortedPeriods =
    sortPeriods(periods);

  const periodValidations =
    sortedPeriods.map(
      (period) =>
        validateExtractionPeriod({
          period,

          sourceReferences:
            safeArray(
              sourceReferences
            ).filter(
              (reference) =>
                reference
                  ?.fiscalYear ===
                  period?.fiscalYear ||
                (
                  reference
                    ?.fiscalYear ===
                    null ||
                  reference
                    ?.fiscalYear ===
                    undefined
                )
            )
        })
    );

  const normalizedPeriods =
    periodValidations.map(
      (item) =>
        item.period
    );

  const trends =
    TREND_FIELDS.map(
      (field) =>
        buildTrendSeries({
          periods:
            normalizedPeriods,

          field
        })
    );

  const checks = [
    ...buildDuplicatePeriodChecks(
      normalizedPeriods
    ),

    ...buildYearSequenceChecks({
      periods:
        normalizedPeriods,

      policy:
        config
    }),

    ...buildGrowthOutlierChecks({
      trends,

      policy:
        config
    }),

    ...buildShareCountChecks({
      periods:
        normalizedPeriods,

      policy:
        config
    }),

    ...buildDividendChecks(
      normalizedPeriods
    ),

    ...buildMarginChecks({
      periods:
        normalizedPeriods,

      policy:
        config
    })
  ];

  const sourceCoverage =
    buildSourceCoverage({
      periods:
        normalizedPeriods,

      sourceReferences
    });

  const errors = [
    ...periodValidations.flatMap(
      (item) =>
        item.errors
    ),

    ...checks.filter(
      (check) =>
        check.severity ===
          MULTI_PERIOD_SEVERITIES
            .ERROR &&
        !check.passed
    )
  ];

  const warnings = [
    ...periodValidations.flatMap(
      (item) =>
        item.warnings
    ),

    ...checks.filter(
      (check) =>
        check.severity ===
          MULTI_PERIOD_SEVERITIES
            .WARNING &&
        !check.passed
    )
  ];

  const company =
    normalizeCompanyFundamentals({
      ...(filing?.company || {}),

      symbol:
        filing?.symbol ||
        filing?.company?.symbol,

      name:
        filing?.companyName ||
        filing?.company?.name,

      periods:
        normalizedPeriods
    });

  const baseWorkspace =
    buildFilingExtractionWorkspace({
      filing: {
        ...filing,

        company
      },

      periods:
        normalizedPeriods,

      sourceReferences
    });

  const status =
    !normalizedPeriods.length
      ? MULTI_PERIOD_EXTRACTION_STATUSES
          .EMPTY
      : errors.length
        ? MULTI_PERIOD_EXTRACTION_STATUSES
            .INVALID
        : warnings.length
          ? MULTI_PERIOD_EXTRACTION_STATUSES
              .PARTIAL
          : MULTI_PERIOD_EXTRACTION_STATUSES
              .READY;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    symbol:
      company.symbol,

    companyName:
      company.name,

    filingType:
      normalizeCode(
        filing?.filingType ||
        "ANNUAL_REPORT"
      ),

    fiscalYears:
      normalizedPeriods.map(
        (period) =>
          period?.fiscalYear
      ),

    periodCount:
      normalizedPeriods.length,

    company,

    periods:
      periodValidations,

    trends,

    checks,

    sourceCoverage,

    errors,

    warnings,

    completenessPercentage:
      baseWorkspace
        .completenessPercentage,

    baseWorkspace
  };
}

export function buildMultiPeriodFilingReadyJson({
  comparison,
  status = "DRAFT"
} = {}) {
  if (!comparison) {
    throw new Error(
      "A multi-period extraction comparison is required."
    );
  }

  const base =
    buildFilingReadyJson({
      workspace:
        comparison
          .baseWorkspace,

      status
    });

  return {
    ...base,

    fiscalYear:
      comparison
        ?.company
        ?.latestPeriod
        ?.fiscalYear ??
      null,

    periodEnd:
      comparison
        ?.company
        ?.latestPeriod
        ?.periodEnd ??
      null,

    company:
      comparison.company,

    metadata: {
      ...(base.metadata || {}),

      multiPeriodExtraction:
        true,

      periodCount:
        comparison.periodCount,

      fiscalYears:
        comparison.fiscalYears,

      trendChecks:
        comparison.checks,

      sourceCoverage:
        comparison.sourceCoverage,

      multiPeriodErrors:
        comparison.errors,

      multiPeriodWarnings:
        comparison.warnings
    }
  };
}

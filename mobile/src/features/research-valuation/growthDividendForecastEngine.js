/*
 * PC-023B3 — Growth, Dividend, and CAGR Forecast Engine
 * Advisory only. Missing inputs are excluded and never treated as zero.
 */

export const FORECAST_STATUSES = {
  AVAILABLE: "AVAILABLE",
  PARTIAL: "PARTIAL",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  INVALID_ASSUMPTIONS: "INVALID_ASSUMPTIONS"
};

export const FORECAST_SCENARIOS = {
  CONSERVATIVE: "CONSERVATIVE",
  BASE: "BASE",
  OPTIMISTIC: "OPTIMISTIC"
};

export const DIVIDEND_SUSTAINABILITY_LEVELS = {
  EXCELLENT: "EXCELLENT",
  STRONG: "STRONG",
  HEALTHY: "HEALTHY",
  MIXED: "MIXED",
  WEAK: "WEAK",
  UNSUSTAINABLE: "UNSUSTAINABLE",
  NOT_RATED: "NOT_RATED"
};

export const DEFAULT_FORECAST_POLICY = {
  projectionYears: 5,
  conservativeGrowthAdjustmentPercentage: -30,
  optimisticGrowthAdjustmentPercentage: 25,
  maximumRevenueGrowthPercentage: 40,
  maximumEarningsGrowthPercentage: 50,
  maximumDividendGrowthPercentage: 25,
  minimumGrowthPercentage: -30,
  preferredPayoutRatioPercentage: 65,
  maximumPayoutRatioPercentage: 95,
  minimumDividendCoverageRatio: 1.2,
  preferredDividendCoverageRatio: 1.8,
  minimumForecastCoveragePercentage: 30,
  defaultTerminalPeRatio: 12
};

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(value) {
  const parsed = nullableNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value) {
  const parsed = nullableNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(number(value), minimum), maximum);
}

function roundMoney(value) {
  const parsed = nullableNumber(value);
  return parsed === null ? null : Number(parsed.toFixed(2));
}

function roundPercent(value) {
  const parsed = nullableNumber(value);
  return parsed === null ? null : Number(parsed.toFixed(2));
}

function roundScore(value) {
  return Math.round(clamp(value, 0, 100));
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

function sum(values = []) {
  return safeArray(values).reduce(
    (total, value) => total + number(value),
    0
  );
}

function average(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter((value) => value !== null);

  return valid.length ? sum(valid) / valid.length : null;
}

function median(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter((value) => value !== null)
    .sort((first, second) => first - second);

  if (!valid.length) {
    return null;
  }

  const middle = Math.floor(valid.length / 2);

  return valid.length % 2 === 0
    ? (valid[middle - 1] + valid[middle]) / 2
    : valid[middle];
}

function standardDeviation(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter((value) => value !== null);

  if (valid.length < 2) {
    return null;
  }

  const mean = average(valid);

  return Math.sqrt(
    average(
      valid.map((value) =>
        Math.pow(value - mean, 2)
      )
    )
  );
}

function calculateCagr({ beginningValue, endingValue, years }) {
  const beginning = positiveNumber(beginningValue);
  const ending = positiveNumber(endingValue);
  const period = positiveNumber(years);

  if (beginning === null || ending === null || period === null) {
    return null;
  }

  return (
    Math.pow(ending / beginning, 1 / period) - 1
  ) * 100;
}

function normalizePolicy(policy = {}) {
  return {
    projectionYears: Math.max(
      Math.floor(
        number(
          policy?.projectionYears ??
            DEFAULT_FORECAST_POLICY.projectionYears
        )
      ),
      1
    ),

    conservativeGrowthAdjustmentPercentage: number(
      policy?.conservativeGrowthAdjustmentPercentage ??
        DEFAULT_FORECAST_POLICY
          .conservativeGrowthAdjustmentPercentage
    ),

    optimisticGrowthAdjustmentPercentage: number(
      policy?.optimisticGrowthAdjustmentPercentage ??
        DEFAULT_FORECAST_POLICY
          .optimisticGrowthAdjustmentPercentage
    ),

    maximumRevenueGrowthPercentage: number(
      policy?.maximumRevenueGrowthPercentage ??
        DEFAULT_FORECAST_POLICY
          .maximumRevenueGrowthPercentage
    ),

    maximumEarningsGrowthPercentage: number(
      policy?.maximumEarningsGrowthPercentage ??
        DEFAULT_FORECAST_POLICY
          .maximumEarningsGrowthPercentage
    ),

    maximumDividendGrowthPercentage: number(
      policy?.maximumDividendGrowthPercentage ??
        DEFAULT_FORECAST_POLICY
          .maximumDividendGrowthPercentage
    ),

    minimumGrowthPercentage: number(
      policy?.minimumGrowthPercentage ??
        DEFAULT_FORECAST_POLICY.minimumGrowthPercentage
    ),

    preferredPayoutRatioPercentage: clamp(
      policy?.preferredPayoutRatioPercentage ??
        DEFAULT_FORECAST_POLICY
          .preferredPayoutRatioPercentage,
      0,
      100
    ),

    maximumPayoutRatioPercentage: clamp(
      policy?.maximumPayoutRatioPercentage ??
        DEFAULT_FORECAST_POLICY
          .maximumPayoutRatioPercentage,
      0,
      200
    ),

    minimumDividendCoverageRatio: positiveNumber(
      policy?.minimumDividendCoverageRatio ??
        DEFAULT_FORECAST_POLICY
          .minimumDividendCoverageRatio
    ),

    preferredDividendCoverageRatio: positiveNumber(
      policy?.preferredDividendCoverageRatio ??
        DEFAULT_FORECAST_POLICY
          .preferredDividendCoverageRatio
    ),

    minimumForecastCoveragePercentage: clamp(
      policy?.minimumForecastCoveragePercentage ??
        DEFAULT_FORECAST_POLICY
          .minimumForecastCoveragePercentage,
      0,
      100
    ),

    defaultTerminalPeRatio: positiveNumber(
      policy?.defaultTerminalPeRatio ??
        DEFAULT_FORECAST_POLICY.defaultTerminalPeRatio
    )
  };
}

export function normalizeHistoricalSeries(series = []) {
  return safeArray(series)
    .map((item, index) => ({
      year: item?.year ?? item?.period ?? index + 1,
      value: nullableNumber(
        item?.value ?? item?.amount ?? item?.total
      )
    }))
    .filter((item) => item.value !== null)
    .sort(
      (first, second) =>
        Number(first.year) - Number(second.year)
    );
}

export function buildHistoricalGrowthAnalysis({
  series = []
} = {}) {
  const normalized = normalizeHistoricalSeries(series);

  if (normalized.length < 2) {
    return {
      status: FORECAST_STATUSES.INSUFFICIENT_DATA,
      observations: normalized.length,
      cagrPercentage: null,
      averageGrowthPercentage: null,
      medianGrowthPercentage: null,
      volatilityPercentage: null,
      annualGrowth: [],
      series: normalized
    };
  }

  const annualGrowth = [];

  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];

    if (previous.value === 0) {
      continue;
    }

    annualGrowth.push({
      year: current.year,
      growthPercentage: roundPercent(
        ((current.value - previous.value) /
          Math.abs(previous.value)) *
          100
      )
    });
  }

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  const yearSpan = Math.max(
    Number(last.year) - Number(first.year),
    normalized.length - 1
  );

  const growthValues = annualGrowth.map(
    (item) => item.growthPercentage
  );

  return {
    status: FORECAST_STATUSES.AVAILABLE,
    observations: normalized.length,
    beginningValue: first.value,
    endingValue: last.value,
    years: yearSpan,
    cagrPercentage: roundPercent(
      calculateCagr({
        beginningValue: first.value,
        endingValue: last.value,
        years: yearSpan
      })
    ),
    averageGrowthPercentage: roundPercent(
      average(growthValues)
    ),
    medianGrowthPercentage: roundPercent(
      median(growthValues)
    ),
    volatilityPercentage: roundPercent(
      standardDeviation(growthValues)
    ),
    annualGrowth,
    series: normalized
  };
}

function deriveBaseGrowth({
  explicitGrowth,
  historicalAnalysis,
  peerGrowth,
  analystGrowth,
  minimum,
  maximum
}) {
  const components = [
    {
      source: "EXPLICIT",
      value: nullableNumber(explicitGrowth),
      weight: 0.35
    },
    {
      source: "HISTORICAL_CAGR",
      value: nullableNumber(
        historicalAnalysis?.cagrPercentage
      ),
      weight: 0.3
    },
    {
      source: "PEER_GROWTH",
      value: nullableNumber(peerGrowth),
      weight: 0.15
    },
    {
      source: "ANALYST_GROWTH",
      value: nullableNumber(analystGrowth),
      weight: 0.2
    }
  ];

  const available = components.filter(
    (component) => component.value !== null
  );

  const totalWeight = sum(
    available.map((component) => component.weight)
  );

  const weighted =
    totalWeight > 0
      ? sum(
          available.map(
            (component) =>
              component.value * component.weight
          )
        ) / totalWeight
      : null;

  return {
    value:
      weighted === null
        ? null
        : clamp(weighted, minimum, maximum),
    components,
    availableComponents: available.length,
    totalComponents: components.length,
    coveragePercentage: roundPercent(totalWeight * 100)
  };
}

export function buildGrowthAssumptions({
  revenueGrowthPercentage = null,
  earningsGrowthPercentage = null,
  freeCashFlowGrowthPercentage = null,
  dividendGrowthPercentage = null,

  historicalRevenue = [],
  historicalEarnings = [],
  historicalFreeCashFlow = [],
  historicalDividends = [],

  peerRevenueGrowthPercentage = null,
  peerEarningsGrowthPercentage = null,
  peerFreeCashFlowGrowthPercentage = null,
  peerDividendGrowthPercentage = null,

  analystRevenueGrowthPercentage = null,
  analystEarningsGrowthPercentage = null,
  analystFreeCashFlowGrowthPercentage = null,
  analystDividendGrowthPercentage = null,

  policy = {}
} = {}) {
  const normalizedPolicy = normalizePolicy(policy);

  const history = {
    revenue: buildHistoricalGrowthAnalysis({
      series: historicalRevenue
    }),
    earnings: buildHistoricalGrowthAnalysis({
      series: historicalEarnings
    }),
    freeCashFlow: buildHistoricalGrowthAnalysis({
      series: historicalFreeCashFlow
    }),
    dividends: buildHistoricalGrowthAnalysis({
      series: historicalDividends
    })
  };

  const revenue = deriveBaseGrowth({
    explicitGrowth: revenueGrowthPercentage,
    historicalAnalysis: history.revenue,
    peerGrowth: peerRevenueGrowthPercentage,
    analystGrowth: analystRevenueGrowthPercentage,
    minimum: normalizedPolicy.minimumGrowthPercentage,
    maximum:
      normalizedPolicy.maximumRevenueGrowthPercentage
  });

  const earnings = deriveBaseGrowth({
    explicitGrowth: earningsGrowthPercentage,
    historicalAnalysis: history.earnings,
    peerGrowth: peerEarningsGrowthPercentage,
    analystGrowth: analystEarningsGrowthPercentage,
    minimum: normalizedPolicy.minimumGrowthPercentage,
    maximum:
      normalizedPolicy.maximumEarningsGrowthPercentage
  });

  const freeCashFlow = deriveBaseGrowth({
    explicitGrowth: freeCashFlowGrowthPercentage,
    historicalAnalysis: history.freeCashFlow,
    peerGrowth: peerFreeCashFlowGrowthPercentage,
    analystGrowth: analystFreeCashFlowGrowthPercentage,
    minimum: normalizedPolicy.minimumGrowthPercentage,
    maximum:
      normalizedPolicy.maximumEarningsGrowthPercentage
  });

  const dividends = deriveBaseGrowth({
    explicitGrowth: dividendGrowthPercentage,
    historicalAnalysis: history.dividends,
    peerGrowth: peerDividendGrowthPercentage,
    analystGrowth: analystDividendGrowthPercentage,
    minimum: normalizedPolicy.minimumGrowthPercentage,
    maximum:
      normalizedPolicy.maximumDividendGrowthPercentage
  });

  const coveragePercentage = roundPercent(
    average([
      revenue.coveragePercentage,
      earnings.coveragePercentage,
      freeCashFlow.coveragePercentage,
      dividends.coveragePercentage
    ])
  );

  return {
    generatedAt: new Date().toISOString(),
    status:
      coveragePercentage === null
        ? FORECAST_STATUSES.INSUFFICIENT_DATA
        : coveragePercentage >=
            normalizedPolicy
              .minimumForecastCoveragePercentage
          ? FORECAST_STATUSES.AVAILABLE
          : FORECAST_STATUSES.PARTIAL,
    revenue,
    earnings,
    freeCashFlow,
    dividends,
    history,
    coveragePercentage,
    policy: normalizedPolicy
  };
}

export function buildCompoundForecast({
  startingValue,
  growthPercentage,
  years = 5,
  label = "Value"
} = {}) {
  const start = positiveNumber(startingValue);
  const growth = nullableNumber(growthPercentage);
  const projectionYears = Math.max(
    Math.floor(number(years)),
    1
  );

  if (start === null || growth === null) {
    return {
      status: FORECAST_STATUSES.INSUFFICIENT_DATA,
      label,
      startingValue: start,
      growthPercentage: growth,
      years: projectionYears,
      series: []
    };
  }

  const series = [];
  let value = start;

  for (
    let year = 1;
    year <= projectionYears;
    year += 1
  ) {
    value *= 1 + growth / 100;

    series.push({
      year,
      value: roundMoney(value),
      growthPercentage: roundPercent(growth)
    });
  }

  return {
    status: FORECAST_STATUSES.AVAILABLE,
    label,
    startingValue: roundMoney(start),
    growthPercentage: roundPercent(growth),
    years: projectionYears,
    endingValue:
      series[series.length - 1]?.value ?? null,
    series
  };
}

export function buildRevenueForecast(options = {}) {
  return buildCompoundForecast({
    startingValue: options.currentRevenue,
    growthPercentage: options.growthPercentage,
    years: options.years,
    label: "Revenue"
  });
}

export function buildEarningsForecast({
  currentEarnings,
  currentEarningsPerShare = null,
  growthPercentage,
  years = 5
} = {}) {
  return {
    total: buildCompoundForecast({
      startingValue: currentEarnings,
      growthPercentage,
      years,
      label: "Earnings"
    }),
    perShare: buildCompoundForecast({
      startingValue: currentEarningsPerShare,
      growthPercentage,
      years,
      label: "Earnings Per Share"
    })
  };
}

export function buildFreeCashFlowForecast({
  currentFreeCashFlow,
  currentFreeCashFlowPerShare = null,
  growthPercentage,
  years = 5
} = {}) {
  return {
    total: buildCompoundForecast({
      startingValue: currentFreeCashFlow,
      growthPercentage,
      years,
      label: "Free Cash Flow"
    }),
    perShare: buildCompoundForecast({
      startingValue: currentFreeCashFlowPerShare,
      growthPercentage,
      years,
      label: "Free Cash Flow Per Share"
    })
  };
}

export function classifyDividendSustainability({
  payoutRatioPercentage = null,
  dividendCoverageRatio = null,
  freeCashFlowCoverageRatio = null,
  dividendGrowthPercentage = null,
  earningsGrowthPercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy = normalizePolicy(policy);
  const components = [];

  const payout = nullableNumber(payoutRatioPercentage);

  if (payout !== null) {
    components.push({
      code: "PAYOUT_RATIO",
      score:
        payout <= 50
          ? 100
          : payout <=
              normalizedPolicy
                .preferredPayoutRatioPercentage
            ? 85
            : payout <= 80
              ? 65
              : payout <=
                  normalizedPolicy
                    .maximumPayoutRatioPercentage
                ? 40
                : 15,
      weight: 0.35
    });
  }

  const earningsCoverage =
    nullableNumber(dividendCoverageRatio);

  if (earningsCoverage !== null) {
    components.push({
      code: "EARNINGS_COVERAGE",
      score:
        earningsCoverage >=
          normalizedPolicy
            .preferredDividendCoverageRatio
          ? 100
          : earningsCoverage >=
              normalizedPolicy
                .minimumDividendCoverageRatio
            ? 75
            : earningsCoverage >= 1
              ? 50
              : 15,
      weight: 0.25
    });
  }

  const cashCoverage =
    nullableNumber(freeCashFlowCoverageRatio);

  if (cashCoverage !== null) {
    components.push({
      code: "FREE_CASH_FLOW_COVERAGE",
      score:
        cashCoverage >= 2
          ? 100
          : cashCoverage >= 1.5
            ? 85
            : cashCoverage >= 1
              ? 60
              : 20,
      weight: 0.25
    });
  }

  const dividendGrowth =
    nullableNumber(dividendGrowthPercentage);

  const earningsGrowth =
    nullableNumber(earningsGrowthPercentage);

  if (
    dividendGrowth !== null &&
    earningsGrowth !== null
  ) {
    components.push({
      code: "GROWTH_ALIGNMENT",
      score:
        dividendGrowth <= earningsGrowth
          ? 90
          : dividendGrowth <= earningsGrowth + 3
            ? 65
            : 30,
      weight: 0.15
    });
  }

  const totalWeight = sum(
    components.map((item) => item.weight)
  );

  const score =
    totalWeight > 0
      ? sum(
          components.map(
            (item) => item.score * item.weight
          )
        ) / totalWeight
      : null;

  let classification;

  if (score === null) {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.NOT_RATED,
      label: "Not Rated"
    };
  } else if (score >= 90) {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.EXCELLENT,
      label: "Excellent"
    };
  } else if (score >= 80) {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.STRONG,
      label: "Strong"
    };
  } else if (score >= 70) {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.HEALTHY,
      label: "Healthy"
    };
  } else if (score >= 55) {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.MIXED,
      label: "Mixed"
    };
  } else if (score >= 35) {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.WEAK,
      label: "Weak"
    };
  } else {
    classification = {
      code:
        DIVIDEND_SUSTAINABILITY_LEVELS.UNSUSTAINABLE,
      label: "Unsustainable"
    };
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),
    classification,
    components,
    availableWeightPercentage:
      roundPercent(totalWeight * 100)
  };
}

export function buildDividendForecast({
  dividendPerShare,
  sharesHeld = null,
  dividendGrowthPercentage,
  years = 5,
  payoutRatioPercentage = null,
  dividendCoverageRatio = null,
  freeCashFlowCoverageRatio = null,
  earningsGrowthPercentage = null,
  withholdingTaxPercentage = 5,
  policy = {}
} = {}) {
  const dividend = positiveNumber(dividendPerShare);
  const growth = nullableNumber(
    dividendGrowthPercentage
  );
  const quantity = nonNegativeNumber(sharesHeld);
  const taxRate = clamp(
    withholdingTaxPercentage,
    0,
    100
  );

  const sustainability =
    classifyDividendSustainability({
      payoutRatioPercentage,
      dividendCoverageRatio,
      freeCashFlowCoverageRatio,
      dividendGrowthPercentage: growth,
      earningsGrowthPercentage,
      policy
    });

  if (dividend === null || growth === null) {
    return {
      status: FORECAST_STATUSES.INSUFFICIENT_DATA,
      sustainability,
      series: []
    };
  }

  const series = [];
  let projectedDividend = dividend;

  for (
    let year = 1;
    year <= Math.max(Math.floor(number(years)), 1);
    year += 1
  ) {
    projectedDividend *= 1 + growth / 100;

    const grossIncome =
      quantity === null
        ? null
        : projectedDividend * quantity;

    const withholdingTax =
      grossIncome === null
        ? null
        : grossIncome * taxRate / 100;

    series.push({
      year,
      dividendPerShare:
        roundMoney(projectedDividend),
      grossIncome: roundMoney(grossIncome),
      withholdingTax:
        roundMoney(withholdingTax),
      netIncome:
        grossIncome === null
          ? null
          : roundMoney(
              grossIncome - withholdingTax
            ),
      growthPercentage: roundPercent(growth)
    });
  }

  return {
    status: FORECAST_STATUSES.AVAILABLE,
    startingDividendPerShare:
      roundMoney(dividend),
    dividendGrowthPercentage:
      roundPercent(growth),
    sharesHeld: quantity,
    withholdingTaxPercentage:
      roundPercent(taxRate),
    endingDividendPerShare:
      series[series.length - 1]
        ?.dividendPerShare ?? null,
    cumulativeGrossIncome:
      roundMoney(
        sum(
          series.map(
            (item) => item.grossIncome
          )
        )
      ),
    cumulativeNetIncome:
      roundMoney(
        sum(
          series.map(
            (item) => item.netIncome
          )
        )
      ),
    sustainability,
    series
  };
}

export function buildExpectedPriceCagr({
  currentPrice,
  terminalFairValue,
  years = 5
} = {}) {
  return {
    currentPrice: roundMoney(currentPrice),
    terminalFairValue:
      roundMoney(terminalFairValue),
    years: number(years),
    priceCagrPercentage: roundPercent(
      calculateCagr({
        beginningValue: currentPrice,
        endingValue: terminalFairValue,
        years
      })
    )
  };
}

export function buildExpectedTotalReturnCagr({
  currentPrice,
  terminalFairValue,
  projectedDividends = [],
  years = 5
} = {}) {
  const price = positiveNumber(currentPrice);
  const terminal = positiveNumber(terminalFairValue);
  const period = positiveNumber(years);

  if (
    price === null ||
    terminal === null ||
    period === null
  ) {
    return {
      status:
        FORECAST_STATUSES.INSUFFICIENT_DATA,
      totalReturnCagrPercentage: null
    };
  }

  const cumulativeDividends = sum(
    safeArray(projectedDividends).map(
      (item) =>
        item?.dividendPerShare ??
        item?.value ??
        item
    )
  );

  const terminalWealth =
    terminal + cumulativeDividends;

  return {
    status: FORECAST_STATUSES.AVAILABLE,
    currentPrice: roundMoney(price),
    terminalFairValue: roundMoney(terminal),
    cumulativeDividendsPerShare:
      roundMoney(cumulativeDividends),
    terminalWealth:
      roundMoney(terminalWealth),
    years: period,
    totalReturnCagrPercentage:
      roundPercent(
        calculateCagr({
          beginningValue: price,
          endingValue: terminalWealth,
          years: period
        })
      )
  };
}

function scenarioGrowth({
  baseGrowth,
  scenario,
  policy
}) {
  const growth = nullableNumber(baseGrowth);

  if (growth === null) {
    return null;
  }

  if (
    scenario ===
    FORECAST_SCENARIOS.CONSERVATIVE
  ) {
    return growth *
      (
        1 +
        policy
          .conservativeGrowthAdjustmentPercentage /
        100
      );
  }

  if (
    scenario ===
    FORECAST_SCENARIOS.OPTIMISTIC
  ) {
    return growth *
      (
        1 +
        policy
          .optimisticGrowthAdjustmentPercentage /
        100
      );
  }

  return growth;
}

export function buildForecastScenario({
  scenario,
  currentRevenue = null,
  currentEarnings = null,
  currentEarningsPerShare = null,
  currentFreeCashFlow = null,
  currentFreeCashFlowPerShare = null,
  dividendPerShare = null,
  sharesHeld = null,
  currentPrice = null,
  terminalPeRatio = null,
  revenueGrowthPercentage = null,
  earningsGrowthPercentage = null,
  freeCashFlowGrowthPercentage = null,
  dividendGrowthPercentage = null,
  payoutRatioPercentage = null,
  dividendCoverageRatio = null,
  freeCashFlowCoverageRatio = null,
  years = 5,
  policy = {}
} = {}) {
  const normalizedPolicy = normalizePolicy(policy);

  const revenueGrowth = scenarioGrowth({
    baseGrowth: revenueGrowthPercentage,
    scenario,
    policy: normalizedPolicy
  });

  const earningsGrowth = scenarioGrowth({
    baseGrowth: earningsGrowthPercentage,
    scenario,
    policy: normalizedPolicy
  });

  const freeCashFlowGrowth = scenarioGrowth({
    baseGrowth: freeCashFlowGrowthPercentage,
    scenario,
    policy: normalizedPolicy
  });

  const dividendGrowth = scenarioGrowth({
    baseGrowth: dividendGrowthPercentage,
    scenario,
    policy: normalizedPolicy
  });

  const revenue = buildRevenueForecast({
    currentRevenue,
    growthPercentage: revenueGrowth,
    years
  });

  const earnings = buildEarningsForecast({
    currentEarnings,
    currentEarningsPerShare,
    growthPercentage: earningsGrowth,
    years
  });

  const freeCashFlow = buildFreeCashFlowForecast({
    currentFreeCashFlow,
    currentFreeCashFlowPerShare,
    growthPercentage: freeCashFlowGrowth,
    years
  });

  const dividends = buildDividendForecast({
    dividendPerShare,
    sharesHeld,
    dividendGrowthPercentage: dividendGrowth,
    years,
    payoutRatioPercentage,
    dividendCoverageRatio,
    freeCashFlowCoverageRatio,
    earningsGrowthPercentage: earningsGrowth,
    policy: normalizedPolicy
  });

  const endingEps =
    earnings?.perShare?.endingValue ?? null;

  const terminalMultiple =
    positiveNumber(terminalPeRatio) ??
    normalizedPolicy.defaultTerminalPeRatio;

  const terminalFairValue =
    positiveNumber(endingEps) !== null &&
    terminalMultiple !== null
      ? endingEps * terminalMultiple
      : null;

  return {
    scenario,
    status:
      revenue.status ===
        FORECAST_STATUSES.AVAILABLE ||
      earnings.perShare.status ===
        FORECAST_STATUSES.AVAILABLE ||
      freeCashFlow.perShare.status ===
        FORECAST_STATUSES.AVAILABLE ||
      dividends.status ===
        FORECAST_STATUSES.AVAILABLE
        ? FORECAST_STATUSES.AVAILABLE
        : FORECAST_STATUSES.INSUFFICIENT_DATA,

    assumptions: {
      revenueGrowthPercentage:
        roundPercent(revenueGrowth),
      earningsGrowthPercentage:
        roundPercent(earningsGrowth),
      freeCashFlowGrowthPercentage:
        roundPercent(freeCashFlowGrowth),
      dividendGrowthPercentage:
        roundPercent(dividendGrowth),
      terminalPeRatio:
        terminalMultiple,
      years
    },

    revenue,
    earnings,
    freeCashFlow,
    dividends,

    terminal: {
      earningsPerShare: roundMoney(endingEps),
      terminalPeRatio: terminalMultiple,
      fairValue: roundMoney(terminalFairValue)
    },

    priceCagr: buildExpectedPriceCagr({
      currentPrice,
      terminalFairValue,
      years
    }),

    totalReturn: buildExpectedTotalReturnCagr({
      currentPrice,
      terminalFairValue,
      projectedDividends: dividends.series,
      years
    })
  };
}

export function classifyForecastConfidence(
  percentage
) {
  const value = nullableNumber(percentage);

  if (value === null) {
    return {
      code: "NOT_AVAILABLE",
      label: "Not Available"
    };
  }

  if (value >= 85) {
    return {
      code: "VERY_HIGH",
      label: "Very High"
    };
  }

  if (value >= 70) {
    return {
      code: "HIGH",
      label: "High"
    };
  }

  if (value >= 50) {
    return {
      code: "MEDIUM",
      label: "Medium"
    };
  }

  if (value >= 25) {
    return {
      code: "LOW",
      label: "Low"
    };
  }

  return {
    code: "VERY_LOW",
    label: "Very Low"
  };
}

export function calculateForecastConfidence({
  growthAssumptions,
  scenarios = [],
  dataQualityScore = null,
  valuationConfidencePercentage = null
} = {}) {
  const scenarioValues = safeArray(scenarios)
    .map(
      (scenario) =>
        nullableNumber(
          scenario
            ?.totalReturn
            ?.totalReturnCagrPercentage
        )
    )
    .filter((value) => value !== null);

  const dispersion =
    standardDeviation(scenarioValues);

  const scenarioAgreementScore =
    dispersion === null
      ? 40
      : dispersion <= 3
        ? 100
        : dispersion <= 6
          ? 85
          : dispersion <= 10
            ? 65
            : dispersion <= 15
              ? 40
              : 20;

  const components = [
    {
      code: "ASSUMPTION_COVERAGE",
      score:
        growthAssumptions
          ?.coveragePercentage ?? 0,
      weight: 0.45
    },
    {
      code: "SCENARIO_AGREEMENT",
      score: scenarioAgreementScore,
      weight: 0.35
    }
  ];

  if (nullableNumber(dataQualityScore) !== null) {
    components.push({
      code: "DATA_QUALITY",
      score: clamp(
        dataQualityScore,
        0,
        100
      ),
      weight: 0.1
    });
  }

  if (
    nullableNumber(
      valuationConfidencePercentage
    ) !== null
  ) {
    components.push({
      code: "VALUATION_CONFIDENCE",
      score: clamp(
        valuationConfidencePercentage,
        0,
        100
      ),
      weight: 0.1
    });
  }

  const totalWeight = sum(
    components.map((item) => item.weight)
  );

  const score = roundScore(
    totalWeight > 0
      ? sum(
          components.map(
            (item) =>
              item.score * item.weight
          )
        ) / totalWeight
      : 0
  );

  return {
    score,
    classification:
      classifyForecastConfidence(score),
    components,
    scenarioDispersionPercentage:
      roundPercent(dispersion)
  };
}

export function buildStockGrowthAndIncomeForecast({
  symbol,
  name = null,
  sector = null,

  currentRevenue = null,
  currentEarnings = null,
  currentEarningsPerShare = null,
  currentFreeCashFlow = null,
  currentFreeCashFlowPerShare = null,
  currentDividendPerShare = null,
  sharesHeld = null,
  currentPrice = null,

  revenueGrowthPercentage = null,
  earningsGrowthPercentage = null,
  freeCashFlowGrowthPercentage = null,
  dividendGrowthPercentage = null,

  historicalRevenue = [],
  historicalEarnings = [],
  historicalFreeCashFlow = [],
  historicalDividends = [],

  peerRevenueGrowthPercentage = null,
  peerEarningsGrowthPercentage = null,
  peerFreeCashFlowGrowthPercentage = null,
  peerDividendGrowthPercentage = null,

  analystRevenueGrowthPercentage = null,
  analystEarningsGrowthPercentage = null,
  analystFreeCashFlowGrowthPercentage = null,
  analystDividendGrowthPercentage = null,

  payoutRatioPercentage = null,
  dividendCoverageRatio = null,
  freeCashFlowCoverageRatio = null,
  terminalPeRatio = null,
  dataQualityScore = null,
  valuationConfidencePercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy = normalizePolicy(policy);

  const assumptions = buildGrowthAssumptions({
    revenueGrowthPercentage,
    earningsGrowthPercentage,
    freeCashFlowGrowthPercentage,
    dividendGrowthPercentage,
    historicalRevenue,
    historicalEarnings,
    historicalFreeCashFlow,
    historicalDividends,
    peerRevenueGrowthPercentage,
    peerEarningsGrowthPercentage,
    peerFreeCashFlowGrowthPercentage,
    peerDividendGrowthPercentage,
    analystRevenueGrowthPercentage,
    analystEarningsGrowthPercentage,
    analystFreeCashFlowGrowthPercentage,
    analystDividendGrowthPercentage,
    policy: normalizedPolicy
  });

  const scenarios = [
    FORECAST_SCENARIOS.CONSERVATIVE,
    FORECAST_SCENARIOS.BASE,
    FORECAST_SCENARIOS.OPTIMISTIC
  ].map((scenario) =>
    buildForecastScenario({
      scenario,
      currentRevenue,
      currentEarnings,
      currentEarningsPerShare,
      currentFreeCashFlow,
      currentFreeCashFlowPerShare,
      dividendPerShare:
        currentDividendPerShare,
      sharesHeld,
      currentPrice,
      terminalPeRatio,
      revenueGrowthPercentage:
        assumptions?.revenue?.value,
      earningsGrowthPercentage:
        assumptions?.earnings?.value,
      freeCashFlowGrowthPercentage:
        assumptions?.freeCashFlow?.value,
      dividendGrowthPercentage:
        assumptions?.dividends?.value,
      payoutRatioPercentage,
      dividendCoverageRatio,
      freeCashFlowCoverageRatio,
      years:
        normalizedPolicy.projectionYears,
      policy: normalizedPolicy
    })
  );

  const baseScenario = scenarios.find(
    (scenario) =>
      scenario.scenario ===
      FORECAST_SCENARIOS.BASE
  );

  const confidence =
    calculateForecastConfidence({
      growthAssumptions: assumptions,
      scenarios,
      dataQualityScore,
      valuationConfidencePercentage
    });

  return {
    generatedAt: new Date().toISOString(),
    symbol:
      normalizeSymbol(symbol) || null,
    name:
      name ||
      normalizeSymbol(symbol) ||
      "Unknown",
    sector: sector || "Unknown",
    status:
      baseScenario?.status ===
        FORECAST_STATUSES.AVAILABLE
        ? assumptions.coveragePercentage >=
          normalizedPolicy
            .minimumForecastCoveragePercentage
          ? FORECAST_STATUSES.AVAILABLE
          : FORECAST_STATUSES.PARTIAL
        : FORECAST_STATUSES.INSUFFICIENT_DATA,

    assumptions,
    scenarios,
    baseScenario,

    forecast: {
      revenue:
        baseScenario?.revenue || null,
      earnings:
        baseScenario?.earnings || null,
      freeCashFlow:
        baseScenario?.freeCashFlow || null,
      dividends:
        baseScenario?.dividends || null,
      terminal:
        baseScenario?.terminal || null,
      priceCagr:
        baseScenario?.priceCagr || null,
      totalReturn:
        baseScenario?.totalReturn || null
    },

    expected: {
      revenueCagrPercentage:
        assumptions?.revenue?.value ?? null,
      earningsCagrPercentage:
        assumptions?.earnings?.value ?? null,
      freeCashFlowCagrPercentage:
        assumptions?.freeCashFlow?.value ?? null,
      dividendCagrPercentage:
        assumptions?.dividends?.value ?? null,
      priceCagrPercentage:
        baseScenario
          ?.priceCagr
          ?.priceCagrPercentage ?? null,
      totalReturnCagrPercentage:
        baseScenario
          ?.totalReturn
          ?.totalReturnCagrPercentage ?? null,
      terminalFairValue:
        baseScenario
          ?.terminal
          ?.fairValue ?? null,
      cumulativeDividendIncome:
        baseScenario
          ?.dividends
          ?.cumulativeNetIncome ?? null
    },

    confidence,

    summary: {
      projectionYears:
        normalizedPolicy.projectionYears,
      assumptionCoveragePercentage:
        assumptions?.coveragePercentage ?? 0,
      confidencePercentage:
        confidence.score,
      confidenceLevel:
        confidence
          ?.classification
          ?.label ||
        "Not Available"
    },

    message:
      `${normalizeSymbol(symbol) || "The security"} has a base-case expected total-return CAGR of ${
        baseScenario
          ?.totalReturn
          ?.totalReturnCagrPercentage === null ||
        baseScenario
          ?.totalReturn
          ?.totalReturnCagrPercentage === undefined
          ? "not available"
          : `${roundPercent(
              baseScenario
                .totalReturn
                .totalReturnCagrPercentage
            )}%`
      }. Forecast confidence is ${confidence.classification.label.toLowerCase()} at ${confidence.score}%.`,

    advisoryOnly: true
  };
}

export function buildStockGrowthAndIncomeForecasts({
  securities = [],
  inputBuilder = null,
  policy = {}
} = {}) {
  const results = safeArray(securities).map(
    (security) => {
      const extra =
        typeof inputBuilder === "function"
          ? inputBuilder(security) || {}
          : {};

      return buildStockGrowthAndIncomeForecast({
        ...security,
        ...extra,
        policy
      });
    }
  );

  const available = results.filter(
    (result) =>
      result.status ===
        FORECAST_STATUSES.AVAILABLE ||
      result.status ===
        FORECAST_STATUSES.PARTIAL
  );

  return {
    generatedAt: new Date().toISOString(),
    status:
      results.length
        ? FORECAST_STATUSES.AVAILABLE
        : FORECAST_STATUSES.INSUFFICIENT_DATA,
    total: results.length,
    forecasted: available.length,
    notForecasted:
      results.length - available.length,
    averageExpectedEarningsCagrPercentage:
      roundPercent(
        average(
          available.map(
            (result) =>
              result
                ?.expected
                ?.earningsCagrPercentage
          )
        )
      ),
    averageExpectedDividendCagrPercentage:
      roundPercent(
        average(
          available.map(
            (result) =>
              result
                ?.expected
                ?.dividendCagrPercentage
          )
        )
      ),
    averageExpectedTotalReturnCagrPercentage:
      roundPercent(
        average(
          available.map(
            (result) =>
              result
                ?.expected
                ?.totalReturnCagrPercentage
          )
        )
      ),
    averageConfidencePercentage:
      roundPercent(
        average(
          available.map(
            (result) =>
              result
                ?.confidence
                ?.score
          )
        )
      ),
    results: results.sort(
      (first, second) =>
        number(
          second
            ?.expected
            ?.totalReturnCagrPercentage
        ) -
        number(
          first
            ?.expected
            ?.totalReturnCagrPercentage
        )
    )
  };
}

export function loadHighestExpectedTotalReturnStocks(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.expected
            ?.totalReturnCagrPercentage
        ) !== null
    )
    .sort(
      (first, second) =>
        number(
          second
            ?.expected
            ?.totalReturnCagrPercentage
        ) -
        number(
          first
            ?.expected
            ?.totalReturnCagrPercentage
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(number(limit)),
        0
      )
    );
}

export function loadHighestExpectedEarningsGrowthStocks(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.expected
            ?.earningsCagrPercentage
        ) !== null
    )
    .sort(
      (first, second) =>
        number(
          second
            ?.expected
            ?.earningsCagrPercentage
        ) -
        number(
          first
            ?.expected
            ?.earningsCagrPercentage
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(number(limit)),
        0
      )
    );
}

export function loadHighestExpectedDividendGrowthStocks(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.expected
            ?.dividendCagrPercentage
        ) !== null
    )
    .sort(
      (first, second) =>
        number(
          second
            ?.expected
            ?.dividendCagrPercentage
        ) -
        number(
          first
            ?.expected
            ?.dividendCagrPercentage
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(number(limit)),
        0
      )
    );
}

export function loadHighestForecastConfidenceStocks(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .sort(
      (first, second) =>
        number(
          second
            ?.confidence
            ?.score
        ) -
        number(
          first
            ?.confidence
            ?.score
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(number(limit)),
        0
      )
    );
}

export function loadUnsustainableDividendForecasts(
  results = []
) {
  return safeArray(results).filter(
    (result) =>
      result
        ?.forecast
        ?.dividends
        ?.sustainability
        ?.classification
        ?.code ===
      DIVIDEND_SUSTAINABILITY_LEVELS
        .UNSUSTAINABLE
  );
}

export function buildGrowthAndIncomeForecastSummary(
  result
) {
  return {
    symbol: result?.symbol || null,
    status:
      result?.status ||
      FORECAST_STATUSES.INSUFFICIENT_DATA,
    revenueCagrPercentage:
      result
        ?.expected
        ?.revenueCagrPercentage ?? null,
    earningsCagrPercentage:
      result
        ?.expected
        ?.earningsCagrPercentage ?? null,
    freeCashFlowCagrPercentage:
      result
        ?.expected
        ?.freeCashFlowCagrPercentage ?? null,
    dividendCagrPercentage:
      result
        ?.expected
        ?.dividendCagrPercentage ?? null,
    priceCagrPercentage:
      result
        ?.expected
        ?.priceCagrPercentage ?? null,
    totalReturnCagrPercentage:
      result
        ?.expected
        ?.totalReturnCagrPercentage ?? null,
    terminalFairValue:
      result
        ?.expected
        ?.terminalFairValue ?? null,
    cumulativeDividendIncome:
      result
        ?.expected
        ?.cumulativeDividendIncome ?? null,
    confidencePercentage:
      result
        ?.confidence
        ?.score ?? 0,
    confidence:
      result
        ?.confidence
        ?.classification
        ?.label ||
      "Not Available",
    dividendSustainability:
      result
        ?.forecast
        ?.dividends
        ?.sustainability
        ?.classification
        ?.label ||
      "Not Rated",
    message:
      result?.message ||
      "No growth and income forecast is available."
  };
}

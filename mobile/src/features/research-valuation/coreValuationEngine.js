/*
 * ============================================================
 * PC-023B1
 * CORE RESEARCH AND VALUATION ENGINE
 * ============================================================
 *
 * Provides explainable valuation models:
 *
 * - Discounted Cash Flow
 * - Dividend Discount Model
 * - Gordon Growth Model
 * - Graham Number
 * - Earnings Multiple Valuation
 * - Book Value Multiple Valuation
 * - Free Cash Flow Yield Valuation
 * - Asset-based valuation
 * - Weighted composite fair value
 * - Margin of safety
 * - Buy-under price
 * - Fair-value range
 * - Sell-over price
 * - Expected upside or downside
 *
 * Safeguards:
 *
 * - does not fetch or fabricate fundamentals,
 * - does not execute trades,
 * - does not modify holdings,
 * - excludes unavailable models,
 * - records assumptions for every result,
 * - identifies invalid or unstable assumptions.
 * ============================================================
 */

export const VALUATION_MODELS = {
  DISCOUNTED_CASH_FLOW:
    "DISCOUNTED_CASH_FLOW",

  DIVIDEND_DISCOUNT:
    "DIVIDEND_DISCOUNT",

  GORDON_GROWTH:
    "GORDON_GROWTH",

  GRAHAM_NUMBER:
    "GRAHAM_NUMBER",

  EARNINGS_MULTIPLE:
    "EARNINGS_MULTIPLE",

  BOOK_VALUE_MULTIPLE:
    "BOOK_VALUE_MULTIPLE",

  FREE_CASH_FLOW_YIELD:
    "FREE_CASH_FLOW_YIELD",

  ASSET_BASED:
    "ASSET_BASED",

  COMPOSITE:
    "COMPOSITE"
};

export const VALUATION_STATUSES = {
  AVAILABLE:
    "AVAILABLE",

  PARTIAL:
    "PARTIAL",

  INSUFFICIENT_DATA:
    "INSUFFICIENT_DATA",

  INVALID_ASSUMPTIONS:
    "INVALID_ASSUMPTIONS",

  UNSTABLE_MODEL:
    "UNSTABLE_MODEL",

  NOT_APPLICABLE:
    "NOT_APPLICABLE"
};

export const VALUATION_CLASSIFICATIONS = {
  DEEPLY_UNDERVALUED:
    "DEEPLY_UNDERVALUED",

  UNDERVALUED:
    "UNDERVALUED",

  FAIRLY_VALUED:
    "FAIRLY_VALUED",

  OVERVALUED:
    "OVERVALUED",

  DEEPLY_OVERVALUED:
    "DEEPLY_OVERVALUED",

  NOT_RATED:
    "NOT_RATED"
};

export const VALUATION_CONFIDENCE_LEVELS = {
  VERY_HIGH:
    "VERY_HIGH",

  HIGH:
    "HIGH",

  MEDIUM:
    "MEDIUM",

  LOW:
    "LOW",

  VERY_LOW:
    "VERY_LOW",

  NOT_AVAILABLE:
    "NOT_AVAILABLE"
};

export const DEFAULT_VALUATION_POLICY = {
  projectionYears:
    5,

  terminalGrowthPercentage:
    4,

  discountRatePercentage:
    12,

  marginOfSafetyPercentage:
    25,

  fairValueRangePercentage:
    10,

  sellPremiumPercentage:
    20,

  targetPeRatio:
    12,

  targetPriceToBookRatio:
    1.5,

  targetFreeCashFlowYieldPercentage:
    8,

  grahamEarningsMultiplier:
    15,

  grahamBookValueMultiplier:
    1.5,

  maximumTerminalGrowthPercentage:
    8,

  minimumDiscountSpreadPercentage:
    2,

  minimumModelCoveragePercentage:
    25
};

export const DEFAULT_COMPOSITE_MODEL_WEIGHTS = {
  DISCOUNTED_CASH_FLOW:
    0.3,

  DIVIDEND_DISCOUNT:
    0.15,

  GRAHAM_NUMBER:
    0.1,

  EARNINGS_MULTIPLE:
    0.2,

  BOOK_VALUE_MULTIPLE:
    0.1,

  FREE_CASH_FLOW_YIELD:
    0.1,

  ASSET_BASED:
    0.05
};

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function number(value) {
  const parsed =
    Number(
      value ?? 0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

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

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function positiveNumber(value) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function nonNegativeNumber(value) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
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

function roundMoney(value) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(2)
  );
}

function roundPercent(value) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(2)
  );
}

function roundMetric(
  value,
  decimals = 6
) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(
      decimals
    )
  );
}

function safeArray(value) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function normalizeSymbol(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}

function normalizeStatus(value) {
  return String(
    value || "UNKNOWN"
  )
    .trim()
    .toUpperCase();
}

function sum(values = []) {
  return safeArray(
    values
  ).reduce(
    (
      total,
      value
    ) =>
      total +
      number(value),
    0
  );
}

function average(values = []) {
  const valid =
    safeArray(values)
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !== null
      );

  if (
    !valid.length
  ) {
    return null;
  }

  return (
    sum(valid) /
    valid.length
  );
}

function median(values = []) {
  const valid =
    safeArray(values)
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !== null
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

  if (
    !valid.length
  ) {
    return null;
  }

  const middle =
    Math.floor(
      valid.length /
      2
    );

  if (
    valid.length %
      2 ===
    0
  ) {
    return (
      valid[
        middle - 1
      ] +
      valid[middle]
    ) /
    2;
  }

  return valid[middle];
}

function standardDeviation(
  values = []
) {
  const valid =
    safeArray(values)
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !== null
      );

  if (
    valid.length <
    2
  ) {
    return null;
  }

  const mean =
    average(valid);

  const variance =
    average(
      valid.map(
        (value) =>
          Math.pow(
            value -
            mean,
            2
          )
      )
    );

  return Math.sqrt(
    variance
  );
}

function normalizePolicy(
  policy = {}
) {
  return {
    projectionYears:
      Math.max(
        Math.floor(
          number(
            policy
              ?.projectionYears ??
            DEFAULT_VALUATION_POLICY
              .projectionYears
          )
        ),
        1
      ),

    terminalGrowthPercentage:
      number(
        policy
          ?.terminalGrowthPercentage ??
        DEFAULT_VALUATION_POLICY
          .terminalGrowthPercentage
      ),

    discountRatePercentage:
      number(
        policy
          ?.discountRatePercentage ??
        DEFAULT_VALUATION_POLICY
          .discountRatePercentage
      ),

    marginOfSafetyPercentage:
      clamp(
        policy
          ?.marginOfSafetyPercentage ??
        DEFAULT_VALUATION_POLICY
          .marginOfSafetyPercentage,
        0,
        90
      ),

    fairValueRangePercentage:
      clamp(
        policy
          ?.fairValueRangePercentage ??
        DEFAULT_VALUATION_POLICY
          .fairValueRangePercentage,
        0,
        100
      ),

    sellPremiumPercentage:
      clamp(
        policy
          ?.sellPremiumPercentage ??
        DEFAULT_VALUATION_POLICY
          .sellPremiumPercentage,
        0,
        200
      ),

    targetPeRatio:
      positiveNumber(
        policy
          ?.targetPeRatio ??
        DEFAULT_VALUATION_POLICY
          .targetPeRatio
      ),

    targetPriceToBookRatio:
      positiveNumber(
        policy
          ?.targetPriceToBookRatio ??
        DEFAULT_VALUATION_POLICY
          .targetPriceToBookRatio
      ),

    targetFreeCashFlowYieldPercentage:
      positiveNumber(
        policy
          ?.targetFreeCashFlowYieldPercentage ??
        DEFAULT_VALUATION_POLICY
          .targetFreeCashFlowYieldPercentage
      ),

    grahamEarningsMultiplier:
      positiveNumber(
        policy
          ?.grahamEarningsMultiplier ??
        DEFAULT_VALUATION_POLICY
          .grahamEarningsMultiplier
      ),

    grahamBookValueMultiplier:
      positiveNumber(
        policy
          ?.grahamBookValueMultiplier ??
        DEFAULT_VALUATION_POLICY
          .grahamBookValueMultiplier
      ),

    maximumTerminalGrowthPercentage:
      number(
        policy
          ?.maximumTerminalGrowthPercentage ??
        DEFAULT_VALUATION_POLICY
          .maximumTerminalGrowthPercentage
      ),

    minimumDiscountSpreadPercentage:
      positiveNumber(
        policy
          ?.minimumDiscountSpreadPercentage ??
        DEFAULT_VALUATION_POLICY
          .minimumDiscountSpreadPercentage
      ),

    minimumModelCoveragePercentage:
      clamp(
        policy
          ?.minimumModelCoveragePercentage ??
        DEFAULT_VALUATION_POLICY
          .minimumModelCoveragePercentage,
        0,
        100
      )
  };
}

/*
 * ============================================================
 * MODEL RESULT BUILDER
 * ============================================================
 */

function buildUnavailableModelResult({
  model,
  status =
    VALUATION_STATUSES
      .INSUFFICIENT_DATA,
  message,
  assumptions = {},
  warnings = []
}) {
  return {
    model,

    status,

    available:
      false,

    fairValue:
      null,

    assumptions,

    warnings,

    message,

    calculations: {}
  };
}

function buildAvailableModelResult({
  model,
  fairValue,
  assumptions = {},
  calculations = {},
  warnings = [],
  message = null
}) {
  const value =
    nullableNumber(
      fairValue
    );

  if (
    value === null ||
    value <= 0
  ) {
    return buildUnavailableModelResult({
      model,

      status:
        VALUATION_STATUSES
          .INVALID_ASSUMPTIONS,

      message:
        message ||
        "The valuation model did not produce a positive fair value.",

      assumptions,

      warnings
    });
  }

  return {
    model,

    status:
      warnings.length
        ? VALUATION_STATUSES
            .PARTIAL
        : VALUATION_STATUSES
            .AVAILABLE,

    available:
      true,

    fairValue:
      roundMoney(
        value
      ),

    assumptions,

    calculations,

    warnings,

    message:
      message ||
      `${model} produced an estimated fair value of ${roundMoney(
        value
      )}.`
  };
}

/*
 * ============================================================
 * CASH-FLOW FORECAST
 * ============================================================
 */

export function buildFreeCashFlowForecast({
  baseFreeCashFlow,
  growthPercentage,
  projectionYears = 5
} = {}) {
  const base =
    positiveNumber(
      baseFreeCashFlow
    );

  const growth =
    nullableNumber(
      growthPercentage
    );

  const years =
    Math.max(
      Math.floor(
        number(
          projectionYears
        )
      ),
      1
    );

  if (
    base === null ||
    growth === null
  ) {
    return {
      status:
        VALUATION_STATUSES
          .INSUFFICIENT_DATA,

      baseFreeCashFlow:
        base,

      growthPercentage:
        growth,

      projectionYears:
        years,

      forecasts:
        []
    };
  }

  const growthDecimal =
    growth /
    100;

  const forecasts =
    [];

  let previous =
    base;

  for (
    let year = 1;
    year <= years;
    year += 1
  ) {
    const projected =
      previous *
      (
        1 +
        growthDecimal
      );

    forecasts.push({
      year,

      freeCashFlow:
        roundMoney(
          projected
        ),

      growthPercentage:
        roundPercent(
          growth
        )
    });

    previous =
      projected;
  }

  return {
    status:
      VALUATION_STATUSES
        .AVAILABLE,

    baseFreeCashFlow:
      roundMoney(
        base
      ),

    growthPercentage:
      roundPercent(
        growth
      ),

    projectionYears:
      years,

    forecasts
  };
}

/*
 * ============================================================
 * DISCOUNTED CASH FLOW
 * ============================================================
 */

export function buildDiscountedCashFlowValuation({
  symbol = null,
  freeCashFlow = null,
  freeCashFlowPerShare = null,
  sharesOutstanding = null,
  growthPercentage = null,
  discountRatePercentage = null,
  terminalGrowthPercentage = null,
  netDebt = 0,
  projectionYears = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const years =
    projectionYears ??
    normalizedPolicy
      .projectionYears;

  const discountRate =
    nullableNumber(
      discountRatePercentage
    ) ??
    normalizedPolicy
      .discountRatePercentage;

  const terminalGrowth =
    nullableNumber(
      terminalGrowthPercentage
    ) ??
    normalizedPolicy
      .terminalGrowthPercentage;

  const growth =
    nullableNumber(
      growthPercentage
    );

  const shares =
    positiveNumber(
      sharesOutstanding
    );

  let baseFreeCashFlow =
    positiveNumber(
      freeCashFlow
    );

  let source =
    "TOTAL_FREE_CASH_FLOW";

  if (
    baseFreeCashFlow ===
      null &&
    positiveNumber(
      freeCashFlowPerShare
    ) !==
      null &&
    shares !==
      null
  ) {
    baseFreeCashFlow =
      positiveNumber(
        freeCashFlowPerShare
      ) *
      shares;

    source =
      "FREE_CASH_FLOW_PER_SHARE";
  }

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    baseFreeCashFlow:
      roundMoney(
        baseFreeCashFlow
      ),

    freeCashFlowSource:
      source,

    growthPercentage:
      growth,

    discountRatePercentage:
      discountRate,

    terminalGrowthPercentage:
      terminalGrowth,

    projectionYears:
      years,

    sharesOutstanding:
      shares,

    netDebt:
      roundMoney(
        netDebt
      )
  };

  if (
    baseFreeCashFlow ===
      null ||
    growth ===
      null ||
    shares ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .DISCOUNTED_CASH_FLOW,

      message:
        "Free cash flow, growth, and shares outstanding are required for DCF valuation.",

      assumptions
    });
  }

  const minimumSpread =
    normalizedPolicy
      .minimumDiscountSpreadPercentage;

  if (
    terminalGrowth >=
    discountRate -
    minimumSpread
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .DISCOUNTED_CASH_FLOW,

      status:
        VALUATION_STATUSES
          .UNSTABLE_MODEL,

      message:
        "Terminal growth must remain meaningfully below the discount rate.",

      assumptions,

      warnings: [
        {
          code:
            "TERMINAL_GROWTH_TOO_HIGH",

          message:
            "The selected terminal-growth assumption makes the DCF model unstable."
        }
      ]
    });
  }

  if (
    terminalGrowth >
    normalizedPolicy
      .maximumTerminalGrowthPercentage
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .DISCOUNTED_CASH_FLOW,

      status:
        VALUATION_STATUSES
          .INVALID_ASSUMPTIONS,

      message:
        "Terminal growth exceeds the configured maximum.",

      assumptions
    });
  }

  const forecast =
    buildFreeCashFlowForecast({
      baseFreeCashFlow,

      growthPercentage:
        growth,

      projectionYears:
        years
    });

  const discountDecimal =
    discountRate /
    100;

  const terminalGrowthDecimal =
    terminalGrowth /
    100;

  const discountedForecasts =
    forecast.forecasts.map(
      (item) => {
        const discountFactor =
          Math.pow(
            1 +
            discountDecimal,
            item.year
          );

        return {
          ...item,

          discountFactor:
            roundMetric(
              discountFactor
            ),

          presentValue:
            roundMoney(
              item.freeCashFlow /
              discountFactor
            )
        };
      }
    );

  const finalYearCashFlow =
    discountedForecasts[
      discountedForecasts.length -
      1
    ]?.freeCashFlow;

  const terminalValue =
    (
      finalYearCashFlow *
      (
        1 +
        terminalGrowthDecimal
      )
    ) /
    (
      discountDecimal -
      terminalGrowthDecimal
    );

  const terminalDiscountFactor =
    Math.pow(
      1 +
      discountDecimal,
      years
    );

  const presentTerminalValue =
    terminalValue /
    terminalDiscountFactor;

  const presentForecastValue =
    sum(
      discountedForecasts.map(
        (item) =>
          item.presentValue
      )
    );

  const enterpriseValue =
    presentForecastValue +
    presentTerminalValue;

  const equityValue =
    enterpriseValue -
    number(netDebt);

  const fairValuePerShare =
    equityValue /
    shares;

  const terminalValuePercentage =
    enterpriseValue > 0
      ? (
          presentTerminalValue /
          enterpriseValue
        ) *
        100
      : null;

  const warnings = [];

  if (
    terminalValuePercentage !==
      null &&
    terminalValuePercentage >
      80
  ) {
    warnings.push({
      code:
        "HIGH_TERMINAL_VALUE_DEPENDENCE",

      message:
        `Terminal value contributes approximately ${roundPercent(
          terminalValuePercentage
        )}% of estimated enterprise value.`
    });
  }

  if (
    growth >
    discountRate
  ) {
    warnings.push({
      code:
        "GROWTH_EXCEEDS_DISCOUNT_RATE",

      message:
        "The near-term growth assumption exceeds the selected discount rate."
    });
  }

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .DISCOUNTED_CASH_FLOW,

    fairValue:
      fairValuePerShare,

    assumptions,

    warnings,

    calculations: {
      forecast:
        discountedForecasts,

      presentForecastValue:
        roundMoney(
          presentForecastValue
        ),

      terminalValue:
        roundMoney(
          terminalValue
        ),

      presentTerminalValue:
        roundMoney(
          presentTerminalValue
        ),

      terminalValuePercentage:
        roundPercent(
          terminalValuePercentage
        ),

      enterpriseValue:
        roundMoney(
          enterpriseValue
        ),

      netDebt:
        roundMoney(
          netDebt
        ),

      equityValue:
        roundMoney(
          equityValue
        ),

      sharesOutstanding:
        shares,

      fairValuePerShare:
        roundMoney(
          fairValuePerShare
        )
    }
  });
}

/*
 * ============================================================
 * DIVIDEND DISCOUNT MODEL
 * ============================================================
 */

export function buildDividendDiscountValuation({
  symbol = null,
  dividendPerShare = null,
  dividendGrowthPercentage = null,
  requiredReturnPercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const dividend =
    positiveNumber(
      dividendPerShare
    );

  const growth =
    nullableNumber(
      dividendGrowthPercentage
    );

  const requiredReturn =
    nullableNumber(
      requiredReturnPercentage
    ) ??
    normalizedPolicy
      .discountRatePercentage;

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    dividendPerShare:
      dividend,

    dividendGrowthPercentage:
      growth,

    requiredReturnPercentage:
      requiredReturn
  };

  if (
    dividend ===
      null ||
    growth ===
      null ||
    requiredReturn ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .DIVIDEND_DISCOUNT,

      message:
        "Dividend per share, dividend growth, and required return are required.",

      assumptions
    });
  }

  if (
    growth >=
    requiredReturn
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .DIVIDEND_DISCOUNT,

      status:
        VALUATION_STATUSES
          .UNSTABLE_MODEL,

      message:
        "Dividend growth must remain below the required return.",

      assumptions
    });
  }

  const growthDecimal =
    growth /
    100;

  const requiredReturnDecimal =
    requiredReturn /
    100;

  const nextDividend =
    dividend *
    (
      1 +
      growthDecimal
    );

  const fairValue =
    nextDividend /
    (
      requiredReturnDecimal -
      growthDecimal
    );

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .DIVIDEND_DISCOUNT,

    fairValue,

    assumptions,

    calculations: {
      currentDividend:
        roundMoney(
          dividend
        ),

      nextDividend:
        roundMoney(
          nextDividend
        ),

      requiredReturnDecimal:
        roundMetric(
          requiredReturnDecimal
        ),

      growthDecimal:
        roundMetric(
          growthDecimal
        ),

      fairValuePerShare:
        roundMoney(
          fairValue
        )
    }
  });
}

/*
 * ============================================================
 * GORDON GROWTH COMPATIBILITY
 * ============================================================
 */

export function buildGordonGrowthValuation(
  options = {}
) {
  const result =
    buildDividendDiscountValuation(
      options
    );

  return {
    ...result,

    model:
      VALUATION_MODELS
        .GORDON_GROWTH
  };
}

/*
 * ============================================================
 * GRAHAM NUMBER
 * ============================================================
 */

export function buildGrahamNumberValuation({
  symbol = null,
  earningsPerShare = null,
  bookValuePerShare = null,
  earningsMultiplier = null,
  bookValueMultiplier = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const eps =
    positiveNumber(
      earningsPerShare
    );

  const bookValue =
    positiveNumber(
      bookValuePerShare
    );

  const earningsMultiple =
    positiveNumber(
      earningsMultiplier
    ) ??
    normalizedPolicy
      .grahamEarningsMultiplier;

  const bookMultiple =
    positiveNumber(
      bookValueMultiplier
    ) ??
    normalizedPolicy
      .grahamBookValueMultiplier;

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    earningsPerShare:
      eps,

    bookValuePerShare:
      bookValue,

    earningsMultiplier:
      earningsMultiple,

    bookValueMultiplier:
      bookMultiple
  };

  if (
    eps ===
      null ||
    bookValue ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .GRAHAM_NUMBER,

      message:
        "Positive earnings per share and book value per share are required.",

      assumptions
    });
  }

  const multiplier =
    earningsMultiple *
    bookMultiple;

  const fairValue =
    Math.sqrt(
      multiplier *
      eps *
      bookValue
    );

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .GRAHAM_NUMBER,

    fairValue,

    assumptions,

    calculations: {
      combinedMultiplier:
        roundMetric(
          multiplier
        ),

      fairValuePerShare:
        roundMoney(
          fairValue
        )
    }
  });
}

/*
 * ============================================================
 * EARNINGS MULTIPLE VALUATION
 * ============================================================
 */

export function buildEarningsMultipleValuation({
  symbol = null,
  earningsPerShare = null,
  targetPeRatio = null,
  growthAdjustedPeRatio = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const eps =
    positiveNumber(
      earningsPerShare
    );

  const targetMultiple =
    positiveNumber(
      growthAdjustedPeRatio
    ) ??
    positiveNumber(
      targetPeRatio
    ) ??
    normalizedPolicy
      .targetPeRatio;

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    earningsPerShare:
      eps,

    targetPeRatio:
      targetMultiple
  };

  if (
    eps ===
      null ||
    targetMultiple ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .EARNINGS_MULTIPLE,

      message:
        "Positive earnings per share and a target P/E ratio are required.",

      assumptions
    });
  }

  const fairValue =
    eps *
    targetMultiple;

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .EARNINGS_MULTIPLE,

    fairValue,

    assumptions,

    calculations: {
      fairValuePerShare:
        roundMoney(
          fairValue
        )
    }
  });
}

/*
 * ============================================================
 * BOOK VALUE MULTIPLE
 * ============================================================
 */

export function buildBookValueMultipleValuation({
  symbol = null,
  bookValuePerShare = null,
  targetPriceToBookRatio = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const bookValue =
    positiveNumber(
      bookValuePerShare
    );

  const targetMultiple =
    positiveNumber(
      targetPriceToBookRatio
    ) ??
    normalizedPolicy
      .targetPriceToBookRatio;

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    bookValuePerShare:
      bookValue,

    targetPriceToBookRatio:
      targetMultiple
  };

  if (
    bookValue ===
      null ||
    targetMultiple ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .BOOK_VALUE_MULTIPLE,

      message:
        "Positive book value per share and a target price-to-book ratio are required.",

      assumptions
    });
  }

  const fairValue =
    bookValue *
    targetMultiple;

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .BOOK_VALUE_MULTIPLE,

    fairValue,

    assumptions,

    calculations: {
      fairValuePerShare:
        roundMoney(
          fairValue
        )
    }
  });
}

/*
 * ============================================================
 * FREE-CASH-FLOW-YIELD VALUATION
 * ============================================================
 */

export function buildFreeCashFlowYieldValuation({
  symbol = null,
  freeCashFlowPerShare = null,
  targetFreeCashFlowYieldPercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const cashFlowPerShare =
    positiveNumber(
      freeCashFlowPerShare
    );

  const targetYield =
    positiveNumber(
      targetFreeCashFlowYieldPercentage
    ) ??
    normalizedPolicy
      .targetFreeCashFlowYieldPercentage;

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    freeCashFlowPerShare:
      cashFlowPerShare,

    targetFreeCashFlowYieldPercentage:
      targetYield
  };

  if (
    cashFlowPerShare ===
      null ||
    targetYield ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .FREE_CASH_FLOW_YIELD,

      message:
        "Positive free cash flow per share and a target free-cash-flow yield are required.",

      assumptions
    });
  }

  const fairValue =
    cashFlowPerShare /
    (
      targetYield /
      100
    );

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .FREE_CASH_FLOW_YIELD,

    fairValue,

    assumptions,

    calculations: {
      targetYieldDecimal:
        roundMetric(
          targetYield /
          100
        ),

      fairValuePerShare:
        roundMoney(
          fairValue
        )
    }
  });
}

/*
 * ============================================================
 * ASSET-BASED VALUATION
 * ============================================================
 */

export function buildAssetBasedValuation({
  symbol = null,
  totalAssets = null,
  totalLiabilities = null,
  preferredEquity = 0,
  intangibleAssets = 0,
  sharesOutstanding = null,
  liquidationDiscountPercentage = 0
} = {}) {
  const assets =
    positiveNumber(
      totalAssets
    );

  const liabilities =
    nonNegativeNumber(
      totalLiabilities
    );

  const shares =
    positiveNumber(
      sharesOutstanding
    );

  const discount =
    clamp(
      liquidationDiscountPercentage,
      0,
      100
    );

  const assumptions = {
    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    totalAssets:
      roundMoney(
        assets
      ),

    totalLiabilities:
      roundMoney(
        liabilities
      ),

    preferredEquity:
      roundMoney(
        preferredEquity
      ),

    intangibleAssets:
      roundMoney(
        intangibleAssets
      ),

    sharesOutstanding:
      shares,

    liquidationDiscountPercentage:
      discount
  };

  if (
    assets ===
      null ||
    liabilities ===
      null ||
    shares ===
      null
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .ASSET_BASED,

      message:
        "Assets, liabilities, and shares outstanding are required.",

      assumptions
    });
  }

  const tangibleAssets =
    Math.max(
      assets -
      number(
        intangibleAssets
      ),
      0
    );

  const netAssetValue =
    tangibleAssets -
    liabilities -
    number(
      preferredEquity
    );

  if (
    netAssetValue <= 0
  ) {
    return buildUnavailableModelResult({
      model:
        VALUATION_MODELS
          .ASSET_BASED,

      status:
        VALUATION_STATUSES
          .NOT_APPLICABLE,

      message:
        "Calculated tangible net asset value is not positive.",

      assumptions
    });
  }

  const discountedNetAssetValue =
    netAssetValue *
    (
      1 -
      discount /
      100
    );

  const fairValue =
    discountedNetAssetValue /
    shares;

  return buildAvailableModelResult({
    model:
      VALUATION_MODELS
        .ASSET_BASED,

    fairValue,

    assumptions,

    calculations: {
      tangibleAssets:
        roundMoney(
          tangibleAssets
        ),

      netAssetValue:
        roundMoney(
          netAssetValue
        ),

      discountedNetAssetValue:
        roundMoney(
          discountedNetAssetValue
        ),

      fairValuePerShare:
        roundMoney(
          fairValue
        )
    }
  });
}

/*
 * ============================================================
 * MODEL RELIABILITY SCORE
 * ============================================================
 */

function calculateModelReliabilityScore(
  modelResult
) {
  if (
    !modelResult?.available
  ) {
    return 0;
  }

  let score =
    85;

  const warningCount =
    safeArray(
      modelResult?.warnings
    ).length;

  score -=
    Math.min(
      warningCount *
      10,
      35
    );

  if (
    modelResult?.status ===
    VALUATION_STATUSES
      .PARTIAL
  ) {
    score -=
      10;
  }

  if (
    modelResult?.model ===
    VALUATION_MODELS
      .DISCOUNTED_CASH_FLOW
  ) {
    const terminalShare =
      nullableNumber(
        modelResult
          ?.calculations
          ?.terminalValuePercentage
      );

    if (
      terminalShare !==
        null &&
      terminalShare >
        85
    ) {
      score -=
        15;
    } else if (
      terminalShare !==
        null &&
      terminalShare >
        75
    ) {
      score -=
        7;
    }
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

/*
 * ============================================================
 * COMPOSITE FAIR VALUE
 * ============================================================
 */

export function buildCompositeFairValue({
  symbol = null,
  modelResults = [],
  modelWeights =
    DEFAULT_COMPOSITE_MODEL_WEIGHTS,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const normalizedResults =
    safeArray(
      modelResults
    )
      .filter(
        (result) =>
          result &&
          result.model
      )
      .map(
        (result) => {
          const configuredWeight =
            number(
              modelWeights?.[
                result.model
              ]
            );

          const reliabilityScore =
            calculateModelReliabilityScore(
              result
            );

          const reliabilityMultiplier =
            reliabilityScore /
            100;

          const effectiveWeight =
            result.available
              ? configuredWeight *
                reliabilityMultiplier
              : 0;

          return {
            ...result,

            configuredWeight,

            configuredWeightPercentage:
              roundPercent(
                configuredWeight *
                100
              ),

            reliabilityScore,

            effectiveWeight:
              roundMetric(
                effectiveWeight
              )
          };
        }
      );

  const available =
    normalizedResults.filter(
      (result) =>
        result.available &&
        nullableNumber(
          result.fairValue
        ) !==
          null &&
        result.effectiveWeight >
          0
    );

  if (
    !available.length
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      symbol:
        normalizeSymbol(
          symbol
        ) ||
        null,

      model:
        VALUATION_MODELS
          .COMPOSITE,

      status:
        VALUATION_STATUSES
          .INSUFFICIENT_DATA,

      available:
        false,

      fairValue:
        null,

      medianFairValue:
        null,

      averageFairValue:
        null,

      modelCoveragePercentage:
        0,

      availableModels:
        0,

      totalModels:
        normalizedResults.length,

      modelResults:
        normalizedResults,

      message:
        "No usable valuation model is available."
    };
  }

  const totalConfiguredWeight =
    sum(
      normalizedResults.map(
        (result) =>
          result.configuredWeight
      )
    );

  const availableConfiguredWeight =
    sum(
      available.map(
        (result) =>
          result.configuredWeight
      )
    );

  const effectiveWeightTotal =
    sum(
      available.map(
        (result) =>
          result.effectiveWeight
      )
    );

  const weightedFairValue =
    effectiveWeightTotal >
      0
      ? sum(
          available.map(
            (result) =>
              number(
                result.fairValue
              ) *
              result.effectiveWeight
          )
        ) /
        effectiveWeightTotal
      : average(
          available.map(
            (result) =>
              result.fairValue
          )
        );

  const fairValues =
    available.map(
      (result) =>
        result.fairValue
    );

  const modelCoveragePercentage =
    totalConfiguredWeight >
      0
      ? (
          availableConfiguredWeight /
          totalConfiguredWeight
        ) *
        100
      : (
          available.length /
          Math.max(
            normalizedResults.length,
            1
          )
        ) *
        100;

  const dispersion =
    standardDeviation(
      fairValues
    );

  const mean =
    average(
      fairValues
    );

  const dispersionPercentage =
    dispersion !==
      null &&
    mean !==
      null &&
    mean !==
      0
      ? (
          dispersion /
          mean
        ) *
        100
      : null;

  const status =
    modelCoveragePercentage >=
      70
      ? VALUATION_STATUSES
          .AVAILABLE
      : VALUATION_STATUSES
          .PARTIAL;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    model:
      VALUATION_MODELS
        .COMPOSITE,

    status,

    available:
      true,

    fairValue:
      roundMoney(
        weightedFairValue
      ),

    medianFairValue:
      roundMoney(
        median(
          fairValues
        )
      ),

    averageFairValue:
      roundMoney(
        average(
          fairValues
        )
      ),

    minimumFairValue:
      roundMoney(
        Math.min(
          ...fairValues
        )
      ),

    maximumFairValue:
      roundMoney(
        Math.max(
          ...fairValues
        )
      ),

    dispersion:
      roundMoney(
        dispersion
      ),

    dispersionPercentage:
      roundPercent(
        dispersionPercentage
      ),

    modelCoveragePercentage:
      roundPercent(
        modelCoveragePercentage
      ),

    availableModels:
      available.length,

    totalModels:
      normalizedResults.length,

    effectiveWeightTotal:
      roundMetric(
        effectiveWeightTotal
      ),

    modelResults:
      normalizedResults,

    message:
      `${available.length} valuation model(s) produced a composite fair value of ${roundMoney(
        weightedFairValue
      )}.`
  };
}

/*
 * ============================================================
 * MARKET PRICE CLASSIFICATION
 * ============================================================
 */

export function classifyValuation({
  currentPrice,
  fairValue
} = {}) {
  const price =
    positiveNumber(
      currentPrice
    );

  const value =
    positiveNumber(
      fairValue
    );

  if (
    price ===
      null ||
    value ===
      null
  ) {
    return {
      code:
        VALUATION_CLASSIFICATIONS
          .NOT_RATED,

      label:
        "Not Rated",

      upsidePercentage:
        null,

      description:
        "Current price and fair value are required."
    };
  }

  const upside =
    (
      (
        value -
        price
      ) /
      price
    ) *
    100;

  if (
    upside >= 40
  ) {
    return {
      code:
        VALUATION_CLASSIFICATIONS
          .DEEPLY_UNDERVALUED,

      label:
        "Deeply Undervalued",

      upsidePercentage:
        roundPercent(
          upside
        ),

      description:
        "Estimated fair value is substantially above the current market price."
    };
  }

  if (
    upside >= 15
  ) {
    return {
      code:
        VALUATION_CLASSIFICATIONS
          .UNDERVALUED,

      label:
        "Undervalued",

      upsidePercentage:
        roundPercent(
          upside
        ),

      description:
        "Estimated fair value is meaningfully above the current market price."
    };
  }

  if (
    upside >
      -15
  ) {
    return {
      code:
        VALUATION_CLASSIFICATIONS
          .FAIRLY_VALUED,

      label:
        "Fairly Valued",

      upsidePercentage:
        roundPercent(
          upside
        ),

      description:
        "The current market price is close to the estimated fair value."
    };
  }

  if (
    upside >
      -35
  ) {
    return {
      code:
        VALUATION_CLASSIFICATIONS
          .OVERVALUED,

      label:
        "Overvalued",

      upsidePercentage:
        roundPercent(
          upside
        ),

      description:
        "The current market price is above the estimated fair value."
    };
  }

  return {
    code:
      VALUATION_CLASSIFICATIONS
        .DEEPLY_OVERVALUED,

    label:
      "Deeply Overvalued",

    upsidePercentage:
      roundPercent(
        upside
      ),

    description:
      "The current market price is substantially above the estimated fair value."
  };
}

/*
 * ============================================================
 * PRICE LEVELS
 * ============================================================
 */

export function buildValuationPriceLevels({
  fairValue,
  marginOfSafetyPercentage = null,
  fairValueRangePercentage = null,
  sellPremiumPercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const value =
    positiveNumber(
      fairValue
    );

  if (
    value ===
    null
  ) {
    return {
      fairValue:
        null,

      strongBuyBelow:
        null,

      buyUnder:
        null,

      fairValueLow:
        null,

      fairValueHigh:
        null,

      sellOver:
        null
    };
  }

  const margin =
    clamp(
      marginOfSafetyPercentage ??
      normalizedPolicy
        .marginOfSafetyPercentage,
      0,
      90
    );

  const range =
    clamp(
      fairValueRangePercentage ??
      normalizedPolicy
        .fairValueRangePercentage,
      0,
      100
    );

  const sellPremium =
    clamp(
      sellPremiumPercentage ??
      normalizedPolicy
        .sellPremiumPercentage,
      0,
      200
    );

  const buyUnder =
    value *
    (
      1 -
      margin /
      100
    );

  const strongBuyBelow =
    value *
    (
      1 -
      Math.min(
        margin +
        15,
        90
      ) /
      100
    );

  const fairValueLow =
    value *
    (
      1 -
      range /
      100
    );

  const fairValueHigh =
    value *
    (
      1 +
      range /
      100
    );

  const sellOver =
    value *
    (
      1 +
      sellPremium /
      100
    );

  return {
    fairValue:
      roundMoney(
        value
      ),

    marginOfSafetyPercentage:
      roundPercent(
        margin
      ),

    fairValueRangePercentage:
      roundPercent(
        range
      ),

    sellPremiumPercentage:
      roundPercent(
        sellPremium
      ),

    strongBuyBelow:
      roundMoney(
        strongBuyBelow
      ),

    buyUnder:
      roundMoney(
        buyUnder
      ),

    fairValueLow:
      roundMoney(
        fairValueLow
      ),

    fairValueHigh:
      roundMoney(
        fairValueHigh
      ),

    sellOver:
      roundMoney(
        sellOver
      )
  };
}

/*
 * ============================================================
 * VALUATION CONFIDENCE
 * ============================================================
 */

export function classifyValuationConfidence(
  percentage
) {
  const value =
    nullableNumber(
      percentage
    );

  if (
    value ===
    null
  ) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .NOT_AVAILABLE,

      label:
        "Not Available"
    };
  }

  if (
    value >= 85
  ) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .VERY_HIGH,

      label:
        "Very High"
    };
  }

  if (
    value >= 70
  ) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .HIGH,

      label:
        "High"
    };
  }

  if (
    value >= 50
  ) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .MEDIUM,

      label:
        "Medium"
    };
  }

  if (
    value >= 25
  ) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .LOW,

      label:
        "Low"
    };
  }

  return {
    code:
      VALUATION_CONFIDENCE_LEVELS
        .VERY_LOW,

    label:
      "Very Low"
  };
}

function calculateCompositeConfidence({
  composite,
  dataQualityScore = null
}) {
  if (
    !composite?.available
  ) {
    return {
      score:
        0,

      classification:
        classifyValuationConfidence(
          0
        ),

      components: []
    };
  }

  const coverage =
    number(
      composite
        ?.modelCoveragePercentage
    );

  const dispersion =
    nullableNumber(
      composite
        ?.dispersionPercentage
    );

  const dispersionScore =
    dispersion ===
      null
      ? 50
      : dispersion <=
          10
        ? 100
        : dispersion <=
            20
          ? 85
          : dispersion <=
              35
            ? 65
            : dispersion <=
                50
              ? 40
              : 20;

  const reliabilityScores =
    safeArray(
      composite
        ?.modelResults
    )
      .filter(
        (result) =>
          result.available
      )
      .map(
        (result) =>
          result.reliabilityScore
      );

  const averageReliability =
    average(
      reliabilityScores
    ) ??
    0;

  const components = [
    {
      code:
        "MODEL_COVERAGE",

      score:
        coverage,

      weight:
        0.35
    },
    {
      code:
        "MODEL_AGREEMENT",

      score:
        dispersionScore,

      weight:
        0.3
    },
    {
      code:
        "MODEL_RELIABILITY",

      score:
        averageReliability,

      weight:
        0.25
    }
  ];

  if (
    nullableNumber(
      dataQualityScore
    ) !==
    null
  ) {
    components.push({
      code:
        "DATA_QUALITY",

      score:
        number(
          dataQualityScore
        ),

      weight:
        0.1
    });
  }

  const totalWeight =
    sum(
      components.map(
        (item) =>
          item.weight
      )
    );

  const score =
    totalWeight >
      0
      ? sum(
          components.map(
            (item) =>
              item.score *
              item.weight
          )
        ) /
        totalWeight
      : 0;

  const rounded =
    Math.round(
      clamp(
        score,
        0,
        100
      )
    );

  return {
    score:
      rounded,

    classification:
      classifyValuationConfidence(
        rounded
      ),

    components
  };
}

/*
 * ============================================================
 * COMPLETE STOCK VALUATION
 * ============================================================
 */

export function buildStockValuation({
  symbol,
  name = null,
  sector = null,
  currentPrice = null,

  freeCashFlow = null,
  freeCashFlowPerShare = null,
  sharesOutstanding = null,
  freeCashFlowGrowthPercentage = null,
  discountRatePercentage = null,
  terminalGrowthPercentage = null,
  netDebt = 0,

  dividendPerShare = null,
  dividendGrowthPercentage = null,
  requiredReturnPercentage = null,

  earningsPerShare = null,
  bookValuePerShare = null,
  targetPeRatio = null,
  targetPriceToBookRatio = null,
  targetFreeCashFlowYieldPercentage = null,

  totalAssets = null,
  totalLiabilities = null,
  preferredEquity = 0,
  intangibleAssets = 0,
  liquidationDiscountPercentage = 0,

  dataQualityScore = null,
  modelWeights =
    DEFAULT_COMPOSITE_MODEL_WEIGHTS,
  policy = {}
} = {}) {
  const normalizedSymbol =
    normalizeSymbol(
      symbol
    );

  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const dcf =
    buildDiscountedCashFlowValuation({
      symbol:
        normalizedSymbol,

      freeCashFlow,

      freeCashFlowPerShare,

      sharesOutstanding,

      growthPercentage:
        freeCashFlowGrowthPercentage,

      discountRatePercentage,

      terminalGrowthPercentage,

      netDebt,

      projectionYears:
        normalizedPolicy
          .projectionYears,

      policy:
        normalizedPolicy
    });

  const dividendDiscount =
    buildDividendDiscountValuation({
      symbol:
        normalizedSymbol,

      dividendPerShare,

      dividendGrowthPercentage,

      requiredReturnPercentage,

      policy:
        normalizedPolicy
    });

  const graham =
    buildGrahamNumberValuation({
      symbol:
        normalizedSymbol,

      earningsPerShare,

      bookValuePerShare,

      policy:
        normalizedPolicy
    });

  const earningsMultiple =
    buildEarningsMultipleValuation({
      symbol:
        normalizedSymbol,

      earningsPerShare,

      targetPeRatio,

      policy:
        normalizedPolicy
    });

  const bookValueMultiple =
    buildBookValueMultipleValuation({
      symbol:
        normalizedSymbol,

      bookValuePerShare,

      targetPriceToBookRatio,

      policy:
        normalizedPolicy
    });

  const freeCashFlowYield =
    buildFreeCashFlowYieldValuation({
      symbol:
        normalizedSymbol,

      freeCashFlowPerShare,

      targetFreeCashFlowYieldPercentage,

      policy:
        normalizedPolicy
    });

  const assetBased =
    buildAssetBasedValuation({
      symbol:
        normalizedSymbol,

      totalAssets,

      totalLiabilities,

      preferredEquity,

      intangibleAssets,

      sharesOutstanding,

      liquidationDiscountPercentage
    });

  const models = [
    dcf,
    dividendDiscount,
    graham,
    earningsMultiple,
    bookValueMultiple,
    freeCashFlowYield,
    assetBased
  ];

  const composite =
    buildCompositeFairValue({
      symbol:
        normalizedSymbol,

      modelResults:
        models,

      modelWeights,

      policy:
        normalizedPolicy
    });

  const classification =
    classifyValuation({
      currentPrice,

      fairValue:
        composite.fairValue
    });

  const priceLevels =
    buildValuationPriceLevels({
      fairValue:
        composite.fairValue,

      policy:
        normalizedPolicy
    });

  const confidence =
    calculateCompositeConfidence({
      composite,

      dataQualityScore
    });

  const current =
    positiveNumber(
      currentPrice
    );

  const fair =
    positiveNumber(
      composite.fairValue
    );

  const absoluteUpside =
    current !==
      null &&
    fair !==
      null
      ? fair -
        current
      : null;

  const marginOfSafetyAtCurrentPrice =
    current !==
      null &&
    fair !==
      null
      ? (
          (
            fair -
            current
          ) /
          fair
        ) *
        100
      : null;

  const warnings =
    models.flatMap(
      (model) =>
        safeArray(
          model?.warnings
        ).map(
          (warning) => ({
            ...warning,

            model:
              model.model
          })
        )
    );

  const status =
    !composite.available
      ? VALUATION_STATUSES
          .INSUFFICIENT_DATA
      : composite
          .modelCoveragePercentage <
        normalizedPolicy
          .minimumModelCoveragePercentage
        ? VALUATION_STATUSES
            .PARTIAL
        : composite.status;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalizedSymbol ||
      null,

    name:
      name ||
      normalizedSymbol ||
      "Unknown",

    sector:
      sector ||
      "Unknown",

    status,

    currentPrice:
      roundMoney(
        current
      ),

    fairValue:
      composite.fairValue,

    classification,

    confidence,

    upside: {
      absolute:
        roundMoney(
          absoluteUpside
        ),

      percentage:
        classification
          ?.upsidePercentage ??
        null,

      marginOfSafetyAtCurrentPrice:
        roundPercent(
          marginOfSafetyAtCurrentPrice
        )
    },

    priceLevels,

    composite,

    models: {
      discountedCashFlow:
        dcf,

      dividendDiscount,

      grahamNumber:
        graham,

      earningsMultiple,

      bookValueMultiple,

      freeCashFlowYield,

      assetBased
    },

    summary: {
      availableModels:
        composite
          ?.availableModels ||
        0,

      totalModels:
        composite
          ?.totalModels ||
        models.length,

      modelCoveragePercentage:
        composite
          ?.modelCoveragePercentage ||
        0,

      modelDispersionPercentage:
        composite
          ?.dispersionPercentage ??
        null,

      confidencePercentage:
        confidence.score,

      confidenceLevel:
        confidence
          ?.classification
          ?.label ||
        "Not Available",

      warningCount:
        warnings.length
    },

    warnings,

    assumptions: {
      policy:
        normalizedPolicy,

      modelWeights,

      dataQualityScore:
        nullableNumber(
          dataQualityScore
        )
    },

    message:
      buildStockValuationMessage({
        symbol:
          normalizedSymbol,

        currentPrice:
          current,

        fairValue:
          composite.fairValue,

        classification,

        confidence,

        composite
      }),

    advisoryOnly:
      true
  };
}

function buildStockValuationMessage({
  symbol,
  currentPrice,
  fairValue,
  classification,
  confidence,
  composite
}) {
  if (
    fairValue ===
      null ||
    fairValue ===
      undefined
  ) {
    return `${symbol || "The security"} could not be valued because sufficient fundamental data is unavailable.`;
  }

  const parts = [];

  parts.push(
    `${symbol || "The security"} has an estimated composite fair value of KES ${roundMoney(
      fairValue
    ).toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    )}.`
  );

  if (
    currentPrice !==
      null &&
    currentPrice !==
      undefined
  ) {
    parts.push(
      `The current price is KES ${roundMoney(
        currentPrice
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )}, resulting in a ${classification.label.toLowerCase()} classification.`
    );
  }

  parts.push(
    `Valuation confidence is ${confidence.classification.label.toLowerCase()} at ${confidence.score}%.`
  );

  parts.push(
    `${composite.availableModels} of ${composite.totalModels} valuation models were available.`
  );

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * BATCH VALUATION
 * ============================================================
 */

export function buildStockValuations({
  securities = [],
  inputBuilder = null,
  policy = {},
  modelWeights =
    DEFAULT_COMPOSITE_MODEL_WEIGHTS
} = {}) {
  const results =
    safeArray(
      securities
    ).map(
      (security) => {
        const additionalInputs =
          typeof inputBuilder ===
            "function"
            ? inputBuilder(
                security
              ) || {}
            : {};

        return buildStockValuation({
          ...security,

          ...additionalInputs,

          policy,

          modelWeights
        });
      }
    );

  const available =
    results.filter(
      (result) =>
        result.fairValue !==
          null &&
        result.fairValue !==
          undefined
    );

  const undervalued =
    results.filter(
      (result) =>
        [
          VALUATION_CLASSIFICATIONS
            .DEEPLY_UNDERVALUED,
          VALUATION_CLASSIFICATIONS
            .UNDERVALUED
        ].includes(
          result
            ?.classification
            ?.code
        )
    );

  const overvalued =
    results.filter(
      (result) =>
        [
          VALUATION_CLASSIFICATIONS
            .OVERVALUED,
          VALUATION_CLASSIFICATIONS
            .DEEPLY_OVERVALUED
        ].includes(
          result
            ?.classification
            ?.code
        )
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      results.length
        ? VALUATION_STATUSES
            .AVAILABLE
        : VALUATION_STATUSES
            .INSUFFICIENT_DATA,

    total:
      results.length,

    valued:
      available.length,

    notValued:
      results.length -
      available.length,

    undervalued:
      undervalued.length,

    overvalued:
      overvalued.length,

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

    results:
      results.sort(
        (
          first,
          second
        ) =>
          number(
            second
              ?.classification
              ?.upsidePercentage
          ) -
          number(
            first
              ?.classification
              ?.upsidePercentage
          )
      )
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadMostUndervaluedStocks(
  valuationResults = [],
  limit = 5
) {
  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    valuationResults
  )
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.classification
            ?.upsidePercentage
        ) !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second
            ?.classification
            ?.upsidePercentage
        ) -
        number(
          first
            ?.classification
            ?.upsidePercentage
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadMostOvervaluedStocks(
  valuationResults = [],
  limit = 5
) {
  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    valuationResults
  )
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.classification
            ?.upsidePercentage
        ) !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          first
            ?.classification
            ?.upsidePercentage
        ) -
        number(
          second
            ?.classification
            ?.upsidePercentage
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadHighestConfidenceValuations(
  valuationResults = [],
  limit = 5
) {
  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    valuationResults
  )
    .sort(
      (
        first,
        second
      ) =>
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
      safeLimit
    );
}

export function loadStocksBelowBuyPrice(
  valuationResults = []
) {
  return safeArray(
    valuationResults
  ).filter(
    (result) => {
      const currentPrice =
        nullableNumber(
          result
            ?.currentPrice
        );

      const buyUnder =
        nullableNumber(
          result
            ?.priceLevels
            ?.buyUnder
        );

      return (
        currentPrice !==
          null &&
        buyUnder !==
          null &&
        currentPrice <=
          buyUnder
      );
    }
  );
}

export function loadStocksAboveSellPrice(
  valuationResults = []
) {
  return safeArray(
    valuationResults
  ).filter(
    (result) => {
      const currentPrice =
        nullableNumber(
          result
            ?.currentPrice
        );

      const sellOver =
        nullableNumber(
          result
            ?.priceLevels
            ?.sellOver
        );

      return (
        currentPrice !==
          null &&
        sellOver !==
          null &&
        currentPrice >=
          sellOver
      );
    }
  );
}

export function buildValuationSummary(
  valuation
) {
  return {
    symbol:
      valuation?.symbol ||
      null,

    status:
      valuation?.status ||
      VALUATION_STATUSES
        .INSUFFICIENT_DATA,

    currentPrice:
      valuation
        ?.currentPrice ??
      null,

    fairValue:
      valuation
        ?.fairValue ??
      null,

    classification:
      valuation
        ?.classification
        ?.label ||
      "Not Rated",

    upsidePercentage:
      valuation
        ?.classification
        ?.upsidePercentage ??
      null,

    confidencePercentage:
      valuation
        ?.confidence
        ?.score ??
      0,

    confidence:
      valuation
        ?.confidence
        ?.classification
        ?.label ||
      "Not Available",

    strongBuyBelow:
      valuation
        ?.priceLevels
        ?.strongBuyBelow ??
      null,

    buyUnder:
      valuation
        ?.priceLevels
        ?.buyUnder ??
      null,

    fairValueLow:
      valuation
        ?.priceLevels
        ?.fairValueLow ??
      null,

    fairValueHigh:
      valuation
        ?.priceLevels
        ?.fairValueHigh ??
      null,

    sellOver:
      valuation
        ?.priceLevels
        ?.sellOver ??
      null,

    availableModels:
      valuation
        ?.summary
        ?.availableModels ||
      0,

    totalModels:
      valuation
        ?.summary
        ?.totalModels ||
      0,

    message:
      valuation?.message ||
      "No valuation summary is available."
  };
}
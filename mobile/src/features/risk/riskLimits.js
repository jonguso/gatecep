function number(value) {
  const parsed =
    Number(
      value ||
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

function roundPercent(value) {
  return Number(
    number(value).toFixed(4)
  );
}

export const RISK_LIMIT_KEYS = {
  MAXIMUM_SINGLE_HOLDING_PERCENTAGE:
    "maximumSingleHoldingPercentage",

  MAXIMUM_SECTOR_PERCENTAGE:
    "maximumSectorPercentage",

  MINIMUM_CASH_PERCENTAGE:
    "minimumCashPercentage",

  MAXIMUM_EQUITY_PERCENTAGE:
    "maximumEquityPercentage",

  TARGET_VOLATILITY_PERCENTAGE:
    "targetVolatilityPercentage",

  MAXIMUM_DRAWDOWN_PERCENTAGE:
    "maximumDrawdownPercentage",

  MINIMUM_HOLDINGS_COUNT:
    "minimumHoldingsCount",

  MAXIMUM_TOP_THREE_PERCENTAGE:
    "maximumTopThreePercentage",

  MAXIMUM_ILLIQUID_PERCENTAGE:
    "maximumIlliquidPercentage",

  MINIMUM_LIQUIDITY_COVERAGE_MONTHS:
    "minimumLiquidityCoverageMonths",

  ALERT_WARNING_THRESHOLD_PERCENTAGE:
    "alertWarningThresholdPercentage",

  ALERT_CRITICAL_THRESHOLD_PERCENTAGE:
    "alertCriticalThresholdPercentage"
};

export function normalizeRiskLimits(
  limits = {}
) {
  return {
    maximumSingleHoldingPercentage:
      roundPercent(
        clamp(
          limits
            ?.maximumSingleHoldingPercentage,
          0,
          100
        )
      ),

    maximumSectorPercentage:
      roundPercent(
        clamp(
          limits
            ?.maximumSectorPercentage,
          0,
          100
        )
      ),

    minimumCashPercentage:
      roundPercent(
        clamp(
          limits
            ?.minimumCashPercentage,
          0,
          100
        )
      ),

    maximumEquityPercentage:
      roundPercent(
        clamp(
          limits
            ?.maximumEquityPercentage,
          0,
          100
        )
      ),

    targetVolatilityPercentage:
      roundPercent(
        clamp(
          limits
            ?.targetVolatilityPercentage,
          0,
          100
        )
      ),

    maximumDrawdownPercentage:
      roundPercent(
        clamp(
          limits
            ?.maximumDrawdownPercentage,
          0,
          100
        )
      ),

    minimumHoldingsCount:
      Math.max(
        Math.floor(
          number(
            limits
              ?.minimumHoldingsCount
          )
        ),
        0
      ),

    maximumTopThreePercentage:
      roundPercent(
        clamp(
          limits
            ?.maximumTopThreePercentage,
          0,
          100
        )
      ),

    maximumIlliquidPercentage:
      roundPercent(
        clamp(
          limits
            ?.maximumIlliquidPercentage,
          0,
          100
        )
      ),

    minimumLiquidityCoverageMonths:
      Math.max(
        number(
          limits
            ?.minimumLiquidityCoverageMonths
        ),
        0
      ),

    alertWarningThresholdPercentage:
      roundPercent(
        clamp(
          limits
            ?.alertWarningThresholdPercentage,
          0,
          100
        )
      ),

    alertCriticalThresholdPercentage:
      roundPercent(
        clamp(
          limits
            ?.alertCriticalThresholdPercentage,
          0,
          100
        )
      )
  };
}

export function validateRiskLimits(
  limits = {}
) {
  const normalized =
    normalizeRiskLimits(
      limits
    );

  if (
    normalized
      .minimumCashPercentage >
    normalized
      .maximumEquityPercentage
  ) {
    throw new Error(
      "Minimum cash percentage cannot exceed maximum equity percentage."
    );
  }

  if (
    normalized
      .alertWarningThresholdPercentage >
    normalized
      .alertCriticalThresholdPercentage
  ) {
    throw new Error(
      "Warning threshold cannot exceed critical threshold."
    );
  }

  return normalized;
}

export function calculateLimitUsagePercentage({
  currentValue,
  limitValue
}) {
  const current =
    Math.abs(
      number(
        currentValue
      )
    );

  const limit =
    Math.abs(
      number(
        limitValue
      )
    );

  if (
    limit <= 0
  ) {
    return current > 0
      ? 100
      : 0;
  }

  return roundPercent(
    (
      current /
      limit
    ) *
    100
  );
}

export function classifyRiskLimitUsage({
  usagePercentage,
  warningThresholdPercentage = 80,
  criticalThresholdPercentage = 100
}) {
  const usage =
    number(
      usagePercentage
    );

  const warning =
    number(
      warningThresholdPercentage
    );

  const critical =
    number(
      criticalThresholdPercentage
    );

  if (
    usage >=
    critical
  ) {
    return "BREACHED";
  }

  if (
    usage >=
    warning
  ) {
    return "WARNING";
  }

  return "WITHIN_LIMIT";
}
/*
 * ============================================================
 * PC-023A4
 * DIVIDEND REINVESTMENT AND INCOME INTELLIGENCE ENGINE
 * ============================================================
 *
 * Determines:
 * - whether expected dividend income should be reinvested,
 * - whether dividends should remain in cash,
 * - which holdings are suitable for reinvestment,
 * - how dividend income affects portfolio income quality,
 * - whether portfolio income is concentrated,
 * - how much dividend income may be selectively redeployed.
 *
 * This engine is advisory only.
 * It does not execute reinvestments, place orders,
 * change cash balances, or modify portfolio holdings.
 * ============================================================
 */

export const DIVIDEND_REINVESTMENT_ACTIONS = {
  REINVEST:
    "REINVEST",

  SELECTIVE_REINVESTMENT:
    "SELECTIVE_REINVESTMENT",

  TAKE_CASH:
    "TAKE_CASH",

  MAINTAIN_RESERVE:
    "MAINTAIN_RESERVE",

  DEFER:
    "DEFER",

  NOT_AVAILABLE:
    "NOT_AVAILABLE"
};

export const DIVIDEND_INCOME_STATUSES = {
  AVAILABLE:
    "AVAILABLE",

  PARTIAL:
    "PARTIAL",

  NO_DIVIDEND_INCOME:
    "NO_DIVIDEND_INCOME",

  NO_ELIGIBLE_HOLDINGS:
    "NO_ELIGIBLE_HOLDINGS",

  RISK_RESTRICTED:
    "RISK_RESTRICTED",

  INSUFFICIENT_DATA:
    "INSUFFICIENT_DATA"
};

export const DIVIDEND_INCOME_QUALITY_LEVELS = {
  EXCELLENT:
    "EXCELLENT",

  STRONG:
    "STRONG",

  HEALTHY:
    "HEALTHY",

  MIXED:
    "MIXED",

  WEAK:
    "WEAK",

  POOR:
    "POOR",

  NOT_RATED:
    "NOT_RATED"
};

export const DIVIDEND_REINVESTMENT_METHODS = {
  SCORE_WEIGHTED:
    "SCORE_WEIGHTED",

  YIELD_WEIGHTED:
    "YIELD_WEIGHTED",

  QUALITY_WEIGHTED:
    "QUALITY_WEIGHTED",

  RISK_ADJUSTED:
    "RISK_ADJUSTED",

  EQUAL_WEIGHTED:
    "EQUAL_WEIGHTED"
};

export const DEFAULT_DIVIDEND_POLICY = {
  minimumReinvestmentAmount:
    1000,

  minimumDividendYieldPercentage:
    3,

  preferredDividendYieldPercentage:
    6,

  maximumDividendYieldPercentage:
    18,

  minimumConfidencePercentage:
    45,

  minimumIncomeScore:
    55,

  minimumInvestmentScore:
    55,

  maximumSingleHoldingAllocationPercentage:
    20,

  maximumSectorAllocationPercentage:
    35,

  minimumCashReservePercentage:
    8,

  preferredCashReservePercentage:
    12,

  maximumReinvestmentPercentage:
    100,

  defaultSelectiveReinvestmentPercentage:
    60
};

const ELIGIBLE_RATINGS = [
  "STRONG_BUY",
  "BUY",
  "ACCUMULATE",
  "HOLD"
];

const EXCLUDED_RATINGS = [
  "REDUCE",
  "SELL",
  "AVOID",
  "NOT_RATED"
];

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

function roundMoney(value) {
  return Number(
    number(value).toFixed(
      2
    )
  );
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(
      2
    )
  );
}

function roundMetric(
  value,
  decimals = 4
) {
  const parsed =
    nullableNumber(
      value
    );

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

function roundScore(value) {
  return Math.round(
    clamp(
      value,
      0,
      100
    )
  );
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

function normalizeSector(value) {
  const text =
    String(
      value ||
      "Unknown"
    ).trim();

  return text ||
    "Unknown";
}

function normalizeStatus(value) {
  return String(
    value || "UNKNOWN"
  )
    .trim()
    .toUpperCase();
}

function average(values = []) {
  const valid =
    safeArray(
      values
    )
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !==
          null
      );

  if (
    !valid.length
  ) {
    return null;
  }

  return (
    valid.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    valid.length
  );
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

function formatLabel(value) {
  return String(
    value || ""
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

/*
 * ============================================================
 * POLICY NORMALIZATION
 * ============================================================
 */

function normalizeDividendPolicy(
  policy = {}
) {
  return {
    minimumReinvestmentAmount:
      Math.max(
        number(
          policy
            ?.minimumReinvestmentAmount ??
          DEFAULT_DIVIDEND_POLICY
            .minimumReinvestmentAmount
        ),
        0
      ),

    minimumDividendYieldPercentage:
      Math.max(
        number(
          policy
            ?.minimumDividendYieldPercentage ??
          DEFAULT_DIVIDEND_POLICY
            .minimumDividendYieldPercentage
        ),
        0
      ),

    preferredDividendYieldPercentage:
      Math.max(
        number(
          policy
            ?.preferredDividendYieldPercentage ??
          DEFAULT_DIVIDEND_POLICY
            .preferredDividendYieldPercentage
        ),
        0
      ),

    maximumDividendYieldPercentage:
      Math.max(
        number(
          policy
            ?.maximumDividendYieldPercentage ??
          DEFAULT_DIVIDEND_POLICY
            .maximumDividendYieldPercentage
        ),
        0
      ),

    minimumConfidencePercentage:
      clamp(
        policy
          ?.minimumConfidencePercentage ??
        DEFAULT_DIVIDEND_POLICY
          .minimumConfidencePercentage,
        0,
        100
      ),

    minimumIncomeScore:
      clamp(
        policy
          ?.minimumIncomeScore ??
        DEFAULT_DIVIDEND_POLICY
          .minimumIncomeScore,
        0,
        100
      ),

    minimumInvestmentScore:
      clamp(
        policy
          ?.minimumInvestmentScore ??
        DEFAULT_DIVIDEND_POLICY
          .minimumInvestmentScore,
        0,
        100
      ),

    maximumSingleHoldingAllocationPercentage:
      clamp(
        policy
          ?.maximumSingleHoldingAllocationPercentage ??
        DEFAULT_DIVIDEND_POLICY
          .maximumSingleHoldingAllocationPercentage,
        0,
        100
      ),

    maximumSectorAllocationPercentage:
      clamp(
        policy
          ?.maximumSectorAllocationPercentage ??
        DEFAULT_DIVIDEND_POLICY
          .maximumSectorAllocationPercentage,
        0,
        100
      ),

    minimumCashReservePercentage:
      clamp(
        policy
          ?.minimumCashReservePercentage ??
        DEFAULT_DIVIDEND_POLICY
          .minimumCashReservePercentage,
        0,
        100
      ),

    preferredCashReservePercentage:
      clamp(
        policy
          ?.preferredCashReservePercentage ??
        DEFAULT_DIVIDEND_POLICY
          .preferredCashReservePercentage,
        0,
        100
      ),

    maximumReinvestmentPercentage:
      clamp(
        policy
          ?.maximumReinvestmentPercentage ??
        DEFAULT_DIVIDEND_POLICY
          .maximumReinvestmentPercentage,
        0,
        100
      ),

    defaultSelectiveReinvestmentPercentage:
      clamp(
        policy
          ?.defaultSelectiveReinvestmentPercentage ??
        DEFAULT_DIVIDEND_POLICY
          .defaultSelectiveReinvestmentPercentage,
        0,
        100
      )
  };
}

/*
 * ============================================================
 * DIVIDEND RECORD NORMALIZATION
 * ============================================================
 */

function normalizeDividendRecord(
  record = {}
) {
  const grossAmount =
    nullableNumber(
      record?.grossAmount
    ) ??
    nullableNumber(
      record?.expectedGrossAmount
    ) ??
    nullableNumber(
      record?.estimatedGrossAmount
    ) ??
    nullableNumber(
      record?.amount
    ) ??
    0;

  const withholdingTax =
    nullableNumber(
      record?.withholdingTax
    ) ??
    nullableNumber(
      record?.taxAmount
    ) ??
    0;

  const netAmount =
    nullableNumber(
      record?.netAmount
    ) ??
    nullableNumber(
      record?.expectedNetAmount
    ) ??
    (
      grossAmount -
      withholdingTax
    );

  return {
    id:
      record?.id ||
      null,

    symbol:
      normalizeSymbol(
        record?.symbol
      ),

    name:
      record?.name ||
      record?.companyName ||
      record?.symbol ||
      "Unknown",

    sector:
      normalizeSector(
        record?.sector
      ),

    dividendPerShare:
      nullableNumber(
        record?.dividendPerShare
      ),

    quantity:
      nullableNumber(
        record?.quantity
      ),

    grossAmount:
      roundMoney(
        grossAmount
      ),

    withholdingTax:
      roundMoney(
        withholdingTax
      ),

    netAmount:
      roundMoney(
        netAmount
      ),

    dividendYieldPercentage:
      nullableNumber(
        record?.dividendYieldPercentage
      ) ??
      nullableNumber(
        record?.yieldPercentage
      ),

    paymentDate:
      record?.paymentDate ||
      record?.payableDate ||
      null,

    recordDate:
      record?.recordDate ||
      null,

    exDividendDate:
      record?.exDividendDate ||
      null,

    status:
      normalizeStatus(
        record?.status ||
        "FORECAST"
      ),

    source:
      record?.source ||
      "DIVIDEND_FORECAST"
  };
}

/*
 * ============================================================
 * INCOME PORTFOLIO ANALYSIS
 * ============================================================
 */

export function buildDividendIncomeAnalysis({
  dividendRecords = [],
  portfolioValue = 0,
  holdings = []
} = {}) {
  const records =
    safeArray(
      dividendRecords
    )
      .map(
        normalizeDividendRecord
      )
      .filter(
        (record) =>
          record.netAmount >
          0
      );

  const totalGrossIncome =
    roundMoney(
      sum(
        records.map(
          (record) =>
            record.grossAmount
        )
      )
    );

  const totalTax =
    roundMoney(
      sum(
        records.map(
          (record) =>
            record.withholdingTax
        )
      )
    );

  const totalNetIncome =
    roundMoney(
      sum(
        records.map(
          (record) =>
            record.netAmount
        )
      )
    );

  const safePortfolioValue =
    Math.max(
      number(
        portfolioValue
      ),
      0
    );

  const portfolioYieldPercentage =
    safePortfolioValue > 0
      ? roundPercent(
          (
            totalNetIncome /
            safePortfolioValue
          ) *
          100
        )
      : null;

  const holdingMap =
    new Map();

  safeArray(
    holdings
  ).forEach(
    (holding) => {
      const symbol =
        normalizeSymbol(
          holding?.symbol
        );

      if (
        symbol
      ) {
        holdingMap.set(
          symbol,
          holding
        );
      }
    }
  );

  const incomeByHolding =
    records.map(
      (record) => {
        const holding =
          holdingMap.get(
            record.symbol
          ) ||
          {};

        const sharePercentage =
          totalNetIncome > 0
            ? (
                record.netAmount /
                totalNetIncome
              ) *
              100
            : 0;

        return {
          ...record,

          allocationPercentage:
            nullableNumber(
              holding
                ?.allocationPercentage
            ),

          marketValue:
            nullableNumber(
              holding
                ?.marketValue ??
              holding
                ?.value
            ),

          investmentScore:
            nullableNumber(
              holding
                ?.score ??
              holding
                ?.investmentScore
            ),

          incomeScore:
            nullableNumber(
              holding
                ?.incomeScore
            ),

          recommendation:
            holding
              ?.rating
              ?.code ||
            holding?.action ||
            null,

          confidencePercentage:
            nullableNumber(
              holding
                ?.confidencePercentage
            ),

          riskStatus:
            holding
              ?.riskStatus ||
            holding
              ?.concentrationStatus ||
            null,

          incomeSharePercentage:
            roundPercent(
              sharePercentage
            )
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        second.netAmount -
        first.netAmount
    );

  const sectorMap =
    new Map();

  incomeByHolding.forEach(
    (record) => {
      const sector =
        normalizeSector(
          record.sector
        );

      const current =
        sectorMap.get(
          sector
        ) || {
          sector,
          incomeAmount: 0,
          records: 0,
          symbols: []
        };

      current.incomeAmount +=
        record.netAmount;

      current.records +=
        1;

      if (
        record.symbol &&
        !current.symbols.includes(
          record.symbol
        )
      ) {
        current.symbols.push(
          record.symbol
        );
      }

      sectorMap.set(
        sector,
        current
      );
    }
  );

  const incomeBySector =
    Array.from(
      sectorMap.values()
    )
      .map(
        (sector) => ({
          sector:
            sector.sector,

          incomeAmount:
            roundMoney(
              sector.incomeAmount
            ),

          incomeSharePercentage:
            totalNetIncome > 0
              ? roundPercent(
                  (
                    sector.incomeAmount /
                    totalNetIncome
                  ) *
                  100
                )
              : 0,

          records:
            sector.records,

          symbols:
            sector.symbols
              .sort()
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          second.incomeAmount -
          first.incomeAmount
      );

  const largestHoldingIncomeShare =
    incomeByHolding[0]
      ?.incomeSharePercentage ??
    0;

  const largestSectorIncomeShare =
    incomeBySector[0]
      ?.incomeSharePercentage ??
    0;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      totalNetIncome > 0
        ? DIVIDEND_INCOME_STATUSES
            .AVAILABLE
        : DIVIDEND_INCOME_STATUSES
            .NO_DIVIDEND_INCOME,

    portfolioValue:
      roundMoney(
        safePortfolioValue
      ),

    totalGrossIncome,

    totalTax,

    totalNetIncome,

    portfolioYieldPercentage,

    records:
      records.length,

    payingHoldings:
      incomeByHolding.length,

    payingSectors:
      incomeBySector.length,

    largestHoldingIncomeShare:
      roundPercent(
        largestHoldingIncomeShare
      ),

    largestSectorIncomeShare:
      roundPercent(
        largestSectorIncomeShare
      ),

    incomeByHolding,

    incomeBySector
  };
}

/*
 * ============================================================
 * INCOME QUALITY SCORE
 * ============================================================
 */

function scorePortfolioDividendYield(
  value
) {
  const yieldPercentage =
    nullableNumber(
      value
    );

  if (
    yieldPercentage ===
    null
  ) {
    return null;
  }

  if (
    yieldPercentage >= 6 &&
    yieldPercentage <= 12
  ) {
    return 100;
  }

  if (
    yieldPercentage >= 4 &&
    yieldPercentage < 6
  ) {
    return 85;
  }

  if (
    yieldPercentage >= 2 &&
    yieldPercentage < 4
  ) {
    return 70;
  }

  if (
    yieldPercentage > 12 &&
    yieldPercentage <= 18
  ) {
    return 65;
  }

  if (
    yieldPercentage > 18
  ) {
    return 40;
  }

  if (
    yieldPercentage > 0
  ) {
    return 50;
  }

  return 20;
}

function scoreIncomeConcentration(
  largestIncomeShare
) {
  const share =
    nullableNumber(
      largestIncomeShare
    );

  if (
    share ===
    null
  ) {
    return null;
  }

  if (
    share <= 25
  ) {
    return 100;
  }

  if (
    share <= 35
  ) {
    return 85;
  }

  if (
    share <= 50
  ) {
    return 65;
  }

  if (
    share <= 70
  ) {
    return 40;
  }

  return 20;
}

function scoreIncomeDiversification({
  payingHoldings,
  payingSectors
}) {
  const holdings =
    number(
      payingHoldings
    );

  const sectors =
    number(
      payingSectors
    );

  const holdingScore =
    holdings >= 8
      ? 100
      : holdings >= 5
        ? 85
        : holdings >= 3
          ? 70
          : holdings >= 2
            ? 55
            : holdings >= 1
              ? 35
              : 0;

  const sectorScore =
    sectors >= 5
      ? 100
      : sectors >= 4
        ? 85
        : sectors >= 3
          ? 70
          : sectors >= 2
            ? 55
            : sectors >= 1
              ? 35
              : 0;

  return roundScore(
    (
      holdingScore *
      0.6
    ) +
    (
      sectorScore *
      0.4
    )
  );
}

export function classifyDividendIncomeQuality(
  score
) {
  const value =
    nullableNumber(
      score
    );

  if (
    value ===
    null
  ) {
    return {
      code:
        DIVIDEND_INCOME_QUALITY_LEVELS
          .NOT_RATED,

      label:
        "Not Rated",

      description:
        "Insufficient dividend evidence is available."
    };
  }

  if (
    value >= 90
  ) {
    return {
      code:
        DIVIDEND_INCOME_QUALITY_LEVELS
          .EXCELLENT,

      label:
        "Excellent",

      description:
        "Portfolio income is strong, diversified, and supported by high-quality dividend holdings."
    };
  }

  if (
    value >= 80
  ) {
    return {
      code:
        DIVIDEND_INCOME_QUALITY_LEVELS
          .STRONG,

      label:
        "Strong",

      description:
        "Portfolio income is attractive with limited concentration concerns."
    };
  }

  if (
    value >= 70
  ) {
    return {
      code:
        DIVIDEND_INCOME_QUALITY_LEVELS
          .HEALTHY,

      label:
        "Healthy",

      description:
        "Portfolio income is generally healthy but has areas requiring monitoring."
    };
  }

  if (
    value >= 55
  ) {
    return {
      code:
        DIVIDEND_INCOME_QUALITY_LEVELS
          .MIXED,

      label:
        "Mixed",

      description:
        "Portfolio income quality is mixed and requires selective review."
    };
  }

  if (
    value >= 40
  ) {
    return {
      code:
        DIVIDEND_INCOME_QUALITY_LEVELS
          .WEAK,

      label:
        "Weak",

      description:
        "Portfolio income is weak or overly concentrated."
    };
  }

  return {
    code:
      DIVIDEND_INCOME_QUALITY_LEVELS
        .POOR,

    label:
      "Poor",

    description:
      "Portfolio income lacks sufficient quality, diversification, or sustainability."
  };
}

export function buildDividendIncomeQualityScore({
  incomeAnalysis,
  dividendConsistencyScore = null,
  payoutSustainabilityScore = null,
  dividendGrowthScore = null,
  paymentReliabilityScore = null,
  averageInvestmentScore = null
} = {}) {
  const components = [
    {
      code:
        "PORTFOLIO_YIELD",

      value:
        scorePortfolioDividendYield(
          incomeAnalysis
            ?.portfolioYieldPercentage
        ),

      weight:
        0.2
    },
    {
      code:
        "HOLDING_CONCENTRATION",

      value:
        scoreIncomeConcentration(
          incomeAnalysis
            ?.largestHoldingIncomeShare
        ),

      weight:
        0.15
    },
    {
      code:
        "SECTOR_CONCENTRATION",

      value:
        scoreIncomeConcentration(
          incomeAnalysis
            ?.largestSectorIncomeShare
        ),

      weight:
        0.1
    },
    {
      code:
        "INCOME_DIVERSIFICATION",

      value:
        scoreIncomeDiversification({
          payingHoldings:
            incomeAnalysis
              ?.payingHoldings,

          payingSectors:
            incomeAnalysis
              ?.payingSectors
        }),

      weight:
        0.15
    },
    {
      code:
        "DIVIDEND_CONSISTENCY",

      value:
        nullableNumber(
          dividendConsistencyScore
        ),

      weight:
        0.12
    },
    {
      code:
        "PAYOUT_SUSTAINABILITY",

      value:
        nullableNumber(
          payoutSustainabilityScore
        ),

      weight:
        0.12
    },
    {
      code:
        "DIVIDEND_GROWTH",

      value:
        nullableNumber(
          dividendGrowthScore
        ),

      weight:
        0.06
    },
    {
      code:
        "PAYMENT_RELIABILITY",

      value:
        nullableNumber(
          paymentReliabilityScore
        ),

      weight:
        0.05
    },
    {
      code:
        "INVESTMENT_QUALITY",

      value:
        nullableNumber(
          averageInvestmentScore
        ),

      weight:
        0.05
    }
  ];

  const available =
    components.filter(
      (component) =>
        component.value !==
        null &&
        component.value !==
        undefined
    );

  const totalWeight =
    sum(
      available.map(
        (component) =>
          component.weight
      )
    );

  const score =
    totalWeight > 0
      ? sum(
          available.map(
            (component) =>
              number(
                component.value
              ) *
              component.weight
          )
        ) /
        totalWeight
      : null;

  return {
    status:
      score ===
      null
        ? "INSUFFICIENT_DATA"
        : "AVAILABLE",

    score:
      score ===
      null
        ? null
        : roundScore(
            score
          ),

    classification:
      classifyDividendIncomeQuality(
        score
      ),

    availableComponents:
      available.length,

    totalComponents:
      components.length,

    availableWeightPercentage:
      roundPercent(
        totalWeight *
        100
      ),

    components:
      components.map(
        (component) => ({
          ...component,

          available:
            component.value !==
              null &&
            component.value !==
              undefined,

          value:
            component.value ===
              null ||
            component.value ===
              undefined
              ? null
              : roundScore(
                  component.value
                )
        })
      )
  };
}

/*
 * ============================================================
 * HOLDING ELIGIBILITY
 * ============================================================
 */

function evaluateDividendReinvestmentEligibility({
  holding,
  policy
}) {
  const symbol =
    normalizeSymbol(
      holding?.symbol
    );

  const rating =
    normalizeStatus(
      holding
        ?.rating
        ?.code ||
      holding?.recommendation ||
      holding?.action
    );

  const yieldPercentage =
    nullableNumber(
      holding
        ?.dividendYieldPercentage
    );

  const incomeScore =
    nullableNumber(
      holding?.incomeScore
    );

  const investmentScore =
    nullableNumber(
      holding
        ?.investmentScore ??
      holding?.score
    );

  const confidence =
    nullableNumber(
      holding
        ?.confidencePercentage
    ) ??
    0;

  const allocation =
    nullableNumber(
      holding
        ?.allocationPercentage
    ) ??
    0;

  const sectorAllocation =
    nullableNumber(
      holding
        ?.sectorAllocationPercentage
    ) ??
    0;

  const riskStatus =
    normalizeStatus(
      holding
        ?.riskStatus ||
      holding
        ?.concentrationStatus
    );

  const reasons = [];

  if (
    !ELIGIBLE_RATINGS.includes(
      rating
    )
  ) {
    reasons.push(
      `Rating ${formatLabel(
        rating
      )} is not eligible for dividend reinvestment.`
    );
  }

  if (
    EXCLUDED_RATINGS.includes(
      rating
    )
  ) {
    reasons.push(
      "The investment recommendation excludes additional capital."
    );
  }

  if (
    yieldPercentage ===
      null ||
    yieldPercentage <
      policy
        .minimumDividendYieldPercentage
  ) {
    reasons.push(
      "Dividend yield is below the configured minimum."
    );
  }

  if (
    yieldPercentage !==
      null &&
    yieldPercentage >
      policy
        .maximumDividendYieldPercentage
  ) {
    reasons.push(
      "Dividend yield is unusually high and may require a sustainability review."
    );
  }

  if (
    incomeScore !==
      null &&
    incomeScore <
      policy
        .minimumIncomeScore
  ) {
    reasons.push(
      "The holding income score is below the configured minimum."
    );
  }

  if (
    investmentScore !==
      null &&
    investmentScore <
      policy
        .minimumInvestmentScore
  ) {
    reasons.push(
      "The holding investment score is below the configured minimum."
    );
  }

  if (
    confidence <
    policy
      .minimumConfidencePercentage
  ) {
    reasons.push(
      "Recommendation confidence is below the configured minimum."
    );
  }

  if (
    allocation >=
    policy
      .maximumSingleHoldingAllocationPercentage
  ) {
    reasons.push(
      "The holding is already at or above the maximum allocation."
    );
  }

  if (
    sectorAllocation >=
    policy
      .maximumSectorAllocationPercentage
  ) {
    reasons.push(
      "The sector is already at or above the maximum allocation."
    );
  }

  if (
    [
      "BREACHED",
      "LIMIT_BREACH",
      "CRITICAL"
    ].includes(
      riskStatus
    )
  ) {
    reasons.push(
      "The holding or sector has breached a configured risk limit."
    );
  }

  return {
    symbol,

    eligible:
      reasons.length ===
      0,

    reasons
  };
}

/*
 * ============================================================
 * REINVESTMENT WEIGHT
 * ============================================================
 */

function calculateDividendReinvestmentWeight({
  holding,
  method
}) {
  const score =
    number(
      holding
        ?.investmentScore ??
      holding?.score
    );

  const incomeScore =
    number(
      holding?.incomeScore
    );

  const yieldPercentage =
    number(
      holding
        ?.dividendYieldPercentage
    );

  const confidence =
    number(
      holding
        ?.confidencePercentage
    );

  const riskAdjustedScore =
    number(
      holding
        ?.riskAdjustedScore ??
      score
    );

  switch (
    method
  ) {
    case DIVIDEND_REINVESTMENT_METHODS
      .EQUAL_WEIGHTED:
      return 1;

    case DIVIDEND_REINVESTMENT_METHODS
      .YIELD_WEIGHTED:
      return Math.max(
        yieldPercentage,
        1
      );

    case DIVIDEND_REINVESTMENT_METHODS
      .QUALITY_WEIGHTED:
      return Math.max(
        (
          score *
          0.45
        ) +
        (
          incomeScore *
          0.4
        ) +
        (
          confidence *
          0.15
        ),
        1
      );

    case DIVIDEND_REINVESTMENT_METHODS
      .RISK_ADJUSTED:
      return Math.max(
        (
          score *
          0.3
        ) +
        (
          incomeScore *
          0.25
        ) +
        (
          riskAdjustedScore *
          0.25
        ) +
        (
          confidence *
          0.1
        ) +
        (
          Math.min(
            yieldPercentage *
            5,
            100
          ) *
          0.1
        ),
        1
      );

    case DIVIDEND_REINVESTMENT_METHODS
      .SCORE_WEIGHTED:
    default:
      return Math.max(
        (
          score *
          0.6
        ) +
        (
          incomeScore *
          0.25
        ) +
        (
          confidence *
          0.15
        ),
        1
      );
  }
}

/*
 * ============================================================
 * REINVESTMENT PLAN
 * ============================================================
 */

export function buildDividendReinvestmentPlan({
  dividendIncome = 0,
  holdings = [],
  reinvestmentPercentage = 100,
  method =
    DIVIDEND_REINVESTMENT_METHODS
      .RISK_ADJUSTED,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizeDividendPolicy(
      policy
    );

  const income =
    Math.max(
      number(
        dividendIncome
      ),
      0
    );

  const percentage =
    clamp(
      reinvestmentPercentage,
      0,
      normalizedPolicy
        .maximumReinvestmentPercentage
    );

  const reinvestmentAmount =
    roundMoney(
      income *
      (
        percentage /
        100
      )
    );

  const eligible = [];
  const excluded = [];

  safeArray(
    holdings
  ).forEach(
    (holding) => {
      const evaluation =
        evaluateDividendReinvestmentEligibility({
          holding,
          policy:
            normalizedPolicy
        });

      if (
        evaluation.eligible
      ) {
        eligible.push({
          holding,

          weight:
            calculateDividendReinvestmentWeight({
              holding,
              method
            })
        });
      } else {
        excluded.push({
          symbol:
            evaluation.symbol,

          reasons:
            evaluation.reasons,

          holding
        });
      }
    }
  );

  if (
    income <= 0
  ) {
    return {
      status:
        DIVIDEND_INCOME_STATUSES
          .NO_DIVIDEND_INCOME,

      method,

      totalDividendIncome:
        0,

      reinvestmentPercentage:
        0,

      reinvestmentAmount:
        0,

      cashRetained:
        0,

      allocations:
        [],

      excluded
    };
  }

  if (
    reinvestmentAmount <
    normalizedPolicy
      .minimumReinvestmentAmount
  ) {
    return {
      status:
        DIVIDEND_INCOME_STATUSES
          .PARTIAL,

      method,

      totalDividendIncome:
        roundMoney(
          income
        ),

      reinvestmentPercentage:
        roundPercent(
          percentage
        ),

      reinvestmentAmount:
        0,

      cashRetained:
        roundMoney(
          income
        ),

      allocations:
        [],

      excluded,

      message:
        "Expected dividend income is below the minimum reinvestment amount."
    };
  }

  if (
    !eligible.length
  ) {
    return {
      status:
        DIVIDEND_INCOME_STATUSES
          .NO_ELIGIBLE_HOLDINGS,

      method,

      totalDividendIncome:
        roundMoney(
          income
        ),

      reinvestmentPercentage:
        roundPercent(
          percentage
        ),

      reinvestmentAmount:
        0,

      cashRetained:
        roundMoney(
          income
        ),

      allocations:
        [],

      excluded
    };
  }

  const totalWeight =
    sum(
      eligible.map(
        (item) =>
          item.weight
      )
    );

  const allocations =
    eligible.map(
      (item) => {
        const holding =
          item.holding;

        const amount =
          totalWeight > 0
            ? reinvestmentAmount *
              (
                item.weight /
                totalWeight
              )
            : reinvestmentAmount /
              eligible.length;

        const marketPrice =
          nullableNumber(
            holding
              ?.marketPrice ??
            holding?.price
          );

        const estimatedShares =
          marketPrice !==
            null &&
          marketPrice >
            0
            ? amount /
              marketPrice
            : null;

        return {
          symbol:
            normalizeSymbol(
              holding?.symbol
            ),

          name:
            holding?.name ||
            holding
              ?.companyName ||
            holding?.symbol ||
            "Unknown",

          sector:
            normalizeSector(
              holding?.sector
            ),

          rating:
            holding?.rating ||
            null,

          investmentScore:
            nullableNumber(
              holding
                ?.investmentScore ??
              holding?.score
            ),

          incomeScore:
            nullableNumber(
              holding
                ?.incomeScore
            ),

          dividendYieldPercentage:
            nullableNumber(
              holding
                ?.dividendYieldPercentage
            ),

          confidencePercentage:
            nullableNumber(
              holding
                ?.confidencePercentage
            ),

          currentAllocationPercentage:
            nullableNumber(
              holding
                ?.allocationPercentage
            ),

          marketPrice:
            marketPrice ===
              null
              ? null
              : roundMoney(
                  marketPrice
                ),

          allocationAmount:
            roundMoney(
              amount
            ),

          allocationPercentage:
            reinvestmentAmount > 0
              ? roundPercent(
                  (
                    amount /
                    reinvestmentAmount
                  ) *
                  100
                )
              : 0,

          estimatedShares:
            estimatedShares ===
              null
              ? null
              : roundMetric(
                  estimatedShares,
                  6
                ),

          advisoryOnly:
            true
        };
      }
    );

  const allocatedAmount =
    roundMoney(
      sum(
        allocations.map(
          (allocation) =>
            allocation.allocationAmount
        )
      )
    );

  const residual =
    roundMoney(
      reinvestmentAmount -
      allocatedAmount
    );

  if (
    allocations.length &&
    residual !== 0
  ) {
    allocations[0] = {
      ...allocations[0],

      allocationAmount:
        roundMoney(
          allocations[0]
            .allocationAmount +
          residual
        )
    };
  }

  const finalAllocated =
    roundMoney(
      sum(
        allocations.map(
          (allocation) =>
            allocation.allocationAmount
        )
      )
    );

  return {
    status:
      DIVIDEND_INCOME_STATUSES
        .AVAILABLE,

    method,

    totalDividendIncome:
      roundMoney(
        income
      ),

    reinvestmentPercentage:
      roundPercent(
        percentage
      ),

    reinvestmentAmount:
      finalAllocated,

    cashRetained:
      roundMoney(
        Math.max(
          income -
          finalAllocated,
          0
        )
      ),

    eligibleHoldings:
      eligible.length,

    excludedHoldings:
      excluded.length,

    allocations:
      allocations.sort(
        (
          first,
          second
        ) =>
          second
            .allocationAmount -
          first
            .allocationAmount
      ),

    excluded
  };
}

/*
 * ============================================================
 * REINVESTMENT READINESS
 * ============================================================
 */

export function calculateDividendReinvestmentReadiness({
  incomeAnalysis,
  incomeQualityScore = null,
  portfolioHealthScore = null,
  riskScore = null,
  liquidityScore = null,
  availableCashPercentage = null,
  eligibleHoldings = 0,
  criticalActions = 0,
  highPriorityActions = 0,
  brokerReconciliationStatus = null
} = {}) {
  const components = [];

  const netIncome =
    number(
      incomeAnalysis
        ?.totalNetIncome
    );

  components.push({
    code:
      "DIVIDEND_INCOME",

    score:
      netIncome >= 100000
        ? 100
        : netIncome >= 50000
          ? 90
          : netIncome >= 10000
            ? 75
            : netIncome >= 1000
              ? 60
              : netIncome > 0
                ? 40
                : 0,

    weight:
      0.2
  });

  [
    {
      code:
        "INCOME_QUALITY",

      score:
        nullableNumber(
          incomeQualityScore
        ),

      weight:
        0.22
    },
    {
      code:
        "PORTFOLIO_HEALTH",

      score:
        nullableNumber(
          portfolioHealthScore
        ),

      weight:
        0.15
    },
    {
      code:
        "RISK",

      score:
        nullableNumber(
          riskScore
        ),

      weight:
        0.15
    },
    {
      code:
        "LIQUIDITY",

      score:
        nullableNumber(
          liquidityScore
        ),

      weight:
        0.08
    }
  ].forEach(
    (component) => {
      if (
        component.score !==
        null
      ) {
        components.push(
          component
        );
      }
    }
  );

  const opportunityScore =
    eligibleHoldings >= 5
      ? 100
      : eligibleHoldings >= 3
        ? 85
        : eligibleHoldings >= 1
          ? 65
          : 10;

  components.push({
    code:
      "ELIGIBLE_HOLDINGS",

    score:
      opportunityScore,

    weight:
      0.12
  });

  const cashReserveScore =
    nullableNumber(
      availableCashPercentage
    ) ===
    null
      ? null
      : number(
          availableCashPercentage
        ) >= 12
        ? 100
        : number(
            availableCashPercentage
          ) >= 8
          ? 80
          : number(
              availableCashPercentage
            ) >= 5
            ? 55
            : 30;

  if (
    cashReserveScore !==
    null
  ) {
    components.push({
      code:
        "CASH_RESERVE",

      score:
        cashReserveScore,

      weight:
        0.08
    });
  }

  const availableWeight =
    sum(
      components.map(
        (component) =>
          component.weight
      )
    );

  const weightedScore =
    availableWeight > 0
      ? sum(
          components.map(
            (component) =>
              component.score *
              component.weight
          )
        ) /
        availableWeight
      : 0;

  let adjustedScore =
    weightedScore;

  const adjustments = [];

  if (
    criticalActions > 0
  ) {
    adjustedScore -=
      30;

    adjustments.push({
      code:
        "CRITICAL_ACTION_RESTRICTION",

      points:
        -30,

      message:
        "Critical executive actions restrict dividend reinvestment."
    });
  } else if (
    highPriorityActions > 0
  ) {
    const deduction =
      Math.min(
        highPriorityActions *
        6,
        18
      );

    adjustedScore -=
      deduction;

    adjustments.push({
      code:
        "HIGH_ACTION_RESTRICTION",

      points:
        -deduction,

      message:
        `${highPriorityActions} high-priority action(s) reduced reinvestment readiness.`
    });
  }

  const reconciliation =
    normalizeStatus(
      brokerReconciliationStatus
    );

  if (
    reconciliation ===
    "OUT_OF_SYNC"
  ) {
    adjustedScore -=
      20;

    adjustments.push({
      code:
        "BROKER_OUT_OF_SYNC",

      points:
        -20,

      message:
        "Broker reconciliation should be completed before reinvestment."
    });
  } else if (
    reconciliation ===
    "PARTIAL_MATCH"
  ) {
    adjustedScore -=
      10;

    adjustments.push({
      code:
        "BROKER_PARTIAL_MATCH",

      points:
        -10,

      message:
        "Incomplete broker reconciliation reduced reinvestment readiness."
    });
  }

  if (
    nullableNumber(
      riskScore
    ) !==
      null &&
    number(
      riskScore
    ) <
      40
  ) {
    adjustedScore -=
      20;

    adjustments.push({
      code:
        "LOW_RISK_SCORE",

      points:
        -20,

      message:
        "Portfolio risk is too high for unrestricted dividend reinvestment."
    });
  }

  return {
    score:
      roundScore(
        adjustedScore
      ),

    availableWeightPercentage:
      roundPercent(
        availableWeight *
        100
      ),

    components,

    adjustments
  };
}

/*
 * ============================================================
 * REINVESTMENT ACTION
 * ============================================================
 */

export function classifyDividendReinvestmentAction({
  readinessScore,
  totalDividendIncome,
  eligibleHoldings,
  incomeQualityScore = null,
  cashReservePercentage = null,
  criticalActions = 0,
  riskScore = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizeDividendPolicy(
      policy
    );

  const readiness =
    number(
      readinessScore
    );

  const income =
    number(
      totalDividendIncome
    );

  const quality =
    nullableNumber(
      incomeQualityScore
    );

  const cashPercentage =
    nullableNumber(
      cashReservePercentage
    );

  const risk =
    nullableNumber(
      riskScore
    );

  if (
    income <= 0
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .NOT_AVAILABLE,

      label:
        "Not Available",

      description:
        "No dividend income is available for reinvestment."
    };
  }

  if (
    criticalActions > 0 ||
    (
      risk !==
        null &&
      risk <
        35
    )
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .DEFER,

      label:
        "Defer Reinvestment",

      description:
        "Dividend reinvestment should be deferred until critical portfolio risks are reviewed."
    };
  }

  if (
    cashPercentage !==
      null &&
    cashPercentage <
      normalizedPolicy
        .minimumCashReservePercentage
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .TAKE_CASH,

      label:
        "Take Cash",

      description:
        "Retain dividend income as cash to rebuild the portfolio reserve."
    };
  }

  if (
    eligibleHoldings <= 0
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .MAINTAIN_RESERVE,

      label:
        "Maintain Reserve",

      description:
        "No suitable holding currently qualifies for dividend reinvestment."
    };
  }

  if (
    readiness >= 80 &&
    quality !==
      null &&
    quality >= 75
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .REINVEST,

      label:
        "Reinvest",

      description:
        "Income quality and portfolio conditions support reinvestment."
    };
  }

  if (
    readiness >= 55
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .SELECTIVE_REINVESTMENT,

      label:
        "Selective Reinvestment",

      description:
        "Reinvest only into the strongest eligible dividend holdings."
    };
  }

  if (
    readiness >= 35
  ) {
    return {
      code:
        DIVIDEND_REINVESTMENT_ACTIONS
          .MAINTAIN_RESERVE,

      label:
        "Maintain Reserve",

      description:
        "Retain dividend income until portfolio conditions improve."
    };
  }

  return {
    code:
      DIVIDEND_REINVESTMENT_ACTIONS
        .TAKE_CASH,

    label:
      "Take Cash",

    description:
      "Current risk and income conditions do not support reinvestment."
  };
}

/*
 * ============================================================
 * DIVIDEND REINVESTMENT ADVICE
 * ============================================================
 */

export function buildDividendReinvestmentAdvice({
  dividendRecords = [],
  holdings = [],
  portfolioValue = 0,
  availableCash = 0,
  portfolioHealthScore = null,
  riskScore = null,
  liquidityScore = null,
  dividendConsistencyScore = null,
  payoutSustainabilityScore = null,
  dividendGrowthScore = null,
  paymentReliabilityScore = null,
  highPriorityActions = 0,
  criticalActions = 0,
  brokerReconciliationStatus = null,
  method =
    DIVIDEND_REINVESTMENT_METHODS
      .RISK_ADJUSTED,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizeDividendPolicy(
      policy
    );

  const incomeAnalysis =
    buildDividendIncomeAnalysis({
      dividendRecords,
      portfolioValue,
      holdings
    });

  const scoredHoldings =
    safeArray(
      holdings
    )
      .filter(
        (holding) =>
          nullableNumber(
            holding
              ?.investmentScore ??
            holding?.score
          ) !==
          null
      );

  const averageInvestmentScore =
    average(
      scoredHoldings.map(
        (holding) =>
          holding
            ?.investmentScore ??
          holding?.score
      )
    );

  const incomeQuality =
    buildDividendIncomeQualityScore({
      incomeAnalysis,
      dividendConsistencyScore,
      payoutSustainabilityScore,
      dividendGrowthScore,
      paymentReliabilityScore,
      averageInvestmentScore
    });

  const eligibility =
    safeArray(
      holdings
    ).map(
      (holding) => ({
        holding,

        evaluation:
          evaluateDividendReinvestmentEligibility({
            holding,
            policy:
              normalizedPolicy
          })
      })
    );

  const eligibleHoldings =
    eligibility.filter(
      (item) =>
        item
          .evaluation
          .eligible
    ).length;

  const cashReservePercentage =
    number(
      portfolioValue
    ) > 0
      ? (
          number(
            availableCash
          ) /
          number(
            portfolioValue
          )
        ) *
        100
      : null;

  const readiness =
    calculateDividendReinvestmentReadiness({
      incomeAnalysis,

      incomeQualityScore:
        incomeQuality.score,

      portfolioHealthScore,

      riskScore,

      liquidityScore,

      availableCashPercentage:
        cashReservePercentage,

      eligibleHoldings,

      criticalActions,

      highPriorityActions,

      brokerReconciliationStatus
    });

  const action =
    classifyDividendReinvestmentAction({
      readinessScore:
        readiness.score,

      totalDividendIncome:
        incomeAnalysis
          .totalNetIncome,

      eligibleHoldings,

      incomeQualityScore:
        incomeQuality.score,

      cashReservePercentage,

      criticalActions,

      riskScore,

      policy:
        normalizedPolicy
    });

  let reinvestmentPercentage;

  switch (
    action.code
  ) {
    case DIVIDEND_REINVESTMENT_ACTIONS
      .REINVEST:
      reinvestmentPercentage =
        normalizedPolicy
          .maximumReinvestmentPercentage;
      break;

    case DIVIDEND_REINVESTMENT_ACTIONS
      .SELECTIVE_REINVESTMENT:
      reinvestmentPercentage =
        normalizedPolicy
          .defaultSelectiveReinvestmentPercentage;
      break;

    default:
      reinvestmentPercentage =
        0;
  }

  const plan =
    buildDividendReinvestmentPlan({
      dividendIncome:
        incomeAnalysis
          .totalNetIncome,

      holdings,

      reinvestmentPercentage,

      method,

      policy:
        normalizedPolicy
    });

  const retainedCash =
    roundMoney(
      incomeAnalysis
        .totalNetIncome -
      plan
        .reinvestmentAmount
    );

  let status;

  if (
    incomeAnalysis.status ===
    DIVIDEND_INCOME_STATUSES
      .NO_DIVIDEND_INCOME
  ) {
    status =
      DIVIDEND_INCOME_STATUSES
        .NO_DIVIDEND_INCOME;
  } else if (
    action.code ===
      DIVIDEND_REINVESTMENT_ACTIONS
        .DEFER
  ) {
    status =
      DIVIDEND_INCOME_STATUSES
        .RISK_RESTRICTED;
  } else if (
    eligibleHoldings <= 0
  ) {
    status =
      DIVIDEND_INCOME_STATUSES
        .NO_ELIGIBLE_HOLDINGS;
  } else if (
    plan
      .reinvestmentAmount >
    0
  ) {
    status =
      DIVIDEND_INCOME_STATUSES
        .AVAILABLE;
  } else {
    status =
      DIVIDEND_INCOME_STATUSES
        .PARTIAL;
  }

  const confidencePercentage =
    roundScore(
      average([
        readiness.score,

        incomeQuality.score,

        eligibleHoldings > 0
          ? Math.min(
              eligibleHoldings *
              20,
              100
            )
          : 10,

        brokerReconciliationStatus &&
        [
          "MATCHED",
          "HOLDINGS_MATCH"
        ].includes(
          normalizeStatus(
            brokerReconciliationStatus
          )
        )
          ? 90
          : 50
      ]) ||
      0
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    action,

    readinessScore:
      readiness.score,

    confidencePercentage,

    income: {
      totalGrossIncome:
        incomeAnalysis
          .totalGrossIncome,

      totalTax:
        incomeAnalysis
          .totalTax,

      totalNetIncome:
        incomeAnalysis
          .totalNetIncome,

      portfolioYieldPercentage:
        incomeAnalysis
          .portfolioYieldPercentage,

      payingHoldings:
        incomeAnalysis
          .payingHoldings,

      payingSectors:
        incomeAnalysis
          .payingSectors,

      largestHoldingIncomeShare:
        incomeAnalysis
          .largestHoldingIncomeShare,

      largestSectorIncomeShare:
        incomeAnalysis
          .largestSectorIncomeShare
    },

    portfolio: {
      totalValue:
        roundMoney(
          portfolioValue
        ),

      availableCash:
        roundMoney(
          availableCash
        ),

      cashReservePercentage:
        cashReservePercentage ===
          null
          ? null
          : roundPercent(
              cashReservePercentage
            )
    },

    quality: {
      score:
        incomeQuality.score,

      classification:
        incomeQuality
          .classification,

      availableWeightPercentage:
        incomeQuality
          .availableWeightPercentage
    },

    reinvestment: {
      method,

      percentage:
        plan
          .reinvestmentPercentage,

      amount:
        plan
          .reinvestmentAmount,

      retainedCash,

      eligibleHoldings:
        plan
          .eligibleHoldings ||
        0,

      excludedHoldings:
        plan
          .excludedHoldings ||
        0,

      allocations:
        plan.allocations,

      excluded:
        plan.excluded
    },

    readiness,

    incomeAnalysis,

    plan,

    policy:
      normalizedPolicy,

    message:
      buildDividendReinvestmentMessage({
        action,
        readinessScore:
          readiness.score,

        confidencePercentage,

        totalNetIncome:
          incomeAnalysis
            .totalNetIncome,

        reinvestmentAmount:
          plan
            .reinvestmentAmount,

        retainedCash,

        eligibleHoldings,

        incomeQuality
      }),

    advisoryOnly:
      true
  };
}

function buildDividendReinvestmentMessage({
  action,
  readinessScore,
  confidencePercentage,
  totalNetIncome,
  reinvestmentAmount,
  retainedCash,
  eligibleHoldings,
  incomeQuality
}) {
  const parts = [];

  parts.push(
    `Dividend guidance is ${action.label}.`
  );

  parts.push(
    `Reinvestment readiness scored ${readinessScore}/100 with ${confidencePercentage}% confidence.`
  );

  parts.push(
    `Estimated net dividend income is KES ${roundMoney(
      totalNetIncome
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
    reinvestmentAmount > 0
  ) {
    parts.push(
      `Approximately KES ${roundMoney(
        reinvestmentAmount
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )} may be considered for reinvestment.`
    );
  }

  parts.push(
    `Approximately KES ${roundMoney(
      retainedCash
    ).toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    )} would remain as cash.`
  );

  parts.push(
    `${eligibleHoldings} holding or holdings qualified for reinvestment review.`
  );

  if (
    incomeQuality?.score !==
      null &&
    incomeQuality?.score !==
      undefined
  ) {
    parts.push(
      `Portfolio income quality scored ${incomeQuality.score}/100 and is rated ${incomeQuality.classification.label}.`
    );
  }

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export function buildDividendReinvestmentSummary(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    action:
      result
        ?.action
        ?.code ||
      DIVIDEND_REINVESTMENT_ACTIONS
        .NOT_AVAILABLE,

    actionLabel:
      result
        ?.action
        ?.label ||
      "Not Available",

    readinessScore:
      result
        .readinessScore,

    confidencePercentage:
      result
        .confidencePercentage,

    totalNetIncome:
      result
        ?.income
        ?.totalNetIncome ||
      0,

    portfolioYieldPercentage:
      result
        ?.income
        ?.portfolioYieldPercentage ??
      null,

    incomeQualityScore:
      result
        ?.quality
        ?.score ??
      null,

    incomeQuality:
      result
        ?.quality
        ?.classification
        ?.label ||
      "Not Rated",

    reinvestmentAmount:
      result
        ?.reinvestment
        ?.amount ||
      0,

    retainedCash:
      result
        ?.reinvestment
        ?.retainedCash ||
      0,

    eligibleHoldings:
      result
        ?.reinvestment
        ?.eligibleHoldings ||
      0,

    allocationCount:
      result
        ?.reinvestment
        ?.allocations
        ?.length ||
      0,

    message:
      result.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadDividendReinvestmentAllocations(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return result
    ?.reinvestment
    ?.allocations ||
    [];
}

export function loadExcludedDividendReinvestmentHoldings(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return result
    ?.reinvestment
    ?.excluded ||
    [];
}

export function loadBestDividendReinvestmentOpportunity(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return result
    ?.reinvestment
    ?.allocations?.[0] ||
    null;
}

export function loadDividendIncomeByHolding(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return result
    ?.incomeAnalysis
    ?.incomeByHolding ||
    [];
}

export function loadDividendIncomeBySector(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return result
    ?.incomeAnalysis
    ?.incomeBySector ||
    [];
}

export function loadDividendIncomeQuality(
  options = {}
) {
  const result =
    buildDividendReinvestmentAdvice(
      options
    );

  return result.quality;
}
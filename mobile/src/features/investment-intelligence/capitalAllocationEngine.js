/*
 * ============================================================
 * PC-023A3
 * CAPITAL ALLOCATION AND CASH DEPLOYMENT ENGINE
 * ============================================================
 *
 * Determines:
 * - whether available cash should be deployed,
 * - how much cash may be deployed,
 * - whether deployment should be immediate or gradual,
 * - which recommendations should receive capital,
 * - which holdings or sectors should be excluded,
 * - how much cash should remain as a reserve.
 *
 * This engine is advisory only.
 * It does not place orders, alter cash, or modify holdings.
 * ============================================================
 */

export const CASH_DEPLOYMENT_ACTIONS = {
  DEPLOY_IMMEDIATELY:
    "DEPLOY_IMMEDIATELY",

  DEPLOY_GRADUALLY:
    "DEPLOY_GRADUALLY",

  MAINTAIN_CASH_RESERVE:
    "MAINTAIN_CASH_RESERVE",

  ACCUMULATE_FOR_OPPORTUNITY:
    "ACCUMULATE_FOR_OPPORTUNITY",

  DO_NOT_DEPLOY:
    "DO_NOT_DEPLOY",

  NOT_AVAILABLE:
    "NOT_AVAILABLE"
};

export const CAPITAL_ALLOCATION_STATUSES = {
  AVAILABLE:
    "AVAILABLE",

  PARTIAL:
    "PARTIAL",

  NO_CASH:
    "NO_CASH",

  NO_ELIGIBLE_OPPORTUNITIES:
    "NO_ELIGIBLE_OPPORTUNITIES",

  RISK_RESTRICTED:
    "RISK_RESTRICTED",

  NOT_READY:
    "NOT_READY"
};

export const CAPITAL_ALLOCATION_METHODS = {
  SCORE_WEIGHTED:
    "SCORE_WEIGHTED",

  EQUAL_WEIGHTED:
    "EQUAL_WEIGHTED",

  CONVICTION_WEIGHTED:
    "CONVICTION_WEIGHTED",

  RISK_ADJUSTED:
    "RISK_ADJUSTED"
};

export const DEFAULT_CASH_RESERVE_POLICY = {
  minimumCashPercentage:
    8,

  preferredCashPercentage:
    12,

  maximumCashPercentage:
    25,

  minimumReserveAmount:
    0,

  maximumSingleDeploymentPercentage:
    35,

  maximumSingleHoldingAllocationPercentage:
    20,

  maximumSectorAllocationPercentage:
    35,

  gradualDeploymentTranches:
    3
};

const ELIGIBLE_RATINGS = [
  "STRONG_BUY",
  "BUY",
  "ACCUMULATE"
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

function normalizeStatus(value) {
  return String(
    value || "UNKNOWN"
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

function average(values = []) {
  const safeValues =
    values
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !==
          null
      );

  if (
    !safeValues.length
  ) {
    return null;
  }

  return (
    safeValues.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    safeValues.length
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

function normalizeCashReservePolicy(
  policy = {}
) {
  return {
    minimumCashPercentage:
      Math.max(
        number(
          policy
            ?.minimumCashPercentage ??
          DEFAULT_CASH_RESERVE_POLICY
            .minimumCashPercentage
        ),
        0
      ),

    preferredCashPercentage:
      Math.max(
        number(
          policy
            ?.preferredCashPercentage ??
          DEFAULT_CASH_RESERVE_POLICY
            .preferredCashPercentage
        ),
        0
      ),

    maximumCashPercentage:
      Math.max(
        number(
          policy
            ?.maximumCashPercentage ??
          DEFAULT_CASH_RESERVE_POLICY
            .maximumCashPercentage
        ),
        0
      ),

    minimumReserveAmount:
      Math.max(
        number(
          policy
            ?.minimumReserveAmount ??
          DEFAULT_CASH_RESERVE_POLICY
            .minimumReserveAmount
        ),
        0
      ),

    maximumSingleDeploymentPercentage:
      clamp(
        policy
          ?.maximumSingleDeploymentPercentage ??
        DEFAULT_CASH_RESERVE_POLICY
          .maximumSingleDeploymentPercentage,
        0,
        100
      ),

    maximumSingleHoldingAllocationPercentage:
      clamp(
        policy
          ?.maximumSingleHoldingAllocationPercentage ??
        DEFAULT_CASH_RESERVE_POLICY
          .maximumSingleHoldingAllocationPercentage,
        0,
        100
      ),

    maximumSectorAllocationPercentage:
      clamp(
        policy
          ?.maximumSectorAllocationPercentage ??
        DEFAULT_CASH_RESERVE_POLICY
          .maximumSectorAllocationPercentage,
        0,
        100
      ),

    gradualDeploymentTranches:
      Math.max(
        Math.floor(
          number(
            policy
              ?.gradualDeploymentTranches ??
            DEFAULT_CASH_RESERVE_POLICY
              .gradualDeploymentTranches
          )
        ),
        1
      )
  };
}

/*
 * ============================================================
 * CASH POSITION
 * ============================================================
 */

export function buildCashPositionAnalysis({
  portfolioValue = 0,
  availableCash = 0,
  reservePolicy = {}
} = {}) {
  const policy =
    normalizeCashReservePolicy(
      reservePolicy
    );

  const totalValue =
    Math.max(
      number(
        portfolioValue
      ),
      0
    );

  const cash =
    Math.max(
      number(
        availableCash
      ),
      0
    );

  if (
    totalValue <= 0
  ) {
    return {
      status:
        "NOT_AVAILABLE",

      portfolioValue:
        roundMoney(
          totalValue
        ),

      availableCash:
        roundMoney(
          cash
        ),

      cashPercentage:
        null,

      minimumReserveAmount:
        roundMoney(
          policy.minimumReserveAmount
        ),

      preferredReserveAmount:
        null,

      deployableCash:
        0,

      excessCash:
        0,

      shortfall:
        0,

      policy
    };
  }

  const cashPercentage =
    (
      cash /
      totalValue
    ) *
    100;

  const percentageReserveAmount =
    totalValue *
    (
      policy
        .minimumCashPercentage /
      100
    );

  const preferredReserveAmount =
    totalValue *
    (
      policy
        .preferredCashPercentage /
      100
    );

  const minimumReserveAmount =
    Math.max(
      percentageReserveAmount,
      policy.minimumReserveAmount
    );

  const deployableCash =
    Math.max(
      cash -
      minimumReserveAmount,
      0
    );

  const excessCash =
    cashPercentage >
      policy
        .maximumCashPercentage
      ? cash -
        (
          totalValue *
          (
            policy
              .maximumCashPercentage /
            100
          )
        )
      : 0;

  const shortfall =
    cash <
      minimumReserveAmount
      ? minimumReserveAmount -
        cash
      : 0;

  let status;

  if (
    cash <= 0
  ) {
    status =
      "NO_CASH";
  } else if (
    shortfall > 0
  ) {
    status =
      "BELOW_MINIMUM_RESERVE";
  } else if (
    cashPercentage >
    policy
      .maximumCashPercentage
  ) {
    status =
      "EXCESS_CASH";
  } else if (
    cashPercentage >
    policy
      .preferredCashPercentage
  ) {
    status =
      "ABOVE_PREFERRED_RESERVE";
  } else {
    status =
      "WITHIN_RESERVE_RANGE";
  }

  return {
    status,

    portfolioValue:
      roundMoney(
        totalValue
      ),

    availableCash:
      roundMoney(
        cash
      ),

    cashPercentage:
      roundPercent(
        cashPercentage
      ),

    minimumReserveAmount:
      roundMoney(
        minimumReserveAmount
      ),

    preferredReserveAmount:
      roundMoney(
        preferredReserveAmount
      ),

    deployableCash:
      roundMoney(
        deployableCash
      ),

    excessCash:
      roundMoney(
        Math.max(
          excessCash,
          0
        )
      ),

    shortfall:
      roundMoney(
        Math.max(
          shortfall,
          0
        )
      ),

    policy
  };
}

/*
 * ============================================================
 * DEPLOYMENT READINESS SCORE
 * ============================================================
 */

export function calculateCashDeploymentReadiness({
  cashPosition,
  portfolioHealthScore = null,
  riskScore = null,
  performanceScore = null,
  rebalancingScore = null,
  liquidityScore = null,
  opportunityCount = 0,
  highPriorityActions = 0,
  criticalActions = 0,
  brokerReconciliationStatus = null
} = {}) {
  const components = [];

  if (
    cashPosition
      ?.deployableCash >
    0
  ) {
    const cashScore =
      cashPosition
        ?.status ===
        "EXCESS_CASH"
        ? 100
        : cashPosition
            ?.status ===
            "ABOVE_PREFERRED_RESERVE"
          ? 85
          : 65;

    components.push({
      code:
        "DEPLOYABLE_CASH",

      score:
        cashScore,

      weight:
        0.2
    });
  } else {
    components.push({
      code:
        "DEPLOYABLE_CASH",

      score:
        10,

      weight:
        0.2
    });
  }

  [
    {
      code:
        "PORTFOLIO_HEALTH",

      score:
        nullableNumber(
          portfolioHealthScore
        ),

      weight:
        0.18
    },
    {
      code:
        "RISK",

      score:
        nullableNumber(
          riskScore
        ),

      weight:
        0.18
    },
    {
      code:
        "PERFORMANCE",

      score:
        nullableNumber(
          performanceScore
        ),

      weight:
        0.12
    },
    {
      code:
        "REBALANCING",

      score:
        nullableNumber(
          rebalancingScore
        ),

      weight:
        0.12
    },
    {
      code:
        "LIQUIDITY",

      score:
        nullableNumber(
          liquidityScore
        ),

      weight:
        0.1
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
    opportunityCount >= 5
      ? 100
      : opportunityCount >= 3
        ? 85
        : opportunityCount >= 1
          ? 65
          : 15;

  components.push({
    code:
      "OPPORTUNITIES",

    score:
      opportunityScore,

    weight:
      0.1
  });

  const availableWeight =
    sum(
      components.map(
        (item) =>
          item.weight
      )
    );

  const weightedScore =
    availableWeight > 0
      ? sum(
          components.map(
            (item) =>
              item.score *
              item.weight
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
        "CRITICAL_ACTION_PENALTY",

      points:
        -30,

      message:
        "Cash deployment was restricted because critical executive actions are active."
    });
  } else if (
    highPriorityActions > 0
  ) {
    const deduction =
      Math.min(
        highPriorityActions *
        7,
        21
      );

    adjustedScore -=
      deduction;

    adjustments.push({
      code:
        "HIGH_ACTION_PENALTY",

      points:
        -deduction,

      message:
        `${highPriorityActions} high-priority action(s) reduced deployment readiness.`
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
        "Cash deployment was reduced because the broker portfolio is out of sync."
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
        "Cash deployment was reduced because broker reconciliation is incomplete."
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
      45
  ) {
    adjustedScore -=
      20;

    adjustments.push({
      code:
        "LOW_RISK_SCORE",

      points:
        -20,

      message:
        "Cash deployment was reduced because portfolio risk controls scored poorly."
    });
  }

  adjustedScore =
    roundScore(
      adjustedScore
    );

  return {
    score:
      adjustedScore,

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
 * CASH DEPLOYMENT ACTION
 * ============================================================
 */

export function classifyCashDeploymentAction({
  readinessScore,
  deployableCash,
  opportunityCount,
  criticalActions = 0,
  riskScore = null,
  cashPositionStatus = null
} = {}) {
  const readiness =
    number(
      readinessScore
    );

  const cash =
    number(
      deployableCash
    );

  const risk =
    nullableNumber(
      riskScore
    );

  if (
    cash <= 0
  ) {
    return {
      code:
        CASH_DEPLOYMENT_ACTIONS
          .MAINTAIN_CASH_RESERVE,

      label:
        "Maintain Cash Reserve",

      description:
        "No cash is available above the configured minimum reserve."
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
        CASH_DEPLOYMENT_ACTIONS
          .DO_NOT_DEPLOY,

      label:
        "Do Not Deploy",

      description:
        "Capital deployment should pause until critical risk or operational issues are reviewed."
    };
  }

  if (
    opportunityCount <= 0
  ) {
    return {
      code:
        CASH_DEPLOYMENT_ACTIONS
          .ACCUMULATE_FOR_OPPORTUNITY,

      label:
        "Accumulate for Opportunity",

      description:
        "Maintain available cash until a sufficiently attractive opportunity is identified."
    };
  }

  if (
    readiness >= 80 &&
    cashPositionStatus ===
      "EXCESS_CASH"
  ) {
    return {
      code:
        CASH_DEPLOYMENT_ACTIONS
          .DEPLOY_IMMEDIATELY,

      label:
        "Deploy Immediately",

      description:
        "Portfolio conditions and available opportunities support immediate partial deployment."
    };
  }

  if (
    readiness >= 60
  ) {
    return {
      code:
        CASH_DEPLOYMENT_ACTIONS
          .DEPLOY_GRADUALLY,

      label:
        "Deploy Gradually",

      description:
        "Deploy capital in controlled tranches while monitoring risk and price movement."
    };
  }

  if (
    readiness >= 40
  ) {
    return {
      code:
        CASH_DEPLOYMENT_ACTIONS
          .MAINTAIN_CASH_RESERVE,

      label:
        "Maintain Cash Reserve",

      description:
        "Retain most available cash until portfolio conditions improve."
    };
  }

  return {
    code:
      CASH_DEPLOYMENT_ACTIONS
        .DO_NOT_DEPLOY,

    label:
      "Do Not Deploy",

    description:
      "Current risk, operational, or opportunity conditions do not support new deployment."
  };
}

/*
 * ============================================================
 * RECOMMENDATION ELIGIBILITY
 * ============================================================
 */

function evaluateRecommendationEligibility({
  recommendation,
  reservePolicy
}) {
  const symbol =
    normalizeSymbol(
      recommendation?.symbol
    );

  const rating =
    normalizeStatus(
      recommendation
        ?.rating
        ?.code ||
      recommendation?.action
    );

  const riskStatus =
    normalizeStatus(
      recommendation
        ?.portfolio
        ?.riskStatus
    );

  const allocationPercentage =
    number(
      recommendation
        ?.portfolio
        ?.allocationPercentage
    );

  const sectorAllocationPercentage =
    number(
      recommendation
        ?.portfolio
        ?.sectorAllocationPercentage
    );

  const confidence =
    number(
      recommendation
        ?.confidencePercentage
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
      )} is not eligible for additional capital.`
    );
  }

  if (
    EXCLUDED_RATINGS.includes(
      rating
    )
  ) {
    reasons.push(
      "The recommendation explicitly excludes additional capital."
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
      "The holding or sector has breached a configured concentration limit."
    );
  }

  if (
    allocationPercentage >=
    reservePolicy
      .maximumSingleHoldingAllocationPercentage
  ) {
    reasons.push(
      "The holding is already at or above the maximum permitted allocation."
    );
  }

  if (
    sectorAllocationPercentage >=
    reservePolicy
      .maximumSectorAllocationPercentage
  ) {
    reasons.push(
      "The sector is already at or above the maximum permitted allocation."
    );
  }

  if (
    confidence < 35
  ) {
    reasons.push(
      "Recommendation confidence is too low for capital allocation."
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
 * OPPORTUNITY WEIGHTING
 * ============================================================
 */

function calculateOpportunityWeight({
  recommendation,
  method
}) {
  const score =
    number(
      recommendation?.score
    );

  const confidence =
    number(
      recommendation
        ?.confidencePercentage
    );

  const riskScore =
    nullableNumber(
      recommendation
        ?.riskAdjusted
        ?.score
    ) ??
    score;

  const rating =
    normalizeStatus(
      recommendation
        ?.rating
        ?.code
    );

  const ratingMultiplier = {
    STRONG_BUY:
      1.3,

    BUY:
      1.15,

    ACCUMULATE:
      1,

    HOLD:
      0.5
  }[
    rating
  ] || 0.25;

  switch (
    method
  ) {
    case CAPITAL_ALLOCATION_METHODS
      .EQUAL_WEIGHTED:
      return 1;

    case CAPITAL_ALLOCATION_METHODS
      .CONVICTION_WEIGHTED:
      return Math.max(
        score *
        ratingMultiplier,
        1
      );

    case CAPITAL_ALLOCATION_METHODS
      .RISK_ADJUSTED:
      return Math.max(
        (
          score *
          0.45
        ) +
        (
          confidence *
          0.25
        ) +
        (
          riskScore *
          0.3
        ),
        1
      );

    case CAPITAL_ALLOCATION_METHODS
      .SCORE_WEIGHTED:
    default:
      return Math.max(
        (
          score *
          0.7
        ) +
        (
          confidence *
          0.3
        ),
        1
      );
  }
}

/*
 * ============================================================
 * DEPLOYABLE AMOUNT
 * ============================================================
 */

function calculateRecommendedDeploymentAmount({
  cashPosition,
  deploymentAction,
  readinessScore,
  policy
}) {
  const deployableCash =
    number(
      cashPosition
        ?.deployableCash
    );

  if (
    deployableCash <= 0
  ) {
    return 0;
  }

  let deploymentPercentage;

  switch (
    deploymentAction?.code
  ) {
    case CASH_DEPLOYMENT_ACTIONS
      .DEPLOY_IMMEDIATELY:
      deploymentPercentage =
        Math.min(
          policy
            .maximumSingleDeploymentPercentage,
          readinessScore >= 90
            ? 35
            : 25
        );
      break;

    case CASH_DEPLOYMENT_ACTIONS
      .DEPLOY_GRADUALLY:
      deploymentPercentage =
        readinessScore >= 70
          ? 20
          : 12.5;
      break;

    case CASH_DEPLOYMENT_ACTIONS
      .MAINTAIN_CASH_RESERVE:
      deploymentPercentage =
        readinessScore >= 50
          ? 5
          : 0;
      break;

    default:
      deploymentPercentage =
        0;
  }

  return roundMoney(
    Math.min(
      deployableCash,
      cashPosition
        .availableCash *
        (
          deploymentPercentage /
          100
        )
    )
  );
}

/*
 * ============================================================
 * CAPITAL ALLOCATION PLAN
 * ============================================================
 */

export function buildCapitalAllocationPlan({
  recommendations = [],
  deploymentAmount = 0,
  allocationMethod =
    CAPITAL_ALLOCATION_METHODS
      .RISK_ADJUSTED,
  reservePolicy = {}
} = {}) {
  const policy =
    normalizeCashReservePolicy(
      reservePolicy
    );

  const amount =
    Math.max(
      number(
        deploymentAmount
      ),
      0
    );

  const eligible = [];
  const excluded = [];

  safeArray(
    recommendations
  ).forEach(
    (recommendation) => {
      const evaluation =
        evaluateRecommendationEligibility({
          recommendation,
          reservePolicy:
            policy
        });

      if (
        evaluation.eligible
      ) {
        eligible.push({
          recommendation,

          weight:
            calculateOpportunityWeight({
              recommendation,
              method:
                allocationMethod
            })
        });
      } else {
        excluded.push({
          symbol:
            evaluation.symbol,

          rating:
            recommendation
              ?.rating
              ?.code ||
            null,

          reasons:
            evaluation.reasons,

          recommendation
        });
      }
    }
  );

  if (
    amount <= 0
  ) {
    return {
      status:
        CAPITAL_ALLOCATION_STATUSES
          .NO_CASH,

      allocationMethod,

      deploymentAmount:
        0,

      allocatedAmount:
        0,

      unallocatedAmount:
        0,

      allocations:
        [],

      excluded
    };
  }

  if (
    !eligible.length
  ) {
    return {
      status:
        CAPITAL_ALLOCATION_STATUSES
          .NO_ELIGIBLE_OPPORTUNITIES,

      allocationMethod,

      deploymentAmount:
        roundMoney(
          amount
        ),

      allocatedAmount:
        0,

      unallocatedAmount:
        roundMoney(
          amount
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

  const initialAllocations =
    eligible.map(
      (item) => {
        const recommendation =
          item.recommendation;

        const allocationAmount =
          totalWeight > 0
            ? amount *
              (
                item.weight /
                totalWeight
              )
            : amount /
              eligible.length;

        return {
          symbol:
            normalizeSymbol(
              recommendation
                ?.symbol
            ),

          name:
            recommendation
              ?.name ||
            recommendation
              ?.symbol ||
            "Unknown",

          sector:
            normalizeSector(
              recommendation
                ?.sector
            ),

          rating:
            recommendation
              ?.rating ||
            null,

          score:
            recommendation
              ?.score ??
            null,

          confidencePercentage:
            recommendation
              ?.confidencePercentage ??
            null,

          riskLevel:
            recommendation
              ?.riskLevel ||
            null,

          currentAllocationPercentage:
            recommendation
              ?.portfolio
              ?.allocationPercentage ??
            null,

          weight:
            item.weight,

          allocationAmount:
            roundMoney(
              allocationAmount
            ),

          allocationPercentage:
            amount > 0
              ? roundPercent(
                  (
                    allocationAmount /
                    amount
                  ) *
                  100
                )
              : 0,

          advisoryOnly:
            true
        };
      }
    );

  /*
   * Correct rounding differences by applying the residual
   * to the highest-ranked allocation.
   */

  const initiallyAllocated =
    roundMoney(
      sum(
        initialAllocations.map(
          (item) =>
            item.allocationAmount
        )
      )
    );

  const residual =
    roundMoney(
      amount -
      initiallyAllocated
    );

  if (
    initialAllocations.length &&
    residual !== 0
  ) {
    initialAllocations[0] = {
      ...initialAllocations[0],

      allocationAmount:
        roundMoney(
          initialAllocations[0]
            .allocationAmount +
          residual
        )
    };
  }

  const allocatedAmount =
    roundMoney(
      sum(
        initialAllocations.map(
          (item) =>
            item.allocationAmount
        )
      )
    );

  return {
    status:
      CAPITAL_ALLOCATION_STATUSES
        .AVAILABLE,

    allocationMethod,

    deploymentAmount:
      roundMoney(
        amount
      ),

    allocatedAmount,

    unallocatedAmount:
      roundMoney(
        Math.max(
          amount -
          allocatedAmount,
          0
        )
      ),

    eligibleOpportunities:
      eligible.length,

    excludedOpportunities:
      excluded.length,

    allocations:
      initialAllocations.sort(
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
 * DEPLOYMENT TRANCHES
 * ============================================================
 */

function buildDeploymentTranches({
  deploymentAction,
  deploymentAmount,
  policy
}) {
  const amount =
    number(
      deploymentAmount
    );

  if (
    amount <= 0
  ) {
    return [];
  }

  const trancheCount =
    deploymentAction?.code ===
      CASH_DEPLOYMENT_ACTIONS
        .DEPLOY_GRADUALLY
      ? policy
          .gradualDeploymentTranches
      : 1;

  const trancheAmount =
    amount /
    trancheCount;

  return Array.from(
    {
      length:
        trancheCount
    },
    (
      _,
      index
    ) => ({
      tranche:
        index +
        1,

      amount:
        roundMoney(
          index ===
            trancheCount -
            1
            ? amount -
              (
                roundMoney(
                  trancheAmount
                ) *
                (
                  trancheCount -
                  1
                )
              )
            : trancheAmount
        ),

      timing:
        trancheCount === 1
          ? "CURRENT_REVIEW"
          : index === 0
            ? "INITIAL"
            : `FOLLOW_UP_${index}`,

      condition:
        index === 0
          ? "Subject to investor confirmation and current market price."
          : "Proceed only if portfolio risk, broker reconciliation, and recommendation quality remain acceptable.",

      advisoryOnly:
        true
    })
  );
}

/*
 * ============================================================
 * CASH DEPLOYMENT ADVICE
 * ============================================================
 */

export function buildCashDeploymentAdvice({
  portfolioValue = 0,
  availableCash = 0,
  recommendations = [],
  portfolioHealthScore = null,
  riskScore = null,
  performanceScore = null,
  rebalancingScore = null,
  liquidityScore = null,
  highPriorityActions = 0,
  criticalActions = 0,
  brokerReconciliationStatus = null,
  reservePolicy = {},
  allocationMethod =
    CAPITAL_ALLOCATION_METHODS
      .RISK_ADJUSTED
} = {}) {
  const policy =
    normalizeCashReservePolicy(
      reservePolicy
    );

  const cashPosition =
    buildCashPositionAnalysis({
      portfolioValue,
      availableCash,
      reservePolicy:
        policy
    });

  const eligibleOpportunityCount =
    safeArray(
      recommendations
    ).filter(
      (recommendation) =>
        ELIGIBLE_RATINGS.includes(
          normalizeStatus(
            recommendation
              ?.rating
              ?.code
          )
        )
    ).length;

  const readiness =
    calculateCashDeploymentReadiness({
      cashPosition,
      portfolioHealthScore,
      riskScore,
      performanceScore,
      rebalancingScore,
      liquidityScore,
      opportunityCount:
        eligibleOpportunityCount,
      highPriorityActions,
      criticalActions,
      brokerReconciliationStatus
    });

  const deploymentAction =
    classifyCashDeploymentAction({
      readinessScore:
        readiness.score,

      deployableCash:
        cashPosition
          .deployableCash,

      opportunityCount:
        eligibleOpportunityCount,

      criticalActions,

      riskScore,

      cashPositionStatus:
        cashPosition.status
    });

  const deploymentAmount =
    calculateRecommendedDeploymentAmount({
      cashPosition,
      deploymentAction,
      readinessScore:
        readiness.score,
      policy
    });

  const allocationPlan =
    buildCapitalAllocationPlan({
      recommendations,
      deploymentAmount,
      allocationMethod,
      reservePolicy:
        policy
    });

  const tranches =
    buildDeploymentTranches({
      deploymentAction,
      deploymentAmount,
      policy
    });

  const remainingCash =
    roundMoney(
      number(
        availableCash
      ) -
      allocationPlan
        .allocatedAmount
    );

  const remainingCashPercentage =
    number(
      portfolioValue
    ) > 0
      ? roundPercent(
          (
            remainingCash /
            number(
              portfolioValue
            )
          ) *
          100
        )
      : null;

  const confidenceScore =
    roundScore(
      average([
        readiness.score,

        eligibleOpportunityCount > 0
          ? Math.min(
              eligibleOpportunityCount *
              20,
              100
            )
          : 10,

        allocationPlan.status ===
          CAPITAL_ALLOCATION_STATUSES
            .AVAILABLE
          ? 85
          : 35,

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

  let status;

  if (
    cashPosition.status ===
    "NO_CASH"
  ) {
    status =
      CAPITAL_ALLOCATION_STATUSES
        .NO_CASH;
  } else if (
    criticalActions > 0 ||
    deploymentAction.code ===
      CASH_DEPLOYMENT_ACTIONS
        .DO_NOT_DEPLOY
  ) {
    status =
      CAPITAL_ALLOCATION_STATUSES
        .RISK_RESTRICTED;
  } else if (
    eligibleOpportunityCount <= 0
  ) {
    status =
      CAPITAL_ALLOCATION_STATUSES
        .NO_ELIGIBLE_OPPORTUNITIES;
  } else if (
    deploymentAmount > 0
  ) {
    status =
      CAPITAL_ALLOCATION_STATUSES
        .AVAILABLE;
  } else {
    status =
      CAPITAL_ALLOCATION_STATUSES
        .PARTIAL;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    action:
      deploymentAction,

    readinessScore:
      readiness.score,

    confidencePercentage:
      confidenceScore,

    portfolio: {
      totalValue:
        roundMoney(
          portfolioValue
        ),

      availableCash:
        roundMoney(
          availableCash
        ),

      currentCashPercentage:
        cashPosition
          .cashPercentage,

      minimumReserveAmount:
        cashPosition
          .minimumReserveAmount,

      preferredReserveAmount:
        cashPosition
          .preferredReserveAmount,

      deployableCash:
        cashPosition
          .deployableCash,

      recommendedDeploymentAmount:
        roundMoney(
          deploymentAmount
        ),

      remainingCash,

      remainingCashPercentage
    },

    opportunities: {
      total:
        safeArray(
          recommendations
        ).length,

      eligible:
        eligibleOpportunityCount,

      allocated:
        allocationPlan
          .allocations
          .length,

      excluded:
        allocationPlan
          .excluded
          .length
    },

    readiness,

    allocationPlan,

    tranches,

    policy,

    message:
      buildCashDeploymentMessage({
        deploymentAction,
        readinessScore:
          readiness.score,
        deploymentAmount,
        remainingCash,
        eligibleOpportunityCount,
        criticalActions,
        highPriorityActions
      }),

    advisoryOnly:
      true
  };
}

function buildCashDeploymentMessage({
  deploymentAction,
  readinessScore,
  deploymentAmount,
  remainingCash,
  eligibleOpportunityCount,
  criticalActions,
  highPriorityActions
}) {
  const parts = [];

  parts.push(
    `Cash deployment guidance is ${deploymentAction.label}.`
  );

  parts.push(
    `Deployment readiness scored ${readinessScore}/100.`
  );

  if (
    deploymentAmount > 0
  ) {
    parts.push(
      `Approximately KES ${roundMoney(
        deploymentAmount
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,
          maximumFractionDigits:
            2
        }
      )} may be considered for deployment.`
    );
  }

  parts.push(
    `Approximately KES ${roundMoney(
      remainingCash
    ).toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          2,
        maximumFractionDigits:
          2
      }
    )} would remain in cash.`
  );

  if (
    eligibleOpportunityCount > 0
  ) {
    parts.push(
      `${eligibleOpportunityCount} eligible investment opportunity or opportunities were identified.`
    );
  }

  if (
    criticalActions > 0
  ) {
    parts.push(
      `${criticalActions} critical executive action or actions restrict deployment.`
    );
  } else if (
    highPriorityActions > 0
  ) {
    parts.push(
      `${highPriorityActions} high-priority portfolio action or actions should be reviewed during deployment.`
    );
  }

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * CAPITAL ALLOCATION ADVICE
 * ============================================================
 */

export function buildCapitalAllocationAdvice(
  options = {}
) {
  const deployment =
    buildCashDeploymentAdvice(
      options
    );

  const strongestAllocation =
    deployment
      ?.allocationPlan
      ?.allocations?.[0] ||
    null;

  const excluded =
    safeArray(
      deployment
        ?.allocationPlan
        ?.excluded
    );

  return {
    generatedAt:
      deployment.generatedAt,

    status:
      deployment.status,

    deploymentAction:
      deployment.action,

    readinessScore:
      deployment
        .readinessScore,

    confidencePercentage:
      deployment
        .confidencePercentage,

    recommendedDeploymentAmount:
      deployment
        ?.portfolio
        ?.recommendedDeploymentAmount ||
      0,

    remainingCash:
      deployment
        ?.portfolio
        ?.remainingCash ||
      0,

    strongestAllocation,

    allocations:
      deployment
        ?.allocationPlan
        ?.allocations ||
      [],

    excluded,

    tranches:
      deployment.tranches,

    message:
      deployment.message,

    advisoryOnly:
      true,

    source:
      deployment
  };
}

/*
 * ============================================================
 * COMPACT SUMMARIES
 * ============================================================
 */

export function buildCashDeploymentSummary(
  options = {}
) {
  const result =
    buildCashDeploymentAdvice(
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
      CASH_DEPLOYMENT_ACTIONS
        .NOT_AVAILABLE,

    actionLabel:
      result
        ?.action
        ?.label ||
      "Not Available",

    readinessScore:
      result.readinessScore,

    confidencePercentage:
      result
        .confidencePercentage,

    availableCash:
      result
        ?.portfolio
        ?.availableCash ||
      0,

    deployableCash:
      result
        ?.portfolio
        ?.deployableCash ||
      0,

    recommendedDeploymentAmount:
      result
        ?.portfolio
        ?.recommendedDeploymentAmount ||
      0,

    remainingCash:
      result
        ?.portfolio
        ?.remainingCash ||
      0,

    eligibleOpportunities:
      result
        ?.opportunities
        ?.eligible ||
      0,

    allocatedOpportunities:
      result
        ?.opportunities
        ?.allocated ||
      0,

    message:
      result.message
  };
}

export function buildCapitalAllocationSummary(
  options = {}
) {
  const result =
    buildCapitalAllocationAdvice(
      options
    );

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    deploymentAction:
      result
        ?.deploymentAction
        ?.code ||
      null,

    readinessScore:
      result.readinessScore,

    confidencePercentage:
      result
        .confidencePercentage,

    recommendedDeploymentAmount:
      result
        .recommendedDeploymentAmount,

    remainingCash:
      result.remainingCash,

    strongestAllocation:
      result.strongestAllocation,

    allocationCount:
      result.allocations.length,

    excludedCount:
      result.excluded.length,

    trancheCount:
      result.tranches.length,

    message:
      result.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadCapitalAllocations(
  options = {}
) {
  const result =
    buildCapitalAllocationAdvice(
      options
    );

  return result.allocations;
}

export function loadExcludedCapitalOpportunities(
  options = {}
) {
  const result =
    buildCapitalAllocationAdvice(
      options
    );

  return result.excluded;
}

export function loadDeploymentTranches(
  options = {}
) {
  const result =
    buildCashDeploymentAdvice(
      options
    );

  return result.tranches;
}

export function loadStrongestCapitalAllocation(
  options = {}
) {
  const result =
    buildCapitalAllocationAdvice(
      options
    );

  return result.strongestAllocation;
}

export function loadCashReserveAnalysis(
  options = {}
) {
  const result =
    buildCashDeploymentAdvice(
      options
    );

  return {
    status:
      result.status,

    action:
      result.action,

    portfolio:
      result.portfolio,

    policy:
      result.policy
  };
}
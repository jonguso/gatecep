/*
 * ============================================================
 * PC-028T
 * INVESTOR DNA RECONCILIATION ENGINE
 * ============================================================
 *
 * Purpose:
 * Compare the investor's INITIAL Investor DNA / Wealth Blueprint
 * against REAL investing evidence over time.
 *
 * IMPORTANT:
 * - This does NOT create a second DNA.
 * - This does NOT mutate Investor DNA automatically.
 * - Practice data is not accepted as evidence.
 * - Observed behavior is evidence to discuss, not proof of intent.
 * - Coach G should ask "why?" before updating durable DNA traits.
 * ============================================================
 */

export const DNA_RECONCILIATION_STATUSES = Object.freeze({
  NOT_ENOUGH_DATA: "NOT_ENOUGH_DATA",
  ALIGNED: "ALIGNED",
  WATCH: "WATCH",
  DRIFTING: "DRIFTING",
  MATERIAL_DRIFT: "MATERIAL_DRIFT"
});

export const DNA_RECONCILIATION_SIGNAL_TYPES = Object.freeze({
  GOAL_ALIGNMENT: "GOAL_ALIGNMENT",
  RISK_ALIGNMENT: "RISK_ALIGNMENT",
  SECTOR_CONCENTRATION: "SECTOR_CONCENTRATION",
  CONTRIBUTION_DISCIPLINE: "CONTRIBUTION_DISCIPLINE",
  TRADING_BEHAVIOR: "TRADING_BEHAVIOR",
  RECOMMENDATION_FOLLOW_THROUGH: "RECOMMENDATION_FOLLOW_THROUGH",
  LIQUIDITY_ALIGNMENT: "LIQUIDITY_ALIGNMENT",
  TIME_HORIZON_ALIGNMENT: "TIME_HORIZON_ALIGNMENT"
});

export const DNA_EVIDENCE_STRENGTH = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH"
});

function n(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function upper(value) {
  return clean(value)?.toUpperCase() || null;
}

function pct(value) {
  const parsed = n(value);
  return parsed === null ? null : parsed;
}

function rankLevel(level) {
  return {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  }[level] || 0;
}

function buildSignal({
  type,
  title,
  level = "LOW",
  aligned = true,
  message,
  evidence = {},
  question = null,
  recommendationId = null
}) {
  return {
    type,
    title,
    level,
    aligned,
    message,
    evidence,
    question,
    recommendationId
  };
}

export function normalizeInitialInvestorDNA({
  investorDNA = {},
  wealthBlueprint = {}
} = {}) {
  const dna = safeObject(investorDNA);
  const blueprint = safeObject(wealthBlueprint);

  return {
    investorType:
      clean(
        dna?.investorType ??
        blueprint?.investorType
      ),

    goal:
      clean(
        dna?.goal ??
        dna?.primaryGoal ??
        blueprint?.goal ??
        blueprint?.primaryGoal
      ),

    riskProfile:
      clean(
        dna?.riskProfile ??
        dna?.riskTolerance ??
        blueprint?.riskProfile
      ),

    timeHorizon:
      clean(
        dna?.timeHorizon ??
        blueprint?.timeHorizon
      ),

    preferredStyle:
      clean(
        dna?.investmentStyle ??
        dna?.preferredStyle ??
        blueprint?.investmentStyle
      ),

    liquidityPreference:
      clean(
        dna?.liquidityPreference ??
        blueprint?.liquidityPreference
      ),

    originalDNA:
      dna,

    originalBlueprint:
      blueprint
  };
}

export function normalizeRealInvestorEvidence({
  realPortfolio = {},
  portfolioHealth = {},
  behavior = {},
  orderHistory = [],
  tradeHistory = [],
  recommendationHistory = [],
  wealthJourney = {}
} = {}) {
  const portfolio = safeObject(realPortfolio);

  return {
    source: "REAL_INVESTING_ONLY",

    portfolio: {
      totalValue:
        n(
          portfolio?.totalValue ??
          portfolio?.currentValue ??
          portfolio?.netWorth
        ),

      holdingsValue:
        n(
          portfolio?.holdingsValue ??
          portfolio?.totalMarketValue
        ),

      availableCash:
        n(portfolio?.availableCash),

      holdings:
        safeArray(portfolio?.holdings),

      sectorAllocation:
        safeArray(
          portfolio?.sectorAllocation ??
          portfolio?.sectors
        )
    },

    portfolioHealth:
      safeObject(portfolioHealth),

    behavior:
      safeObject(behavior),

    orderHistory:
      safeArray(orderHistory),

    tradeHistory:
      safeArray(tradeHistory),

    recommendationHistory:
      safeArray(recommendationHistory),

    wealthJourney:
      safeObject(wealthJourney)
  };
}

export function buildGoalAlignmentSignal({
  initialDNA = {},
  realEvidence = {}
} = {}) {
  const goal =
    clean(initialDNA?.goal);

  const journey =
    safeObject(
      realEvidence?.wealthJourney
    );

  if (!goal) {
    return buildSignal({
      type: DNA_RECONCILIATION_SIGNAL_TYPES.GOAL_ALIGNMENT,
      title: "Goal alignment",
      level: "LOW",
      aligned: true,
      message:
        "The initial Investor DNA does not contain enough goal detail to judge alignment.",
      evidence: {
        goal: null
      },
      question:
        "What financial outcome matters most to you now, and has that changed since you joined GateCEP?"
    });
  }

  const status =
    upper(
      journey?.summary?.status ??
      journey?.topGoal?.classification?.status ??
      journey?.classification?.status
    );

  const behind =
    [
      "SLIGHTLY_BEHIND",
      "BEHIND",
      "CRITICAL_GAP"
    ].includes(status);

  return buildSignal({
    type: DNA_RECONCILIATION_SIGNAL_TYPES.GOAL_ALIGNMENT,
    title: "Goal alignment",
    level: behind ? "HIGH" : "LOW",
    aligned: !behind,
    message: behind
      ? `Real investing progress appears behind the plan for the investor's stated goal: ${goal}.`
      : `Current real investing evidence does not show a material goal mismatch for ${goal}.`,
    evidence: {
      goal,
      wealthJourneyStatus:
        status || null
    },
    question: behind
      ? "Your current investing path appears behind the goal you originally described. What has changed since we made the plan?"
      : null
  });
}

export function buildRiskAlignmentSignal({
  initialDNA = {},
  realEvidence = {}
} = {}) {
  const riskProfile =
    upper(initialDNA?.riskProfile);

  const health =
    safeObject(
      realEvidence?.portfolioHealth
    );

  const behavior =
    safeObject(
      realEvidence?.behavior
    );

  const concentrationRisk =
    upper(
      health?.concentrationRisk ??
      health?.concentration?.level
    );

  const highTurnover =
    behavior?.highTurnover === true ||
    upper(behavior?.tradingFrequency) === "HIGH";

  if (!riskProfile) {
    return buildSignal({
      type: DNA_RECONCILIATION_SIGNAL_TYPES.RISK_ALIGNMENT,
      title: "Risk alignment",
      aligned: true,
      level: "LOW",
      message:
        "The initial Investor DNA does not contain enough risk-profile evidence to judge real-behavior alignment.",
      evidence: {}
    });
  }

  const conservative =
    [
      "CONSERVATIVE",
      "LOW",
      "CAUTIOUS"
    ].includes(riskProfile);

  const mismatch =
    conservative &&
    (
      concentrationRisk === "HIGH" ||
      highTurnover
    );

  return buildSignal({
    type: DNA_RECONCILIATION_SIGNAL_TYPES.RISK_ALIGNMENT,
    title: "Risk alignment",
    aligned: !mismatch,
    level: mismatch ? "HIGH" : "LOW",
    message: mismatch
      ? "Observed real investing behavior appears more aggressive than the investor's initial risk profile."
      : "Current real investing behavior does not show a clear conflict with the initial risk profile.",
    evidence: {
      initialRiskProfile:
        riskProfile,
      concentrationRisk:
        concentrationRisk || null,
      highTurnover
    },
    question: mismatch
      ? "When you first joined GateCEP you described a more cautious approach, but your recent investing looks more aggressive. Is that intentional, or did circumstances change?"
      : null
  });
}

function sectorMap(input = []) {
  const map = new Map();

  safeArray(input).forEach((item) => {
    const sector =
      clean(
        item?.sector ??
        item?.name ??
        item?.label
      );

    const weight =
      pct(
        item?.weight ??
        item?.percentage ??
        item?.allocationPct ??
        item?.allocation
      );

    if (sector && weight !== null) {
      map.set(
        sector.toUpperCase(),
        weight
      );
    }
  });

  return map;
}

export function buildSectorConcentrationSignal({
  realEvidence = {}
} = {}) {
  const portfolio =
    safeObject(
      realEvidence?.portfolio
    );

  const health =
    safeObject(
      realEvidence?.portfolioHealth
    );

  const allocation =
    sectorMap(
      portfolio?.sectorAllocation
    );

  let largestSector = null;
  let largestWeight = null;

  allocation.forEach((weight, sector) => {
    if (
      largestWeight === null ||
      weight > largestWeight
    ) {
      largestWeight = weight;
      largestSector = sector;
    }
  });

  const concentrationRisk =
    upper(
      health?.concentrationRisk ??
      health?.concentration?.level
    );

  const high =
    concentrationRisk === "HIGH" ||
    (
      largestWeight !== null &&
      largestWeight >= 40
    );

  return buildSignal({
    type: DNA_RECONCILIATION_SIGNAL_TYPES.SECTOR_CONCENTRATION,
    title: "Sector concentration",
    aligned: !high,
    level: high ? "HIGH" : "LOW",
    message: high
      ? `${largestSector || "One sector"} represents a material concentration in the real portfolio.`
      : "Current real-sector allocation does not show a material concentration signal.",
    evidence: {
      largestSector,
      largestSectorWeight:
        largestWeight,
      concentrationRisk:
        concentrationRisk || null
    },
    question: high
      ? `Your portfolio remains concentrated${largestSector ? ` in ${largestSector}` : ""}. Is that deliberate, or are there constraints Coach G should understand?`
      : null
  });
}

export function buildRecommendationFollowThroughSignals({
  realEvidence = {}
} = {}) {
  const recommendations =
    safeArray(
      realEvidence?.recommendationHistory
    );

  if (!recommendations.length) {
    return [];
  }

  return recommendations
    .filter(
      (item) =>
        item &&
        item.status !== "DISMISSED"
    )
    .map((item) => {
      const recommendationId =
        clean(
          item?.id ??
          item?.recommendationId
        );

      const action =
        upper(
          item?.action ??
          item?.recommendedAction
        );

      const targetSector =
        upper(
          item?.targetSector ??
          item?.sector
        );

      const observed =
        upper(
          item?.observedOutcome ??
          item?.followThroughStatus ??
          item?.complianceStatus
        );

      const notFollowed =
        [
          "NOT_FOLLOWED",
          "OPPOSITE_ACTION",
          "DRIFTED",
          "MISALIGNED"
        ].includes(observed);

      const partial =
        [
          "PARTIAL",
          "PARTIALLY_FOLLOWED"
        ].includes(observed);

      const aligned =
        !notFollowed &&
        !partial;

      return buildSignal({
        type:
          DNA_RECONCILIATION_SIGNAL_TYPES.RECOMMENDATION_FOLLOW_THROUGH,

        title:
          "Recommendation follow-through",

        aligned,

        level:
          notFollowed
            ? "HIGH"
            : partial
              ? "MEDIUM"
              : "LOW",

        message:
          notFollowed
            ? `The investor's real activity did not follow a prior Coach G recommendation${targetSector ? ` involving ${targetSector}` : ""}.`
            : partial
              ? "The investor partially followed a prior Coach G recommendation."
              : "Available evidence does not show material divergence from this recommendation.",

        evidence: {
          action,
          targetSector,
          observedOutcome:
            observed || null,
          recommendation:
            item
        },

        recommendationId,

        question:
          notFollowed
            ? `Coach G previously suggested ${action || "a portfolio change"}${targetSector ? ` involving ${targetSector}` : ""}, but your real activity moved differently. What influenced that decision?`
            : partial
              ? "You partially followed the earlier recommendation. What made you stop or change direction?"
              : null
      });
    });
}

export function buildTradingBehaviorSignal({
  initialDNA = {},
  realEvidence = {}
} = {}) {
  const behavior =
    safeObject(
      realEvidence?.behavior
    );

  const preferredStyle =
    upper(
      initialDNA?.preferredStyle
    );

  const highTurnover =
    behavior?.highTurnover === true;

  const holdingPeriod =
    upper(
      behavior?.holdingPeriodPattern ??
      behavior?.holdingPeriod
    );

  const longTermDNA =
    [
      "LONG_TERM",
      "BUY_AND_HOLD",
      "PATIENT"
    ].includes(preferredStyle) ||
    upper(initialDNA?.timeHorizon) === "LONG_TERM";

  const mismatch =
    longTermDNA &&
    (
      highTurnover ||
      [
        "SHORT",
        "SHORT_TERM"
      ].includes(holdingPeriod)
    );

  return buildSignal({
    type: DNA_RECONCILIATION_SIGNAL_TYPES.TRADING_BEHAVIOR,
    title: "Trading behavior",
    aligned: !mismatch,
    level: mismatch ? "MEDIUM" : "LOW",
    message: mismatch
      ? "Recent real trading behavior appears more active than the investor's initial long-term orientation."
      : "Current real trading behavior does not show a clear mismatch with the initial investing style.",
    evidence: {
      preferredStyle:
        preferredStyle || null,
      timeHorizon:
        upper(initialDNA?.timeHorizon),
      highTurnover,
      holdingPeriod:
        holdingPeriod || null
    },
    question: mismatch
      ? "You originally described a longer-term approach, but recent trading is more active. Are you intentionally changing your strategy?"
      : null
  });
}

export function buildLiquidityAlignmentSignal({
  realEvidence = {}
} = {}) {
  const portfolio =
    safeObject(
      realEvidence?.portfolio
    );

  const behavior =
    safeObject(
      realEvidence?.behavior
    );

  const totalValue =
    n(portfolio?.totalValue) || 0;

  const cash =
    n(portfolio?.availableCash) || 0;

  const cashPct =
    totalValue > 0
      ? (cash / totalValue) * 100
      : null;

  const cashPressure =
    behavior?.cashBufferConcern === true ||
    behavior?.liquidityPressure === true;

  return buildSignal({
    type: DNA_RECONCILIATION_SIGNAL_TYPES.LIQUIDITY_ALIGNMENT,
    title: "Liquidity alignment",
    aligned: !cashPressure,
    level: cashPressure ? "HIGH" : "LOW",
    message: cashPressure
      ? "Observed cash pressure may be interfering with the investor's long-term plan."
      : "Current evidence does not show a material liquidity conflict.",
    evidence: {
      availableCash:
        cash,
      cashPercentage:
        cashPct,
      cashPressure
    },
    question: cashPressure
      ? "Your recent cash position suggests some liquidity pressure. Has anything changed in your short-term financial needs?"
      : null
  });
}

export function buildInvestorDNAReconciliationSignals({
  initialDNA = {},
  realEvidence = {}
} = {}) {
  const signals = [
    buildGoalAlignmentSignal({
      initialDNA,
      realEvidence
    }),

    buildRiskAlignmentSignal({
      initialDNA,
      realEvidence
    }),

    buildSectorConcentrationSignal({
      realEvidence
    }),

    buildTradingBehaviorSignal({
      initialDNA,
      realEvidence
    }),

    buildLiquidityAlignmentSignal({
      realEvidence
    }),

    ...buildRecommendationFollowThroughSignals({
      realEvidence
    })
  ];

  return signals.sort(
    (a, b) =>
      rankLevel(b?.level) -
      rankLevel(a?.level)
  );
}

export function calculateInvestorDNAReconciliationScore({
  signals = []
} = {}) {
  const relevant =
    safeArray(signals)
      .filter(Boolean);

  if (!relevant.length) {
    return {
      score: null,
      status:
        DNA_RECONCILIATION_STATUSES.NOT_ENOUGH_DATA
    };
  }

  const weights = {
    HIGH: 20,
    MEDIUM: 10,
    LOW: 3
  };

  const penalty =
    relevant.reduce(
      (total, signal) =>
        total +
        (
          signal?.aligned
            ? 0
            : weights[signal?.level] || 0
        ),
      0
    );

  const score =
    Math.max(
      0,
      100 - penalty
    );

  let status =
    DNA_RECONCILIATION_STATUSES.ALIGNED;

  if (score < 55) {
    status =
      DNA_RECONCILIATION_STATUSES.MATERIAL_DRIFT;
  } else if (score < 75) {
    status =
      DNA_RECONCILIATION_STATUSES.DRIFTING;
  } else if (score < 90) {
    status =
      DNA_RECONCILIATION_STATUSES.WATCH;
  }

  return {
    score,
    status,
    penalty
  };
}

export function buildInvestorDNAReconciliationHypotheses({
  signals = []
} = {}) {
  return safeArray(signals)
    .filter(
      (signal) =>
        signal &&
        signal.aligned === false
    )
    .map((signal) => ({
      type: signal.type,

      hypothesis:
        signal.type ===
        DNA_RECONCILIATION_SIGNAL_TYPES.RECOMMENDATION_FOLLOW_THROUGH
          ? "The investor may have had information, constraints, preferences, or market views that Coach G did not know when the recommendation was made."
          : signal.type ===
            DNA_RECONCILIATION_SIGNAL_TYPES.SECTOR_CONCENTRATION
            ? "The concentration may be intentional, legacy exposure, driven by conviction, or caused by limited capital / transaction constraints."
            : signal.type ===
              DNA_RECONCILIATION_SIGNAL_TYPES.TRADING_BEHAVIOR
              ? "The investor's strategy may be evolving, or short-term decisions may be overriding the original long-term intention."
              : signal.type ===
                DNA_RECONCILIATION_SIGNAL_TYPES.LIQUIDITY_ALIGNMENT
                ? "A change in cash needs may be affecting the investor's ability to follow the original plan."
                : "The investor's circumstances, beliefs, or priorities may have changed since the initial DNA was created.",

      mustConfirmWithInvestor:
        true
    }));
}

export function buildCoachGDNAReconciliationQuestions({
  signals = []
} = {}) {
  const seen = new Set();

  return safeArray(signals)
    .filter(
      (signal) =>
        signal &&
        signal.aligned === false &&
        clean(signal?.question)
    )
    .map(
      (signal) =>
        clean(signal.question)
    )
    .filter((question) => {
      if (seen.has(question)) {
        return false;
      }

      seen.add(question);
      return true;
    });
}

export function buildInvestorDNAUpdateProposal({
  initialDNA = {},
  signals = [],
  confirmedClarifications = []
} = {}) {
  const confirmations =
    safeArray(
      confirmedClarifications
    );

  if (!confirmations.length) {
    return {
      shouldUpdate: false,
      reason:
        "Observed behavior alone is not enough to update Investor DNA. Coach G needs investor confirmation.",
      proposedChanges: [],
      safeguards: {
        automaticDNAChange: false
      }
    };
  }

  const proposedChanges =
    confirmations
      .filter(
        (item) =>
          item?.confirmed === true &&
          clean(item?.field)
      )
      .map((item) => ({
        field:
          clean(item.field),

        previousValue:
          initialDNA?.[
            item.field
          ] ?? null,

        proposedValue:
          item?.value ?? null,

        reason:
          clean(item?.reason) ||
          "Confirmed by investor during Coach G reconciliation.",

        confirmedByInvestor:
          true
      }));

  return {
    shouldUpdate:
      proposedChanges.length > 0,

    reason:
      proposedChanges.length
        ? "Investor-confirmed clarification supports a durable DNA update."
        : "No confirmed DNA changes are available.",

    proposedChanges,

    safeguards: {
      automaticDNAChange:
        false,

      requiresExplicitApply:
        true
    }
  };
}

export function buildInvestorDNAReconciliation({
  investorDNA = {},
  wealthBlueprint = {},
  realPortfolio = {},
  portfolioHealth = {},
  behavior = {},
  orderHistory = [],
  tradeHistory = [],
  recommendationHistory = [],
  wealthJourney = {},
  confirmedClarifications = []
} = {}) {
  const initialDNA =
    normalizeInitialInvestorDNA({
      investorDNA,
      wealthBlueprint
    });

  const realEvidence =
    normalizeRealInvestorEvidence({
      realPortfolio,
      portfolioHealth,
      behavior,
      orderHistory,
      tradeHistory,
      recommendationHistory,
      wealthJourney
    });

  const signals =
    buildInvestorDNAReconciliationSignals({
      initialDNA,
      realEvidence
    });

  const classification =
    calculateInvestorDNAReconciliationScore({
      signals
    });

  const hypotheses =
    buildInvestorDNAReconciliationHypotheses({
      signals
    });

  const questions =
    buildCoachGDNAReconciliationQuestions({
      signals
    });

  const dnaUpdateProposal =
    buildInvestorDNAUpdateProposal({
      initialDNA,
      signals,
      confirmedClarifications
    });

  return {
    generatedAt:
      new Date().toISOString(),

    initialDNA,

    realEvidence,

    signals,

    classification,

    hypotheses,

    coachG: {
      shouldDiscuss:
        classification?.status !==
          DNA_RECONCILIATION_STATUSES.ALIGNED ||
        questions.length > 0,

      questions,

      narrative:
        buildInvestorDNAReconciliationNarrative({
          initialDNA,
          classification,
          signals
        })
    },

    dnaUpdateProposal,

    safeguards: {
      practiceEvidenceAccepted:
        false,

      secondDNACreated:
        false,

      automaticDNAChange:
        false,

      observedBehaviorIsProofOfIntent:
        false,

      realEvidenceOnly:
        true
    }
  };
}

export function buildInvestorDNAReconciliationNarrative({
  initialDNA = {},
  classification = {},
  signals = []
} = {}) {
  const mismatches =
    safeArray(signals)
      .filter(
        (signal) =>
          signal?.aligned === false
      );

  if (
    classification?.status ===
    DNA_RECONCILIATION_STATUSES.NOT_ENOUGH_DATA
  ) {
    return "Coach G needs more real investing evidence before comparing current behavior with the investor's initial DNA.";
  }

  if (!mismatches.length) {
    return "Current real investing behavior is broadly consistent with the investor's initial DNA and plan. Coach G should continue monitoring for meaningful changes.";
  }

  const top =
    mismatches[0];

  return `Coach G found ${mismatches.length} real-investing signal(s) worth discussing. The highest-priority issue is ${top?.title || "a possible change in behavior"}. This is evidence to clarify with the investor, not proof that the original Investor DNA was wrong.`;
}

export function loadInvestorDNAReconciliationIssues(
  reconciliation = {}
) {
  return safeArray(
    reconciliation?.signals
  ).filter(
    (signal) =>
      signal?.aligned === false
  );
}

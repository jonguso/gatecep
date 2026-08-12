import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  buildUnifiedPortfolioAnalytics
} from "../analytics/unifiedPortfolioAnalyticsService";

import {
  buildBehaviorAnalytics
} from "../behavior-analytics/behaviorAnalyticsService";

import {
  buildPortfolioHealthScore
} from "../analytics/portfolioHealthScoreService";

import {
  INVESTOR_WEALTH_CONTEXT_DOMAINS,
  clearInvestorWealthContextProviders,
  registerInvestorWealthContextProvider
} from "./investorWealthContextService";

/*
 * ============================================================
 * PC-028H
 * REAL GATECEP SERVICE WIRING
 * ============================================================
 *
 * This file wires PC-028G to services confirmed to already exist
 * in the current GateCEP mobile codebase:
 *
 * - loadInvestorContext()
 * - buildUnifiedPortfolioAnalytics()
 * - buildBehaviorAnalytics()
 * - buildPortfolioHealthScore()
 *
 * We deliberately DO NOT invent order/trade loaders because the
 * inspection did not reveal a canonical investor order/trade history
 * service yet.
 *
 * Goals:
 * The existing investor context exposes goal information through the
 * stored profile / Investor DNA. We extract that evidence without
 * fabricating target amounts or dates.
 * ============================================================
 */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};
}

function clean(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function numberOrNull(value) {
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

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== null &&
      value !== undefined
  );
}

function normalizeGoalEvidence(
  rawGoal,
  investorContext = {}
) {
  if (!rawGoal) {
    return null;
  }

  if (
    typeof rawGoal ===
    "string"
  ) {
    return {
      id:
        null,

      name:
        rawGoal,

      targetAmount:
        null,

      targetDate:
        null,

      priority:
        "MEDIUM",

      currency:
        "KES",

      source:
        "INVESTOR_CONTEXT",

      completeness:
        "INTENT_ONLY"
    };
  }

  if (
    typeof rawGoal ===
    "object"
  ) {
    return {
      ...rawGoal,

      id:
        clean(
          rawGoal?.id ??
          rawGoal?.goalId
        ),

      name:
        clean(
          rawGoal?.name ??
          rawGoal?.title ??
          rawGoal?.goal
        ) ||
        "Financial Goal",

      targetAmount:
        numberOrNull(
          rawGoal?.targetAmount ??
          rawGoal?.targetValue ??
          rawGoal?.amount
        ),

      targetDate:
        clean(
          rawGoal?.targetDate ??
          rawGoal?.date
        ),

      priority:
        clean(
          rawGoal?.priority
        ) ||
        "MEDIUM",

      currency:
        clean(
          rawGoal?.currency
        ) ||
        "KES",

      source:
        "INVESTOR_CONTEXT",

      completeness:
        (
          numberOrNull(
            rawGoal?.targetAmount ??
            rawGoal?.targetValue ??
            rawGoal?.amount
          ) !== null &&
          clean(
            rawGoal?.targetDate ??
            rawGoal?.date
          )
        )
          ? "PLANNABLE"
          : "PARTIAL"
    };
  }

  return null;
}

export function extractGoalsFromInvestorContext(
  investorContext = {}
) {
  const dna =
    safeObject(
      investorContext
        ?.investorDNA
    );

  const profile =
    safeObject(
      investorContext
        ?.profile
    );

  const nestedProfile =
    safeObject(
      investorContext
        ?.investorProfile
    );

  const directGoals = [
    ...safeArray(
      investorContext
        ?.goals
    ),

    ...safeArray(
      profile?.goals
    ),

    ...safeArray(
      nestedProfile?.goals
    ),

    ...safeArray(
      dna?.goals
    )
  ];

  const singularGoal =
    firstDefined(
      investorContext?.goal,
      profile?.goal,
      nestedProfile?.goal,
      dna?.goal
    );

  if (singularGoal) {
    directGoals.push(
      singularGoal
    );
  }

  const normalized =
    directGoals
      .map(
        (goal) =>
          normalizeGoalEvidence(
            goal,
            investorContext
          )
      )
      .filter(Boolean);

  const deduped = [];

  normalized.forEach(
    (goal) => {
      const key =
        goal?.id ||
        `${goal?.name || ""}|${goal?.targetAmount || ""}|${goal?.targetDate || ""}`;

      if (
        !deduped.some(
          (item) =>
            item.key ===
            key
        )
      ) {
        deduped.push({
          key,
          goal
        });
      }
    }
  );

  return deduped.map(
    (item) =>
      item.goal
  );
}

export function adaptInvestorContextForWealthJourney(
  investorContext = {}
) {
  const investorDNA =
    safeObject(
      investorContext
        ?.investorDNA
    );

  return {
    investor: {
      id:
        clean(
          investorContext?.id ??
          investorContext?.userId ??
          investorContext?.investorId
        ),

      investorType:
        firstDefined(
          investorContext
            ?.investorType,
          investorDNA
            ?.investorType
        ) ||
        null,

      riskProfile:
        firstDefined(
          investorContext
            ?.riskProfile,
          investorDNA
            ?.riskProfile
        ) ||
        null
    },

    investorDNA,

    practicePortfolio:
      safeObject(
        investorContext
          ?.practicePortfolio
      ),

    hasInvestorDNA:
      Boolean(
        investorContext
          ?.hasInvestorDNA ??
        Object.keys(
          investorDNA
        ).length
      ),

    hasPracticePortfolio:
      Boolean(
        investorContext
          ?.hasPracticePortfolio ??
        safeArray(
          investorContext
            ?.practicePortfolio
            ?.holdings
        ).length
      ),

    goals:
      extractGoalsFromInvestorContext(
        investorContext
      )
  };
}

export function adaptUnifiedPortfolioAnalyticsForWealthJourney(
  analytics = {}
) {
  const portfolio =
    safeObject(
      analytics
        ?.portfolio
    );

  const practicePortfolio =
    safeObject(
      analytics
        ?.practicePortfolio
    );

  const holdings =
    safeArray(
      analytics?.holdings
    ).length
      ? safeArray(
          analytics?.holdings
        )
      : safeArray(
          portfolio?.holdings
        ).length
        ? safeArray(
            portfolio
              ?.holdings
          )
        : safeArray(
            practicePortfolio
              ?.holdings
          );

  const summary =
    safeObject(
      analytics
        ?.summary
    );

  const availableCash =
    firstDefined(
      numberOrNull(
        analytics
          ?.availableCash
      ),
      numberOrNull(
        summary
          ?.availableCash
      ),
      numberOrNull(
        portfolio
          ?.availableCash
      ),
      numberOrNull(
        practicePortfolio
          ?.availableCash
      ),
      0
    );

  const holdingsValue =
    firstDefined(
      numberOrNull(
        analytics
          ?.holdingsValue
      ),
      numberOrNull(
        summary
          ?.holdingsValue
      ),
      holdings.reduce(
        (
          total,
          holding
        ) =>
          total +
          (
            numberOrNull(
              holding
                ?.marketValue
            ) ||
            (
              (
                numberOrNull(
                  holding
                    ?.quantity
                ) ||
                0
              ) *
              (
                numberOrNull(
                  holding
                    ?.marketPrice ??
                  holding
                    ?.price
                ) ||
                0
              )
            )
          ),
        0
      )
    );

  const currentValue =
    firstDefined(
      numberOrNull(
        analytics
          ?.currentValue
      ),
      numberOrNull(
        analytics
          ?.totalValue
      ),
      numberOrNull(
        summary
          ?.totalValue
      ),
      holdingsValue !==
        null
        ? holdingsValue +
          (
            availableCash ||
            0
          )
        : null
    );

  return {
    portfolio: {
      ...portfolio,

      currentValue,

      totalMarketValue:
        holdingsValue,

      availableCash,

      holdings
    },

    cash: {
      availableCash
    },

    holdings
  };
}

export function adaptBehaviorAnalyticsForWealthJourney(
  analytics = {}
) {
  const behavior =
    safeObject(
      analytics
        ?.behavior
    );

  const summary =
    safeObject(
      analytics
        ?.summary
    );

  return {
    ...analytics,
    ...behavior,

    tradesPerMonth:
      firstDefined(
        numberOrNull(
          analytics
            ?.tradesPerMonth
        ),
        numberOrNull(
          behavior
            ?.tradesPerMonth
        ),
        numberOrNull(
          summary
            ?.tradesPerMonth
        )
      ),

    turnoverPercentage:
      firstDefined(
        numberOrNull(
          analytics
            ?.turnoverPercentage
        ),
        numberOrNull(
          behavior
            ?.turnoverPercentage
        ),
        numberOrNull(
          summary
            ?.turnoverPercentage
        )
      ),

    averageHoldingDays:
      firstDefined(
        numberOrNull(
          analytics
            ?.averageHoldingDays
        ),
        numberOrNull(
          behavior
            ?.averageHoldingDays
        ),
        numberOrNull(
          summary
            ?.averageHoldingDays
        )
      ),

    highTurnover:
      Boolean(
        analytics
          ?.highTurnover ??
        behavior
          ?.highTurnover ??
        (
          numberOrNull(
            analytics
              ?.turnoverPercentage
          ) >
          100
        )
      )
  };
}

export function adaptPortfolioHealthForWealthJourney(
  health = {}
) {
  const summary =
    safeObject(
      health
        ?.summary
    );

  const concentration =
    safeObject(
      health
        ?.concentration
    );

  const allocation =
    safeObject(
      health
        ?.allocation
    );

  return {
    ...health,

    score:
      firstDefined(
        numberOrNull(
          health
            ?.score
        ),
        numberOrNull(
          health
            ?.healthScore
        ),
        numberOrNull(
          summary
            ?.score
        )
      ),

    concentrationRisk:
      firstDefined(
        clean(
          health
            ?.concentrationRisk
        ),
        clean(
          concentration
            ?.risk
        ),
        clean(
          concentration
            ?.classification
        )
      ),

    topHoldingWeightPercentage:
      firstDefined(
        numberOrNull(
          health
            ?.topHoldingWeightPercentage
        ),
        numberOrNull(
          concentration
            ?.topHoldingWeightPercentage
        ),
        numberOrNull(
          concentration
            ?.largestHoldingPercentage
        )
      ),

    topSectorWeightPercentage:
      firstDefined(
        numberOrNull(
          health
            ?.topSectorWeightPercentage
        ),
        numberOrNull(
          concentration
            ?.topSectorWeightPercentage
        )
      ),

    driftPercentage:
      firstDefined(
        numberOrNull(
          health
            ?.driftPercentage
        ),
        numberOrNull(
          allocation
            ?.driftPercentage
        )
      )
  };
}

let contextCache = null;
let portfolioCache = null;
let behaviorCache = null;
let healthCache = null;

async function loadCachedInvestorContext() {
  if (!contextCache) {
    contextCache =
      loadInvestorContext()
        .then(
          (result) =>
            adaptInvestorContextForWealthJourney(
              result
            )
        );
  }

  return contextCache;
}

async function loadCachedPortfolio() {
  if (!portfolioCache) {
    portfolioCache =
      buildUnifiedPortfolioAnalytics()
        .then(
          (result) =>
            adaptUnifiedPortfolioAnalyticsForWealthJourney(
              result
            )
        );
  }

  return portfolioCache;
}

async function loadCachedBehavior() {
  if (!behaviorCache) {
    behaviorCache =
      buildBehaviorAnalytics()
        .then(
          (result) =>
            adaptBehaviorAnalyticsForWealthJourney(
              result
            )
        );
  }

  return behaviorCache;
}

async function loadCachedHealth() {
  if (!healthCache) {
    healthCache =
      buildPortfolioHealthScore()
        .then(
          (result) =>
            adaptPortfolioHealthForWealthJourney(
              result
            )
        );
  }

  return healthCache;
}

export function resetGatecepWealthJourneyProviderCache() {
  contextCache = null;
  portfolioCache = null;
  behaviorCache = null;
  healthCache = null;
}

export function registerRealGatecepWealthJourneyProviders({
  resetProviders = false
} = {}) {
  if (resetProviders) {
    clearInvestorWealthContextProviders();
  }

  resetGatecepWealthJourneyProviderCache();

  const registered = [];

  function register(
    domain,
    name,
    loader
  ) {
    registerInvestorWealthContextProvider({
      domain,
      name,
      loader
    });

    registered.push({
      domain,
      name
    });
  }

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .INVESTOR,
    "loadInvestorContext",
    async () => {
      const context =
        await loadCachedInvestorContext();

      return context
        .investor;
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .DNA,
    "loadInvestorContext.investorDNA",
    async () => {
      const context =
        await loadCachedInvestorContext();

      return context
        .investorDNA;
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .GOALS,
    "loadInvestorContext.goal",
    async () => {
      const context =
        await loadCachedInvestorContext();

      return context
        .goals;
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PRACTICE,
    "loadInvestorContext.practicePortfolio",
    async () => {
      const context =
        await loadCachedInvestorContext();

      return safeArray(
        context
          ?.practicePortfolio
          ?.holdings
      );
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PORTFOLIO,
    "buildUnifiedPortfolioAnalytics",
    async () => {
      const context =
        await loadCachedPortfolio();

      return context
        .portfolio;
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .CASH,
    "buildUnifiedPortfolioAnalytics.availableCash",
    async () => {
      const context =
        await loadCachedPortfolio();

      return context
        .cash;
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .HOLDINGS,
    "buildUnifiedPortfolioAnalytics.holdings",
    async () => {
      const context =
        await loadCachedPortfolio();

      return context
        .holdings;
    }
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .BEHAVIOR,
    "buildBehaviorAnalytics",
    async () =>
      loadCachedBehavior()
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PORTFOLIO_HEALTH,
    "buildPortfolioHealthScore",
    async () =>
      loadCachedHealth()
  );

  return {
    registeredCount:
      registered.length,

    registered,

    intentionallyUnwired: [
      {
        domain:
          INVESTOR_WEALTH_CONTEXT_DOMAINS
            .ORDERS,

        reason:
          "No canonical investor order-history loader was identified in the inspected code."
      },
      {
        domain:
          INVESTOR_WEALTH_CONTEXT_DOMAINS
            .TRADES,

        reason:
          "No canonical investor trade-history loader was identified in the inspected code."
      },
      {
        domain:
          INVESTOR_WEALTH_CONTEXT_DOMAINS
            .CONVERSATIONS,

        reason:
          "No canonical Coach G conversation-history loader was identified in the inspected code."
      },
      {
        domain:
          INVESTOR_WEALTH_CONTEXT_DOMAINS
            .LIFE_CHANGES,

        reason:
          "No canonical life-change history loader was identified in the inspected code."
      }
    ]
  };
}

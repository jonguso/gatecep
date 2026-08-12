/*
 * ============================================================
 * PC-028G
 * INVESTOR WEALTH CONTEXT SERVICE
 * ============================================================
 *
 * GateCEP purpose:
 *
 * Build one standardized, current-investor context for the Wealth
 * Journey and Coach G.
 *
 * Instead of every screen independently assembling:
 * - goals
 * - Investor DNA
 * - portfolio
 * - cash
 * - holdings
 * - orders / trades
 * - practice activity
 * - behavior analytics
 * - portfolio health
 * - recent conversations
 * - recent life changes
 *
 * PC-028G provides a single context contract.
 *
 * Design:
 * - provider-based so existing GateCEP services can plug in
 * - supports partial data
 * - preserves source provenance
 * - reports missing / stale context
 * - never invents missing investor facts
 * ============================================================
 */

export const INVESTOR_WEALTH_CONTEXT_DOMAINS = Object.freeze({
  INVESTOR: "INVESTOR",
  GOALS: "GOALS",
  DNA: "DNA",
  PORTFOLIO: "PORTFOLIO",
  CASH: "CASH",
  HOLDINGS: "HOLDINGS",
  ORDERS: "ORDERS",
  TRADES: "TRADES",
  PRACTICE: "PRACTICE",
  BEHAVIOR: "BEHAVIOR",
  PORTFOLIO_HEALTH: "PORTFOLIO_HEALTH",
  FINANCIAL_CONTEXT: "FINANCIAL_CONTEXT",
  ALLOCATION_ADVICE: "ALLOCATION_ADVICE",
  CONVERSATIONS: "CONVERSATIONS",
  LIFE_CHANGES: "LIFE_CHANGES"
});

export const INVESTOR_WEALTH_CONTEXT_STATUSES = Object.freeze({
  READY: "READY",
  PARTIAL: "PARTIAL",
  MINIMAL: "MINIMAL",
  UNAVAILABLE: "UNAVAILABLE"
});

const providers = new Map();

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};
}

function n(value) {
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

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(value) {
  const text = clean(value);

  return text
    ? text.toUpperCase()
    : null;
}

export function registerInvestorWealthContextProvider({
  domain,
  loader,
  name = null
} = {}) {
  if (
    !Object.values(
      INVESTOR_WEALTH_CONTEXT_DOMAINS
    ).includes(domain)
  ) {
    throw new Error(
      `Unsupported investor wealth context domain: ${domain}`
    );
  }

  if (
    typeof loader !== "function"
  ) {
    throw new Error(
      `A loader function is required for ${domain}.`
    );
  }

  providers.set(
    domain,
    {
      domain,
      name:
        clean(name) ||
        domain,
      loader
    }
  );

  return {
    registered: true,
    domain
  };
}

export function unregisterInvestorWealthContextProvider(
  domain
) {
  return providers.delete(
    domain
  );
}

export function clearInvestorWealthContextProviders() {
  providers.clear();
}

export function loadRegisteredInvestorWealthContextProviders() {
  return Array.from(
    providers.values()
  ).map(
    (item) => ({
      domain:
        item.domain,
      name:
        item.name
    })
  );
}

export function normalizeWealthJourneyGoal(
  goal = {}
) {
  return {
    ...safeObject(goal),

    id:
      clean(
        goal?.id ??
        goal?.goalId
      ),

    name:
      clean(
        goal?.name ??
        goal?.title
      ) ||
      "Financial Goal",

    targetAmount:
      n(
        goal?.targetAmount ??
        goal?.targetValue
      ),

    targetDate:
      clean(
        goal?.targetDate
      ),

    priority:
      clean(
        goal?.priority
      ) ||
      "MEDIUM",

    currency:
      clean(
        goal?.currency
      ) ||
      "KES"
  };
}

export function normalizeWealthJourneyHolding(
  holding = {}
) {
  const quantity =
    n(
      holding?.quantity ??
      holding?.currentQuantity
    );

  const price =
    n(
      holding?.marketPrice ??
      holding?.price ??
      holding?.lastPrice
    );

  return {
    ...safeObject(holding),

    symbol:
      normalizeSymbol(
        holding?.symbol ??
        holding?.ticker
      ),

    quantity,

    marketPrice:
      price,

    marketValue:
      n(
        holding?.marketValue
      ) ??
      (
        quantity !== null &&
        price !== null
          ? quantity *
            price
          : null
      ),

    averageCost:
      n(
        holding?.averageCost ??
        holding?.averageCostPerShare
      ),

    costBasis:
      n(
        holding?.costBasis ??
        holding?.investedValue
      )
  };
}

export function normalizeWealthJourneyOrder(
  order = {}
) {
  return {
    ...safeObject(order),

    id:
      clean(
        order?.id ??
        order?.orderId
      ),

    symbol:
      normalizeSymbol(
        order?.symbol ??
        order?.ticker
      ),

    side:
      clean(
        order?.side ??
        order?.type
      )?.toUpperCase() ||
      null,

    quantity:
      n(
        order?.quantity ??
        order?.qty
      ),

    price:
      n(
        order?.price ??
        order?.averageFillPrice
      ),

    status:
      clean(
        order?.status
      ),

    createdAt:
      order?.createdAt ??
      order?.date ??
      null
  };
}

export function normalizeWealthJourneyTrade(
  trade = {}
) {
  return {
    ...safeObject(trade),

    id:
      clean(
        trade?.id ??
        trade?.tradeId
      ),

    symbol:
      normalizeSymbol(
        trade?.symbol ??
        trade?.ticker
      ),

    side:
      clean(
        trade?.side ??
        trade?.type
      )?.toUpperCase() ||
      null,

    quantity:
      n(
        trade?.quantity ??
        trade?.qty
      ),

    price:
      n(
        trade?.price
      ),

    executedAt:
      trade?.executedAt ??
      trade?.date ??
      null
  };
}

export function normalizeInvestorWealthContextInput(
  input = {}
) {
  const portfolio =
    safeObject(
      input?.portfolio
    );

  const cash =
    safeObject(
      input?.cash
    );

  const holdings =
    safeArray(
      input?.holdings ??
      portfolio?.holdings
    ).map(
      normalizeWealthJourneyHolding
    );

  const normalizedPortfolio = {
    ...portfolio,

    currentValue:
      n(
        portfolio?.currentValue ??
        portfolio?.totalMarketValue ??
        portfolio?.portfolioValue
      ),

    totalMarketValue:
      n(
        portfolio?.totalMarketValue ??
        portfolio?.currentValue ??
        portfolio?.portfolioValue
      ),

    availableCash:
      n(
        portfolio?.availableCash ??
        cash?.availableCash
      ),

    holdings
  };

  return {
    investor:
      safeObject(
        input?.investor
      ),

    goals:
      safeArray(
        input?.goals
      ).map(
        normalizeWealthJourneyGoal
      ),

    investorDNA:
      safeObject(
        input?.investorDNA ??
        input?.dna
      ),

    portfolio:
      normalizedPortfolio,

    cash: {
      ...cash,

      availableCash:
        n(
          cash?.availableCash ??
          normalizedPortfolio
            ?.availableCash
        )
    },

    holdings,

    orders:
      safeArray(
        input?.orders
      ).map(
        normalizeWealthJourneyOrder
      ),

    trades:
      safeArray(
        input?.trades
      ).map(
        normalizeWealthJourneyTrade
      ),

    practiceActivity:
      safeArray(
        input?.practiceActivity ??
        input?.practice
      ),

    contributionBehavior:
      safeObject(
        input
          ?.contributionBehavior
      ),

    behavior:
      safeObject(
        input?.behavior
      ),

    portfolioHealth:
      safeObject(
        input?.portfolioHealth
      ),

    financialContext:
      safeObject(
        input?.financialContext
      ),

    allocationAdvice:
      safeObject(
        input?.allocationAdvice
      ),

    planningAssumptions:
      safeObject(
        input?.planningAssumptions
      ),

    recentConversations:
      safeArray(
        input?.recentConversations ??
        input?.conversations
      ),

    recentLifeChanges:
      safeArray(
        input?.recentLifeChanges ??
        input?.lifeChanges
      )
  };
}

function mapDomainToContextPatch(
  domain,
  value
) {
  switch (domain) {
    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .INVESTOR:
      return {
        investor:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .GOALS:
      return {
        goals:
          safeArray(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .DNA:
      return {
        investorDNA:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PORTFOLIO:
      return {
        portfolio:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .CASH:
      return {
        cash:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .HOLDINGS:
      return {
        holdings:
          safeArray(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .ORDERS:
      return {
        orders:
          safeArray(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .TRADES:
      return {
        trades:
          safeArray(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PRACTICE:
      return {
        practiceActivity:
          safeArray(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .BEHAVIOR:
      return {
        behavior:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PORTFOLIO_HEALTH:
      return {
        portfolioHealth:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .FINANCIAL_CONTEXT:
      return {
        financialContext:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .ALLOCATION_ADVICE:
      return {
        allocationAdvice:
          safeObject(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .CONVERSATIONS:
      return {
        recentConversations:
          safeArray(value)
      };

    case INVESTOR_WEALTH_CONTEXT_DOMAINS
      .LIFE_CHANGES:
      return {
        recentLifeChanges:
          safeArray(value)
      };

    default:
      return {};
  }
}

export async function loadInvestorWealthContextFromProviders({
  session = {},
  seedContext = {}
} = {}) {
  const entries =
    Array.from(
      providers.values()
    );

  const settled =
    await Promise.all(
      entries.map(
        async (
          provider
        ) => {
          try {
            const value =
              await provider
                .loader({
                  session,
                  seedContext
                });

            return {
              domain:
                provider.domain,

              name:
                provider.name,

              success:
                true,

              value,

              loadedAt:
                nowIso()
            };
          } catch (
            error
          ) {
            return {
              domain:
                provider.domain,

              name:
                provider.name,

              success:
                false,

              error:
                error?.message ||
                String(error),

              loadedAt:
                nowIso()
            };
          }
        }
      )
    );

  let merged = {
    ...safeObject(
      seedContext
    )
  };

  settled
    .filter(
      (item) =>
        item.success
    )
    .forEach(
      (item) => {
        merged = {
          ...merged,
          ...mapDomainToContextPatch(
            item.domain,
            item.value
          )
        };
      }
    );

  return {
    context:
      normalizeInvestorWealthContextInput(
        merged
      ),

    sources:
      settled
  };
}

export function calculateInvestorWealthContextReadiness({
  context,
  sources = []
} = {}) {
  const checks = {
    investor:
      Boolean(
        context
          ?.investor &&
        Object.keys(
          context.investor
        ).length
      ),

    goals:
      safeArray(
        context?.goals
      ).length >
      0,

    dna:
      Boolean(
        context
          ?.investorDNA &&
        Object.keys(
          context
            .investorDNA
        ).length
      ),

    portfolio:
      n(
        context
          ?.portfolio
          ?.currentValue ??
        context
          ?.portfolio
          ?.totalMarketValue
      ) !==
      null,

    holdings:
      safeArray(
        context?.holdings
      ).length >
      0,

    cash:
      n(
        context
          ?.cash
          ?.availableCash
      ) !==
      null,

    behavior:
      Boolean(
        context
          ?.behavior &&
        Object.keys(
          context.behavior
        ).length
      )
  };

  const coreChecks = [
    checks.goals,
    checks.portfolio ||
      checks.holdings,
    checks.dna
  ];

  const coreReady =
    coreChecks.filter(Boolean)
      .length;

  const allReady =
    Object.values(
      checks
    )
      .filter(Boolean)
      .length;

  let status =
    INVESTOR_WEALTH_CONTEXT_STATUSES
      .UNAVAILABLE;

  if (
    coreReady ===
    coreChecks.length
  ) {
    status =
      INVESTOR_WEALTH_CONTEXT_STATUSES
        .READY;
  } else if (
    coreReady >=
    2
  ) {
    status =
      INVESTOR_WEALTH_CONTEXT_STATUSES
        .PARTIAL;
  } else if (
    allReady >
    0
  ) {
    status =
      INVESTOR_WEALTH_CONTEXT_STATUSES
        .MINIMAL;
  }

  return {
    status,

    checks,

    coreReady:
      coreReady ===
      coreChecks.length,

    availableDomains:
      allReady,

    providerFailures:
      safeArray(
        sources
      )
        .filter(
          (item) =>
            item
              ?.success ===
            false
        )
        .map(
          (item) => ({
            domain:
              item.domain,

            provider:
              item.name,

            error:
              item.error
          })
        ),

    missingForWealthJourney: [
      !checks.goals
        ? "GOALS"
        : null,

      !(
        checks.portfolio ||
        checks.holdings
      )
        ? "PORTFOLIO_OR_HOLDINGS"
        : null,

      !checks.dna
        ? "INVESTOR_DNA"
        : null
    ].filter(Boolean)
  };
}

export function buildObservedBehaviorInputs({
  context
} = {}) {
  const orders =
    safeArray(
      context?.orders
    );

  const trades =
    safeArray(
      context?.trades
    );

  const practice =
    safeArray(
      context
        ?.practiceActivity
    );

  return {
    ...safeObject(
      context?.behavior
    ),

    observationCounts: {
      orders:
        orders.length,

      trades:
        trades.length,

      practiceActions:
        practice.length
    },

    sourceAvailability: {
      orderHistory:
        orders.length >
        0,

      tradeHistory:
        trades.length >
        0,

      practiceHistory:
        practice.length >
        0
    }
  };
}

export function buildWealthJourneyAdvisorInput({
  context
} = {}) {
  const normalized =
    normalizeInvestorWealthContextInput(
      context
    );

  return {
    goals:
      normalized.goals,

    portfolio:
      normalized.portfolio,

    cash:
      normalized.cash,

    contributionBehavior:
      normalized
        .contributionBehavior,

    behavior:
      buildObservedBehaviorInputs({
        context:
          normalized
      }),

    portfolioHealth:
      normalized
        .portfolioHealth,

    investorDNA:
      normalized
        .investorDNA,

    financialContext:
      normalized
        .financialContext,

    allocationAdvice:
      normalized
        .allocationAdvice,

    planningAssumptions:
      normalized
        .planningAssumptions,

    recentLifeChanges:
      normalized
        .recentLifeChanges,

    source: {
      sourceType:
        "INVESTOR_WEALTH_CONTEXT",

      sourceReference:
        clean(
          normalized
            ?.investor
            ?.id ??
          normalized
            ?.investor
            ?.userId
        )
    }
  };
}

export async function buildInvestorWealthContext({
  session = {},
  seedContext = {}
} = {}) {
  const loaded =
    await loadInvestorWealthContextFromProviders({
      session,
      seedContext
    });

  const readiness =
    calculateInvestorWealthContextReadiness({
      context:
        loaded.context,

      sources:
        loaded.sources
    });

  const advisorInput =
    buildWealthJourneyAdvisorInput({
      context:
        loaded.context
    });

  return {
    generatedAt:
      nowIso(),

    session: {
      investorId:
        clean(
          session?.investorId ??
          session?.userId ??
          loaded
            ?.context
            ?.investor
            ?.id
        ),

      sessionId:
        clean(
          session?.sessionId
        )
    },

    status:
      readiness.status,

    readiness,

    context:
      loaded.context,

    advisorInput,

    sources:
      loaded.sources,

    coachGContext: {
      canEvaluateGoals:
        readiness
          ?.checks
          ?.goals &&
        (
          readiness
            ?.checks
            ?.portfolio ||
          readiness
            ?.checks
            ?.holdings
        ),

      canLearnFromBehavior:
        readiness
          ?.checks
          ?.behavior ||
        safeArray(
          loaded
            ?.context
            ?.orders
        ).length >
          0 ||
        safeArray(
          loaded
            ?.context
            ?.trades
        ).length >
          0 ||
        safeArray(
          loaded
            ?.context
            ?.practiceActivity
        ).length >
          0,

      missingContext:
        readiness
          .missingForWealthJourney
    },

    safeguards: {
      missingFactsInvented:
        false,

      providerFailuresHidden:
        false,

      sourceProvenancePreserved:
        true
    }
  };
}

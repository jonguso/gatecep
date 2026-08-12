import {
  INVESTOR_WEALTH_CONTEXT_DOMAINS,
  registerInvestorWealthContextProvider
} from "./investorWealthContextService";

/*
 * ============================================================
 * PC-028G
 * EXISTING SERVICE REGISTRATION GUIDE
 * ============================================================
 *
 * This file intentionally does not import guessed GateCEP services.
 * Connect the REAL services already present in your project here.
 *
 * Example usage from app bootstrap:
 *
 * registerGatecepInvestorWealthContextProviders({
 *   loadInvestor,
 *   loadGoals,
 *   loadInvestorDNA,
 *   loadPortfolio,
 *   loadCash,
 *   loadHoldings,
 *   loadOrders,
 *   loadTrades,
 *   loadPracticeActivity,
 *   loadBehavior,
 *   loadPortfolioHealth,
 *   loadFinancialContext,
 *   loadAllocationAdvice,
 *   loadRecentConversations,
 *   loadRecentLifeChanges
 * });
 *
 * Each loader receives:
 *   { session, seedContext }
 * ============================================================
 */

export function registerGatecepInvestorWealthContextProviders(
  loaders = {}
) {
  const mapping = [
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.INVESTOR,
      "loadInvestor"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.GOALS,
      "loadGoals"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.DNA,
      "loadInvestorDNA"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.PORTFOLIO,
      "loadPortfolio"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.CASH,
      "loadCash"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.HOLDINGS,
      "loadHoldings"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.ORDERS,
      "loadOrders"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.TRADES,
      "loadTrades"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.PRACTICE,
      "loadPracticeActivity"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.BEHAVIOR,
      "loadBehavior"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.PORTFOLIO_HEALTH,
      "loadPortfolioHealth"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.FINANCIAL_CONTEXT,
      "loadFinancialContext"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.ALLOCATION_ADVICE,
      "loadAllocationAdvice"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.CONVERSATIONS,
      "loadRecentConversations"
    ],
    [
      INVESTOR_WEALTH_CONTEXT_DOMAINS.LIFE_CHANGES,
      "loadRecentLifeChanges"
    ]
  ];

  const registered = [];

  mapping.forEach(
    (
      [
        domain,
        loaderName
      ]
    ) => {
      const loader =
        loaders?.[
          loaderName
        ];

      if (
        typeof loader ===
        "function"
      ) {
        registerInvestorWealthContextProvider({
          domain,
          loader,
          name:
            loaderName
        });

        registered.push({
          domain,
          loaderName
        });
      }
    }
  );

  return {
    registeredCount:
      registered.length,

    registered
  };
}

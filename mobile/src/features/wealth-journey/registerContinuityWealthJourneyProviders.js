import {
  INVESTOR_WEALTH_CONTEXT_DOMAINS,
  clearInvestorWealthContextProviders,
  registerInvestorWealthContextProvider
} from "./investorWealthContextService";

import {
  loadContinuityWealthContext
} from "./wealthJourneyContinuityAdapter";

/*
 * PC-028K
 * Continuity-based provider registration.
 *
 * Replaces disconnected provider calls with one canonical journey load,
 * guaranteeing that Investor DNA and uploaded portfolio refer to the
 * same current investor journey.
 */

let cache = null;

async function loadBridge() {
  if (!cache) {
    cache =
      loadContinuityWealthContext({
        broker:
          "ALL"
      });
  }

  return cache;
}

export function resetContinuityWealthContextCache() {
  cache = null;
}

export function registerContinuityWealthJourneyProviders({
  resetProviders = true
} = {}) {
  if (resetProviders) {
    clearInvestorWealthContextProviders();
  }

  resetContinuityWealthContextCache();

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
    "journeyContinuity.investor",
    async () =>
      (
        await loadBridge()
      ).wealthContext
        .investor
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .DNA,
    "journeyContinuity.investorDNA",
    async () =>
      (
        await loadBridge()
      ).wealthContext
        .investorDNA
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .GOALS,
    "journeyContinuity.goals",
    async () =>
      (
        await loadBridge()
      ).wealthContext
        .goals
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .PORTFOLIO,
    "journeyContinuity.portfolio",
    async () =>
      (
        await loadBridge()
      ).wealthContext
        .portfolio
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .CASH,
    "journeyContinuity.cash",
    async () =>
      (
        await loadBridge()
      ).wealthContext
        .cash
  );

  register(
    INVESTOR_WEALTH_CONTEXT_DOMAINS
      .HOLDINGS,
    "journeyContinuity.holdings",
    async () =>
      (
        await loadBridge()
      ).wealthContext
        .holdings
  );

  return {
    registeredCount:
      registered.length,

    registered
  };
}

import {
  buildInvestorDNAReconciliation
} from "./investorDNAReconciliationEngine";

import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  loadCanonicalRealWealthMetrics
} from "./canonicalRealWealthMetricsService";

import {
  buildPortfolioHealthScore
} from "../analytics/portfolioHealthScoreService";

import {
  buildBehaviorAnalytics
} from "../behavior-analytics/behaviorAnalyticsService";

import {
  loadRealCurrentInvestorWealthJourney
} from "./realWealthJourneyRuntime";

import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";

import {
  reconcileRecommendationHistoryOutcomes
} from "./recommendationOutcomeReconciliationEngine";

/*
 * PC-028T runtime adapter.
 *
 * recommendationHistory, orderHistory and tradeHistory are intentionally
 * injectable because GateCEP currently has multiple execution/history stores.
 * The runtime does not guess or silently merge incompatible histories.
 */

export async function loadCurrentInvestorDNAReconciliation({
  recommendationHistory = null,
  orderHistory = null,
  tradeHistory = null,
  confirmedClarifications = []
} = {}) {
  const [
    investorContext,
    realWealth,
    portfolioHealth,
    behavior,
    wealthJourney,
    canonicalBehaviorHistory
  ] =
    await Promise.all([
      loadInvestorContext(),

      loadCanonicalRealWealthMetrics(),

      buildPortfolioHealthScore().catch(
        () => ({})
      ),

      buildBehaviorAnalytics().catch(
        () => ({})
      ),

      loadRealCurrentInvestorWealthJourney().catch(
        () => ({})
      ),

      loadCanonicalRealBehaviorHistory().catch(
        () => ({ recommendationHistory: [], orderHistory: [], tradeHistory: [], audit: null })
      )
    ]);

  return buildInvestorDNAReconciliation({
    investorDNA:
      investorContext?.investorDNA || {},

    wealthBlueprint:
      investorContext?.wealthBlueprint || {},

    realPortfolio: {
      totalValue:
        realWealth?.netWorth ?? null,

      holdingsValue:
        realWealth?.holdingsValue ?? null,

      availableCash:
        realWealth?.availableCash ?? null,

      holdings:
        realWealth?.holdings || []
    },

    portfolioHealth,

    behavior,

    recommendationHistory:
      reconcileRecommendationHistoryOutcomes({
        recommendationHistory:
          Array.isArray(recommendationHistory)
            ? recommendationHistory
            : canonicalBehaviorHistory?.recommendationHistory || [],

        orderHistory:
          Array.isArray(orderHistory)
            ? orderHistory
            : canonicalBehaviorHistory?.orderHistory || [],

        tradeHistory:
          Array.isArray(tradeHistory)
            ? tradeHistory
            : canonicalBehaviorHistory?.tradeHistory || []
      }),

    orderHistory:
      Array.isArray(orderHistory)
        ? orderHistory
        : canonicalBehaviorHistory?.orderHistory || [],

    tradeHistory:
      Array.isArray(tradeHistory)
        ? tradeHistory
        : canonicalBehaviorHistory?.tradeHistory || [],

    wealthJourney,

    confirmedClarifications
  });
}

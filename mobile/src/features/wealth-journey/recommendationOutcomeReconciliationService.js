import {
  loadCanonicalRealBehaviorHistory
} from "./canonicalRealBehaviorHistoryService";

import {
  reconcileRecommendationHistoryOutcomes,
  buildRecommendationOutcomeSummary
} from "./recommendationOutcomeReconciliationEngine";

export async function loadReconciledCoachGRecommendationHistory() {
  const history =
    await loadCanonicalRealBehaviorHistory();

  const recommendations =
    reconcileRecommendationHistoryOutcomes({
      recommendationHistory:
        history?.recommendationHistory || [],

      orderHistory:
        history?.orderHistory || [],

      tradeHistory:
        history?.tradeHistory || []
    });

  return {
    recommendations,

    summary:
      buildRecommendationOutcomeSummary({
        reconciledRecommendations:
          recommendations
      }),

    historyAudit:
      history?.audit || null,

    sources:
      history?.sources || {}
  };
}

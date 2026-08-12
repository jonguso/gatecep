import {
  loadCurrentInvestorDNAReconciliation
} from "./investorDNAReconciliationRuntime";

import {
  loadInvestorDNAReconciliationClarifications
} from "./investorDNAReconciliationConversationStore";

import {
  buildClarificationResolutionContext
} from "./clarificationResolutionEngine";

export async function loadCurrentClarificationResolutionContext() {
  const [
    reconciliation,
    clarifications
  ] =
    await Promise.all([
      loadCurrentInvestorDNAReconciliation(),
      loadInvestorDNAReconciliationClarifications()
    ]);

  return buildClarificationResolutionContext({
    reconciliation,
    clarifications
  });
}

export async function loadCurrentDNAUpdateReviewProposal() {
  const context =
    await loadCurrentClarificationResolutionContext();

  return (
    context?.dnaUpdateReview || {
      shouldReview: false,
      status:
        "NO_DNA_UPDATE_REVIEW_REQUIRED",
      candidates: []
    }
  );
}

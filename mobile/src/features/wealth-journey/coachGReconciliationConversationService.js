import {
  loadCurrentInvestorDNAReconciliation
} from "./investorDNAReconciliationRuntime";

import {
  buildCoachGReconciliationConversation,
  buildReconciliationResponseOptions,
  buildDNAClarificationEvidence
} from "./coachGReconciliationConversationEngine";

import {
  loadInvestorDNAReconciliationClarifications,
  saveInvestorDNAReconciliationClarification
} from "./investorDNAReconciliationConversationStore";

import {
  buildDNAReconciliationSignalFingerprint,
  buildClarificationResolutionContext
} from "./clarificationResolutionEngine";

export async function loadCurrentCoachGReconciliationConversation() {
  const [
    reconciliation,
    clarifications
  ] =
    await Promise.all([
      loadCurrentInvestorDNAReconciliation(),
      loadInvestorDNAReconciliationClarifications()
    ]);

  const clarificationResolution =
    buildClarificationResolutionContext({
      reconciliation,
      clarifications
    });

  const resolvedReconciliation =
    clarificationResolution
      ?.resolvedReconciliation ||
    reconciliation;

  const conversation =
    buildCoachGReconciliationConversation({
      reconciliation:
        resolvedReconciliation
    });

  return {
    reconciliation:
      resolvedReconciliation,

    originalReconciliation:
      reconciliation,

    clarificationResolution,

    dnaUpdateReview:
      clarificationResolution
        ?.dnaUpdateReview || null,

    conversation,

    responseOptions:
      conversation?.activeSignal
        ? buildReconciliationResponseOptions({
            signal:
              conversation.activeSignal
          })
        : []
  };
}

export async function submitCoachGReconciliationClarification({
  signal = {},
  responseType,
  responseText = null
} = {}) {
  const evidence =
    buildDNAClarificationEvidence({
      signal,
      responseType,
      responseText
    });

  if (evidence?.valid) {
    evidence.signalFingerprint =
      buildDNAReconciliationSignalFingerprint(
        signal
      );
  }

  if (!evidence?.valid) {
    return evidence;
  }

  const saved =
    await saveInvestorDNAReconciliationClarification(
      evidence
    );

  return {
    success: true,
    clarification: saved
  };
}

export async function loadConfirmedDNAReconciliationClarifications() {
  return loadInvestorDNAReconciliationClarifications();
}

/*
 * PC-028Y
 * CLARIFICATION RESOLUTION & DNA UPDATE DECISION ENGINE
 */

export const CLARIFICATION_RESOLUTION_STATUSES = Object.freeze({
  UNRESOLVED: "UNRESOLVED",
  RESOLVED_NO_DNA_CHANGE: "RESOLVED_NO_DNA_CHANGE",
  RESOLVED_MONITOR: "RESOLVED_MONITOR",
  NEEDS_FOLLOW_UP: "NEEDS_FOLLOW_UP",
  DNA_UPDATE_REVIEW_REQUIRED: "DNA_UPDATE_REVIEW_REQUIRED"
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function upper(value) {
  return clean(value)?.toUpperCase() || null;
}

function stablePart(value) {
  return (
    clean(value)
      ?.toUpperCase()
      ?.replace(/\s+/g, "_")
      ?.replace(/[^A-Z0-9_-]/g, "")
    || "NA"
  );
}

export function buildDNAReconciliationSignalFingerprint(signal = {}) {
  const evidence = signal?.evidence || {};
  const recommendation = evidence?.recommendation || {};

  const recommendationId =
    signal?.recommendationId ||
    recommendation?.id ||
    recommendation?.recommendationId ||
    null;

  const sector =
    evidence?.targetSector ||
    evidence?.largestSector ||
    recommendation?.targetSector ||
    recommendation?.sector ||
    null;

  const symbol =
    evidence?.symbol ||
    recommendation?.symbol ||
    null;

  return [
    stablePart(signal?.type),
    stablePart(recommendationId),
    stablePart(sector),
    stablePart(symbol),
    stablePart(signal?.title)
  ].join("|");
}

export function buildClarificationSignalFingerprint(clarification = {}) {
  return (
    clean(clarification?.signalFingerprint) ||
    buildDNAReconciliationSignalFingerprint(
      clarification?.evidence?.originalSignal || {}
    )
  );
}

export function classifyClarificationResolution(clarification = {}) {
  const responseType = upper(clarification?.responseType);
  const materiality = upper(clarification?.materiality);
  const maySupportDNAUpdate =
    clarification?.maySupportDNAUpdate === true;

  if (
    [
      "TEMPORARY_DECISION",
      "CONSTRAINT_PREVENTED_ACTION",
      "DID_NOT_UNDERSTAND"
    ].includes(responseType)
  ) {
    return {
      status:
        CLARIFICATION_RESOLUTION_STATUSES.RESOLVED_NO_DNA_CHANGE,
      resolved: true,
      suppressRepeatQuestion: true,
      shouldMonitor: true,
      shouldCreateDNAUpdateReview: false,
      reason:
        "The investor's explanation indicates the observed behavior should not currently redefine Investor DNA."
    };
  }

  if (responseType === "CIRCUMSTANCES_CHANGED") {
    return {
      status:
        CLARIFICATION_RESOLUTION_STATUSES.DNA_UPDATE_REVIEW_REQUIRED,
      resolved: true,
      suppressRepeatQuestion: true,
      shouldMonitor: true,
      shouldCreateDNAUpdateReview: true,
      reason:
        "The investor confirmed that circumstances changed. Coach G should explicitly review which Investor DNA fields, goals, or planning assumptions may need updating."
    };
  }

  if (
    [
      "INTENTIONAL",
      "DISAGREED_WITH_RECOMMENDATION"
    ].includes(responseType)
  ) {
    return {
      status:
        CLARIFICATION_RESOLUTION_STATUSES.RESOLVED_MONITOR,
      resolved: true,
      suppressRepeatQuestion: true,
      shouldMonitor: true,
      shouldCreateDNAUpdateReview:
        maySupportDNAUpdate &&
        materiality === "HIGH",
      reason:
        "The investor confirmed a deliberate choice. Coach G should monitor for repeated or explicit evidence before treating this as a durable DNA change."
    };
  }

  if (responseType === "OTHER") {
    const hasExplanation =
      Boolean(clean(clarification?.responseText));

    return {
      status:
        hasExplanation
          ? CLARIFICATION_RESOLUTION_STATUSES.NEEDS_FOLLOW_UP
          : CLARIFICATION_RESOLUTION_STATUSES.UNRESOLVED,
      resolved: false,
      suppressRepeatQuestion: false,
      shouldMonitor: true,
      shouldCreateDNAUpdateReview: false,
      reason:
        hasExplanation
          ? "The investor provided context, but Coach G needs a more specific follow-up before resolving the signal."
          : "No usable clarification was provided."
    };
  }

  return {
    status:
      CLARIFICATION_RESOLUTION_STATUSES.UNRESOLVED,
    resolved: false,
    suppressRepeatQuestion: false,
    shouldMonitor: false,
    shouldCreateDNAUpdateReview: false,
    reason:
      "The clarification does not yet provide enough evidence to resolve this signal."
  };
}

function newestClarificationForSignal({
  signal,
  clarifications = []
} = {}) {
  const fingerprint =
    buildDNAReconciliationSignalFingerprint(signal);

  const matches =
    safeArray(clarifications)
      .filter(
        (clarification) =>
          buildClarificationSignalFingerprint(clarification) ===
          fingerprint
      )
      .sort(
        (a, b) =>
          (Date.parse(b?.confirmedAt || b?.savedAt || "") || 0) -
          (Date.parse(a?.confirmedAt || a?.savedAt || "") || 0)
      );

  return matches[0] || null;
}

export function resolveDNAReconciliationSignals({
  reconciliation = {},
  clarifications = []
} = {}) {
  const signals = safeArray(reconciliation?.signals);

  const resolvedSignals =
    signals.map((signal) => {
      const clarification =
        newestClarificationForSignal({
          signal,
          clarifications
        });

      if (!clarification) {
        return {
          ...signal,
          resolution: {
            status:
              CLARIFICATION_RESOLUTION_STATUSES.UNRESOLVED,
            resolved: false,
            suppressRepeatQuestion: false
          }
        };
      }

      const resolution =
        classifyClarificationResolution(clarification);

      return {
        ...signal,
        clarification,
        resolution,
        signalFingerprint:
          buildDNAReconciliationSignalFingerprint(signal)
      };
    });

  const activeSignals =
    resolvedSignals.filter(
      (signal) =>
        signal?.aligned === false &&
        signal?.resolution?.suppressRepeatQuestion !== true
    );

  const resolvedIssues =
    resolvedSignals.filter(
      (signal) =>
        signal?.resolution?.resolved === true
    );

  return {
    ...reconciliation,
    signals: activeSignals,
    allSignals: resolvedSignals,
    resolutionSummary: {
      totalSignals: resolvedSignals.length,
      activeIssues: activeSignals.length,
      resolvedIssues: resolvedIssues.length,
      dnaUpdateReviewsRequired:
        resolvedSignals.filter(
          (signal) =>
            signal?.resolution?.shouldCreateDNAUpdateReview === true
        ).length
    },
    resolvedIssues
  };
}

function inferReviewDomains(signal = {}) {
  switch (signal?.type) {
    case "GOAL_ALIGNMENT":
      return [
        "goal",
        "target",
        "timeline",
        "priority",
        "contribution capacity"
      ];

    case "RISK_ALIGNMENT":
      return [
        "risk profile",
        "risk tolerance"
      ];

    case "TRADING_BEHAVIOR":
      return [
        "investment style",
        "time horizon"
      ];

    case "LIQUIDITY_ALIGNMENT":
      return [
        "liquidity preference",
        "cash needs",
        "contribution capacity"
      ];

    case "RECOMMENDATION_FOLLOW_THROUGH":
      return [
        "investment preferences",
        "portfolio constraints",
        "strategy conviction"
      ];

    case "SECTOR_CONCENTRATION":
      return [
        "sector preferences",
        "concentration tolerance",
        "portfolio constraints"
      ];

    default:
      return [
        "Investor DNA",
        "planning assumptions"
      ];
  }
}

export function buildExplicitDNAUpdateReviewProposal({
  resolvedReconciliation = {}
} = {}) {
  const candidates =
    safeArray(resolvedReconciliation?.allSignals)
      .filter(
        (signal) =>
          signal?.resolution?.shouldCreateDNAUpdateReview === true
      )
      .map((signal) => ({
        signalFingerprint:
          signal?.signalFingerprint ||
          buildDNAReconciliationSignalFingerprint(signal),

        signalType:
          signal?.type || null,

        title:
          signal?.title ||
          "Investor DNA review",

        investorExplanation:
          clean(signal?.clarification?.responseText),

        responseType:
          signal?.clarification?.responseType || null,

        reason:
          signal?.resolution?.reason || null,

        requestedReview:
          inferReviewDomains(signal),

        investorConfirmed:
          signal?.clarification?.confirmedByInvestor === true
      }));

  return {
    shouldReview:
      candidates.length > 0,

    status:
      candidates.length
        ? "REVIEW_REQUIRED"
        : "NO_DNA_UPDATE_REVIEW_REQUIRED",

    candidates,

    instructions:
      candidates.length
        ? "Coach G should review the candidate domains with the investor and ask for explicit field-level confirmation before any Investor DNA update is applied."
        : "No clarification currently requires an Investor DNA update review.",

    safeguards: {
      automaticDNAChange: false,
      explicitFieldConfirmationRequired: true,
      secondDNACreated: false,
      practiceEvidenceUsed: false
    }
  };
}

export function buildClarificationResolutionContext({
  reconciliation = {},
  clarifications = []
} = {}) {
  const resolvedReconciliation =
    resolveDNAReconciliationSignals({
      reconciliation,
      clarifications
    });

  const dnaUpdateReview =
    buildExplicitDNAUpdateReviewProposal({
      resolvedReconciliation
    });

  return {
    resolvedReconciliation,
    dnaUpdateReview,
    safeguards: {
      clarificationClosesRepeatedQuestion: true,
      automaticDNAChange: false,
      practiceEvidenceUsed: false
    }
  };
}

export const RECONCILIATION_CONVERSATION_STATES = Object.freeze({
  NOT_REQUIRED: "NOT_REQUIRED",
  READY: "READY",
  WAITING_FOR_RESPONSE: "WAITING_FOR_RESPONSE",
  CLARIFIED: "CLARIFIED",
  RESOLVED: "RESOLVED"
});

export const RECONCILIATION_RESPONSE_TYPES = Object.freeze({
  INTENTIONAL: "INTENTIONAL",
  CIRCUMSTANCES_CHANGED: "CIRCUMSTANCES_CHANGED",
  TEMPORARY_DECISION: "TEMPORARY_DECISION",
  DID_NOT_UNDERSTAND: "DID_NOT_UNDERSTAND",
  DISAGREED_WITH_RECOMMENDATION: "DISAGREED_WITH_RECOMMENDATION",
  CONSTRAINT_PREVENTED_ACTION: "CONSTRAINT_PREVENTED_ACTION",
  OTHER: "OTHER"
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function rank(level) {
  return { HIGH: 3, MEDIUM: 2, LOW: 1 }[String(level || "").toUpperCase()] || 0;
}

function signalPriority(signal = {}) {
  let score = rank(signal?.level) * 100;

  if (signal?.aligned === false) score += 50;
  if (signal?.type === "RECOMMENDATION_FOLLOW_THROUGH") score += 40;
  if (signal?.type === "SECTOR_CONCENTRATION") score += 30;
  if (signal?.type === "GOAL_ALIGNMENT") score += 25;
  if (signal?.type === "RISK_ALIGNMENT") score += 20;

  return score;
}

export function prioritizeDNAReconciliationSignals({
  reconciliation = {}
} = {}) {
  return safeArray(reconciliation?.signals)
    .filter((signal) => signal && signal.aligned === false)
    .sort((a, b) => signalPriority(b) - signalPriority(a));
}

function buildFollowThroughQuestion(signal = {}) {
  const evidence = signal?.evidence || {};
  const recommendation = evidence?.recommendation || {};
  const targetSector =
    evidence?.targetSector ||
    recommendation?.targetSector ||
    recommendation?.sector ||
    null;

  const action =
    evidence?.action ||
    recommendation?.action ||
    recommendation?.recommendedAction ||
    "the earlier recommendation";

  return {
    opener:
      "I noticed something worth understanding before we change your plan.",

    observation:
      targetSector
        ? `Earlier, we discussed ${action} involving ${targetSector}, but your real investing activity moved differently.`
        : "Your recent real investing activity moved differently from an earlier Coach G recommendation.",

    question:
      targetSector
        ? `What influenced your decision around ${targetSector}?`
        : "What influenced that decision?",

    whyItMatters:
      "Your answer helps Coach G understand whether this was intentional, temporary, or evidence that your circumstances or preferences have changed."
  };
}

function buildConcentrationQuestion(signal = {}) {
  const evidence = signal?.evidence || {};
  const sector = evidence?.largestSector || null;
  const weight = evidence?.largestSectorWeight;

  return {
    opener:
      "Your portfolio concentration is worth discussing before Coach G recommends another change.",

    observation:
      sector
        ? `${sector} is currently one of the largest concentrations in your real portfolio${weight !== null && weight !== undefined ? ` at about ${Number(weight).toFixed(1)}%` : ""}.`
        : "Your real portfolio remains concentrated in a relatively small part of the market.",

    question:
      sector
        ? `Is your concentration in ${sector} deliberate, or is there another reason it has remained high?`
        : "Is this concentration deliberate, or is there another reason it has remained high?",

    whyItMatters:
      "Coach G should understand whether the exposure reflects conviction, legacy holdings, limited capital, transaction constraints, or something else."
  };
}

function buildGoalQuestion(signal = {}) {
  const evidence = signal?.evidence || {};

  return {
    opener:
      "Your goal is still the anchor for this conversation.",

    observation:
      evidence?.goal
        ? `Your current real investing path appears different from the plan for ${evidence.goal}.`
        : "Your current real investing path appears different from the goal plan we previously discussed.",

    question:
      "Has the goal, timeline, contribution ability, or priority changed since we made the plan?",

    whyItMatters:
      "A changed goal should change the plan; temporary behavior should not automatically change your Investor DNA."
  };
}

function buildRiskQuestion(signal = {}) {
  return {
    opener:
      "Your recent investing pattern looks somewhat different from the risk approach we first discussed.",

    observation:
      signal?.message ||
      "Observed real investing behavior may be more aggressive than your initial risk profile.",

    question:
      "Is that change intentional, or has something changed in how comfortable you are with investment risk?",

    whyItMatters:
      "Coach G needs to distinguish a genuine change in risk preference from a short-term decision or market reaction."
  };
}

function buildLiquidityQuestion(signal = {}) {
  return {
    opener:
      "Cash flexibility can affect whether an investment plan is practical.",

    observation:
      signal?.message ||
      "Your recent cash position may be affecting the original plan.",

    question:
      "Have your short-term cash needs changed, or is this only temporary?",

    whyItMatters:
      "Coach G should not push higher contributions or portfolio changes without understanding your liquidity needs."
  };
}

function buildTradingBehaviorQuestion(signal = {}) {
  return {
    opener:
      "Your recent trading pattern is worth understanding.",

    observation:
      signal?.message ||
      "Your real trading behavior appears more active than the approach we originally discussed.",

    question:
      "Are you intentionally changing your investing style, or were these trades driven by a specific short-term situation?",

    whyItMatters:
      "A temporary trading episode should not automatically redefine your long-term Investor DNA."
  };
}

export function buildCoachGReconciliationPromptForSignal(signal = {}) {
  switch (signal?.type) {
    case "RECOMMENDATION_FOLLOW_THROUGH":
      return buildFollowThroughQuestion(signal);
    case "SECTOR_CONCENTRATION":
      return buildConcentrationQuestion(signal);
    case "GOAL_ALIGNMENT":
      return buildGoalQuestion(signal);
    case "RISK_ALIGNMENT":
      return buildRiskQuestion(signal);
    case "LIQUIDITY_ALIGNMENT":
      return buildLiquidityQuestion(signal);
    case "TRADING_BEHAVIOR":
      return buildTradingBehaviorQuestion(signal);
    default:
      return {
        opener:
          "I noticed a difference between your original plan and your recent real investing activity.",
        observation:
          signal?.message || "There is a behavior signal worth clarifying.",
        question:
          signal?.question || "What changed, if anything?",
        whyItMatters:
          "Coach G should understand the reason before changing your plan or Investor DNA."
      };
  }
}

export function buildCoachGReconciliationConversation({
  reconciliation = {}
} = {}) {
  const prioritized =
    prioritizeDNAReconciliationSignals({ reconciliation });

  if (!prioritized.length) {
    return {
      state:
        RECONCILIATION_CONVERSATION_STATES.NOT_REQUIRED,
      activeSignal: null,
      prompt: null,
      remainingSignals: [],
      summary:
        "No material Investor DNA reconciliation issue currently requires discussion."
    };
  }

  const activeSignal = prioritized[0];
  const prompt =
    buildCoachGReconciliationPromptForSignal(activeSignal);

  return {
    state:
      RECONCILIATION_CONVERSATION_STATES.READY,
    activeSignal,
    prompt,
    remainingSignals:
      prioritized.slice(1),
    totalIssues:
      prioritized.length,
    summary:
      `Coach G has ${prioritized.length} real-investing issue(s) to clarify, starting with ${activeSignal?.title || "the highest-priority issue"}.`,
    safeguards: {
      oneIssueAtATime: true,
      practiceEvidenceUsed: false,
      conclusionBeforeClarification: false,
      automaticDNAChange: false
    }
  };
}

export function buildReconciliationResponseOptions({
  signal = {}
} = {}) {
  const options = [
    {
      type: RECONCILIATION_RESPONSE_TYPES.INTENTIONAL,
      label: "It was intentional"
    },
    {
      type: RECONCILIATION_RESPONSE_TYPES.CIRCUMSTANCES_CHANGED,
      label: "My circumstances changed"
    },
    {
      type: RECONCILIATION_RESPONSE_TYPES.TEMPORARY_DECISION,
      label: "It was temporary"
    },
    {
      type: RECONCILIATION_RESPONSE_TYPES.CONSTRAINT_PREVENTED_ACTION,
      label: "Something prevented me"
    },
    {
      type: RECONCILIATION_RESPONSE_TYPES.DISAGREED_WITH_RECOMMENDATION,
      label: "I chose a different approach"
    },
    {
      type: RECONCILIATION_RESPONSE_TYPES.OTHER,
      label: "Something else"
    }
  ];

  if (signal?.type === "RECOMMENDATION_FOLLOW_THROUGH") {
    options.splice(4, 0, {
      type: RECONCILIATION_RESPONSE_TYPES.DID_NOT_UNDERSTAND,
      label: "I wasn't clear on the recommendation"
    });
  }

  return options;
}

export function normalizeInvestorReconciliationResponse({
  signal = {},
  responseType,
  responseText = null,
  at = new Date().toISOString()
} = {}) {
  const type = clean(responseType);

  if (!type) {
    return {
      valid: false,
      reason:
        "A reconciliation response type is required."
    };
  }

  return {
    valid: true,
    signalType:
      signal?.type || null,
    signalTitle:
      signal?.title || null,
    responseType:
      type,
    responseText:
      clean(responseText),
    confirmedAt:
      at,
    confirmedByInvestor:
      true,
    evidence: {
      originalSignal:
        signal
    }
  };
}

export function classifyClarificationDNAMateriality(
  clarification = {}
) {
  switch (clarification?.responseType) {
    case RECONCILIATION_RESPONSE_TYPES.CIRCUMSTANCES_CHANGED:
      return {
        materiality: "HIGH",
        maySupportDNAUpdate: true,
        reason:
          "The investor confirmed that circumstances changed."
      };

    case RECONCILIATION_RESPONSE_TYPES.INTENTIONAL:
    case RECONCILIATION_RESPONSE_TYPES.DISAGREED_WITH_RECOMMENDATION:
      return {
        materiality: "MEDIUM",
        maySupportDNAUpdate: true,
        reason:
          "The investor confirmed a deliberate choice that may reveal durable preferences, but Coach G still needs enough repeated or explicit evidence."
      };

    case RECONCILIATION_RESPONSE_TYPES.TEMPORARY_DECISION:
    case RECONCILIATION_RESPONSE_TYPES.CONSTRAINT_PREVENTED_ACTION:
    case RECONCILIATION_RESPONSE_TYPES.DID_NOT_UNDERSTAND:
      return {
        materiality: "LOW",
        maySupportDNAUpdate: false,
        reason:
          "The explanation suggests the observed behavior should not currently redefine Investor DNA."
      };

    default:
      return {
        materiality: "UNKNOWN",
        maySupportDNAUpdate: false,
        reason:
          "Coach G needs more context before considering a durable DNA update."
      };
  }
}

export function buildDNAClarificationEvidence({
  signal = {},
  responseType,
  responseText = null,
  at = new Date().toISOString()
} = {}) {
  const clarification =
    normalizeInvestorReconciliationResponse({
      signal,
      responseType,
      responseText,
      at
    });

  if (!clarification?.valid) {
    return clarification;
  }

  const materiality =
    classifyClarificationDNAMateriality(clarification);

  return {
    ...clarification,
    ...materiality,
    source:
      "COACH_G_RECONCILIATION_CONVERSATION",
    safeguards: {
      investorConfirmed: true,
      automaticDNAChange: false,
      practiceEvidenceUsed: false
    }
  };
}

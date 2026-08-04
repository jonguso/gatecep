import {
  FUNDAMENTAL_OPERATIONS_LEVELS,
  buildFundamentalOperationsHealth
} from "./fundamentalOperationsHealthService";

/*
 * ============================================================
 * PC-026C
 * COACH G FUNDAMENTAL OPERATIONS ADVISOR
 * ============================================================
 *
 * Converts PC-026B operational health into:
 *
 * - Coach G executive recommendations,
 * - prioritized operational actions,
 * - concise executive narratives,
 * - workflow-specific guidance,
 * - direct route links,
 * - high-priority insight loaders.
 *
 * Safeguards:
 *
 * - advisory only,
 * - never verifies or approves filings,
 * - never promotes unapproved records,
 * - never fabricates financial data,
 * - preserves PC-026B priority ordering.
 * ============================================================
 */

export const COACH_G_OPERATIONS_ADVICE_TYPES = {
  DATA_COVERAGE: "DATA_COVERAGE",
  DATA_QUALITY: "DATA_QUALITY",
  FILING_REVIEW: "FILING_REVIEW",
  DUPLICATE_CONTROL: "DUPLICATE_CONTROL",
  SUBMISSION_RECOVERY: "SUBMISSION_RECOVERY",
  GOVERNANCE: "GOVERNANCE",
  MONITORING: "MONITORING"
};

export const COACH_G_OPERATIONS_ACTION_STATUSES = {
  OPEN: "OPEN",
  MONITOR: "MONITOR",
  COMPLETE: "COMPLETE"
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function number(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function rankLevel(level) {
  const rank = {
    CRITICAL:
      5,

    HIGH:
      4,

    MEDIUM:
      3,

    LOW:
      2,

    INFO:
      1
  };

  return rank[
    normalizeCode(level)
  ] || 0;
}

function mapAdviceType(
  priority
) {
  const id =
    normalizeCode(
      priority?.id
    );

  if (
    id.includes(
      "RESEARCH"
    )
  ) {
    return COACH_G_OPERATIONS_ADVICE_TYPES
      .DATA_COVERAGE;
  }

  if (
    id.includes(
      "QUALITY"
    ) ||
    id.includes(
      "WARNING"
    )
  ) {
    return COACH_G_OPERATIONS_ADVICE_TYPES
      .DATA_QUALITY;
  }

  if (
    id.includes(
      "FILING_REVIEW"
    ) ||
    id.includes(
      "REJECTED"
    )
  ) {
    return COACH_G_OPERATIONS_ADVICE_TYPES
      .FILING_REVIEW;
  }

  if (
    id.includes(
      "DUPLICATE"
    )
  ) {
    return COACH_G_OPERATIONS_ADVICE_TYPES
      .DUPLICATE_CONTROL;
  }

  if (
    id.includes(
      "SUBMISSION"
    )
  ) {
    return COACH_G_OPERATIONS_ADVICE_TYPES
      .SUBMISSION_RECOVERY;
  }

  return COACH_G_OPERATIONS_ADVICE_TYPES
    .GOVERNANCE;
}

function buildActionReason(
  priority,
  health
) {
  const id =
    normalizeCode(
      priority?.id
    );

  if (
    id ===
    "RESEARCH_READY_ZERO"
  ) {
    return `None of the ${number(
      health
        ?.repository
        ?.totalRecords
    )} repository records is currently research ready.`;
  }

  if (
    id ===
    "LOW_RESEARCH_COVERAGE"
  ) {
    return `Research readiness is ${number(
      health
        ?.repository
        ?.researchReadinessPercentage
    )}%, below the operating target.`;
  }

  if (
    id ===
    "PENDING_FILING_REVIEW"
  ) {
    return `${number(
      health
        ?.filings
        ?.pendingReviewFilings
    )} filing(s) are awaiting verification or approval.`;
  }

  if (
    id ===
    "DUPLICATE_FILINGS"
  ) {
    return `${number(
      health
        ?.filings
        ?.duplicateFilings
    )} duplicate or revision filing alert(s) are active.`;
  }

  if (
    id ===
    "FAILED_SUBMISSIONS"
  ) {
    return `${number(
      health
        ?.submissions
        ?.failed
    )} filing submission(s) failed.`;
  }

  if (
    id ===
    "BLOCKED_DUPLICATE_SUBMISSIONS"
  ) {
    return `${number(
      health
        ?.submissions
        ?.duplicateReview
    )} filing submission(s) are blocked for duplicate review.`;
  }

  if (
    id ===
    "REPOSITORY_WARNINGS"
  ) {
    return `${number(
      health
        ?.repository
        ?.warningRecords
    )} repository record(s) contain validation or quality warnings.`;
  }

  return priority?.message ||
    "Operational review is required.";
}

function buildActionSteps(
  priority
) {
  const id =
    normalizeCode(
      priority?.id
    );

  if (
    id ===
    "RESEARCH_READY_ZERO" ||
    id ===
    "LOW_RESEARCH_COVERAGE"
  ) {
    return [
      "Open the fundamental import or extraction workspace.",
      "Load verified annual-report values with source references.",
      "Submit the filing into controlled review.",
      "Approve and promote only after validation."
    ];
  }

  if (
    id ===
    "PENDING_FILING_REVIEW"
  ) {
    return [
      "Open the verified filing review queue.",
      "Review source documents and extraction warnings.",
      "Verify records that are supported by evidence.",
      "Approve and promote only after all checks pass."
    ];
  }

  if (
    id ===
    "DUPLICATE_FILINGS" ||
    id ===
    "BLOCKED_DUPLICATE_SUBMISSIONS"
  ) {
    return [
      "Compare the filing period, revision number, and content hash.",
      "Link the record to an existing filing or create a controlled revision.",
      "Use duplicate override only when the filing is intentionally distinct.",
      "Preserve the resolution note in the audit history."
    ];
  }

  if (
    id ===
    "FAILED_SUBMISSIONS"
  ) {
    return [
      "Open filing submission history.",
      "Review the stored validation error and payload snapshot.",
      "Correct the filing-ready JSON where required.",
      "Retry the submission and confirm the new filing receipt."
    ];
  }

  if (
    id ===
    "REPOSITORY_WARNINGS"
  ) {
    return [
      "Open the fundamental import dashboard.",
      "Review missing fields and validation warnings.",
      "Add verified source data without converting blanks to zero.",
      "Re-run repository quality checks."
    ];
  }

  return [
    "Open the linked workflow.",
    "Review the supporting operational details.",
    "Complete the required action.",
    "Refresh the operations health service."
  ];
}

export function buildCoachGFundamentalOperationsAction({
  priority,
  health,
  position = 0
} = {}) {
  return {
    id:
      priority?.id ||
      `OPERATIONS_ACTION_${position + 1}`,

    rank:
      position + 1,

    type:
      mapAdviceType(
        priority
      ),

    level:
      priority?.level ||
      FUNDAMENTAL_OPERATIONS_LEVELS
        .INFO,

    title:
      priority?.title ||
      "Review Fundamental Operations",

    recommendation:
      priority?.message ||
      "Review the fundamental-data workflow.",

    reason:
      buildActionReason(
        priority,
        health
      ),

    steps:
      buildActionSteps(
        priority
      ),

    route:
      priority?.route ||
      "/fundamental-operations-center",

    routeParams:
      priority?.routeParams ||
      null,

    actionLabel:
      priority?.actionLabel ||
      "Open Workflow",

    status:
      COACH_G_OPERATIONS_ACTION_STATUSES
        .OPEN,

    priorityScore:
      rankLevel(
        priority?.level
      ) * 20 -
      position,

    advisoryOnly:
      true
  };
}

function buildStrengths(
  health
) {
  const strengths = [];

  if (
    number(
      health
        ?.submissions
        ?.failed
    ) === 0
  ) {
    strengths.push({
      id:
        "NO_SUBMISSION_FAILURES",

      title:
        "Submission Pipeline Stable",

      message:
        "No failed filing submissions are currently recorded."
    });
  }

  if (
    number(
      health
        ?.filings
        ?.duplicateFilings
    ) === 0
  ) {
    strengths.push({
      id:
        "NO_DUPLICATE_FILINGS",

      title:
        "No Active Filing Duplicates",

      message:
        "No duplicate or revision filing alert is currently active."
    });
  }

  if (
    number(
      health
        ?.filings
        ?.pendingReviewFilings
    ) === 0
  ) {
    strengths.push({
      id:
        "NO_REVIEW_BACKLOG",

      title:
        "No Filing Review Backlog",

      message:
        "There are no filings awaiting verification or approval."
    });
  }

  if (
    number(
      health
        ?.repository
        ?.researchReadinessPercentage
    ) >= 80
  ) {
    strengths.push({
      id:
        "STRONG_RESEARCH_COVERAGE",

      title:
        "Strong Research Coverage",

      message:
        `${health.repository.researchReadinessPercentage}% of repository records are research ready.`
    });
  }

  return strengths;
}

function buildWeaknesses(
  health
) {
  const weaknesses = [];

  if (
    number(
      health
        ?.repository
        ?.researchReadyRecords
    ) === 0
  ) {
    weaknesses.push({
      id:
        "NO_RESEARCH_READY_RECORDS",

      level:
        "CRITICAL",

      title:
        "Research Coverage Is Empty",

      message:
        "The valuation and research engines cannot operate fully until verified fundamentals are promoted."
    });
  }

  if (
    number(
      health
        ?.repository
        ?.warningRecords
    ) > 0
  ) {
    weaknesses.push({
      id:
        "DATA_QUALITY_WARNINGS",

      level:
        "MEDIUM",

      title:
        "Repository Warnings Require Review",

      message:
        `${health.repository.warningRecords} record(s) contain quality or validation warnings.`
    });
  }

  if (
    number(
      health
        ?.submissions
        ?.failed
    ) > 0
  ) {
    weaknesses.push({
      id:
        "FAILED_SUBMISSION_WORK",

      level:
        "HIGH",

      title:
        "Submission Recovery Required",

      message:
        `${health.submissions.failed} submission(s) failed and require correction or retry.`
    });
  }

  return weaknesses;
}

function buildCoachGNarrative({
  health,
  actions,
  strengths,
  weaknesses
}) {
  const topAction =
    actions[0];

  const score =
    number(
      health?.overallScore
    );

  const classification =
    health
      ?.classification
      ?.label ||
    "Unknown";

  const repositoryText =
    `${number(
      health
        ?.repository
        ?.researchReadyRecords
    )} of ${number(
      health
        ?.repository
        ?.totalRecords
    )} repository records are research ready`;

  const workflowText =
    `${number(
      health
        ?.filings
        ?.pendingReviewFilings
    )} filing(s) await review and ${number(
      health
        ?.submissions
        ?.failed
    )} submission failure(s) are active`;

  const nextAction =
    topAction
      ? `The highest-priority action is ${topAction.title.toLowerCase()}.`
      : "No immediate operational action is required.";

  return `The fundamental operations score is ${score}/100, rated ${classification}. ${repositoryText}. ${workflowText}. ${nextAction} The service is advisory and does not automatically approve or promote financial data.`;
}

export async function buildCoachGFundamentalOperationsAdvice() {
  const health =
    await buildFundamentalOperationsHealth();

  const actions =
    safeArray(
      health?.priorities
    )
      .map(
        (
          priority,
          index
        ) =>
          buildCoachGFundamentalOperationsAction({
            priority,
            health,
            position:
              index
          })
      )
      .sort(
        (
          first,
          second
        ) =>
          second.priorityScore -
          first.priorityScore
      );

  const strengths =
    buildStrengths(
      health
    );

  const weaknesses =
    buildWeaknesses(
      health
    );

  const criticalActions =
    actions.filter(
      (action) =>
        action.level ===
        FUNDAMENTAL_OPERATIONS_LEVELS
          .CRITICAL
    );

  const highActions =
    actions.filter(
      (action) =>
        action.level ===
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH
    );

  const narrative =
    buildCoachGNarrative({
      health,
      actions,
      strengths,
      weaknesses
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    advisor:
      "Coach G",

    operationsScore:
      health.overallScore,

    classification:
      health.classification,

    executiveStatus: {
      label:
        health
          .classification
          .label,

      actionLevel:
        health
          .classification
          .actionLevel,

      actionRequired:
        health
          .classification
          .actionRequired,

      criticalActionCount:
        criticalActions.length,

      highActionCount:
        highActions.length
    },

    repository:
      health.repository,

    filings:
      health.filings,

    submissions:
      health.submissions,

    strengths,

    weaknesses,

    actions,

    criticalActions,

    highActions,

    topAction:
      actions[0] ||
      null,

    alerts:
      health.alerts,

    narrative,

    safeguards:
      health.safeguards
  };
}

export async function buildCoachGFundamentalOperationsSummary() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return {
    generatedAt:
      advice.generatedAt,

    advisor:
      advice.advisor,

    operationsScore:
      advice.operationsScore,

    status:
      advice
        .classification
        .status,

    label:
      advice
        .classification
        .label,

    actionLevel:
      advice
        .classification
        .actionLevel,

    actionRequired:
      advice
        .classification
        .actionRequired,

    criticalActions:
      advice
        .criticalActions
        .length,

    highActions:
      advice
        .highActions
        .length,

    topAction:
      advice.topAction,

    strengthCount:
      advice.strengths.length,

    weaknessCount:
      advice.weaknesses.length,

    narrative:
      advice.narrative
  };
}

export async function loadCoachGFundamentalOperationsActions() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.actions;
}

export async function loadCoachGCriticalFundamentalOperationsActions() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.criticalActions;
}

export async function loadCoachGHighPriorityFundamentalOperationsActions() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return [
    ...advice.criticalActions,
    ...advice.highActions
  ];
}

export async function loadCoachGTopFundamentalOperationsAction() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.topAction;
}

export async function loadCoachGFundamentalOperationsStrengths() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.strengths;
}

export async function loadCoachGFundamentalOperationsWeaknesses() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.weaknesses;
}

export async function loadCoachGFundamentalOperationsNarrative() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.narrative;
}

export async function loadCoachGFundamentalOperationsAlerts() {
  const advice =
    await buildCoachGFundamentalOperationsAdvice();

  return advice.alerts;
}

import {
  loadFundamentalRecords,
  loadFundamentalRepositoryMetadata
} from "../fundamentalRepository";

import {
  buildVerifiedFilingSummary,
  loadDuplicateVerifiedFilings,
  loadPendingVerifiedFilings,
  loadVerifiedFilings
} from "../filings/verifiedFilingDatasetManager";

import {
  buildFilingSubmissionHistorySummary,
  loadFilingSubmissionHistory
} from "../filings/filingSubmissionHistoryService";

/*
 * ============================================================
 * PC-026B
 * FUNDAMENTAL OPERATIONS HEALTH SERVICE
 * ============================================================
 *
 * Moves the operational calculations from PC-026A into a
 * reusable service for:
 *
 * - Coach G,
 * - executive dashboards,
 * - notifications,
 * - background monitoring,
 * - mobile and web operations screens.
 *
 * Provides:
 *
 * - repository readiness analysis,
 * - filing workflow analysis,
 * - submission workflow analysis,
 * - operations score and classification,
 * - actionable priorities,
 * - operational alerts,
 * - executive summary,
 * - focused loader functions.
 * ============================================================
 */

export const FUNDAMENTAL_OPERATIONS_LEVELS = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO"
};

export const FUNDAMENTAL_OPERATIONS_STATUSES = {
  CRITICAL_REVIEW: "CRITICAL_REVIEW",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
  OPERATIONAL: "OPERATIONAL",
  STRONG: "STRONG"
};

export const FUNDAMENTAL_OPERATIONS_ALERT_TYPES = {
  RESEARCH_READINESS: "RESEARCH_READINESS",
  DATA_QUALITY: "DATA_QUALITY",
  FILING_REVIEW: "FILING_REVIEW",
  DUPLICATE_FILING: "DUPLICATE_FILING",
  SUBMISSION_FAILURE: "SUBMISSION_FAILURE",
  DUPLICATE_SUBMISSION: "DUPLICATE_SUBMISSION",
  REJECTED_FILING: "REJECTED_FILING",
  SYSTEM: "SYSTEM"
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

function roundWhole(value) {
  return Math.round(
    number(value)
  );
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.max(
    minimum,
    Math.min(
      maximum,
      value
    )
  );
}

function isResearchReady(
  record
) {
  return Boolean(
    record?.earningsPerShare !== null &&
      record?.earningsPerShare !== undefined ||
    record?.bookValuePerShare !== null &&
      record?.bookValuePerShare !== undefined ||
    record?.freeCashFlowPerShare !== null &&
      record?.freeCashFlowPerShare !== undefined ||
    record?.revenue !== null &&
      record?.revenue !== undefined
  );
}

function hasWarnings(
  record
) {
  return (
    safeArray(
      record?.dataQuality?.warnings
    ).length > 0 ||
    safeArray(
      record?.validation?.warnings
    ).length > 0 ||
    safeArray(
      record?.warnings
    ).length > 0
  );
}

export function buildRepositoryOperationsAnalysis({
  records = [],
  metadata = null
} = {}) {
  const normalized =
    safeArray(records);

  const researchReady =
    normalized.filter(
      isResearchReady
    );

  const identityOnly =
    normalized.filter(
      (record) =>
        !isResearchReady(record)
    );

  const warningRecords =
    normalized.filter(
      hasWarnings
    );

  const qualityScores =
    normalized
      .map(
        (record) =>
          Number(
            record?.dataQualityScore
          )
      )
      .filter(
        Number.isFinite
      );

  const averageQuality =
    qualityScores.length
      ? qualityScores.reduce(
          (total, value) =>
            total + value,
          0
        ) /
        qualityScores.length
      : 0;

  const readinessPercentage =
    normalized.length
      ? (
          researchReady.length /
          normalized.length
        ) *
        100
      : 0;

  return {
    totalRecords:
      normalized.length,

    researchReadyRecords:
      researchReady.length,

    identityOnlyRecords:
      identityOnly.length,

    warningRecords:
      warningRecords.length,

    averageDataQualityScore:
      roundWhole(
        averageQuality
      ),

    researchReadinessPercentage:
      roundWhole(
        readinessPercentage
      ),

    seedVersion:
      metadata?.seedVersion ||
      null,

    schemaVersion:
      metadata?.schemaVersion ??
      null,

    researchReadySymbols:
      researchReady.map(
        (record) =>
          record?.symbol
      ),

    identityOnlySymbols:
      identityOnly.map(
        (record) =>
          record?.symbol
      ),

    warningSymbols:
      warningRecords.map(
        (record) =>
          record?.symbol
      )
  };
}

export function buildFilingOperationsAnalysis({
  filings = [],
  summary = null,
  pendingFilings = [],
  duplicateFilings = []
} = {}) {
  const normalizedFilings =
    safeArray(filings);

  const pending =
    safeArray(
      pendingFilings
    );

  const duplicates =
    safeArray(
      duplicateFilings
    );

  return {
    totalFilings:
      summary?.total ??
      normalizedFilings.length,

    draftFilings:
      summary?.draft ??
      0,

    pendingReviewFilings:
      summary?.pendingReview ??
      pending.length,

    verifiedFilings:
      summary?.verified ??
      0,

    approvedFilings:
      summary?.approved ??
      0,

    rejectedFilings:
      summary?.rejected ??
      0,

    supersededFilings:
      summary?.superseded ??
      0,

    duplicateFilings:
      summary?.duplicates ??
      duplicates.length,

    pendingFilings:
      pending,

    duplicateRecords:
      duplicates
  };
}

export function buildSubmissionOperationsAnalysis({
  history = [],
  summary = null
} = {}) {
  const normalized =
    safeArray(history);

  return {
    totalSubmissions:
      summary?.total ??
      normalized.length,

    submitted:
      summary?.submitted ??
      0,

    failed:
      summary?.failed ??
      0,

    invalid:
      summary?.invalid ??
      0,

    duplicateReview:
      summary?.duplicateReview ??
      0,

    retried:
      summary?.retried ??
      0,

    linkedFilings:
      summary?.linkedFilings ??
      0,

    recentSubmissions:
      normalized.slice(
        0,
        10
      )
  };
}

export function calculateFundamentalOperationsScore({
  repository,
  filings,
  submissions
} = {}) {
  const readiness =
    number(
      repository
        ?.researchReadinessPercentage
    );

  const quality =
    number(
      repository
        ?.averageDataQualityScore
    );

  const filingPenalty =
    Math.min(
      number(
        filings
          ?.pendingReviewFilings
      ) * 4 +
      number(
        filings
          ?.duplicateFilings
      ) * 6,
      25
    );

  const submissionPenalty =
    Math.min(
      number(
        submissions
          ?.failed
      ) * 6 +
      number(
        submissions
          ?.duplicateReview
      ) * 5,
      20
    );

  const warningPenalty =
    Math.min(
      number(
        repository
          ?.warningRecords
      ) * 2,
      15
    );

  const score =
    readiness * 0.45 +
    quality * 0.25 +
    30 -
    filingPenalty -
    submissionPenalty -
    warningPenalty;

  return clamp(
    roundWhole(score),
    0,
    100
  );
}

export function buildFundamentalOperationsPriorities({
  repository,
  filings,
  submissions
} = {}) {
  const priorities = [];

  if (
    number(
      repository
        ?.researchReadyRecords
    ) === 0
  ) {
    priorities.push({
      id:
        "RESEARCH_READY_ZERO",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .RESEARCH_READINESS,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .CRITICAL,

      title:
        "Populate Research-Ready Fundamentals",

      message:
        "No repository record currently contains sufficient financial evidence for research valuation.",

      route:
        "/fundamental-import",

      actionLabel:
        "Open Import Dashboard"
    });
  } else if (
    number(
      repository
        ?.researchReadinessPercentage
    ) < 50
  ) {
    priorities.push({
      id:
        "LOW_RESEARCH_COVERAGE",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .RESEARCH_READINESS,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH,

      title:
        "Increase Research Coverage",

      message:
        `Only ${number(
          repository
            ?.researchReadinessPercentage
        )}% of repository records are research ready.`,

      route:
        "/fundamental-import",

      actionLabel:
        "Import Verified Data"
    });
  }

  if (
    number(
      filings
        ?.pendingReviewFilings
    ) > 0
  ) {
    priorities.push({
      id:
        "PENDING_FILING_REVIEW",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .FILING_REVIEW,

      level:
        number(
          filings
            ?.pendingReviewFilings
        ) >= 5
          ? FUNDAMENTAL_OPERATIONS_LEVELS
              .HIGH
          : FUNDAMENTAL_OPERATIONS_LEVELS
              .MEDIUM,

      title:
        "Process Filing Review Queue",

      message:
        `${number(
          filings
            ?.pendingReviewFilings
        )} filing(s) are awaiting verification or approval.`,

      route:
        "/verified-filings",

      actionLabel:
        "Open Review Queue"
    });
  }

  if (
    number(
      filings
        ?.duplicateFilings
    ) > 0
  ) {
    priorities.push({
      id:
        "DUPLICATE_FILINGS",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .DUPLICATE_FILING,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH,

      title:
        "Resolve Duplicate Filings",

      message:
        `${number(
          filings
            ?.duplicateFilings
        )} duplicate or revision warning(s) require controlled review.`,

      route:
        "/verified-filings",

      actionLabel:
        "Review Duplicates"
    });
  }

  if (
    number(
      submissions?.failed
    ) > 0
  ) {
    priorities.push({
      id:
        "FAILED_SUBMISSIONS",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .SUBMISSION_FAILURE,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH,

      title:
        "Retry Failed Submissions",

      message:
        `${number(
          submissions?.failed
        )} filing submission(s) failed and may require correction or retry.`,

      route:
        "/filing-submission-history",

      actionLabel:
        "Open Submission History"
    });
  }

  if (
    number(
      submissions
        ?.duplicateReview
    ) > 0
  ) {
    priorities.push({
      id:
        "BLOCKED_DUPLICATE_SUBMISSIONS",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .DUPLICATE_SUBMISSION,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH,

      title:
        "Resolve Blocked Submissions",

      message:
        `${number(
          submissions
            ?.duplicateReview
        )} submission(s) are blocked for duplicate review.`,

      route:
        "/filing-submission-history",

      actionLabel:
        "Resolve Duplicate Blocks"
    });
  }

  if (
    number(
      repository
        ?.warningRecords
    ) > 0
  ) {
    priorities.push({
      id:
        "REPOSITORY_WARNINGS",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .DATA_QUALITY,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .MEDIUM,

      title:
        "Review Data-Quality Warnings",

      message:
        `${number(
          repository
            ?.warningRecords
        )} repository record(s) contain data-quality or validation warnings.`,

      route:
        "/fundamental-import",

      actionLabel:
        "Review Repository"
    });
  }

  if (
    number(
      filings
        ?.rejectedFilings
    ) > 0
  ) {
    priorities.push({
      id:
        "REJECTED_FILINGS",

      type:
        FUNDAMENTAL_OPERATIONS_ALERT_TYPES
          .REJECTED_FILING,

      level:
        FUNDAMENTAL_OPERATIONS_LEVELS
          .LOW,

      title:
        "Review Rejected Filing History",

      message:
        `${number(
          filings
            ?.rejectedFilings
        )} filing(s) were rejected and remain available for revision or audit.`,

      route:
        "/verified-filings",

      actionLabel:
        "Open Filing Register"
    });
  }

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

  return priorities.sort(
    (
      first,
      second
    ) =>
      rank[second.level] -
      rank[first.level]
  );
}

export function classifyFundamentalOperationsHealth({
  score,
  priorities = []
} = {}) {
  const normalizedScore =
    clamp(
      number(score),
      0,
      100
    );

  const critical =
    safeArray(
      priorities
    ).some(
      (priority) =>
        priority.level ===
        FUNDAMENTAL_OPERATIONS_LEVELS
          .CRITICAL
    );

  const highCount =
    safeArray(
      priorities
    ).filter(
      (priority) =>
        priority.level ===
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH
    ).length;

  if (
    critical ||
    normalizedScore < 35
  ) {
    return {
      status:
        FUNDAMENTAL_OPERATIONS_STATUSES
          .CRITICAL_REVIEW,

      label:
        "Critical Review",

      actionLevel:
        "Immediate Action",

      actionRequired:
        true,

      message:
        "Fundamental-data coverage or workflow controls require immediate attention."
    };
  }

  if (
    highCount >= 2 ||
    normalizedScore < 60
  ) {
    return {
      status:
        FUNDAMENTAL_OPERATIONS_STATUSES
          .NEEDS_ATTENTION,

      label:
        "Needs Attention",

      actionLevel:
        "Priority Review",

      actionRequired:
        true,

      message:
        "Several operational issues should be resolved before expanding research coverage."
    };
  }

  if (
    normalizedScore < 80
  ) {
    return {
      status:
        FUNDAMENTAL_OPERATIONS_STATUSES
          .OPERATIONAL,

      label:
        "Operational",

      actionLevel:
        "Monitor",

      actionRequired:
        false,

      message:
        "The workflow is operational, with manageable quality or review tasks remaining."
    };
  }

  return {
    status:
      FUNDAMENTAL_OPERATIONS_STATUSES
        .STRONG,

    label:
      "Strong",

    actionLevel:
      "Normal Operations",

    actionRequired:
      false,

    message:
      "Fundamental-data quality and workflow controls are operating at a strong level."
  };
}

export function buildFundamentalOperationsAlerts({
  priorities = [],
  filings,
  submissions
} = {}) {
  const alerts =
    safeArray(
      priorities
    ).map(
      (priority) => ({
        id:
          priority.id,

        type:
          priority.type,

        level:
          priority.level,

        title:
          priority.title,

        message:
          priority.message,

        route:
          priority.route,

        actionLabel:
          priority.actionLabel,

        source:
          "FUNDAMENTAL_OPERATIONS"
      })
    );

  safeArray(
    filings
      ?.pendingFilings
  )
    .slice(
      0,
      5
    )
    .forEach(
      (filing) => {
        alerts.push({
          id:
            `FILING-${filing.id}`,

          type:
            FUNDAMENTAL_OPERATIONS_ALERT_TYPES
              .FILING_REVIEW,

          level:
            FUNDAMENTAL_OPERATIONS_LEVELS
              .MEDIUM,

          title:
            `${filing.symbol} Filing Awaiting Action`,

          message:
            `${filing.filingType || "Filing"} for FY ${filing.fiscalYear ?? "N/A"} is ${filing.status || "pending"}.`,

          route:
            "/verified-filings",

          routeParams: {
            filingId:
              filing.id
          },

          source:
            "VERIFIED_FILINGS"
        });
      }
    );

  safeArray(
    submissions
      ?.recentSubmissions
  )
    .filter(
      (entry) =>
        entry?.historyStatus ===
          "FAILED" ||
        entry?.historyStatus ===
          "DUPLICATE_REVIEW_REQUIRED"
    )
    .slice(
      0,
      5
    )
    .forEach(
      (entry) => {
        alerts.push({
          id:
            `SUBMISSION-${entry.id}`,

          type:
            entry.historyStatus ===
            "FAILED"
              ? FUNDAMENTAL_OPERATIONS_ALERT_TYPES
                  .SUBMISSION_FAILURE
              : FUNDAMENTAL_OPERATIONS_ALERT_TYPES
                  .DUPLICATE_SUBMISSION,

          level:
            FUNDAMENTAL_OPERATIONS_LEVELS
              .HIGH,

          title:
            `${entry.symbol || "Unknown"} Submission ${entry.historyStatus}`,

          message:
            entry.error ||
            "The filing submission requires operational review.",

          route:
            "/filing-submission-history",

          source:
            "SUBMISSION_HISTORY"
        });
      }
    );

  return alerts;
}

export async function buildFundamentalOperationsHealth() {
  const [
    records,
    metadata,
    filings,
    filingSummary,
    pendingFilings,
    duplicateFilings,
    submissionHistory,
    submissionSummary
  ] =
    await Promise.all([
      loadFundamentalRecords(),
      loadFundamentalRepositoryMetadata(),
      loadVerifiedFilings(),
      buildVerifiedFilingSummary(),
      loadPendingVerifiedFilings(),
      loadDuplicateVerifiedFilings(),
      loadFilingSubmissionHistory(),
      buildFilingSubmissionHistorySummary()
    ]);

  const repository =
    buildRepositoryOperationsAnalysis({
      records,
      metadata
    });

  const filingOperations =
    buildFilingOperationsAnalysis({
      filings,
      summary:
        filingSummary,
      pendingFilings,
      duplicateFilings
    });

  const submissions =
    buildSubmissionOperationsAnalysis({
      history:
        submissionHistory,
      summary:
        submissionSummary
    });

  const priorities =
    buildFundamentalOperationsPriorities({
      repository,
      filings:
        filingOperations,
      submissions
    });

  const overallScore =
    calculateFundamentalOperationsScore({
      repository,
      filings:
        filingOperations,
      submissions
    });

  const classification =
    classifyFundamentalOperationsHealth({
      score:
        overallScore,
      priorities
    });

  const alerts =
    buildFundamentalOperationsAlerts({
      priorities,
      filings:
        filingOperations,
      submissions
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    overallScore,

    classification,

    repository,

    filings:
      filingOperations,

    submissions,

    priorities,

    alerts,

    summary:
      `The fundamental operations score is ${overallScore}/100, rated ${classification.label}. ${repository.researchReadyRecords} of ${repository.totalRecords} repository records are research ready. ${filingOperations.pendingReviewFilings} filing(s) await review, ${filingOperations.duplicateFilings} duplicate filing alert(s) are active, and ${submissions.failed} submission failure(s) require attention.`,

    safeguards: {
      automaticApproval:
        false,

      automaticPromotion:
        false,

      missingValuesFabricated:
        false,

      advisoryOnly:
        true
    }
  };
}

export async function buildFundamentalOperationsSummary() {
  const health =
    await buildFundamentalOperationsHealth();

  return {
    generatedAt:
      health.generatedAt,

    overallScore:
      health.overallScore,

    status:
      health
        .classification
        .status,

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

    researchReady:
      health
        .repository
        .researchReadyRecords,

    totalRepositoryRecords:
      health
        .repository
        .totalRecords,

    pendingFilings:
      health
        .filings
        .pendingReviewFilings,

    duplicateFilings:
      health
        .filings
        .duplicateFilings,

    failedSubmissions:
      health
        .submissions
        .failed,

    duplicateSubmissionBlocks:
      health
        .submissions
        .duplicateReview,

    priorityCount:
      health.priorities.length,

    alertCount:
      health.alerts.length,

    topPriority:
      health.priorities[0] ||
      null,

    narrative:
      health.summary
  };
}

export async function loadFundamentalOperationsPriorities() {
  const health =
    await buildFundamentalOperationsHealth();

  return health.priorities;
}

export async function loadFundamentalOperationsAlerts() {
  const health =
    await buildFundamentalOperationsHealth();

  return health.alerts;
}

export async function loadCriticalFundamentalOperationsAlerts() {
  const alerts =
    await loadFundamentalOperationsAlerts();

  return alerts.filter(
    (alert) =>
      alert.level ===
      FUNDAMENTAL_OPERATIONS_LEVELS
        .CRITICAL
  );
}

export async function loadHighPriorityFundamentalOperationsAlerts() {
  const alerts =
    await loadFundamentalOperationsAlerts();

  return alerts.filter(
    (alert) =>
      alert.level ===
        FUNDAMENTAL_OPERATIONS_LEVELS
          .CRITICAL ||
      alert.level ===
        FUNDAMENTAL_OPERATIONS_LEVELS
          .HIGH
  );
}

export async function loadTopFundamentalOperationsPriority() {
  const priorities =
    await loadFundamentalOperationsPriorities();

  return priorities[0] ||
    null;
}

export async function loadFundamentalRepositoryOperationsHealth() {
  const health =
    await buildFundamentalOperationsHealth();

  return health.repository;
}

export async function loadFundamentalFilingOperationsHealth() {
  const health =
    await buildFundamentalOperationsHealth();

  return health.filings;
}

export async function loadFundamentalSubmissionOperationsHealth() {
  const health =
    await buildFundamentalOperationsHealth();

  return health.submissions;
}

import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const CASES_KEY =
  "practiceBrokerReconciliationCases";

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeCases(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeIssues(
  issues = []
) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map(
  (issue, index) => ({
    id:
      issue?.id ||
      `ISSUE-${Date.now()}-${index}`,

    discrepancyKey:
      issue?.discrepancyKey ||
      `${issue?.discrepancyType || issue?.status || "UNKNOWN"}:${
        issue?.symbol || "ACCOUNT"
      }`,

    symbol:
      issue?.symbol ||
      null,

    discrepancyType:
      issue?.discrepancyType ||
      issue?.status ||
      null,

      gatecepQuantity:
        Number(
          issue?.gatecepQuantity ||
          0
        ),

      brokerQuantity:
        Number(
          issue?.brokerQuantity ||
          0
        ),

      gatecepValue:
        Number(
          issue?.gatecepValue ||
          0
        ),

      brokerValue:
        Number(
          issue?.brokerValue ||
          0
        ),

      resolutionCode:
        issue?.resolutionCode ||
        null,

      resolutionLabel:
        issue?.resolutionLabel ||
        null,

      resolutionDecisionId:
        issue?.resolutionDecisionId ||
        null,

      resolutionStatus:
        issue?.resolutionStatus ||
        "OPEN",

      resolvedAt:
        issue?.resolvedAt ||
        null
    })
  );
}

/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadBrokerReconciliationCases() {
  const raw =
    await userGetItem(
      CASES_KEY
    );

  return normalizeCases(
    raw
  );
}

/*
 * ============================================================
 * SAVE
 * ============================================================
 */

export async function saveBrokerReconciliationCases(
  cases = []
) {
  const safeCases =
    Array.isArray(cases)
      ? cases
      : [];

  await userSetItem(
    CASES_KEY,
    JSON.stringify(
      safeCases
    )
  );

  return safeCases;
}

/*
 * ============================================================
 * CREATE CASE
 * ============================================================
 */

export async function createBrokerReconciliationCase(
  data = {}
) {
  const cases =
    await loadBrokerReconciliationCases();

  const now =
    new Date().toISOString();

  const caseId =
    data?.id ||
    `BRC-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;

  const issues =
    normalizeIssues(
      data?.issues
    );

  const record = {
    id:
      caseId,

    type:
      "BROKER_RECONCILIATION_CASE",

    broker:
      data?.broker ||
      null,

    accountName:
      data?.accountName ||
      null,

    currency:
      data?.currency ||
      "KES",

    status:
      data?.status ||
      deriveCaseStatus(
        issues
      ),

    initialReconciliationStatus:
      data?.initialReconciliationStatus ||
      null,

    latestReconciliationStatus:
      data?.latestReconciliationStatus ||
      data?.initialReconciliationStatus ||
      null,
    
    reconciliationFingerprint:
  data?.reconciliationFingerprint ||
  null,
   
    brokerTotal:
      Number(
        data?.brokerTotal ||
        0
      ),

    gatecepTotal:
      Number(
        data?.gatecepTotal ||
        0
      ),

    difference:
      Number(
        data?.difference ||
        0
      ),

    cashDifference:
      Number(
        data?.cashDifference ||
        0
      ),

    matched:
      Number(
        data?.matched ||
        0
      ),

    mismatched:
      Number(
        data?.mismatched ||
        issues.length
      ),

    issues,

    issueCount:
      issues.length,

    resolvedCount:
      countResolved(
        issues
      ),

    openCount:
      countOpen(
        issues
      ),

    openedAt:
      data?.openedAt ||
      now,

    resolvedAt:
      data?.resolvedAt ||
      null,

    createdAt:
      data?.createdAt ||
      now,

    updatedAt:
      now
  };

  const updated = [
    record,
    ...cases
  ];

  await saveBrokerReconciliationCases(
    updated
  );

  return record;
}

/*
 * ============================================================
 * GET CASE
 * ============================================================
 */

export async function getBrokerReconciliationCase(
  caseId
) {
  if (!caseId) {
    return null;
  }

  const cases =
    await loadBrokerReconciliationCases();

  return (
    cases.find(
      (item) =>
        item?.id ===
        caseId
    ) ||
    null
  );
}

export async function getLatestBrokerReconciliationCase() {
  const cases =
    await loadBrokerReconciliationCases();

  if (!cases.length) {
    return null;
  }

  const sorted =
    [...cases].sort(
      (a, b) =>
        new Date(
          b?.openedAt ||
          b?.createdAt ||
          0
        ).getTime() -
        new Date(
          a?.openedAt ||
          a?.createdAt ||
          0
        ).getTime()
    );

  return sorted[0] || null;
}

/*
 * ============================================================
 * GET ACTIVE CASE
 * ============================================================
 */

export async function getActiveBrokerReconciliationCase() {
  const cases =
    await loadBrokerReconciliationCases();

  return (
    cases.find(
      (item) =>
        item?.status ===
          "OPEN" ||
        item?.status ===
          "PARTIALLY_RESOLVED"
    ) ||
    null
  );
}

/*
 * ============================================================
 * UPDATE CASE
 * ============================================================
 */

export async function updateBrokerReconciliationCase(
  caseId,
  updates = {}
) {
  if (!caseId) {
    throw new Error(
      "Reconciliation case ID is required"
    );
  }

  const cases =
    await loadBrokerReconciliationCases();

  const now =
    new Date().toISOString();

  let updatedCase =
    null;

  const updatedCases =
    cases.map(
      (item) => {
        if (
          item?.id !==
          caseId
        ) {
          return item;
        }

        const nextIssues =
          updates?.issues
            ? normalizeIssues(
                updates.issues
              )
            : normalizeIssues(
                item?.issues
              );

        const nextStatus =
          updates?.status ||
          deriveCaseStatus(
            nextIssues
          );

        updatedCase = {
          ...item,
          ...updates,

          id:
            item.id,

          issues:
            nextIssues,

          issueCount:
            nextIssues.length,

          resolvedCount:
            countResolved(
              nextIssues
            ),

          openCount:
            countOpen(
              nextIssues
            ),

          status:
            nextStatus,

          resolvedAt:
            nextStatus ===
            "RESOLVED"
              ? item?.resolvedAt ||
                updates?.resolvedAt ||
                now
              : null,

          updatedAt:
            now
        };

        return updatedCase;
      }
    );

  await saveBrokerReconciliationCases(
    updatedCases
  );

  return updatedCase;
}

/*
 * ============================================================
 * RESOLVE INDIVIDUAL ISSUE
 * ============================================================
 */

export async function resolveBrokerReconciliationCaseIssue(
  caseId,
  symbol,
  resolution = {}
) {
  if (!caseId) {
    throw new Error(
      "Reconciliation case ID is required"
    );
  }

  if (!symbol) {
    throw new Error(
      "Security symbol is required"
    );
  }

  const current =
    await getBrokerReconciliationCase(
      caseId
    );

  if (!current) {
    throw new Error(
      "Reconciliation case was not found"
    );
  }

  const now =
    new Date().toISOString();

  const issues =
    normalizeIssues(
      current?.issues
    ).map(
      (issue) => {
        if (
          String(
            issue?.symbol ||
            ""
          ).toUpperCase() !==
          String(
            symbol
          ).toUpperCase()
        ) {
          return issue;
        }

        return {
          ...issue,

          resolutionCode:
            resolution
              ?.resolutionCode ||
            issue
              ?.resolutionCode ||
            null,

          resolutionLabel:
            resolution
              ?.resolutionLabel ||
            issue
              ?.resolutionLabel ||
            null,

          resolutionDecisionId:
            resolution
              ?.resolutionDecisionId ||
            issue
              ?.resolutionDecisionId ||
            null,

          resolutionStatus:
            "RESOLVED",

          resolvedAt:
            resolution
              ?.resolvedAt ||
            now
        };
      }
    );

  return updateBrokerReconciliationCase(
    caseId,
    {
      issues
    }
  );
}

/*
 * ============================================================
 * STATUS HELPERS
 * ============================================================
 */

function countResolved(
  issues = []
) {
  return issues.filter(
    (issue) =>
      issue
        ?.resolutionStatus ===
      "RESOLVED"
  ).length;
}

function countOpen(
  issues = []
) {
  return issues.filter(
    (issue) =>
      issue
        ?.resolutionStatus !==
      "RESOLVED"
  ).length;
}

function deriveCaseStatus(
  issues = []
) {
  if (
    !Array.isArray(issues) ||
    !issues.length
  ) {
    return "RESOLVED";
  }

  const resolved =
    countResolved(
      issues
    );

  if (resolved === 0) {
    return "OPEN";
  }

  if (
    resolved <
    issues.length
  ) {
    return "PARTIALLY_RESOLVED";
  }

  return "RESOLVED";
}

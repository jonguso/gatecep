import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const IMPORTS_KEY =
  "brokerPortfolioImportRequests";

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeImports(value) {
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

function normalizeImportRequest(
  request = {}
) {
  const now =
    new Date().toISOString();

  return {
    id:
      request?.id ||
      `BPI-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "BROKER_PORTFOLIO_IMPORT_REQUEST",

    actionId:
      request?.actionId ||
      null,

    caseId:
      request?.caseId ||
      null,

    issueId:
      request?.issueId ||
      null,

    discrepancyKey:
      request?.discrepancyKey ||
      null,

    broker:
      request?.broker ||
      null,

    accountName:
      request?.accountName ||
      null,

    currency:
      request?.currency ||
      "KES",

    symbol:
      request?.symbol ||
      null,

    companyName:
      request?.companyName ||
      request?.symbol ||
      null,

    sector:
      request?.sector ||
      null,

    brokerQuantity:
      Number(
        request?.brokerQuantity ||
        0
      ),

    gatecepQuantityBefore:
      Number(
        request?.gatecepQuantityBefore ||
        0
      ),

    quantityToImport:
      Number(
        request?.quantityToImport ??
        request?.brokerQuantity ??
        0
      ),

    averagePrice:
      Number(
        request?.averagePrice ||
        0
      ),

    marketPrice:
      Number(
        request?.marketPrice ||
        request?.averagePrice ||
        0
      ),

    estimatedValue:
      Number(
        request?.estimatedValue ||
        0
      ),

    resolutionCode:
      request?.resolutionCode ||
      null,

    resolutionLabel:
      request?.resolutionLabel ||
      null,

    status:
      request?.status ||
      "DRAFT",

    approvalRequired:
      request?.approvalRequired !== false,

    approved:
      Boolean(
        request?.approved
      ),

    approvedBy:
      request?.approvedBy ||
      null,

    approvedAt:
      request?.approvedAt ||
      null,

    executedBy:
      request?.executedBy ||
      null,

    executedAt:
      request?.executedAt ||
      null,

    cancelledAt:
      request?.cancelledAt ||
      null,

    failureReason:
      request?.failureReason ||
      null,

    notes:
      request?.notes ||
      null,

    source:
      request?.source ||
      "PC_014_CONTROLLED_IMPORT",

    createdAt:
      request?.createdAt ||
      now,

    updatedAt:
      request?.updatedAt ||
      now
  };
}

/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadBrokerPortfolioImportRequests() {
  const raw =
    await userGetItem(
      IMPORTS_KEY
    );

  return normalizeImports(
    raw
  );
}

/*
 * ============================================================
 * SAVE
 * ============================================================
 */

export async function saveBrokerPortfolioImportRequests(
  requests = []
) {
  const safeRequests =
    Array.isArray(requests)
      ? requests
      : [];

  await userSetItem(
    IMPORTS_KEY,
    JSON.stringify(
      safeRequests
    )
  );

  return safeRequests;
}

/*
 * ============================================================
 * CREATE
 * ============================================================
 */

export async function createBrokerPortfolioImportRequest(
  request = {}
) {
  if (!request?.actionId) {
    throw new Error(
      "Approved reconciliation action ID is required."
    );
  }

  if (!request?.caseId) {
    throw new Error(
      "Reconciliation case ID is required."
    );
  }

  if (!request?.symbol) {
    throw new Error(
      "Security symbol is required."
    );
  }

  const requests =
    await loadBrokerPortfolioImportRequests();

  /*
   * One import request per reconciliation action.
   */
  const existing =
    requests.find(
      (item) =>
        item?.actionId ===
        request.actionId
    );

  if (existing) {
    return existing;
  }

  const quantity =
    Number(
      request?.quantityToImport ??
      request?.brokerQuantity ??
      0
    );

  const marketPrice =
    Number(
      request?.marketPrice ||
      request?.averagePrice ||
      0
    );

  const record =
    normalizeImportRequest({
      ...request,

      quantityToImport:
        quantity,

      estimatedValue:
        Number(
          request?.estimatedValue ||
          quantity *
            marketPrice
        ),

      status:
        request?.status ||
        "DRAFT",

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    });

  const updated = [
    record,
    ...requests
  ];

  await saveBrokerPortfolioImportRequests(
    updated
  );

  return record;
}

/*
 * ============================================================
 * GET
 * ============================================================
 */

export async function getBrokerPortfolioImportRequest(
  requestId
) {
  if (!requestId) {
    return null;
  }

  const requests =
    await loadBrokerPortfolioImportRequests();

  return (
    requests.find(
      (item) =>
        item?.id ===
        requestId
    ) ||
    null
  );
}

/*
 * ============================================================
 * GET BY ACTION
 * ============================================================
 */

export async function getBrokerPortfolioImportRequestByAction(
  actionId
) {
  if (!actionId) {
    return null;
  }

  const requests =
    await loadBrokerPortfolioImportRequests();

  return (
    requests.find(
      (item) =>
        item?.actionId ===
        actionId
    ) ||
    null
  );
}

/*
 * ============================================================
 * UPDATE
 * ============================================================
 */

export async function updateBrokerPortfolioImportRequest(
  requestId,
  updates = {}
) {
  if (!requestId) {
    throw new Error(
      "Import request ID is required."
    );
  }

  const requests =
    await loadBrokerPortfolioImportRequests();

  const now =
    new Date().toISOString();

  let updatedRequest =
    null;

  const updatedRequests =
    requests.map(
      (item) => {
        if (
          item?.id !==
          requestId
        ) {
          return item;
        }

        const nextStatus =
          updates?.status ||
          item?.status ||
          "DRAFT";

        updatedRequest =
          normalizeImportRequest({
            ...item,
            ...updates,

            id:
              item.id,

            status:
              nextStatus,

            approvedAt:
              nextStatus ===
                "APPROVED"
                ? item?.approvedAt ||
                  updates?.approvedAt ||
                  now
                : updates?.approvedAt ??
                  item?.approvedAt ??
                  null,

            executedAt:
              nextStatus ===
                "COMPLETED"
                ? item?.executedAt ||
                  updates?.executedAt ||
                  now
                : updates?.executedAt ??
                  item?.executedAt ??
                  null,

            cancelledAt:
              nextStatus ===
                "CANCELLED"
                ? item?.cancelledAt ||
                  updates?.cancelledAt ||
                  now
                : updates?.cancelledAt ??
                  item?.cancelledAt ??
                  null,

            updatedAt:
              now
          });

        return updatedRequest;
      }
    );

  await saveBrokerPortfolioImportRequests(
    updatedRequests
  );

  return updatedRequest;
}

/*
 * ============================================================
 * SUBMIT FOR REVIEW
 * ============================================================
 */

export async function submitBrokerPortfolioImportRequest(
  requestId
) {
  return updateBrokerPortfolioImportRequest(
    requestId,
    {
      status:
        "PENDING_APPROVAL"
    }
  );
}

/*
 * ============================================================
 * APPROVE
 * ============================================================
 */

export async function approveBrokerPortfolioImportRequest(
  requestId,
  approvedBy = null
) {
  return updateBrokerPortfolioImportRequest(
    requestId,
    {
      status:
        "APPROVED",

      approved:
        true,

      approvedBy,

      approvedAt:
        new Date().toISOString()
    }
  );
}

/*
 * ============================================================
 * MARK EXECUTING
 * ============================================================
 */

export async function startBrokerPortfolioImportRequest(
  requestId
) {
  return updateBrokerPortfolioImportRequest(
    requestId,
    {
      status:
        "EXECUTING"
    }
  );
}

/*
 * ============================================================
 * COMPLETE
 * ============================================================
 */

export async function completeBrokerPortfolioImportRequest(
  requestId,
  executedBy = null
) {
  return updateBrokerPortfolioImportRequest(
    requestId,
    {
      status:
        "COMPLETED",

      executedBy,

      executedAt:
        new Date().toISOString(),

      failureReason:
        null
    }
  );
}

/*
 * ============================================================
 * FAIL
 * ============================================================
 */

export async function failBrokerPortfolioImportRequest(
  requestId,
  failureReason
) {
  return updateBrokerPortfolioImportRequest(
    requestId,
    {
      status:
        "FAILED",

      failureReason:
        failureReason ||
        "Portfolio import failed."
    }
  );
}

/*
 * ============================================================
 * CANCEL
 * ============================================================
 */

export async function cancelBrokerPortfolioImportRequest(
  requestId,
  notes = null
) {
  return updateBrokerPortfolioImportRequest(
    requestId,
    {
      status:
        "CANCELLED",

      notes,

      cancelledAt:
        new Date().toISOString()
    }
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

export async function getBrokerPortfolioImportSummary() {
  const requests =
    await loadBrokerPortfolioImportRequests();

  const count =
    (status) =>
      requests.filter(
        (item) =>
          item?.status ===
          status
      ).length;

  return {
    total:
      requests.length,

    draft:
      count("DRAFT"),

    pendingApproval:
      count(
        "PENDING_APPROVAL"
      ),

    approved:
      count("APPROVED"),

    executing:
      count("EXECUTING"),

    completed:
      count("COMPLETED"),

    failed:
      count("FAILED"),

    cancelled:
      count("CANCELLED")
  };
}
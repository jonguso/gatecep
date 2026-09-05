import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const AUDIT_KEY =
  "practiceBrokerSyncAuditHistory";

/*
 * ============================================================
 * NORMALIZE STORED HISTORY
 * ============================================================
 */

function normalize(value) {
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

/*
 * ============================================================
 * LOAD HISTORY
 * ============================================================
 */

export async function loadBrokerSyncAuditHistory() {
  const raw =
    await userGetItem(
      AUDIT_KEY
    );

  return normalize(raw);
}

/*
 * ============================================================
 * NUMERIC NORMALIZER
 * ============================================================
 */

function number(value) {
  const parsed =
    Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundMoney(value) {
  return Number(
    number(value).toFixed(2)
  );
}

/*
 * ============================================================
 * ISSUE SIGNATURE
 * ============================================================
 *
 * We do not compare timestamps or display messages.
 *
 * We compare the meaningful reconciliation state:
 *
 * issue type
 * count
 * symbols
 * amount
 */

function normalizeIssues(
  issues = []
) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues
    .map((issue) => ({
      type:
        issue?.type ||
        null,

      severity:
        issue?.severity ||
        null,

      count:
        number(
          issue?.count
        ),

      amount:
        roundMoney(
          issue?.amount
        ),

      symbols:
        Array.isArray(
          issue?.symbols
        )
          ? [...issue.symbols]
              .map(
                (symbol) =>
                  String(
                    symbol
                  ).toUpperCase()
              )
              .sort()
          : []
    }))
    .sort(
      (a, b) =>
        String(
          a.type
        ).localeCompare(
          String(
            b.type
          )
        )
    );
}

/*
 * ============================================================
 * RECONCILIATION SIGNATURE
 * ============================================================
 *
 * If this signature has not changed, we do not create
 * another audit event.
 */

function buildEventSignature(
  event = {}
) {
  return JSON.stringify({
    type:
      event.type ||
      "BROKER_SYNC",

    broker:
      event.broker ||
      null,

    accountName:
      event.accountName ||
      null,

    status:
      event.status ||
      null,

    classification:
      event.classification ||
      null,

    brokerTotal:
      roundMoney(
        event.brokerTotal
      ),

    gatecepTotal:
      roundMoney(
        event.gatecepTotal
      ),

    difference:
      roundMoney(
        event.difference
      ),

    cashDifference:
      roundMoney(
        event.cashDifference
      ),

    holdingsCount:
      number(
        event.holdingsCount
      ),

    matched:
      number(
        event.matched
      ),

    mismatched:
      number(
        event.mismatched
      ),

    missingAtBroker:
      number(
        event.missingAtBroker
      ),

    extraAtBroker:
      number(
        event.extraAtBroker
      ),

    issues:
      normalizeIssues(
        event.issues
      )
  });
}

/*
 * ============================================================
 * ADD AUDIT EVENT
 * ============================================================
 *
 * Idempotent behavior:
 *
 * Same reconciliation state
 *      ↓
 * Return latest event
 *
 * Changed reconciliation state
 *      ↓
 * Create new event
 */

export async function addBrokerSyncAuditEvent(
  event = {}
) {
  const history =
    await loadBrokerSyncAuditHistory();

  const latest =
    history[0] ||
    null;

  const incomingSignature =
    buildEventSignature(
      event
    );

  const latestSignature =
    latest
      ? buildEventSignature(
          latest
        )
      : null;

  /*
   * ----------------------------------------------------------
   * NO CHANGE
   * ----------------------------------------------------------
   *
   * Do not create another audit event simply because
   * the user refreshed Coach G Insight.
   */

  if (
    latest &&
    incomingSignature ===
      latestSignature
  ) {
    return {
      ...latest,

      auditAction:
        "REUSED",

      unchanged:
        true
    };
  }

  /*
   * ----------------------------------------------------------
   * NEW RECONCILIATION STATE
   * ----------------------------------------------------------
   */

  const now =
    new Date().toISOString();

  const record = {
    id:
      event.id ||
      `BSA-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    type:
      event.type ||
      "BROKER_SYNC",

    broker:
      event.broker ||
      null,

    accountName:
      event.accountName ||
      null,

    status:
      event.status ||
      null,

    classification:
      event.classification ||
      null,

    brokerTotal:
      roundMoney(
        event.brokerTotal
      ),

    gatecepTotal:
      roundMoney(
        event.gatecepTotal
      ),

    difference:
      roundMoney(
        event.difference
      ),

    cashDifference:
      roundMoney(
        event.cashDifference
      ),

    holdingsCount:
      number(
        event.holdingsCount
      ),

    matched:
      number(
        event.matched
      ),

    mismatched:
      number(
        event.mismatched
      ),

    missingAtBroker:
      number(
        event.missingAtBroker
      ),

    extraAtBroker:
      number(
        event.extraAtBroker
      ),

    issues:
      Array.isArray(
        event.issues
      )
        ? event.issues
        : [],

    createdAt:
      event.createdAt ||
      now,

    updatedAt:
      now
  };

  const updated = [
    record,
    ...history
  ];

  await userSetItem(
    AUDIT_KEY,
    JSON.stringify(
      updated
    )
  );

  return {
    ...record,

    auditAction:
      "CREATED",

    unchanged:
      false
  };
}

/*
 * ============================================================
 * PC-028U
 * REAL BEHAVIOR HISTORY SOURCE POLICY
 * ============================================================
 *
 * This file deliberately does NOT guess GateCEP's canonical
 * recommendation/order/trade stores.
 *
 * It defines the rules any source must pass before its records may
 * enter Investor DNA reconciliation.
 * ============================================================
 */

export const REAL_BEHAVIOR_HISTORY_TYPES = Object.freeze({
  RECOMMENDATION: "RECOMMENDATION",
  ORDER: "ORDER",
  TRADE: "TRADE"
});

export const REAL_BEHAVIOR_SOURCE_CLASSES = Object.freeze({
  REAL: "REAL",
  PRACTICE: "PRACTICE",
  UNKNOWN: "UNKNOWN"
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

export function classifyBehaviorHistoryRecord(record = {}) {
  const explicitPractice =
    record?.isPractice === true ||
    upper(record?.mode) === "PRACTICE" ||
    upper(record?.environment) === "PRACTICE" ||
    upper(record?.sourceType) === "PRACTICE" ||
    upper(record?.portfolioType) === "PRACTICE" ||
    upper(record?.broker) === "PRACTICE" ||
    upper(record?.brokerId) === "SIM" ||
    upper(record?.brokerId) === "SIMULATION" ||
    upper(record?.executionVenue) === "SIMULATION";

  if (explicitPractice) {
    return REAL_BEHAVIOR_SOURCE_CLASSES.PRACTICE;
  }

  const explicitReal =
    record?.isPractice === false ||
    record?.isReal === true ||
    upper(record?.mode) === "LIVE" ||
    upper(record?.environment) === "LIVE" ||
    upper(record?.sourceType) === "REAL" ||
    upper(record?.portfolioType) === "REAL" ||
    Boolean(
      clean(
        record?.brokerAccountId ??
        record?.accountId
      )
    );

  if (explicitReal) {
    return REAL_BEHAVIOR_SOURCE_CLASSES.REAL;
  }

  return REAL_BEHAVIOR_SOURCE_CLASSES.UNKNOWN;
}

export function filterRealBehaviorHistory(records = []) {
  return safeArray(records).filter(
    (record) =>
      classifyBehaviorHistoryRecord(record) ===
      REAL_BEHAVIOR_SOURCE_CLASSES.REAL
  );
}

export function buildBehaviorHistorySourceAudit({
  recommendations = [],
  orders = [],
  trades = []
} = {}) {
  const analyze = (records) => {
    const rows = safeArray(records);

    const counts = rows.reduce(
      (result, row) => {
        const classification =
          classifyBehaviorHistoryRecord(row);

        result[classification] =
          (result[classification] || 0) + 1;

        return result;
      },
      {
        REAL: 0,
        PRACTICE: 0,
        UNKNOWN: 0
      }
    );

    return {
      total: rows.length,
      ...counts,
      accepted:
        counts.REAL,
      rejected:
        counts.PRACTICE +
        counts.UNKNOWN
    };
  };

  return {
    recommendations:
      analyze(recommendations),

    orders:
      analyze(orders),

    trades:
      analyze(trades),

    safeguards: {
      practiceAccepted:
        false,

      unknownAccepted:
        false,

      realOnly:
        true
    }
  };
}

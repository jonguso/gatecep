import { brokerExecutionFillIdentity } from "../broker-sync/brokerExecutionFillIdentity.js";
import {
  loadCombinedBrokerTransactionHistoryEvidence
} from "./brokerTransactionHistoryEvidenceStore.js";

function parseArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value : []; } catch { return []; }
}

function hasExplicitHistoricalExecutionClassification(
  row = {}
) {
  return (
    typeof row.historicalExecutionState === "string" &&
    row.historicalExecutionState.trim().length > 0 &&
    typeof row.executionConfirmed === "boolean" &&
    typeof row.fifoEligible === "boolean" &&
    typeof row.canAffectFifo === "boolean"
  );
}

export function isCompletedLotExecution(row = {}) {
  /*
   * Classified historical broker evidence has already passed
   * the authoritative historical execution policy:
   *
   *   Total Traded Quantity proves execution.
   *   fifoEligible / canAffectFifo prove FIFO readiness.
   *
   * Order Status is descriptive for this evidence and must not
   * re-gate an execution that the historical policy classified
   * as FIFO-ready.
   */
  if (
    hasExplicitHistoricalExecutionClassification(row)
  ) {
    return (
      row.executionConfirmed === true &&
      row.historicalExecutionState === "EXECUTED_READY" &&
      row.fifoEligible === true &&
      row.canAffectFifo === true
    );
  }

  /*
   * Legacy/live compatibility:
   *
   * Evidence without the explicit historical classification
   * shape retains the pre-existing status-driven completion
   * predicate.
   */
  const status =
    String(
      row.status ||
      row.orderStatus ||
      ""
    )
      .trim()
      .toUpperCase();

  return [
    "FULLY TRADED",
    "PARTIALLY TRADED",
    "FILLED",
    "COMPLETED",
    "SETTLED"
  ].some(
    (accepted) =>
      status.includes(accepted)
  )
    && String(row.symbol || "").trim()
    && ["BUY", "SELL", "B", "S"].includes(
      String(
        row.side ||
        row.type ||
        ""
      ).toUpperCase()
    )
    && Number(
      row.quantity ||
      row.filledQuantity ||
      row.tradedQuantity
    ) > 0
    && Number(
      row.price ||
      row.averagePrice ||
      row.executionPrice
    ) > 0
    && String(
      row.executionDate ||
      row.date ||
      row.createdAt ||
      ""
    ).trim();
}

export async function loadBrokerLotHistoryEvidence({
  brokerAccountKey = null
} = {}) {
  const evidence =
    await loadCombinedBrokerTransactionHistoryEvidence();

  const normalizedAccountKey =
    String(brokerAccountKey || "")
      .trim()
      .toUpperCase();

  const combined = [
    ...evidence.verified,
    ...evidence.unverified
  ].filter(
    (row) =>
      !normalizedAccountKey ||
      String(row?.brokerAccountKey || "")
        .trim()
        .toUpperCase() === normalizedAccountKey
  );

  const seen = new Set();

  const records =
    combined
      .filter(
      (row) =>
        row?.canAffectFifo !== false &&
        row?.fifoEligible !== false
    )
    .filter(isCompletedLotExecution)
      .filter((row) => {
        const accountKey = String(
          row?.brokerAccountKey ||
          "LEGACY_UNSCOPED"
        )
          .trim()
          .toUpperCase();

        const fillKey =
          brokerExecutionFillIdentity(row) ||
          String(
            row.id ||
            `${row.date}-${row.symbol}-${row.side}-${row.quantity}-${row.price}`
          );

        const key = `${accountKey}::${fillKey}`;

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });

  return {
    ready: records.length > 0,
    brokerAccountKey:
      normalizedAccountKey || null,
    records,
    completedCount: records.length,
    symbols: [
      ...new Set(
        records.map(
          (row) =>
            String(row.symbol).toUpperCase()
        )
      )
    ],
    accountCount: new Set(
      records
        .map((row) => row?.brokerAccountKey)
        .filter(Boolean)
    ).size,
    legacyUnscopedCount:
      records.filter(
        (row) => !row?.brokerAccountKey
      ).length,
    analyticsOnlyCount:
      records.filter(
        (row) =>
          row.canAffectRealPortfolio !== true
      ).length
  };
}

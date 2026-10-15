import { brokerExecutionFillIdentity } from "../broker-sync/brokerExecutionFillIdentity.js";
import {
  loadCombinedBrokerTransactionHistoryEvidence
} from "./brokerTransactionHistoryEvidenceStore.js";

function parseArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value : []; } catch { return []; }
}

export function isCompletedLotExecution(row = {}) {
  const status = String(row.status || row.orderStatus || "").trim().toUpperCase();
  return ["FULLY TRADED", "FILLED", "COMPLETED", "SETTLED"].some((accepted) => status.includes(accepted))
    && String(row.symbol || "").trim()
    && ["BUY", "SELL", "B", "S"].includes(String(row.side || row.type || "").toUpperCase())
    && Number(row.quantity || row.filledQuantity || row.tradedQuantity) > 0
    && Number(row.price || row.averagePrice || row.executionPrice) > 0
    && String(row.executionDate || row.date || row.createdAt || "").trim();
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

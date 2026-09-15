import { brokerExecutionFillIdentity } from "../broker-sync/brokerExecutionFillIdentity.js";

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

export async function loadBrokerLotHistoryEvidence() {
  const { userGetItem } = await import("../../services/auth/userStorage.js");
  const [verifiedRaw, incompleteRaw] = await Promise.all([
    userGetItem("transactionHistory"),
    userGetItem("unverifiedTransactionHistory")
  ]);
  const combined = [...parseArray(verifiedRaw), ...parseArray(incompleteRaw)];
  const seen = new Set();
  const records = combined.filter(isCompletedLotExecution).filter((row) => {
    const key =
      brokerExecutionFillIdentity(row) ||
      String(
        row.id ||
        `${row.date}-${row.symbol}-${row.side}-${row.quantity}-${row.price}`
      );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    ready: records.length > 0,
    records,
    completedCount: records.length,
    symbols: [...new Set(records.map((row) => String(row.symbol).toUpperCase()))],
    analyticsOnlyCount: records.filter((row) => row.canAffectRealPortfolio !== true).length
  };
}

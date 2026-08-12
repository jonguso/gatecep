import { userGetItem } from "../../services/auth/userStorage";
import { loadRecommendationHistory } from "../../services/coach/recommendationLifecycleStore";
import { loadExecutionAuditTrail } from "../../services/trade/executionAuditStore";
import { filterRealBehaviorHistory, buildBehaviorHistorySourceAudit } from "./realBehaviorHistorySourcePolicy";

function safeArray(v) { return Array.isArray(v) ? v : []; }
function parseArray(raw) { if (!raw) return []; if (Array.isArray(raw)) return raw; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
function clean(v) { if (v === null || v === undefined) return null; const t = String(v).trim(); return t || null; }
function upper(v) { return clean(v)?.toUpperCase() || null; }

export async function loadCanonicalRealTransactionHistory() {
  const raw = await userGetItem("transactionHistory");
  return parseArray(raw).map((row) => ({
    ...row,
    isPractice: false,
    isReal: true,
    sourceType: "REAL",
    evidenceSource: "TRANSACTION_HISTORY"
  }));
}

export async function loadCanonicalCoachGRecommendationHistory() {
  return safeArray(await loadRecommendationHistory());
}

function isRealExecutionAuditEvent(event = {}) {
  const brokerId = upper(event?.brokerId);
  const brokerName = upper(event?.brokerName);
  if (brokerId === "SIM" || brokerId === "SIMULATION" || brokerName?.includes("SIMULATION")) return false;
  return Boolean(
    clean(event?.brokerOrderId) ||
    (clean(event?.brokerId) && brokerId !== "SIM" && brokerId !== "SIMULATION") ||
    event?.isReal === true ||
    event?.isPractice === false ||
    upper(event?.sourceType) === "REAL" ||
    upper(event?.mode) === "LIVE"
  );
}

function auditEventToOrderEvidence(event = {}) {
  const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
  return {
    id: event?.orderId || event?.id || null,
    orderId: event?.orderId || null,
    executionId: event?.executionId || null,
    symbol: upper(event?.symbol ?? payload?.symbol),
    side: upper(payload?.side ?? payload?.type),
    quantity: Number(payload?.quantity ?? payload?.qty ?? 0),
    price: Number(payload?.price ?? payload?.averageFillPrice ?? 0),
    status: upper(event?.status ?? payload?.status),
    brokerId: clean(event?.brokerId ?? payload?.brokerId),
    brokerName: clean(event?.brokerName ?? payload?.brokerName),
    brokerOrderId: clean(event?.brokerOrderId ?? payload?.brokerOrderId),
    createdAt: event?.createdAt || payload?.createdAt || null,
    eventType: upper(event?.eventType),
    message: clean(event?.message),
    isPractice: false,
    isReal: true,
    sourceType: "REAL",
    evidenceSource: "EXECUTION_AUDIT_TRAIL",
    rawAuditEvent: event
  };
}

export async function loadCanonicalRealOrderHistory() {
  const events = safeArray(await loadExecutionAuditTrail()).filter(isRealExecutionAuditEvent);
  const byOrder = new Map();
  events.forEach((event) => {
    const evidence = auditEventToOrderEvidence(event);
    const key = evidence?.orderId || `${evidence?.executionId || "EXEC"}|${evidence?.symbol || "UNKNOWN"}|${evidence?.brokerOrderId || event?.id}`;
    const existing = byOrder.get(key);
    const incomingTime = Date.parse(evidence?.createdAt || 0) || 0;
    const existingTime = Date.parse(existing?.createdAt || 0) || 0;
    if (!existing || incomingTime >= existingTime) byOrder.set(key, evidence);
  });
  return Array.from(byOrder.values());
}

export async function loadCanonicalRealBehaviorHistory() {
  const [recommendationHistory, orderHistory, tradeHistory] = await Promise.all([
    loadCanonicalCoachGRecommendationHistory(),
    loadCanonicalRealOrderHistory(),
    loadCanonicalRealTransactionHistory()
  ]);
  const acceptedOrders = filterRealBehaviorHistory(orderHistory);
  const acceptedTrades = filterRealBehaviorHistory(tradeHistory);
  const audit = buildBehaviorHistorySourceAudit({ recommendations: [], orders: orderHistory, trades: tradeHistory });
  return {
    recommendationHistory: safeArray(recommendationHistory),
    orderHistory: acceptedOrders,
    tradeHistory: acceptedTrades,
    audit: {
      ...audit,
      recommendations: {
        total: safeArray(recommendationHistory).length,
        accepted: safeArray(recommendationHistory).length,
        rejected: 0,
        classification: "COACH_G_ADVICE_HISTORY"
      }
    },
    sources: {
      recommendations: "recommendationHistory",
      orders: "executionAuditTrail",
      trades: "transactionHistory"
    },
    safeguards: {
      simulatedTradesLoaded: false,
      activeBasketUsedAsHistory: false,
      practiceDecisionJournalLoaded: false,
      unknownExecutionEventsAccepted: false
    }
  };
}

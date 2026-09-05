import { userGetItem } from "../../services/auth/userStorage";
import { loadRecommendationHistory } from "../../services/coach/recommendationLifecycleStore";
import { filterRealBehaviorHistory, buildBehaviorHistorySourceAudit } from "./realBehaviorHistorySourcePolicy";
import { partitionBrokerExecutionEvidence } from "../broker-sync/brokerExecutionEvidencePolicy";

function safeArray(v) { return Array.isArray(v) ? v : []; }
function parseArray(raw) { if (!raw) return []; if (Array.isArray(raw)) return raw; try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
export async function loadCanonicalRealTransactionHistory() {
  const raw = await userGetItem("transactionHistory");
  const { verified } = partitionBrokerExecutionEvidence(parseArray(raw));
  return verified.map((row) => ({
    ...row,
    isPractice: false,
    isReal: true,
    sourceType: "BROKER_EXECUTION_EVIDENCE",
    evidenceSource: "VERIFIED_BROKER_TRANSACTION_HISTORY",
    createdAt: row.executionDate
  }));
}

export async function loadCanonicalCoachGRecommendationHistory() {
  return safeArray(await loadRecommendationHistory());
}

export async function loadCanonicalRealOrderHistory() {
  // GateCEP order/audit stores are Practice-only. REAL activity begins only
  // after a broker supplies complete execution evidence in transactionHistory.
  return [];
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
      orders: "NONE_GATECEP_PRACTICE_ONLY",
      trades: "transactionHistory"
    },
    safeguards: {
      simulatedTradesLoaded: false,
      gatecepExecutionAuditLoaded: false,
      activeBasketUsedAsHistory: false,
      practiceDecisionJournalLoaded: false,
      unknownExecutionEventsAccepted: false
    }
  };
}

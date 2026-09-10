/* PC-030M20AQ — Coach G Decision Lab
 * Pure, read-only decision analysis helpers.
 * No REAL/Practice/CDSC/transaction mutation is permitted here.
 */

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const round = (v, d = 2) => Number(n(v).toFixed(d));

export function requiredRecoveryPercent(lossPercent = 0) {
  const loss = Math.abs(n(lossPercent));
  if (!(loss > 0) || loss >= 100) return loss >= 100 ? null : 0;
  return round((loss / (100 - loss)) * 100, 2);
}

export function buildRecoveryStressTable(levels = [10, 20, 30, 40, 50]) {
  return levels.map((lossPercent) => ({
    lossPercent: Math.abs(n(lossPercent)),
    recoveryPercent: requiredRecoveryPercent(lossPercent)
  }));
}

function holdingValue(h = {}) {
  const direct = n(h.marketValue ?? h.currentValue ?? h.value);
  if (direct > 0) return direct;
  return n(h.quantity) * n(h.marketPrice ?? h.price ?? h.currentPrice ?? h.averagePrice ?? h.averageCost);
}

export function buildDecisionLabBaseline({ holdings = [], availableCash = 0, goals = [] } = {}) {
  const rows = (Array.isArray(holdings) ? holdings : [])
    .map((h) => ({ ...h, value: holdingValue(h) }))
    .filter((h) => h.value > 0);
  const holdingsValue = rows.reduce((sum, h) => sum + h.value, 0);
  const cash = n(availableCash);
  const netWorth = holdingsValue + cash;
  const largest = [...rows].sort((a, b) => b.value - a.value)[0] || null;
  const largestWeight = holdingsValue > 0 && largest ? (largest.value / holdingsValue) * 100 : 0;
  const goalRows = Array.isArray(goals) ? goals : [];
  return {
    evidenceDriven: true,
    readOnly: true,
    mutatesRealPortfolio: false,
    mutatesPracticePortfolio: false,
    holdingsCount: rows.length,
    holdingsValue: round(holdingsValue),
    availableCash: round(cash),
    netWorth: round(netWorth),
    largestHolding: largest ? String(largest.symbol || "").toUpperCase() : null,
    largestHoldingWeight: round(largestWeight),
    goalsAvailable: goalRows.length > 0,
    goalCount: goalRows.length
  };
}

export function classifyDecisionRisk({
  projectedLargestHoldingWeight = 0,
  projectedSectorWeight = 0,
  cashPercent = 0,
  stressLossPercent = 0,
  goalImpact = "UNKNOWN"
} = {}) {
  const reasons = [];
  let score = 0;
  const largest = n(projectedLargestHoldingWeight);
  const sector = n(projectedSectorWeight);
  const cash = n(cashPercent);
  const stress = Math.abs(n(stressLossPercent));
  const goal = String(goalImpact || "UNKNOWN").toUpperCase();

  if (largest >= 25) { score += 2; reasons.push("single-position concentration is at least 25%"); }
  else if (largest >= 15) { score += 1; reasons.push("single-position concentration is elevated"); }
  if (sector >= 40) { score += 2; reasons.push("sector concentration is at least 40%"); }
  else if (sector >= 30) { score += 1; reasons.push("sector concentration is elevated"); }
  if (cash < 5) { score += 2; reasons.push("projected liquidity falls below 5%"); }
  else if (cash < 10) { score += 1; reasons.push("projected liquidity is below 10%"); }
  if (stress >= 30) { score += 2; reasons.push("selected downside stress is 30% or greater"); }
  else if (stress >= 20) { score += 1; reasons.push("selected downside stress is material"); }
  if (["WORSENS", "BEHIND", "AT_RISK"].includes(goal)) { score += 2; reasons.push("the scenario worsens verified goal evidence"); }

  const classification = score >= 6 ? "AGGRESSIVE" : score >= 3 ? "BALANCED" : "CONSERVATIVE";
  return {
    classification,
    score,
    reasons,
    explainable: true,
    recoveryPercent: requiredRecoveryPercent(stress)
  };
}

export function projectSimpleDecision({
  holdings = [], availableCash = 0, symbol, side = "BUY", quantity = 0, price = 0, charges = 0
} = {}) {
  const target = String(symbol || "").toUpperCase();
  const q = n(quantity); const p = n(price); const fees = n(charges);
  if (!target || !(q > 0) || !(p > 0)) return { available: false, status: "SCENARIO_INPUT_REQUIRED" };
  const rows = (Array.isArray(holdings) ? holdings : []).map((h) => ({ ...h }));
  const idx = rows.findIndex((h) => String(h.symbol || "").toUpperCase() === target);
  const current = idx >= 0 ? rows[idx] : { symbol: target, quantity: 0, marketPrice: p };
  const currentQty = n(current.quantity);
  const normalizedSide = String(side || "BUY").toUpperCase();
  if (normalizedSide === "SELL" && q > currentQty) return { available: false, status: "QUANTITY_EXCEEDS_HOLDING" };
  const projectedQty = normalizedSide === "BUY" ? currentQty + q : currentQty - q;
  const cashChange = normalizedSide === "BUY" ? -(q * p + fees) : (q * p - fees);
  const projectedCash = n(availableCash) + cashChange;
  const next = { ...current, symbol: target, quantity: projectedQty, marketPrice: p, marketValue: projectedQty * p };
  if (idx >= 0) rows[idx] = next; else rows.push(next);
  const baseline = buildDecisionLabBaseline({ holdings, availableCash });
  const projected = buildDecisionLabBaseline({ holdings: rows, availableCash: projectedCash });
  return {
    available: true,
    status: "PROJECTED_ONLY",
    symbol: target,
    side: normalizedSide,
    baseline,
    projected,
    projectedQuantity: projectedQty,
    projectedAvailableCash: round(projectedCash),
    readOnly: true,
    mutatesRealPortfolio: false,
    mutatesPracticePortfolio: false
  };
}

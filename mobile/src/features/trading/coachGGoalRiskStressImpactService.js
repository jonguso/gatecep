// PC-030M20AS — Goal + Risk Stress Impact
// Reuses M20AQ recovery/risk logic and M20AR10 projected-impact evidence.
// Pure/read-only. No REAL/Practice/Investor DNA/goal mutation.

import { buildRecoveryStressTable, classifyDecisionRisk } from "./coachGDecisionLabService.js";

const n = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const maybeNumber = (v) => v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
const round = (v, d = 2) => Number(n(v).toFixed(d));
const upper = (v) => String(v || "").trim().toUpperCase();

function holdingValue(h = {}) {
  const direct = maybeNumber(h?.marketValue ?? h?.currentValue ?? h?.value);
  if (direct !== null && direct >= 0) return direct;
  return n(h?.quantity ?? h?.shares) * n(h?.marketPrice ?? h?.currentPrice ?? h?.price ?? h?.lastPrice ?? h?.averagePrice ?? h?.averageCost);
}

function normalizeGoalCandidate(value = {}) {
  const progress = value?.progress ?? value;
  const goal = progress?.goal ?? value?.goal ?? progress;
  return {
    id: goal?.id ?? null,
    name: goal?.name ?? goal?.title ?? "Financial Goal",
    targetAmount: maybeNumber(goal?.targetAmount ?? goal?.targetValue ?? goal?.amount),
    targetDate: goal?.targetDate ?? goal?.date ?? null,
    currency: goal?.currency || "KES",
    trajectory: progress?.trajectory ?? value?.trajectory ?? null
  };
}

export function extractVerifiedGoalEvidence(wealthJourney = {}) {
  const journey = wealthJourney?.experience?.journey ?? wealthJourney?.journey ?? {};
  const top = journey?.topPriorityGoal ?? journey?.goalAdvice?.[0] ?? null;
  if (!top) return { available: false, source: "REAL_WEALTH_JOURNEY", reason: "NO_ACTIVE_GOAL" };
  const goal = normalizeGoalCandidate(top);
  if (!(goal.targetAmount > 0)) return { available: false, source: "REAL_WEALTH_JOURNEY", reason: "GOAL_TARGET_AMOUNT_REQUIRED", goalName: goal.name };
  return { available: true, source: "REAL_WEALTH_JOURNEY", ...goal, hasTargetDate: Boolean(goal.targetDate), hasTrajectoryEvidence: Boolean(goal.targetDate && goal.trajectory?.valid) };
}

function projectedHoldingRows({ holdings = [], projectedImpact = {} } = {}) {
  const symbol = upper(projectedImpact?.symbol);
  const action = upper(projectedImpact?.action) === "SELL" ? "SELL" : "BUY";
  const gross = n(projectedImpact?.transaction?.gross);
  const rows = (Array.isArray(holdings) ? holdings : []).map((holding) => ({ symbol: upper(holding?.symbol), value: holdingValue(holding) }));
  const index = rows.findIndex((row) => row.symbol === symbol);
  if (index >= 0) rows[index].value = action === "BUY" ? rows[index].value + gross : Math.max(0, rows[index].value - gross);
  else if (action === "BUY" && symbol) rows.push({ symbol, value: gross });
  return rows.filter((row) => row.value > 0);
}

function buildGoalImpact({ currentNetWorth, projectedNetWorth, stressedNetWorth, goalEvidence } = {}) {
  if (!goalEvidence?.available || !(goalEvidence?.targetAmount > 0)) {
    return {
      available: false,
      status: "GOAL_EVIDENCE_UNAVAILABLE",
      source: goalEvidence?.source || "REAL_WEALTH_JOURNEY",
      message: goalEvidence?.reason === "GOAL_TARGET_AMOUNT_REQUIRED"
        ? "A saved goal exists, but a valid target amount is required before scenario progress can be compared."
        : "No verified active Wealth Journey goal with a target amount is available for this scenario."
    };
  }
  const target = n(goalEvidence.targetAmount);
  const currentProgress = target > 0 ? (currentNetWorth / target) * 100 : 0;
  const projectedProgress = target > 0 ? (projectedNetWorth / target) * 100 : 0;
  const stressedProgress = target > 0 ? (stressedNetWorth / target) * 100 : 0;
  const delta = projectedProgress - currentProgress;
  const direction = Math.abs(delta) < 0.005 ? "UNCHANGED" : delta > 0 ? "IMPROVES" : "WORSENS";
  return {
    available: true,
    source: "REAL_WEALTH_JOURNEY",
    goalId: goalEvidence.id || null,
    goalName: goalEvidence.name || "Financial Goal",
    currency: goalEvidence.currency || "KES",
    targetAmount: round(target),
    targetDate: goalEvidence.targetDate || null,
    hasTargetDate: Boolean(goalEvidence.targetDate),
    hasTrajectoryEvidence: Boolean(goalEvidence.hasTrajectoryEvidence),
    currentProgressPercent: round(currentProgress),
    projectedProgressPercent: round(projectedProgress),
    stressedProgressPercent: round(stressedProgress),
    projectedRemainingAmount: round(Math.max(target - projectedNetWorth, 0)),
    stressedRemainingAmount: round(Math.max(target - stressedNetWorth, 0)),
    direction,
    trackStatus: projectedNetWorth >= target ? "ACHIEVED" : "NOT_RECLASSIFIED_FROM_SINGLE_TRADE",
    message: projectedNetWorth >= target
      ? "The projected net worth meets or exceeds this saved goal target."
      : goalEvidence.hasTrajectoryEvidence
        ? "This trade-level scenario shows goal sensitivity only. GateCEP does not silently replace the Wealth Journey trajectory or reclassify on-track status from one hypothetical trade."
        : "Progress can be compared, but on-track/behind status is not inferred without sufficient saved trajectory evidence."
  };
}

export function buildGoalRiskStressImpact({ holdings = [], projectedImpact, goalEvidence = null, stressLossPercent = 20 } = {}) {
  if (!projectedImpact?.available) return {
    available: false,
    status: "PROJECTED_IMPACT_REQUIRED",
    message: projectedImpact?.evidenceMessage || "Projected portfolio impact is required before goal/risk stress can be calculated.",
    readOnly: true, mutatesRealPortfolio: false, mutatesPracticePortfolio: false, mutatesInvestorDNA: false, mutatesGoals: false
  };

  const stress = Math.min(50, Math.max(0, n(stressLossPercent)));
  const currentHoldingsValue = (Array.isArray(holdings) ? holdings : []).reduce((sum, holding) => sum + holdingValue(holding), 0);
  const action = upper(projectedImpact.action) === "SELL" ? "SELL" : "BUY";
  const gross = n(projectedImpact?.transaction?.gross);
  const projectedHoldingsValue = action === "BUY" ? currentHoldingsValue + gross : Math.max(0, currentHoldingsValue - gross);
  const currentCash = n(projectedImpact?.current?.availableCash);
  const projectedCash = n(projectedImpact?.projected?.availableCash);
  const currentNetWorth = currentHoldingsValue + currentCash;
  const projectedNetWorth = projectedHoldingsValue + projectedCash;
  const stressedHoldingsValue = projectedHoldingsValue * (1 - stress / 100);
  const stressedNetWorth = stressedHoldingsValue + projectedCash;
  const modeledNetWorthDrawdownPercent = projectedNetWorth > 0 ? ((projectedNetWorth - stressedNetWorth) / projectedNetWorth) * 100 : 0;
  const cashPercent = projectedNetWorth > 0 ? (projectedCash / projectedNetWorth) * 100 : 0;

  const projectedRows = projectedHoldingRows({ holdings, projectedImpact });
  const largestProjectedValue = projectedRows.reduce((max, row) => Math.max(max, row.value), 0);
  const projectedLargestHoldingWeight = projectedHoldingsValue > 0 ? (largestProjectedValue / projectedHoldingsValue) * 100 : 0;
  const goal = buildGoalImpact({ currentNetWorth, projectedNetWorth, stressedNetWorth, goalEvidence });
  const goalRiskInput = goal.available && goal.direction === "WORSENS" ? "WORSENS" : "UNKNOWN";
  const risk = classifyDecisionRisk({ projectedLargestHoldingWeight, projectedSectorWeight: n(projectedImpact?.projected?.sectorExposurePct), cashPercent, stressLossPercent: stress, goalImpact: goalRiskInput });

  return {
    available: true,
    status: "DETERMINISTIC_STRESS_ONLY",
    readOnly: true, mutatesRealPortfolio: false, mutatesPracticePortfolio: false, mutatesInvestorDNA: false, mutatesGoals: false,
    action,
    symbol: projectedImpact.symbol,
    selectedStressLossPercent: stress,
    recoveryTable: buildRecoveryStressTable([10, 20, 30, 40, 50]),
    currentHoldingsValue: round(currentHoldingsValue),
    projectedHoldingsValue: round(projectedHoldingsValue),
    currentNetWorth: round(currentNetWorth),
    projectedNetWorth: round(projectedNetWorth),
    stressedHoldingsValue: round(stressedHoldingsValue),
    stressedNetWorth: round(stressedNetWorth),
    modeledNetWorthDrawdownPercent: round(modeledNetWorthDrawdownPercent),
    projectedCashPercent: round(cashPercent),
    projectedLargestHoldingWeight: round(projectedLargestHoldingWeight),
    projectedSectorWeight: round(projectedImpact?.projected?.sectorExposurePct),
    risk,
    goal,
    safeguards: {
      deterministicOnly: true,
      probabilityForecastUsed: false,
      expectedReturnInvented: false,
      cashStressedAsEquity: false,
      recoveryMathSource: "M20AQ_DECISION_LAB",
      riskClassificationSource: "M20AQ_DECISION_LAB",
      goalSource: goalEvidence?.source || "REAL_WEALTH_JOURNEY"
    }
  };
}

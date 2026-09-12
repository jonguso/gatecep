/*
 * PC-030M20AV2 — Goal-Preserving Diversified Recovery Allocation
 *
 * Pure advisory allocation logic.
 * Reuses:
 * - canonical REAL holdings supplied by caller
 * - saved sector targets when present
 * - existing Coach G investment-opportunity evidence supplied by caller
 * - existing 40% Decision Lab sector concentration guard
 *
 * It never manufactures a security, target, expected return, probability,
 * goal change, cash mutation, or broker execution.
 */

import {
  buildSectorExposure,
  calculateSectorAccommodation,
  buildUnderweightSectorCandidates
} from "../trading/coachGDecisionAccommodationService.js";

function n(v) {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}
function positive(v) {
  const x = n(v);
  return x !== null && x > 0 ? x : 0;
}
function text(v) {
  return String(v ?? "").trim();
}
function upper(v) {
  return text(v).toUpperCase();
}
function round(v) {
  const x = n(v);
  return x === null ? null : Math.round((x + Number.EPSILON) * 100) / 100;
}
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function scoreConfidence(value) {
  const v = upper(value);
  if (v === "VERY_HIGH" || v === "STRONG") return 4;
  if (v === "HIGH") return 3;
  if (v === "MEDIUM" || v === "MODERATE") return 2;
  if (v === "LOW") return 1;
  return 0;
}

export function normalizeRecoveryOpportunity(raw = {}) {
  const security = raw?.security && typeof raw.security === "object" ? raw.security : {};
  const recommendation =
    raw?.recommendation && typeof raw.recommendation === "object"
      ? raw.recommendation
      : {};

  const symbol = upper(
    raw?.symbol ??
    raw?.ticker ??
    raw?.code ??
    security?.symbol ??
    security?.ticker ??
    recommendation?.symbol
  );

  const sector = text(
    raw?.sector ??
    raw?.industry ??
    security?.sector ??
    security?.industry ??
    recommendation?.sector
  );

  const action = upper(
    raw?.action ??
    raw?.decision ??
    raw?.recommendationAction ??
    recommendation?.action ??
    recommendation?.decision
  );

  const confidence =
    raw?.confidence ??
    raw?.recommendationConfidence ??
    recommendation?.confidence ??
    null;

  const score =
    n(
      raw?.score ??
      raw?.totalScore ??
      raw?.investmentScore ??
      raw?.recommendationScore ??
      recommendation?.score
    ) ?? 0;

  const price =
    n(
      raw?.price ??
      raw?.currentPrice ??
      raw?.marketPrice ??
      raw?.lastPrice ??
      security?.price ??
      security?.currentPrice ??
      recommendation?.price
    );

  const concentrationStatus = upper(
    raw?.concentrationStatus ??
    raw?.portfolioImpact?.concentrationStatus ??
    recommendation?.concentrationStatus
  );

  const rationale = text(
    raw?.rationale ??
    raw?.reason ??
    raw?.summary ??
    recommendation?.rationale ??
    recommendation?.reason
  );

  const allowedAction =
    ["BUY", "ADD", "ACCUMULATE", "INCREASE", "CONSIDER_BUY"].includes(action);

  const concentrationBlocked =
    concentrationStatus.includes("BREACH") ||
    concentrationStatus.includes("EXCEED");

  return {
    raw,
    symbol,
    name: text(raw?.name ?? security?.name ?? recommendation?.name ?? symbol),
    sector,
    action,
    confidence,
    confidenceScore: scoreConfidence(confidence),
    score,
    price,
    concentrationStatus,
    rationale,
    allowedAction,
    concentrationBlocked,
    evidenceAvailable: Boolean(symbol && sector && allowedAction)
  };
}

function targetMap(targetSectorWeights = {}) {
  if (!targetSectorWeights || typeof targetSectorWeights !== "object") return {};
  return Object.fromEntries(
    Object.entries(targetSectorWeights)
      .map(([sector, weight]) => [text(sector), positive(weight)])
      .filter(([sector, weight]) => sector && weight > 0)
  );
}

function currentSectorWeightMap(holdings = []) {
  return Object.fromEntries(
    buildSectorExposure(holdings).map((x) => [x.sector, positive(x.weight)])
  );
}

function holdingPriceForSymbol(holdings = [], symbol) {
  const key = upper(symbol);
  const h = safeArray(holdings).find(
    (row) => upper(row?.symbol ?? row?.code ?? row?.security) === key
  );
  return n(
    h?.marketPrice ??
    h?.currentPrice ??
    h?.price ??
    h?.lastPrice ??
    h?.averagePrice
  );
}

export function buildRecoveryAllocationCandidates({
  holdings = [],
  opportunities = [],
  targetSectorWeights = {},
  recoveryAmount = 0,
  sectorLimitPercent = 40
} = {}) {
  const amount = positive(recoveryAmount);
  const targets = targetMap(targetSectorWeights);
  const currentWeights = currentSectorWeightMap(holdings);
  const underweight = buildUnderweightSectorCandidates({
    holdings,
    targetSectorWeights: targets
  });
  const underweightSet = new Set(underweight.map((x) => x.sector));

  const normalized = safeArray(opportunities)
    .map(normalizeRecoveryOpportunity)
    .filter((x) => x.evidenceAvailable && !x.concentrationBlocked);

  const rows = normalized.map((candidate) => {
    const targetWeight = positive(targets[candidate.sector]);
    const currentWeight = positive(currentWeights[candidate.sector]);
    const targetEvidenceAvailable = targetWeight > 0;

    const atOrAboveTarget =
      targetEvidenceAvailable && currentWeight >= targetWeight;

    const wholeBudgetImpact = calculateSectorAccommodation({
      holdings,
      proposedSector: candidate.sector,
      proposedAmount: amount,
      sectorLimitPercent
    });

    const alreadyAtOrAboveGuard =
      currentWeight >= positive(sectorLimitPercent);

    const blockedByConcentration =
      alreadyAtOrAboveGuard ||
      wholeBudgetImpact.exceedsSectorGuard === true;

    const eligible =
      !atOrAboveTarget &&
      !blockedByConcentration &&
      (
        !Object.keys(targets).length ||
        underweightSet.has(candidate.sector)
      );

    return {
      ...candidate,
      price:
        candidate.price ??
        holdingPriceForSymbol(holdings, candidate.symbol),
      targetWeight: targetEvidenceAvailable ? targetWeight : null,
      currentWeight,
      targetGap:
        targetEvidenceAvailable
          ? round(Math.max(0, targetWeight - currentWeight))
          : null,
      eligible,
      blockedByTarget: atOrAboveTarget,
      blockedByConcentration,
      wholeBudgetProjectedSectorWeight:
        wholeBudgetImpact.projectedSectorWeight,
      maxAdditionalBeforeSectorGuard:
        wholeBudgetImpact.maxAdditionalBeforeSectorGuard
    };
  });

  return {
    amount,
    targets,
    exposures: buildSectorExposure(holdings),
    underweight,
    candidates: rows,
    eligible: rows.filter((x) => x.eligible),
    rejected: rows.filter((x) => !x.eligible)
  };
}

function rankCandidate(a, b) {
  if ((b.targetGap || 0) !== (a.targetGap || 0)) {
    return (b.targetGap || 0) - (a.targetGap || 0);
  }
  if (b.confidenceScore !== a.confidenceScore) {
    return b.confidenceScore - a.confidenceScore;
  }
  return b.score - a.score;
}

function chooseBestPerSector(eligible = []) {
  const bySector = new Map();
  for (const row of [...eligible].sort(rankCandidate)) {
    if (!bySector.has(row.sector)) bySector.set(row.sector, row);
  }
  return [...bySector.values()].sort(rankCandidate);
}

function allocationWeights(selected = []) {
  const withGap = selected.filter((x) => positive(x.targetGap) > 0);
  const gapTotal = withGap.reduce((s, x) => s + positive(x.targetGap), 0);

  if (gapTotal > 0) {
    return Object.fromEntries(
      selected.map((x) => [
        x.symbol,
        positive(x.targetGap) > 0
          ? positive(x.targetGap) / gapTotal
          : 0
      ])
    );
  }

  const evidenceWeights = selected.map((x) => ({
    symbol: x.symbol,
    value: Math.max(1, x.confidenceScore * 10 + positive(x.score))
  }));
  const total = evidenceWeights.reduce((s, x) => s + x.value, 0);

  return Object.fromEntries(
    evidenceWeights.map((x) => [x.symbol, x.value / total])
  );
}

export function buildGoalPreservingDiversifiedRecoveryAllocation({
  holdings = [],
  opportunities = [],
  targetSectorWeights = {},
  recoveryAmount = 0,
  sectorLimitPercent = 40,
  minimumDistinctSectors = 2,
  maximumSecurities = 4
} = {}) {
  const base = buildRecoveryAllocationCandidates({
    holdings,
    opportunities,
    targetSectorWeights,
    recoveryAmount,
    sectorLimitPercent
  });

  if (!(base.amount > 0)) {
    return {
      status: "UNAVAILABLE",
      reason: "RECOVERY_AMOUNT_REQUIRED",
      ...base,
      allocation: []
    };
  }

  if (!base.eligible.length) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "NO_ELIGIBLE_EVIDENCE_BACKED_SECURITIES",
      ...base,
      allocation: []
    };
  }

  const bestBySector = chooseBestPerSector(base.eligible);
  const distinctSectors = new Set(bestBySector.map((x) => x.sector));

  if (distinctSectors.size < minimumDistinctSectors) {
    return {
      status: "INSUFFICIENT_DIVERSIFIED_EVIDENCE",
      reason: "FEWER_THAN_TWO_EVIDENCE_SUPPORTED_SECTORS",
      ...base,
      allocation: []
    };
  }

  const selected = bestBySector.slice(
    0,
    Math.max(minimumDistinctSectors, maximumSecurities)
  );
  const weights = allocationWeights(selected);

  let allocated = 0;
  const allocation = selected.map((row, index) => {
    const isLast = index === selected.length - 1;
    let budget = isLast
      ? Math.max(0, base.amount - allocated)
      : base.amount * positive(weights[row.symbol]);

    const sectorGuardCap = positive(row.maxAdditionalBeforeSectorGuard);
    if (sectorGuardCap > 0) budget = Math.min(budget, sectorGuardCap);

    budget = round(budget) || 0;
    allocated += budget;

    const price = positive(row.price);
    const approximateQuantity =
      price > 0 ? Math.floor(budget / price) : null;

    const estimatedGross =
      approximateQuantity !== null
        ? round(approximateQuantity * price)
        : null;

    const projected = calculateSectorAccommodation({
      holdings,
      proposedSector: row.sector,
      proposedAmount: estimatedGross ?? budget,
      sectorLimitPercent
    });

    return {
      symbol: row.symbol,
      name: row.name,
      sector: row.sector,
      action: "BUY",
      proposedAmount: budget,
      price: price || null,
      approximateQuantity,
      estimatedGross,
      currentSectorWeight: projected.currentSectorWeight,
      projectedSectorWeight: projected.projectedSectorWeight,
      targetSectorWeight: row.targetWeight,
      targetGap: row.targetGap,
      confidence: row.confidence,
      score: row.score,
      rationale:
        row.rationale ||
        `This security is supported by existing Coach G investment evidence in ${row.sector}, while that sector remains compatible with the saved diversification evidence.`,
      advisoryOnly: true
    };
  });

  const usableAllocation = allocation.filter((x) => x.proposedAmount > 0);
  const usedBudget = round(
    usableAllocation.reduce((s, x) => s + x.proposedAmount, 0)
  ) || 0;

  return {
    status: "AVAILABLE",
    reason: "DIVERSIFIED_RECOVERY_ALLOCATION_AVAILABLE",
    recoveryAmount: base.amount,
    allocatedAmount: usedBudget,
    unallocatedAmount: round(Math.max(0, base.amount - usedBudget)),
    allocation: usableAllocation,
    exposures: base.exposures,
    underweight: base.underweight,
    rejected: base.rejected,
    safeguards: {
      advisoryOnly: true,
      goalChanged: false,
      targetDateChanged: false,
      contributionChanged: false,
      realCashChanged: false,
      realPortfolioChanged: false,
      practicePortfolioChanged: false,
      investorDNAChanged: false,
      brokerOrderCreated: false,
      fabricatedSecurityAllowed: false,
      fabricatedSectorTargetAllowed: false
    }
  };
}

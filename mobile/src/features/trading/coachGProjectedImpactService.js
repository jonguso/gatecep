// PC-030M20AR10 — Action-Aware Projected Impact Interpretation
// Extends M20AR8 projected impact with explainable Coach G interpretation.
// Pure/read-only. No persistence and no REAL/Practice mutation.

const num = (v) => Number(v || 0);
const upper = (v) => String(v || "").trim().toUpperCase();
const pct = (v) => Number(v || 0).toFixed(2);
const money = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function holdingValue(h) {
  const explicit = num(h?.marketValue ?? h?.currentValue ?? h?.value);
  if (explicit > 0) return explicit;
  const qty = num(h?.quantity ?? h?.shares);
  const px = num(h?.currentPrice ?? h?.marketPrice ?? h?.price ?? h?.lastPrice ?? h?.averagePrice ?? h?.averageCost);
  return qty * px;
}

function holdingSector(h) {
  return String(h?.sector || h?.industry || "Unknown").trim() || "Unknown";
}

function direction(current, projected, epsilon = 0.005) {
  const delta = num(projected) - num(current);
  if (Math.abs(delta) <= epsilon) return "UNCHANGED";
  return delta > 0 ? "INCREASES" : "DECREASES";
}

export function buildProjectedImpactInterpretation(review = {}) {
  if (!review?.available) {
    return {
      available: false,
      action: review?.action || null,
      headline: "Projected impact needs more evidence",
      summary: review?.evidenceMessage || "Complete the scenario evidence before Coach G interprets the projected impact.",
      question: "Would you like to return to the scenario and complete the missing evidence?",
      concentrationDirection: "UNAVAILABLE",
      liquidityDirection: "UNAVAILABLE",
      evidenceBoundaries: ["No projected interpretation is created from missing evidence."]
    };
  }

  const action = upper(review?.action) === "SELL" ? "SELL" : "BUY";
  const symbol = review?.symbol || "this security";
  const sector = review?.sector || "this sector";
  const currentSector = num(review?.current?.sectorExposurePct);
  const projectedSector = num(review?.projected?.sectorExposurePct);
  const currentWeight = num(review?.current?.portfolioWeightPct);
  const projectedWeight = num(review?.projected?.portfolioWeightPct);
  const currentCash = num(review?.current?.availableCash);
  const projectedCash = num(review?.projected?.availableCash);

  const sectorDirection = direction(currentSector, projectedSector);
  const weightDirection = direction(currentWeight, projectedWeight);
  const cashDirection = direction(currentCash, projectedCash, 0.01);

  if (action === "SELL") {
    const quantity = num(review?.projected?.quantity);
    const concentrationText = sectorDirection === "DECREASES"
      ? `This reduction lowers ${sector} exposure from ${pct(currentSector)}% to ${pct(projectedSector)}%.`
      : sectorDirection === "UNCHANGED"
        ? `${sector} exposure remains approximately ${pct(projectedSector)}% in this modeled holdings view.`
        : `${sector} exposure moves from ${pct(currentSector)}% to ${pct(projectedSector)}%; Coach G will not describe that as concentration relief.`;
    const cashText = cashDirection === "INCREASES"
      ? `Projected available cash increases from KES ${money(currentCash)} to KES ${money(projectedCash)}.`
      : `Projected available cash is KES ${money(projectedCash)} in this scenario.`;

    return {
      available: true,
      action,
      headline: `Reducing ${symbol}: what this changes`,
      summary: `${concentrationText} ${symbol} weight moves from ${pct(currentWeight)}% to ${pct(projectedWeight)}%, leaving ${quantity.toLocaleString()} projected shares. ${cashText}`,
      question: "What do you want the released cash to accomplish: liquidity, a goal, or a separate reinvestment decision?",
      concentrationDirection: sectorDirection === "DECREASES" || weightDirection === "DECREASES" ? "LOWER" : "UNCHANGED_OR_MIXED",
      liquidityDirection: cashDirection === "INCREASES" ? "HIGHER" : "UNCHANGED_OR_MIXED",
      evidenceBoundaries: [
        "Remaining WAP, released cost basis and realized gain/loss come only from the existing FIFO-aware SELL analysis.",
        "This scenario is advisory and does not mutate the REAL or Practice portfolio.",
        "Goal impact is not asserted here unless verified goal evidence is supplied to a goal-aware analysis."
      ]
    };
  }

  const concentrationText = sectorDirection === "INCREASES"
    ? `This addition raises ${sector} exposure from ${pct(currentSector)}% to ${pct(projectedSector)}%.`
    : sectorDirection === "UNCHANGED"
      ? `${sector} exposure remains approximately ${pct(projectedSector)}% in this modeled holdings view.`
      : `This addition moves ${sector} exposure from ${pct(currentSector)}% to ${pct(projectedSector)}%.`;
  const cashText = cashDirection === "DECREASES"
    ? `Projected available cash falls from KES ${money(currentCash)} to KES ${money(projectedCash)}.`
    : `Projected available cash is KES ${money(projectedCash)} in this scenario.`;

  return {
    available: true,
    action,
    headline: `Adding ${symbol}: what this changes`,
    summary: `${concentrationText} ${symbol} weight moves from ${pct(currentWeight)}% to ${pct(projectedWeight)}%. ${cashText}`,
    question: sectorDirection === "INCREASES" || weightDirection === "INCREASES"
      ? "Does this extra concentration still fit what you want this decision to accomplish?"
      : "Would you like to keep this scenario or change one assumption before planning it?",
    concentrationDirection: sectorDirection === "INCREASES" || weightDirection === "INCREASES" ? "HIGHER" : "UNCHANGED_OR_MIXED",
    liquidityDirection: cashDirection === "DECREASES" ? "LOWER" : "UNCHANGED_OR_MIXED",
    evidenceBoundaries: [
      "Projected BUY WAP reuses the weighted-average guard when available.",
      "This scenario is advisory and does not mutate the REAL or Practice portfolio.",
      "Coach G does not manufacture goal impact, expected return or probability evidence."
    ]
  };
}

export function buildProjectedImpactReview({
  holdings = [],
  selectedStock,
  side,
  estimate,
  existingHolding = null,
  averageGuard = null,
  availableCash = 0
} = {}) {
  const action = upper(side) === "SELL" ? "SELL" : "BUY";
  const qty = num(estimate?.qty);
  const price = num(estimate?.price);
  const totalFees = num(estimate?.totalFees);
  const gross = num(estimate?.gross);
  const symbol = upper(selectedStock?.symbol);
  const sector = String(selectedStock?.sector || existingHolding?.sector || "Unknown").trim() || "Unknown";

  const currentQty = num(existingHolding?.quantity ?? existingHolding?.shares);
  const currentWap = num(existingHolding?.averagePrice ?? existingHolding?.averageCost);
  const currentHoldingValue = existingHolding ? holdingValue(existingHolding) : 0;
  const currentPortfolioValue = holdings.reduce((sum, h) => sum + holdingValue(h), 0);
  const currentSectorValue = holdings
    .filter((h) => holdingSector(h).toUpperCase() === sector.toUpperCase())
    .reduce((sum, h) => sum + holdingValue(h), 0);

  let available = qty > 0 && price > 0 && !!symbol;
  let evidenceMessage = null;
  let projectedQty = currentQty;
  let projectedWap = currentWap || null;
  let projectedHoldingValue = currentHoldingValue;
  let projectedPortfolioValue = currentPortfolioValue;
  let projectedSectorValue = currentSectorValue;
  let costBasisReleased = null;
  let realizedGainLoss = null;

  if (action === "BUY") {
    projectedQty = currentQty + qty;
    const acquisitionCost = gross + totalFees;
    const existingCostBasis = currentQty > 0 && currentWap > 0 ? currentQty * currentWap : 0;
    if (averageGuard?.available && num(averageGuard?.projectedAveragePrice) > 0) projectedWap = num(averageGuard.projectedAveragePrice);
    else projectedWap = projectedQty > 0 ? (existingCostBasis + acquisitionCost) / projectedQty : null;
    projectedHoldingValue = currentHoldingValue + gross;
    projectedPortfolioValue = currentPortfolioValue + gross;
    projectedSectorValue = currentSectorValue + gross;
  } else {
    if (!existingHolding) {
      available = false;
      evidenceMessage = "This security is not present in the current portfolio, so a SELL impact cannot be projected.";
    } else if (!averageGuard?.available) {
      available = false;
      evidenceMessage = averageGuard?.message || "Verified lot/cost-basis evidence is required before Coach G can project this SELL impact.";
    } else {
      projectedQty = num(averageGuard.remainingQuantity);
      projectedWap = averageGuard.remainingAveragePrice === null ? null : num(averageGuard.remainingAveragePrice);
      costBasisReleased = num(averageGuard.releasedCostBasis);
      realizedGainLoss = num(averageGuard.estimatedRealizedProfitLoss);
      projectedHoldingValue = Math.max(0, currentHoldingValue - gross);
      projectedPortfolioValue = Math.max(0, currentPortfolioValue - gross);
      projectedSectorValue = Math.max(0, currentSectorValue - gross);
    }
  }

  const currentWeightPct = currentPortfolioValue > 0 ? (currentHoldingValue / currentPortfolioValue) * 100 : 0;
  const projectedWeightPct = projectedPortfolioValue > 0 ? (projectedHoldingValue / projectedPortfolioValue) * 100 : 0;
  const currentSectorPct = currentPortfolioValue > 0 ? (currentSectorValue / currentPortfolioValue) * 100 : 0;
  const projectedSectorPct = projectedPortfolioValue > 0 ? (projectedSectorValue / projectedPortfolioValue) * 100 : 0;

  const review = {
    version: "PC-030M20AR10",
    advisoryOnly: true,
    realPortfolioMutationAllowed: false,
    practicePortfolioMutationAllowed: false,
    available,
    evidenceMessage,
    action,
    symbol,
    sector,
    current: { quantity: currentQty, weightedAveragePrice: currentWap || null, holdingValue: currentHoldingValue, portfolioWeightPct: currentWeightPct, sectorExposurePct: currentSectorPct, availableCash: num(availableCash) },
    projected: { quantity: projectedQty, weightedAveragePrice: projectedWap, holdingValue: projectedHoldingValue, portfolioWeightPct: projectedWeightPct, sectorExposurePct: projectedSectorPct, availableCash: num(estimate?.remainingCash), costBasisReleased, realizedGainLoss },
    transaction: { quantity: qty, price, gross, totalFees }
  };

  return { ...review, interpretation: buildProjectedImpactInterpretation(review) };
}

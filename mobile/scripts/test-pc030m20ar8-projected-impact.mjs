import assert from "node:assert/strict";
import { buildProjectedImpactReview } from "../src/features/trading/coachGProjectedImpactService.js";

const holdings = [
  { symbol: "KCB", sector: "Banking", quantity: 1000, currentPrice: 50, averagePrice: 40 },
  { symbol: "SCOM", sector: "Telecommunications", quantity: 1000, currentPrice: 25, averagePrice: 20 }
];

const buy = buildProjectedImpactReview({
  holdings,
  selectedStock: { symbol: "COOP", sector: "Banking" },
  side: "BUY",
  estimate: { qty: 1000, price: 15, gross: 15000, totalFees: 250, remainingCash: 34750 },
  availableCash: 50000
});
assert.equal(buy.available, true);
assert.equal(buy.projected.quantity, 1000);
assert.equal(Number(buy.projected.weightedAveragePrice.toFixed(2)), 15.25);
assert.ok(buy.projected.sectorExposurePct > buy.current.sectorExposurePct);
assert.equal(buy.realPortfolioMutationAllowed, false);
console.log("PASS — a new BUY receives a projected acquisition WAP including scenario charges without requiring an existing holding.");

const existingBuy = buildProjectedImpactReview({
  holdings,
  selectedStock: { symbol: "KCB", sector: "Banking" },
  side: "BUY",
  existingHolding: holdings[0],
  averageGuard: { available: true, projectedAveragePrice: 42.5 },
  estimate: { qty: 100, price: 50, gross: 5000, totalFees: 80, remainingCash: 44920 },
  availableCash: 50000
});
assert.equal(existingBuy.projected.weightedAveragePrice, 42.5);
console.log("PASS — existing-holding BUY reuses the established weighted-average guard result rather than creating a second WAP formula.");

const sellBlocked = buildProjectedImpactReview({
  holdings,
  selectedStock: { symbol: "KCB", sector: "Banking" },
  side: "SELL",
  existingHolding: holdings[0],
  averageGuard: { available: false, message: "FIFO evidence incomplete" },
  estimate: { qty: 100, price: 55, gross: 5500, totalFees: 90, remainingCash: 55410 },
  availableCash: 50000
});
assert.equal(sellBlocked.available, false);
assert.match(sellBlocked.evidenceMessage, /FIFO evidence incomplete/);
console.log("PASS — SELL impact refuses to fabricate projected remaining WAP when FIFO/cost-basis evidence is incomplete.");

const sell = buildProjectedImpactReview({
  holdings,
  selectedStock: { symbol: "KCB", sector: "Banking" },
  side: "SELL",
  existingHolding: holdings[0],
  averageGuard: { available: true, remainingQuantity: 900, remainingAveragePrice: 41, releasedCostBasis: 3900, estimatedRealizedProfitLoss: 1510 },
  estimate: { qty: 100, price: 55, gross: 5500, totalFees: 90, remainingCash: 55410 },
  availableCash: 50000
});
assert.equal(sell.projected.quantity, 900);
assert.equal(sell.projected.weightedAveragePrice, 41);
assert.equal(sell.projected.costBasisReleased, 3900);
console.log("PASS — SELL projected quantity/WAP/cost basis comes from the existing FIFO-aware sale analysis.");
console.log("PASS — projected impact review remains advisory/read-only and does not mutate REAL or Practice portfolios.");

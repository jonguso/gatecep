import { normalizeEvidenceDate } from "./transactionDateNormalizationService.js";
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value, places = 4) => Number(n(value).toFixed(places));

function chargesFor({ quantity, price, feePolicy = {} }) {
  const consideration = Math.max(0, n(quantity) * n(price));
  const commission = Math.max(
    n(feePolicy.minimumCommission),
    consideration * n(feePolicy.commissionRatePct) / 100
  );
  const other = consideration * n(feePolicy.otherChargesRatePct) / 100;
  return commission + other + n(feePolicy.fixedCharges);
}

function maximumPriceWithoutRaisingAverage({ currentAveragePrice, proposedQuantity, feePolicy }) {
  const average = n(currentAveragePrice);
  const quantity = n(proposedQuantity);
  if (!(average > 0 && quantity > 0 && feePolicy)) return null;
  let low = 0;
  let high = average;
  for (let index = 0; index < 80; index += 1) {
    const candidate = (low + high) / 2;
    const allInUnitCost = (quantity * candidate + chargesFor({ quantity, price: candidate, feePolicy })) / quantity;
    if (allInUnitCost <= average) low = candidate;
    else high = candidate;
  }
  return Math.floor(low * 100) / 100;
}

function minimumSalePriceWithoutRealizedLoss({ soldCostPerShare, proposedQuantity, feePolicy }) {
  const average = n(soldCostPerShare);
  const quantity = n(proposedQuantity);
  if (!(average > 0 && quantity > 0 && feePolicy)) return null;
  let low = average;
  let high = Math.max(average * 2, average + 100);
  for (let index = 0; index < 80; index += 1) {
    const candidate = (low + high) / 2;
    const netUnitProceeds = (quantity * candidate - chargesFor({ quantity, price: candidate, feePolicy })) / quantity;
    if (netUnitProceeds >= average) high = candidate;
    else low = candidate;
  }
  return Math.ceil(high * 100) / 100;
}

export function analyzeWeightedAverageBuy({ holding = {}, proposedQuantity = 0, proposedPrice = 0, feePolicy = null, estimatedCharges = null } = {}) {
  const currentQuantity = n(holding.quantity);
  const currentAveragePrice = n(holding.averagePrice ?? holding.averageCost ?? holding.costPrice);
  const currentCostBasis = n(holding.costValue ?? holding.investedValue ?? holding.costBasis) || currentQuantity * currentAveragePrice;
  const buyQuantity = n(proposedQuantity);
  const price = n(proposedPrice);

  if (!(currentQuantity > 0 && currentAveragePrice > 0)) return { available: false, status: "COST_BASIS_REQUIRED", message: "A verified current quantity and weighted average price are required." };
  if (!(buyQuantity > 0 && price > 0)) return { available: false, status: "ORDER_INPUT_REQUIRED", currentQuantity, currentAveragePrice, message: "Enter a proposed quantity and price to calculate the weighted-average impact." };

  const charges = estimatedCharges === null ? (feePolicy ? chargesFor({ quantity: buyQuantity, price, feePolicy }) : null) : n(estimatedCharges);
  if (charges === null) return { available: false, status: "FEE_EVIDENCE_REQUIRED", currentQuantity, currentAveragePrice, message: "Verified brokerage and statutory charges are required before Coach G can calculate an exact buy threshold." };

  const consideration = buyQuantity * price;
  const allInCost = consideration + charges;
  const allInUnitCost = allInCost / buyQuantity;
  const projectedQuantity = currentQuantity + buyQuantity;
  const projectedAveragePrice = (currentCostBasis + allInCost) / projectedQuantity;
  const change = projectedAveragePrice - currentAveragePrice;
  const maximumBuyPrice = maximumPriceWithoutRaisingAverage({ currentAveragePrice, proposedQuantity: buyQuantity, feePolicy });
  const raisesAverage = change > 0.005;

  return {
    available: true,
    status: raisesAverage ? "WAIT_FOR_LOWER_ALL_IN_PRICE" : "DOES_NOT_RAISE_AVERAGE",
    currentQuantity,
    currentAveragePrice: round(currentAveragePrice, 2),
    currentCostBasis: round(currentCostBasis, 2),
    proposedQuantity: buyQuantity,
    proposedPrice: round(price, 2),
    consideration: round(consideration, 2),
    estimatedCharges: round(charges, 2),
    allInCost: round(allInCost, 2),
    allInUnitCost: round(allInUnitCost, 2),
    projectedQuantity,
    projectedAveragePrice: round(projectedAveragePrice, 2),
    averagePriceChange: round(change, 2),
    maximumBuyPrice,
    raisesAverage,
    recommendation: raisesAverage
      ? maximumBuyPrice === null
        ? "This purchase raises the weighted average. Wait for a lower all-in acquisition cost or verify a lower fee schedule."
        : `At this quantity and fee schedule, consider waiting for a limit price of KES ${maximumBuyPrice.toFixed(2)} or lower if your goal is not to raise the weighted average.`
      : "The estimated all-in unit cost does not raise the current weighted average. Still review valuation, concentration, liquidity and your goal before adding."
  };
}

export function reconstructFifoAcquisitionLots({ transactions = [], symbol, currentQuantity, currentAveragePrice } = {}) {
  const target = String(symbol || "").toUpperCase();
  const rows = (Array.isArray(transactions) ? transactions : [])
    .filter((row) => {
      const status = String(row.status || row.orderStatus || "").toUpperCase();
      return String(row.symbol || "").toUpperCase() === target && ["FULLY TRADED", "FILLED", "COMPLETED", "SETTLED"].some((accepted) => status.includes(accepted));
    })
    .sort((a, b) => dateKey(a.executionDate || a.date || a.createdAt) - dateKey(b.executionDate || b.date || b.createdAt));
  const lots = [];
  rows.forEach((row) => {
    const quantity = n(row.quantity || row.filledQuantity || row.tradedQuantity);
    const price = n(row.price || row.averagePrice || row.executionPrice);
    if (!(quantity > 0 && price > 0)) return;
    if (String(row.side || row.type || "").toUpperCase().includes("BUY")) {
      const fees = n(row.fees || row.totalFees || row.charges);
      const rawLotDate = row.executionDate || row.date || null;
      const lotDateEvidence = normalizeEvidenceDate(rawLotDate);
      lots.push({
        quantity,
        unitCost: (quantity * price + fees) / quantity,
        originalUnitPrice: price,
        feesKnown: fees > 0,
        date: rawLotDate,
        normalizedDate: lotDateEvidence.normalizedDate || null,
        dateMethod: lotDateEvidence.method,
        brokerReference: row.brokerReference || row.orderNo || null
      });
      return;
    }
    if (String(row.side || row.type || "").toUpperCase().includes("SELL")) {
      let remaining = quantity;
      while (remaining > 0 && lots.length) {
        const consumed = Math.min(remaining, lots[0].quantity);
        lots[0].quantity -= consumed;
        remaining -= consumed;
        if (lots[0].quantity <= 0.000001) lots.shift();
      }
    }
  });
  const reconstructedQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  const reconstructedCost = lots.reduce((sum, lot) => sum + lot.quantity * lot.unitCost, 0);
  const reconstructedAverage = reconstructedQuantity > 0 ? reconstructedCost / reconstructedQuantity : 0;
  const quantityMatches = Math.abs(reconstructedQuantity - n(currentQuantity)) < 0.000001;
  const averageMatches = n(currentAveragePrice) > 0 && Math.abs(reconstructedAverage - n(currentAveragePrice)) <= Math.max(0.02, n(currentAveragePrice) * 0.005);
  const calibrationFactor = quantityMatches && reconstructedAverage > 0 && n(currentAveragePrice) > 0 ? n(currentAveragePrice) / reconstructedAverage : 1;
  const calibratedLots = quantityMatches ? lots.map((lot) => ({ ...lot, unitCost: lot.unitCost * calibrationFactor })) : lots;
  return {
    available: rows.length > 0 && quantityMatches,
    status: !rows.length ? "TRANSACTION_HISTORY_REQUIRED" : !quantityMatches ? "LOT_QUANTITY_MISMATCH" : averageMatches ? "FIFO_LOTS_RECONCILED" : "FIFO_LOTS_CALIBRATED_TO_BROKER_WAP",
    lots: calibratedLots,
    calibratedToBrokerAverage: quantityMatches && !averageMatches,
    calibrationFactor: round(calibrationFactor, 6),
    reconstructedQuantity: round(reconstructedQuantity, 4),
    reconstructedAverage: round(reconstructedAverage, 2)
  };
}

function dateKey(value) {
  const normalized = normalizeEvidenceDate(value).normalizedDate;
  const direct = normalized ? Date.parse(`${normalized}T00:00:00Z`) : NaN;
  return Number.isFinite(direct) ? direct : 0;
}

function fifoRemovedCost(lots = [], quantity = 0) {
  let remaining = n(quantity);
  let cost = 0;
  const consumedLots = [];
  for (const lot of lots) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, n(lot.quantity));
    cost += used * n(lot.unitCost);
    if (used > 0) consumedLots.push({ ...lot, quantity: used, cost: used * n(lot.unitCost) });
    remaining -= used;
  }
  return remaining <= 0.000001 ? { cost, consumedLots } : null;
}

export function analyzeAverageCostSale({ holding = {}, proposedQuantity = 0, proposedPrice = 0, feePolicy = null, estimatedCharges = null, costBasisMethod = "AVERAGE_COST", acquisitionLots = [], removedLotAveragePrice = null } = {}) {
  const currentQuantity = n(holding.quantity);
  const currentAveragePrice = n(holding.averagePrice ?? holding.averageCost ?? holding.costPrice);
  const sellQuantity = n(proposedQuantity);
  const price = n(proposedPrice);

  if (!(currentQuantity > 0 && currentAveragePrice > 0)) return { available: false, status: "COST_BASIS_REQUIRED", message: "A verified current quantity and weighted average price are required." };
  if (!(sellQuantity > 0 && price > 0)) return { available: false, status: "ORDER_INPUT_REQUIRED", currentQuantity, currentAveragePrice, message: "Enter a proposed quantity and price to calculate the sale impact." };
  if (sellQuantity > currentQuantity) return { available: false, status: "QUANTITY_EXCEEDS_HOLDING", currentQuantity, currentAveragePrice, message: `The scenario quantity exceeds the ${currentQuantity} shares currently held.` };

  const charges = estimatedCharges === null ? (feePolicy ? chargesFor({ quantity: sellQuantity, price, feePolicy }) : null) : n(estimatedCharges);
  if (charges === null) return { available: false, status: "FEE_EVIDENCE_REQUIRED", currentQuantity, currentAveragePrice, message: "Verified brokerage and statutory sale charges are required before Coach G can calculate an exact net break-even price." };

  const method = String(costBasisMethod || "AVERAGE_COST").toUpperCase();
  let releasedCostBasis = sellQuantity * currentAveragePrice;
  let removedLots = [];
  if (method === "FIFO") {
    const fifoResult = fifoRemovedCost(acquisitionLots, sellQuantity);
    if (fifoResult === null) return { available: false, status: "FIFO_LOT_EVIDENCE_REQUIRED", currentQuantity, currentAveragePrice, message: "Reconciled acquisition-lot history is required to predict the broker's FIFO re-averaging. Upload complete broker transactions or use a specific-lot scenario." };
    releasedCostBasis = fifoResult.cost;
    removedLots = fifoResult.consumedLots;
  } else if (method === "SPECIFIC_LOT") {
    if (!(n(removedLotAveragePrice) > 0)) return { available: false, status: "SPECIFIC_LOT_COST_REQUIRED", currentQuantity, currentAveragePrice, message: "Enter the expected average acquisition cost of the shares the broker will remove." };
    releasedCostBasis = sellQuantity * n(removedLotAveragePrice);
  }

  const grossProceeds = sellQuantity * price;
  const netProceeds = Math.max(grossProceeds - charges, 0);
  const netProceedsPerShare = netProceeds / sellQuantity;
  const estimatedRealizedProfitLoss = netProceeds - releasedCostBasis;
  const remainingQuantity = currentQuantity - sellQuantity;
  const currentCostBasis = n(holding.costValue ?? holding.investedValue ?? holding.costBasis) || currentQuantity * currentAveragePrice;
  const remainingCostBasis = Math.max(currentCostBasis - releasedCostBasis, 0);
  const remainingAveragePrice = remainingQuantity > 0 ? remainingCostBasis / remainingQuantity : null;
  const soldCostPerShare = releasedCostBasis / sellQuantity;
  const minimumSalePrice = minimumSalePriceWithoutRealizedLoss({ soldCostPerShare, proposedQuantity: sellQuantity, feePolicy });
  const realizesLoss = estimatedRealizedProfitLoss < -0.005;

  return {
    available: true,
    side: "SELL",
    status: realizesLoss ? "BELOW_NET_BREAK_EVEN" : "AT_OR_ABOVE_NET_BREAK_EVEN",
    currentQuantity,
    currentAveragePrice: round(currentAveragePrice, 2),
    costBasisMethod: method,
    proposedQuantity: sellQuantity,
    proposedPrice: round(price, 2),
    grossProceeds: round(grossProceeds, 2),
    estimatedCharges: round(charges, 2),
    netProceeds: round(netProceeds, 2),
    netProceedsPerShare: round(netProceedsPerShare, 2),
    releasedCostBasis: round(releasedCostBasis, 2),
    soldCostPerShare: round(soldCostPerShare, 2),
    removedLots,
    estimatedRealizedProfitLoss: round(estimatedRealizedProfitLoss, 2),
    remainingQuantity,
    remainingCostBasis: round(remainingCostBasis, 2),
    remainingAveragePrice: remainingAveragePrice === null ? null : round(remainingAveragePrice, 2),
    remainingAverageChange: remainingAveragePrice === null ? null : round(remainingAveragePrice - currentAveragePrice, 2),
    minimumSalePrice,
    realizesLoss,
    recommendation: realizesLoss
      ? minimumSalePrice === null
        ? "This sale realizes a cost-basis loss after charges. Verify the fee schedule before relying on an exact break-even price."
        : `At this quantity and fee schedule, KES ${minimumSalePrice.toFixed(2)} is the minimum gross limit price that avoids an estimated realized cost-basis loss.`
      : "The estimated net proceeds are at or above the released cost basis. Still review valuation, concentration, tax, liquidity and your goal before reducing the holding.",
    accountingNote: remainingQuantity > 0
      ? method === "AVERAGE_COST"
        ? `Under proportional average-cost removal, the remaining ${remainingQuantity} shares retain a weighted average of KES ${currentAveragePrice.toFixed(2)}.`
        : `Under ${method === "FIFO" ? "FIFO" : "the selected-lot scenario"}, removing shares with an average acquisition cost of KES ${soldCostPerShare.toFixed(2)} changes the remaining weighted average to KES ${remainingAveragePrice.toFixed(2)}.`
      : "This scenario sells the full holding, so no remaining weighted average applies."
  };
}

export { chargesFor as estimateWeightedAverageGuardCharges };

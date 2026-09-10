import { reconstructFifoAcquisitionLots } from "./weightedAverageBuyGuardService.js";
import { isCompletedLotExecution, loadBrokerLotHistoryEvidence } from "./brokerLotHistoryEvidenceService.js";
import { canonicalSecuritySymbol } from "./securityIdentityService.js";
import { normalizeEvidenceDate } from "./transactionDateNormalizationService.js";

const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const EPSILON = 0.000001;

function dateKey(value) {
  const normalized = normalizeEvidenceDate(value).normalizedDate;
  const direct = normalized ? Date.parse(`${normalized}T00:00:00Z`) : NaN;
  return Number.isFinite(direct) ? direct : 0;
}

function sideOf(row = {}) {
  const side = String(row.side || row.type || "").trim().toUpperCase();
  if (side === "B" || side.includes("BUY")) return "BUY";
  if (side === "S" || side.includes("SELL")) return "SELL";
  return side;
}

export function buildHistoricalSecurityLotLedger({ transactions = [], symbol, currentQuantity = null, currentAveragePrice = null, costBasisMethod = "FIFO" } = {}) {
  const target = canonicalSecuritySymbol(symbol);
  const rows = (Array.isArray(transactions) ? transactions : [])
    .map((row) => ({ ...row, rawSymbol: row.rawSymbol || row.symbol || null, symbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol), canonicalSymbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol) }))
    .filter((row) => canonicalSecuritySymbol(row.canonicalSymbol || row.symbol) === target)
    .filter(isCompletedLotExecution)
    .sort((a, b) => dateKey(a.executionDate || a.date || a.createdAt) - dateKey(b.executionDate || b.date || b.createdAt));

  const acquisitions = [];
  const historicalSales = [];
  const openQueue = [];
  const issues = [];

  rows.forEach((row) => {
    const side = sideOf(row);
    const quantity = n(row.quantity || row.filledQuantity || row.tradedQuantity);
    const price = n(row.price || row.averagePrice || row.executionPrice);
    const date = row.executionDate || row.date || row.createdAt || null;
    const dateEvidence = normalizeEvidenceDate(date);
    const brokerReference = row.brokerReference || row.orderNo || row.id || null;

    if (side === "BUY") {
      const fees = n(row.fees || row.totalFees || row.charges);
      const lot = {
        brokerReference,
        acquisitionDate: date,
        acquisitionDateNormalized: dateEvidence.normalizedDate || null,
        acquisitionDateMethod: dateEvidence.method,
        originalQuantity: quantity,
        historicallyConsumedQuantity: 0,
        remainingQuantity: quantity,
        originalUnitPrice: price,
        unitCost: (quantity * price + fees) / quantity,
        feesKnown: fees > 0,
        status: "OPEN"
      };
      acquisitions.push(lot);
      openQueue.push(lot);
      return;
    }

    if (side === "SELL") {
      let remaining = quantity;
      const consumedLots = [];
      for (const lot of openQueue) {
        if (remaining <= EPSILON) break;
        if (lot.remainingQuantity <= EPSILON) continue;
        const consumed = Math.min(remaining, lot.remainingQuantity);
        lot.historicallyConsumedQuantity += consumed;
        lot.remainingQuantity -= consumed;
        lot.status = lot.remainingQuantity <= EPSILON ? "CLOSED" : "PARTIAL";
        consumedLots.push({
          brokerReference: lot.brokerReference,
          acquisitionDate: lot.acquisitionDate,
          acquisitionDateNormalized: lot.acquisitionDateNormalized || null,
          acquisitionDateMethod: lot.acquisitionDateMethod || null,
          quantity: consumed,
          originalUnitPrice: lot.originalUnitPrice,
          unitCost: lot.unitCost
        });
        remaining -= consumed;
      }
      const unmatchedQuantity = remaining > EPSILON ? remaining : 0;
      if (unmatchedQuantity > 0) {
        issues.push({
          code: "UNMATCHED_HISTORICAL_SALE",
          saleBrokerReference: brokerReference,
          saleDate: date,
          saleDateNormalized: dateEvidence.normalizedDate || null,
          saleDateMethod: dateEvidence.method,
          saleQuantity: quantity,
          unmatchedQuantity
        });
      }
      historicalSales.push({
        brokerReference,
        saleDate: date,
        saleDateNormalized: dateEvidence.normalizedDate || null,
        saleDateMethod: dateEvidence.method,
        quantity,
        price,
        consumedLots,
        unmatchedQuantity
      });
    }
  });

  const rawOpenLots = acquisitions
    .filter((lot) => lot.remainingQuantity > EPSILON)
    .map((lot) => ({
      quantity: lot.remainingQuantity,
      unitCost: lot.unitCost,
      originalUnitPrice: lot.originalUnitPrice,
      feesKnown: lot.feesKnown,
      date: lot.acquisitionDate,
      normalizedDate: lot.acquisitionDateNormalized || null,
      dateMethod: lot.acquisitionDateMethod || null,
      brokerReference: lot.brokerReference
    }));

  const hasBrokerPosition = currentQuantity !== null && currentQuantity !== undefined;
  const fifo = hasBrokerPosition
    ? reconstructFifoAcquisitionLots({ transactions: rows, symbol: target, currentQuantity, currentAveragePrice })
    : null;
  const openLots = fifo?.available ? fifo.lots : rawOpenLots;
  const ledgerQuantity = rawOpenLots.reduce((sum, lot) => sum + n(lot.quantity), 0);
  const quantityMatches = !hasBrokerPosition || Math.abs(ledgerQuantity - n(currentQuantity)) <= EPSILON;
  const available = rows.length > 0 && issues.length === 0 && quantityMatches;

  return {
    symbol: target,
    costBasisMethod: String(costBasisMethod || "FIFO").toUpperCase(),
    source: "VERIFIED_BROKER_TRANSACTION_HISTORY",
    analyticalOnly: true,
    mutatesRealPortfolio: false,
    mutatesPracticePortfolio: false,
    available,
    status: !rows.length
      ? "TRANSACTION_HISTORY_REQUIRED"
      : issues.length
      ? "HISTORICAL_LEDGER_GAP"
      : !quantityMatches
      ? "LOT_QUANTITY_MISMATCH"
      : "HISTORICAL_LOT_LEDGER_RECONCILED",
    acquisitions,
    historicalSales,
    openLots,
    reconstructedQuantity: ledgerQuantity,
    reconciliation: {
      brokerQuantity: hasBrokerPosition ? n(currentQuantity) : null,
      ledgerQuantity,
      quantityMatches
    },
    calibration: fifo ? {
      status: fifo.status,
      calibratedToBrokerAverage: fifo.calibratedToBrokerAverage,
      calibrationFactor: fifo.calibrationFactor,
      reconstructedAverage: fifo.reconstructedAverage
    } : null,
    issues
  };
}

export async function loadHistoricalSecurityLotLedger({ symbol, currentQuantity = null, currentAveragePrice = null, costBasisMethod = "FIFO" } = {}) {
  const evidence = await loadBrokerLotHistoryEvidence();
  return buildHistoricalSecurityLotLedger({
    transactions: evidence.records,
    symbol,
    currentQuantity,
    currentAveragePrice,
    costBasisMethod
  });
}

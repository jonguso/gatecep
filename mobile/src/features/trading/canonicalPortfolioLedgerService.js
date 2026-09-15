import { buildHistoricalSecurityLotLedger } from "./historicalSecurityLotLedgerService.js";
import { isCompletedLotExecution } from "./brokerLotHistoryEvidenceService.js";
import { canonicalSecuritySymbol } from "./securityIdentityService.js";
import { brokerExecutionFillIdentity } from "../broker-sync/brokerExecutionFillIdentity.js";

const EPSILON = 0.000001;
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const text = (value) => String(value ?? "").trim();

function parseArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function eventKey(row = {}) {
  return (
    brokerExecutionFillIdentity(row) ||
    text(
      row.id ||
      `${row.executionDate || row.date}-` +
      `${canonicalSecuritySymbol(row.canonicalSymbol || row.symbol)}-` +
      `${row.side}-${row.quantity}-${row.price}`
    )
  );
}

export function normalizeCanonicalTradeEvents(records = []) {
  const seen = new Set();
  return (Array.isArray(records) ? records : [])
    .filter(isCompletedLotExecution)
    // PC-031A16:
    // Canonical REAL accounting is fail-closed.
    // A completed-looking row is insufficient by itself;
    // broker evidence must have been explicitly verified
    // as eligible to affect the REAL portfolio.
    .filter((row) => row.canAffectRealPortfolio === true)
    .map((row) => ({
      id: eventKey(row),
      brokerReference: text(row.brokerReference || row.id) || null,
      broker: text(row.broker) || null,
      executionDate: row.executionDate || row.date || row.createdAt || null,
      settlementDate: row.settlementDate || null,
      settlementStatus: row.settlementStatus || null,
      rawSymbol: text(row.rawSymbol || row.symbol).toUpperCase(),
      symbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol),
      canonicalSymbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol),
      sector: row.sector || null,
      side: /^(B|BUY)/i.test(text(row.side || row.type)) ? "BUY" : "SELL",
      quantity: n(row.quantity || row.filledQuantity || row.tradedQuantity),
      price: n(row.price || row.averagePrice || row.executionPrice),
      totalFees: n(row.totalFees ?? row.fees ?? row.charges),
      status: text(row.status || row.orderStatus).toUpperCase(),
      sourceType: "BROKER_EXECUTION_EVIDENCE",
      provenance: row.source || row.fileName || "TRANSACTION_HISTORY",
      canAffectRealPortfolio: true
    }))
    .filter((row) => {
      if (!row.id || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => new Date(a.executionDate || 0) - new Date(b.executionDate || 0));
}

export function buildCanonicalSecurityLedger({ transactions = [], holdings = [] } = {}) {
  const events = normalizeCanonicalTradeEvents(transactions);
  const holdingMap = new Map();
  for (const h of (Array.isArray(holdings) ? holdings : [])) {
    const rawSymbol = text(h.symbol || h.ticker).toUpperCase();
    const canonicalSymbol = canonicalSecuritySymbol(h.canonicalSymbol || rawSymbol);
    const prior = holdingMap.get(canonicalSymbol);
    holdingMap.set(canonicalSymbol, prior ? { ...h, rawSymbol, symbol:canonicalSymbol, quantity:n(prior.quantity ?? prior.qty)+n(h.quantity ?? h.qty) } : { ...h, rawSymbol, symbol:canonicalSymbol });
  }
  const symbols = [...new Set([...events.map((e) => e.symbol), ...holdingMap.keys()].filter(Boolean))];
  const securities = symbols.map((symbol) => {
    const holding = holdingMap.get(symbol);
    const brokerQuantity = holding ? n(holding.quantity ?? holding.qty) : 0;
    const brokerAveragePrice = holding ? n(holding.averagePrice ?? holding.averageCost ?? holding.costPrice) : null;
    const ledger = buildHistoricalSecurityLotLedger({ transactions: events, symbol, currentQuantity: brokerQuantity, currentAveragePrice: brokerAveragePrice, costBasisMethod: "FIFO" });
    return { symbol, brokerQuantity, brokerAveragePrice, ...ledger };
  });
  return {
    source: "VERIFIED_BROKER_EXECUTION_EVIDENCE",
    events,
    securities,
    reconciledCount: securities.filter((s) => s.reconciliation?.quantityMatches && !s.issues?.length).length,
    gapCount: securities.filter((s) => !s.reconciliation?.quantityMatches || s.issues?.length).length
  };
}

const CASH_TYPES = new Set(["OPENING_CASH","DEPOSIT","WITHDRAWAL","BUY_CONSIDERATION","BUY_FEES","SELL_PROCEEDS","SELL_FEES","DIVIDEND","INTEREST","TAX","BROKER_FEE","REGULATORY_FEE","CORPORATE_ACTION_CASH","ADJUSTMENT"]);

export function buildCanonicalCashLedger({ events = [], brokerAvailableCash = null } = {}) {
  const rows = (Array.isArray(events) ? events : []).filter((e) => CASH_TYPES.has(text(e.type).toUpperCase())).map((e, index) => ({
    id: e.id || e.brokerReference || `cash-${index}`,
    date: e.date || e.executionDate || null,
    type: text(e.type).toUpperCase(),
    amount: n(e.amount),
    brokerReference: e.brokerReference || null,
    rawSymbol: e.rawSymbol || e.symbol || null,
    symbol: e.symbol ? canonicalSecuritySymbol(e.canonicalSymbol || e.symbol) : null,
    sourceType: e.sourceType || "BROKER_CASH_EVIDENCE",
    provenance: e.provenance || null
  }));
  const calculatedCash = rows.reduce((sum, e) => sum + e.amount, 0);
  const hasBrokerCash = brokerAvailableCash !== null && brokerAvailableCash !== undefined && Number.isFinite(Number(brokerAvailableCash));
  const difference = hasBrokerCash ? n(brokerAvailableCash) - calculatedCash : null;
  const reconciled = hasBrokerCash && rows.length > 0 && Math.abs(difference) <= 0.01;
  return {
    source: "BROKER_CASH_LEDGER_EVIDENCE",
    events: rows,
    calculatedAvailableCash: calculatedCash,
    brokerAvailableCash: hasBrokerCash ? n(brokerAvailableCash) : null,
    difference,
    reconciled,
    status: !rows.length ? "CASH_LEDGER_HISTORY_REQUIRED" : !hasBrokerCash ? "BROKER_CASH_REQUIRED" : reconciled ? "CASH_LEDGER_RECONCILED" : "CASH_RECONCILIATION_GAP"
  };
}

export function deriveTradeCashEvents(transactions = []) {
  return normalizeCanonicalTradeEvents(transactions).flatMap((trade) => {
    const gross = trade.quantity * trade.price;
    if (trade.side === "BUY") return [
      { id: `${trade.id}:consideration`, date: trade.executionDate, type: "BUY_CONSIDERATION", amount: -gross, brokerReference: trade.brokerReference, symbol: trade.symbol, sourceType: trade.sourceType },
      ...(trade.totalFees > 0 ? [{ id: `${trade.id}:fees`, date: trade.executionDate, type: "BUY_FEES", amount: -trade.totalFees, brokerReference: trade.brokerReference, symbol: trade.symbol, sourceType: trade.sourceType }] : [])
    ];
    return [
      { id: `${trade.id}:proceeds`, date: trade.executionDate, type: "SELL_PROCEEDS", amount: gross, brokerReference: trade.brokerReference, symbol: trade.symbol, sourceType: trade.sourceType },
      ...(trade.totalFees > 0 ? [{ id: `${trade.id}:fees`, date: trade.executionDate, type: "SELL_FEES", amount: -trade.totalFees, brokerReference: trade.brokerReference, symbol: trade.symbol, sourceType: trade.sourceType }] : [])
    ];
  });
}

export async function rebuildCanonicalPortfolioLedger() {
  const [{ userGetItem, userSetItem }, { loadUnifiedPortfolio }] = await Promise.all([
    import("../../auth/userStorage.js"),
    import("../../services/portfolio/unifiedPortfolioApi.js")
  ]);
  const [txRaw, cashEventsRaw, cashRaw, portfolio] = await Promise.all([
    userGetItem("transactionHistory"),
    userGetItem("canonicalCashEvidenceEvents"),
    userGetItem("availableCash"),
    loadUnifiedPortfolio()
  ]);
  const transactions = parseArray(txRaw);
  const statementCashEvents = parseArray(cashEventsRaw);
  const tradeCashEvents = deriveTradeCashEvents(transactions);
  const securityLedger = buildCanonicalSecurityLedger({ transactions, holdings: portfolio?.holdings || [] });
  const cashLedger = buildCanonicalCashLedger({ events: [...statementCashEvents, ...tradeCashEvents], brokerAvailableCash: cashRaw === null ? null : Number(cashRaw) });
  const result = {
    version: "PC-030M20AL",
    derivedAt: new Date().toISOString(),
    evidenceDriven: true,
    mutatesRealPortfolio: false,
    mutatesPracticePortfolio: false,
    securityLedger,
    cashLedger
  };
  await userSetItem("canonicalPortfolioLedger", JSON.stringify(result));
  return result;
}

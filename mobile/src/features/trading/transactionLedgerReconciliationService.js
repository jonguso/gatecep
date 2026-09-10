import { isCompletedLotExecution } from "./brokerLotHistoryEvidenceService.js";
import { buildMonthlyPositionRegister, buildThreeWayPositionReconciliation } from "./monthlyPositionRegisterService.js";
import { normalizeTransactionDateEvidence } from "./transactionDateNormalizationService.js";
import { canonicalSecuritySymbol, canonicalizeSecuritySymbol } from "./securityIdentityService.js";

const EPSILON = 0.000001;
const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const text = (value) => String(value ?? "").trim();

function parseArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sideOf(row = {}) {
  const side = text(row.side || row.type).toUpperCase();
  if (side === "B" || side.includes("BUY")) return "BUY";
  if (side === "S" || side.includes("SELL") || side.includes("SALE")) return "SELL";
  return side || "UNKNOWN";
}

function dateOf(row = {}) {
  return row.executionDate || row.date || row.createdAt || null;
}

function dateKey(value) {
  if (!value) return 0;
  const direct = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(direct) ? direct : 0;
}

function evidenceKey(row = {}) {
  return text(row.brokerReference || row.id || `${dateOf(row)}-${canonicalSecuritySymbol(row.canonicalSymbol || row.symbol)}-${sideOf(row)}-${row.quantity}-${row.price}`);
}

function analyticalExclusionReasons(row = {}) {
  const reasons = [];
  const status = text(row.status || row.orderStatus).toUpperCase();
  const side = sideOf(row);
  const quantity = n(row.quantity || row.filledQuantity || row.tradedQuantity);
  const price = n(row.price || row.averagePrice || row.executionPrice);
  const date = text(dateOf(row));

  if (!text(row.symbol)) reasons.push("SYMBOL_REQUIRED");
  if (!["BUY", "SELL"].includes(side)) reasons.push("SIDE_REQUIRED");
  if (!(quantity > 0)) reasons.push("EXECUTED_QUANTITY_REQUIRED");
  if (!(price > 0)) reasons.push("EXECUTED_PRICE_REQUIRED");
  if (!date) reasons.push("EXECUTION_DATE_REQUIRED");
  if (!["FULLY TRADED", "FILLED", "COMPLETED", "SETTLED"].some((accepted) => status.includes(accepted))) {
    reasons.push(["REJECTED", "REFUSED", "CANCELLED", "CANCELED", "EXPIRED"].some((blocked) => status.includes(blocked))
      ? "TRADE_NOT_EXECUTED"
      : "COMPLETED_EXECUTION_STATUS_REQUIRED");
  }
  return reasons;
}

export function buildTransactionLedgerReconciliation({ verified = [], unverified = [], holdings = [], monthlyPositionStatements = [] } = {}) {
  const raw = [
    ...parseArray(verified).map((row) => ({ ...row, evidenceBucket: "VERIFIED_HISTORY" })),
    ...parseArray(unverified).map((row) => ({ ...row, evidenceBucket: "UNVERIFIED_HISTORY" }))
  ];

  const holdingMap = new Map();
  for (const holding of (Array.isArray(holdings) ? holdings : [])) {
    const rawSymbol = text(holding.symbol || holding.ticker).toUpperCase();
    const canonicalSymbol = canonicalSecuritySymbol(rawSymbol);
    const prior = holdingMap.get(canonicalSymbol);
    // Alias rows representing the same security are combined only when multiple rows actually exist.
    holdingMap.set(canonicalSymbol, prior ? { ...holding, rawSymbols:[...(prior.rawSymbols || [prior.rawSymbol || prior.symbol]), rawSymbol], symbol:canonicalSymbol, quantity:n(prior.quantity ?? prior.qty)+n(holding.quantity ?? holding.qty) } : { ...holding, rawSymbol, symbol:canonicalSymbol });
  }

  const seenAnalytical = new Set();
  const rows = raw.map((row, sourceIndex) => {
    const rawSymbol = text(row.rawSymbol || row.symbol).toUpperCase();
    const symbol = canonicalSecuritySymbol(row.canonicalSymbol || row.symbol);
    const side = sideOf(row);
    const quantity = n(row.quantity || row.filledQuantity || row.tradedQuantity);
    const price = n(row.price || row.averagePrice || row.executionPrice);
    const status = text(row.status || row.orderStatus).toUpperCase() || "UNKNOWN";
    const key = evidenceKey(row) || `ROW-${sourceIndex}`;
    const completed = isCompletedLotExecution(row);
    const duplicate = completed && seenAnalytical.has(key);
    if (completed && !duplicate) seenAnalytical.add(key);
    const exclusionReasons = analyticalExclusionReasons(row);
    if (duplicate) exclusionReasons.push("DUPLICATE_EVIDENCE");
    const fifoIncluded = completed && !duplicate;
    const canonicalEligible = fifoIncluded && row.canAffectRealPortfolio !== false;
    if (fifoIncluded && row.canAffectRealPortfolio === false) exclusionReasons.push("REAL_PORTFOLIO_EVIDENCE_NOT_VERIFIED");

    return {
      id: key,
      sourceIndex,
      evidenceBucket: row.evidenceBucket,
      provenance: row.source || row.fileName || row.evidenceBucket,
      rawSymbol,
      symbol,
      canonicalSymbol: symbol,
      sector: row.sector || holdingMap.get(symbol)?.sector || null,
      rawDate: dateOf(row),
      date: normalizeTransactionDateEvidence(row).executionDate || dateOf(row),
      executionDate: normalizeTransactionDateEvidence(row).executionDate,
      settlementDate: normalizeTransactionDateEvidence(row).settlementDate,
      rawExecutionDate: normalizeTransactionDateEvidence(row).rawExecutionDate,
      rawSettlementDate: normalizeTransactionDateEvidence(row).rawSettlementDate,
      dateNormalizationMethod: normalizeTransactionDateEvidence(row).executionDateMethod,
      settlementDateNormalizationMethod: normalizeTransactionDateEvidence(row).settlementDateMethod,
      effectiveDate: normalizeTransactionDateEvidence(row).effectiveDate,
      effectiveDateRole: normalizeTransactionDateEvidence(row).effectiveDateRole,
      side,
      quantity,
      price,
      value: n(row.value || quantity * price),
      fees: n(row.totalFees ?? row.fees ?? row.charges),
      status,
      brokerReference: row.brokerReference || row.id || null,
      broker: row.broker || null,
      settlementStatus: row.settlementStatus || null,
      fifoIncluded,
      canonicalEligible,
      exclusionReasons: [...new Set(exclusionReasons)]
    };
  }).sort((a, b) => dateKey(a.effectiveDate || a.date) - dateKey(b.effectiveDate || b.date) || a.sourceIndex - b.sourceIndex);

  const symbols = [...new Set([
    ...rows.map((row) => row.symbol),
    ...holdingMap.keys()
  ].filter(Boolean))].sort();

  const securities = symbols.map((symbol) => {
    let runningQuantity = 0;
    const securityRows = rows.filter((row) => row.symbol === symbol).map((row) => {
      if (row.fifoIncluded) {
        runningQuantity += row.side === "SELL" ? -row.quantity : row.quantity;
      }
      return { ...row, runningQuantity: row.fifoIncluded ? runningQuantity : null };
    });
    const holding = holdingMap.get(symbol);
    const brokerQuantity = holding ? n(holding.quantity ?? holding.qty) : 0;
    const difference = runningQuantity - brokerQuantity;
    const reconciled = Math.abs(difference) <= EPSILON;
    return {
      rawSymbols: [...new Set([...(holding?.rawSymbols || [holding?.rawSymbol || holding?.symbol].filter(Boolean)), ...securityRows.map((row)=>row.rawSymbol).filter(Boolean)])],
      symbol,
      canonicalSymbol: symbol,
      sector: holding?.sector || securityRows.find((row) => row.sector)?.sector || null,
      brokerQuantity,
      ledgerQuantity: runningQuantity,
      difference,
      reconciled,
      status: reconciled ? "RECONCILED" : "NOT_RECONCILED",
      includedCount: securityRows.filter((row) => row.fifoIncluded).length,
      excludedCount: securityRows.filter((row) => !row.fifoIncluded || !row.canonicalEligible).length,
      rows: securityRows
    };
  });

  const monthlyPositionRegister = buildMonthlyPositionRegister(monthlyPositionStatements);
  const threeWay = buildThreeWayPositionReconciliation({
    register: monthlyPositionRegister,
    holdings,
    transactions: rows.filter((row) => row.fifoIncluded)
  });

  return {
    version: "PC-030M20AL",
    priorVersion: "PC-030M20AK",
    evidenceDriven: true,
    readOnly: true,
    mutatesRealPortfolio: false,
    mutatesPracticePortfolio: false,
    securities,
    rows,
    monthlyPositionRegister,
    threeWay,
    summary: {
      securityCount: securities.length,
      reconciledCount: securities.filter((item) => item.reconciled).length,
      gapCount: securities.filter((item) => !item.reconciled).length,
      evidenceRowCount: rows.length,
      fifoIncludedCount: rows.filter((row) => row.fifoIncluded).length,
      excludedOrRestrictedCount: rows.filter((row) => !row.fifoIncluded || !row.canonicalEligible).length
    }
  };
}

export async function loadTransactionLedgerReconciliation() {
  const [{ userGetItem }, { loadUnifiedPortfolioRuntime }] = await Promise.all([
    import("../../auth/userStorage.js"),
    import("../../portfolio/unifiedPortfolioApi.js")
  ]);
  const [verifiedRaw, unverifiedRaw, monthlyPositionStatementsRaw, portfolio] = await Promise.all([
    userGetItem("transactionHistory"),
    userGetItem("unverifiedTransactionHistory"),
    userGetItem("cdscMonthlyPositionStatements"),
    loadUnifiedPortfolioRuntime({ broker: "ALL" }).catch(() => null)
  ]);
  return buildTransactionLedgerReconciliation({
    verified: verifiedRaw,
    unverified: unverifiedRaw,
    holdings: portfolio?.holdings || [],
    monthlyPositionStatements: monthlyPositionStatementsRaw
  });
}

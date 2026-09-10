import { normalizeEvidenceDate, normalizeTransactionDateEvidence, classifyAgainstStatement, calendarDayDifference } from "./transactionDateNormalizationService.js";
import { canonicalSecuritySymbol, canonicalizeSecuritySymbol } from "./securityIdentityService.js";

const EPSILON = 0.000001;
const n = (value) => Number.isFinite(Number(String(value ?? "").replaceAll(",", ""))) ? Number(String(value ?? "").replaceAll(",", "")) : 0;
const text = (value) => String(value ?? "").trim();

function parseArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function isoDate(value) {
  return normalizeEvidenceDate(value).normalizedDate;
}

function periodKey(statement = {}) {
  return text(statement.periodEnd || statement.statementEnd || statement.asOfDate || statement.period || "");
}

function normalizeMovementType(value) {
  const v = text(value).toUpperCase();
  if (v.includes("BALANCE BROUGHT FORWARD") || v === "OPENING" || v === "OPENING_BALANCE") return "OPENING_BALANCE";
  if (v.includes("BALANCE CARRIED FORWARD") || v === "CLOSING" || v === "CLOSING_BALANCE") return "CLOSING_BALANCE";
  if (v.includes("PURCHASE") || v === "BUY") return "PURCHASE";
  if (v.includes("SALE") || v === "SELL") return "SALE";
  return v || "OTHER";
}

export function buildMonthlyPositionStatement({ accountNumber = null, periodStart, periodEnd, rows = [], sourceFileName = null, statementId = null } = {}) {
  const normalizedRows = (Array.isArray(rows) ? rows : []).map((row, index) => ({
    id: row.id || `CDSC-${index}`,
    rawSymbol: text(row.rawSymbol || row.symbol || row.Symbol || row.Security || row.security).toUpperCase(),
    symbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol || row.Symbol || row.Security || row.security),
    canonicalSymbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol || row.Symbol || row.Security || row.security),
    name: row.name || row.securityName || row.Name || null,
    broker: row.broker || row.Broker || null,
    date: isoDate(row.date || row.Date),
    type: normalizeMovementType(row.type || row.Type || row.particulars || row.Particulars),
    quantity: n(row.quantity ?? row.Quantity ?? row.debit ?? row.Debit ?? row.credit ?? row.Credit),
    balance: n(row.balance ?? row.Balance),
    rawParticulars: row.particulars || row.Particulars || null
  })).filter((row) => row.symbol && row.type);

  const grouped = new Map();
  for (const row of normalizedRows) {
    if (!grouped.has(row.symbol)) grouped.set(row.symbol, []);
    grouped.get(row.symbol).push(row);
  }

  const securities = [...grouped.entries()].map(([symbol, securityRows]) => {
    const openingRow = securityRows.find((r) => r.type === "OPENING_BALANCE");
    const closingRow = [...securityRows].reverse().find((r) => r.type === "CLOSING_BALANCE");
    const purchases = securityRows.filter((r) => r.type === "PURCHASE").reduce((s,r) => s + r.quantity, 0);
    const sales = securityRows.filter((r) => r.type === "SALE").reduce((s,r) => s + r.quantity, 0);
    const openingBalance = openingRow ? openingRow.balance : 0;
    const calculatedClosingBalance = openingBalance + purchases - sales;
    const closingBalance = closingRow ? closingRow.balance : calculatedClosingBalance;
    const difference = calculatedClosingBalance - closingBalance;
    return {
      symbol,
      name: securityRows.find((r) => r.name)?.name || symbol,
      openingBalance,
      purchases,
      sales,
      calculatedClosingBalance,
      closingBalance,
      difference,
      intraMonthReconciled: Math.abs(difference) <= EPSILON,
      status: Math.abs(difference) <= EPSILON ? "MONTH_RECONCILED" : "MONTH_STATEMENT_GAP",
      rows: securityRows
    };
  }).sort((a,b) => a.symbol.localeCompare(b.symbol));

  const start = isoDate(periodStart);
  const end = isoDate(periodEnd);
  return {
    version: "PC-030M20AL",
    statementId: statementId || `CDSC-${accountNumber || "ACCOUNT"}-${end || Date.now()}`,
    source: "CDSC_MONTHLY_POSITION_STATEMENT",
    authoritativeForSettledQuantity: true,
    accountNumber,
    periodStart: start,
    periodEnd: end,
    sourceFileName,
    securities,
    rowCount: normalizedRows.length,
    createdAt: new Date().toISOString()
  };
}

function canonicalizeStoredStatement(statement = {}) {
  const groups = new Map();
  for (const sourceSecurity of statement.securities || []) {
    const identity = canonicalizeSecuritySymbol(sourceSecurity.canonicalSymbol || sourceSecurity.symbol);
    const canonical = identity.canonicalSymbol;
    const sourceRows = (sourceSecurity.rows || []).map((row) => {
      const rowIdentity = canonicalizeSecuritySymbol(row.canonicalSymbol || row.symbol || sourceSecurity.symbol);
      return { ...row, rawSymbol: row.rawSymbol || row.symbol || sourceSecurity.symbol, symbol: rowIdentity.canonicalSymbol, canonicalSymbol: rowIdentity.canonicalSymbol };
    });
    if (!groups.has(canonical)) groups.set(canonical, []);
    groups.get(canonical).push({ ...sourceSecurity, rawSymbol: sourceSecurity.rawSymbol || sourceSecurity.symbol, symbol: canonical, canonicalSymbol: canonical, rows: sourceRows });
  }
  const securities = [...groups.entries()].map(([symbol, parts]) => {
    if (parts.length === 1) return parts[0];
    const rows = parts.flatMap((p) => p.rows || []);
    const openingRows = rows.filter((r) => r.type === "OPENING_BALANCE");
    const closingRows = rows.filter((r) => r.type === "CLOSING_BALANCE");
    const purchases = rows.filter((r) => r.type === "PURCHASE").reduce((sum,r)=>sum+n(r.quantity),0);
    const sales = rows.filter((r) => r.type === "SALE").reduce((sum,r)=>sum+n(r.quantity),0);
    const openingBalance = openingRows.length ? n(openingRows[0].balance) : parts.reduce((sum,p)=>sum+n(p.openingBalance),0);
    const closingBalance = closingRows.length ? n(closingRows.at(-1).balance) : parts.reduce((sum,p)=>sum+n(p.closingBalance),0);
    const calculatedClosingBalance = openingBalance + purchases - sales;
    const difference = calculatedClosingBalance - closingBalance;
    return {
      symbol, canonicalSymbol:symbol, rawSymbols:[...new Set(parts.map((p)=>p.rawSymbol || p.symbol))],
      name: parts.find((p)=>p.name)?.name || symbol, openingBalance, purchases, sales, calculatedClosingBalance, closingBalance, difference,
      intraMonthReconciled: Math.abs(difference) <= EPSILON,
      status: Math.abs(difference) <= EPSILON ? "MONTH_RECONCILED" : "MONTH_STATEMENT_GAP", rows
    };
  }).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  return { ...statement, securities };
}

export function buildMonthlyPositionRegister(statements = []) {
  const ordered = parseArray(statements).map(canonicalizeStoredStatement).slice().sort((a,b) => String(a.periodEnd || "").localeCompare(String(b.periodEnd || "")));
  const continuity = [];
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1];
    const current = ordered[i];
    const symbols = new Set([...(previous.securities || []).map(x=>x.symbol), ...(current.securities || []).map(x=>x.symbol)]);
    for (const symbol of symbols) {
      const prev = (previous.securities || []).find(x=>x.symbol===symbol);
      const cur = (current.securities || []).find(x=>x.symbol===symbol);
      if (!prev || !cur) continue;
      const difference = n(prev.closingBalance) - n(cur.openingBalance);
      continuity.push({
        symbol,
        previousPeriodEnd: previous.periodEnd,
        currentPeriodStart: current.periodStart,
        previousClosingBalance: n(prev.closingBalance),
        currentOpeningBalance: n(cur.openingBalance),
        difference,
        reconciled: Math.abs(difference) <= EPSILON,
        status: Math.abs(difference) <= EPSILON ? "CONTINUITY_RECONCILED" : "CONTINUITY_GAP"
      });
    }
  }
  return {
    version: "PC-030M20AL",
    readOnly: true,
    statements: ordered,
    latestStatement: ordered.at(-1) || null,
    continuity,
    continuityGapCount: continuity.filter(x=>!x.reconciled).length
  };
}

export function buildDateBucketReconciliation({ statement, transactions = [], settlementWindowDays = 7 } = {}) {
  if (!statement) return [];
  const tx = Array.isArray(transactions) ? transactions : [];
  const buckets = new Map();
  const keyFor = (symbol, date, side, source) => `${source}|${canonicalSecuritySymbol(symbol)}|${date}|${side}`;
  const add = (source, symbol, date, side, qty, row, dateRole = null) => {
    const key = keyFor(symbol, date, side, source);
    if (!buckets.has(key)) buckets.set(key, { key, source, symbol:canonicalSecuritySymbol(symbol), date, side, quantity:0, rows:[], dateRole });
    const b = buckets.get(key);
    b.quantity += qty;
    b.rows.push(row);
  };

  for (const sec of statement.securities || []) {
    for (const row of sec.rows || []) {
      const side = row.type === "PURCHASE" ? "BUY" : row.type === "SALE" ? "SELL" : null;
      if (!side || !(row.quantity > 0) || !row.date) continue;
      add("CDSC", sec.symbol, row.date, side, row.quantity, row, "SETTLEMENT_DATE");
    }
  }

  const normalizedTransactions = [];
  for (const row of tx) {
    const symbol = canonicalSecuritySymbol(row.canonicalSymbol || row.symbol);
    const sideRaw = text(row.side || row.type).toUpperCase();
    const side = sideRaw === "B" || sideRaw.includes("BUY") ? "BUY" : sideRaw === "S" || sideRaw.includes("SELL") || sideRaw.includes("SALE") ? "SELL" : null;
    const qty = n(row.quantity || row.filledQuantity || row.tradedQuantity);
    const dates = normalizeTransactionDateEvidence(row);
    const date = dates.effectiveDate;
    const periodClass = classifyAgainstStatement(date, statement);
    const normalized = { ...row, ...dates, statementPeriodClass: periodClass };
    normalizedTransactions.push(normalized);
    if (!symbol || !side || !(qty > 0) || !date || periodClass !== "IN_STATEMENT_PERIOD") continue;
    add("TX", symbol, date, side, qty, normalized, dates.effectiveDateRole);
  }

  const cdscBuckets = [...buckets.values()].filter((b) => b.source === "CDSC");
  const txBuckets = [...buckets.values()].filter((b) => b.source === "TX");
  const usedTx = new Set();
  const results = [];

  for (const c of cdscBuckets) {
    const exact = txBuckets.find((t) => !usedTx.has(t.key) && t.symbol === c.symbol && t.side === c.side && t.date === c.date && (t.dateRole === "SETTLEMENT_DATE" || Math.abs(t.quantity - c.quantity) <= EPSILON));
    if (exact) {
      usedTx.add(exact.key);
      const difference = exact.quantity - c.quantity;
      results.push({
        symbol:c.symbol,date:c.date,side:c.side,cdscQuantity:c.quantity,transactionQuantity:exact.quantity,difference,
        cdscRows:c.rows,transactionRows:exact.rows,reconciled:Math.abs(difference)<=EPSILON,
        status:Math.abs(difference)<=EPSILON?"DATE_BUCKET_RECONCILED":"DATE_BUCKET_GAP",
        dateAlignment:"EXACT_DATE",dateGapDays:0,aggregationAccepted:c.rows.length!==exact.rows.length && Math.abs(difference)<=EPSILON,
        authoritativeDateMatch:true
      });
      continue;
    }

    // CDSC publishes settlement dates. If broker evidence only exposes a trade/execution
    // date, allow a clearly-labelled, non-destructive candidate match by quantity inside
    // a short forward settlement window. This does NOT invent or overwrite settlementDate.
    const candidates = txBuckets.filter((t) => {
      if (usedTx.has(t.key) || t.symbol !== c.symbol || t.side !== c.side || Math.abs(t.quantity-c.quantity)>EPSILON) return false;
      if (t.dateRole === "SETTLEMENT_DATE") return false;
      const lag = calendarDayDifference(t.date, c.date);
      return lag !== null && lag >= 0 && lag <= settlementWindowDays;
    }).sort((a,b) => calendarDayDifference(a.date,c.date)-calendarDayDifference(b.date,c.date));

    if (candidates.length === 1) {
      const t = candidates[0];
      usedTx.add(t.key);
      results.push({
        symbol:c.symbol,date:c.date,transactionDate:t.date,side:c.side,cdscQuantity:c.quantity,transactionQuantity:t.quantity,difference:0,
        cdscRows:c.rows,transactionRows:t.rows,reconciled:true,status:"SETTLEMENT_WINDOW_RECONCILED",
        dateAlignment:"TRADE_DATE_TO_CDSC_SETTLEMENT_DATE",dateGapDays:calendarDayDifference(t.date,c.date),aggregationAccepted:c.rows.length!==t.rows.length,
        authoritativeDateMatch:false,provisionalDateAlignment:true
      });
    } else {
      results.push({
        symbol:c.symbol,date:c.date,side:c.side,cdscQuantity:c.quantity,transactionQuantity:0,difference:-c.quantity,
        cdscRows:c.rows,transactionRows:[],reconciled:false,status:candidates.length>1?"SETTLEMENT_WINDOW_AMBIGUOUS":"DATE_BUCKET_GAP",
        dateAlignment:"UNMATCHED",dateGapDays:null,aggregationAccepted:false,authoritativeDateMatch:false
      });
    }
  }

  for (const t of txBuckets.filter((x) => !usedTx.has(x.key))) {
    results.push({
      symbol:t.symbol,date:t.date,side:t.side,cdscQuantity:0,transactionQuantity:t.quantity,difference:t.quantity,
      cdscRows:[],transactionRows:t.rows,reconciled:false,status:"TRANSACTION_BUCKET_UNMATCHED",
      dateAlignment:t.dateRole === "SETTLEMENT_DATE" ? "UNMATCHED_SETTLEMENT_DATE" : "UNMATCHED_TRADE_DATE",
      dateGapDays:null,aggregationAccepted:false,authoritativeDateMatch:false
    });
  }

  return results.sort((a,b) => String(a.date).localeCompare(String(b.date)) || a.symbol.localeCompare(b.symbol));
}

export function buildThreeWayPositionReconciliation({ register, holdings = [], transactions = [] } = {}) {
  const latest = register?.latestStatement || null;
  const holdingMap = new Map();
  for (const h of (Array.isArray(holdings) ? holdings : [])) {
    const rawSymbol = text(h.symbol || h.ticker).toUpperCase();
    const canonicalSymbol = canonicalSecuritySymbol(h.canonicalSymbol || rawSymbol);
    const prior = holdingMap.get(canonicalSymbol);
    holdingMap.set(canonicalSymbol, prior ? { ...h, symbol:canonicalSymbol, rawSymbols:[...(prior.rawSymbols || [prior.rawSymbol || prior.symbol]), rawSymbol], quantity:n(prior.quantity ?? prior.qty)+n(h.quantity ?? h.qty) } : { ...h, rawSymbol, symbol:canonicalSymbol });
  }
  const dateBuckets = buildDateBucketReconciliation({ statement: latest, transactions });
  const symbols = new Set([...(latest?.securities || []).map(x=>x.symbol), ...holdingMap.keys()]);
  const normalizedTransactions = (Array.isArray(transactions) ? transactions : []).map((row) => ({ ...row, rawSymbol: row.rawSymbol || row.symbol || null, symbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol), canonicalSymbol: canonicalSecuritySymbol(row.canonicalSymbol || row.symbol), ...normalizeTransactionDateEvidence(row) }));

  const securities = [...symbols].map(symbol => {
    const anchor = (latest?.securities || []).find(x=>x.symbol===symbol) || null;
    const holding = holdingMap.get(symbol) || null;
    const registeredQuantity = anchor ? n(anchor.closingBalance) : null;
    const brokerQuantity = holding ? n(holding.quantity ?? holding.qty) : null;
    const positionDifference = registeredQuantity === null || brokerQuantity === null ? null : brokerQuantity - registeredQuantity;
    const positionReconciled = positionDifference !== null && Math.abs(positionDifference) <= EPSILON;
    const securityBuckets = dateBuckets.filter(x=>x.symbol===symbol);
    const historyReconciled = securityBuckets.length > 0 && securityBuckets.every(x=>x.reconciled);

    const securityTx = normalizedTransactions.filter((row) => canonicalSecuritySymbol(row.canonicalSymbol || row.symbol) === symbol);
    const preAnchorRows = securityTx.filter((row) => classifyAgainstStatement(row.effectiveDate, latest) === "BEFORE_STATEMENT_PERIOD");
    const inPeriodRows = securityTx.filter((row) => classifyAgainstStatement(row.effectiveDate, latest) === "IN_STATEMENT_PERIOD");
    const afterAnchorRows = securityTx.filter((row) => classifyAgainstStatement(row.effectiveDate, latest) === "AFTER_STATEMENT_PERIOD");
    let anchorWindowLedgerQuantity = anchor ? n(anchor.openingBalance) : null;
    if (anchorWindowLedgerQuantity !== null) {
      for (const row of inPeriodRows) {
        const side = text(row.side || row.type).toUpperCase();
        const qty = n(row.quantity || row.filledQuantity || row.tradedQuantity);
        if (side === "BUY" || side === "B") anchorWindowLedgerQuantity += qty;
        else if (side === "SELL" || side === "SALE" || side === "S") anchorWindowLedgerQuantity -= qty;
      }
    }
    const anchorWindowDifference = anchorWindowLedgerQuantity === null || registeredQuantity === null ? null : anchorWindowLedgerQuantity - registeredQuantity;
    const anchorWindowReconciled = anchorWindowDifference !== null && Math.abs(anchorWindowDifference) <= EPSILON;
    const provisionalDateMatchCount = securityBuckets.filter((b) => b.provisionalDateAlignment).length;

    return {
      symbol,
      statementAsOf: latest?.periodEnd || null,
      statementPeriodStart: latest?.periodStart || null,
      registeredQuantity,
      brokerQuantity,
      positionDifference,
      positionReconciled,
      positionStatus: registeredQuantity === null ? "CDSC_ANCHOR_REQUIRED" : brokerQuantity === null ? "BROKER_VALUATION_REQUIRED" : positionReconciled ? "POSITION_RECONCILED" : "POSITION_MISMATCH",
      transactionHistoryReconciled: historyReconciled,
      transactionHistoryStatus: securityBuckets.length === 0 ? "TRANSACTION_DATE_BUCKETS_UNAVAILABLE" : historyReconciled ? (provisionalDateMatchCount ? "TRANSACTION_HISTORY_RECONCILED_WITH_SETTLEMENT_ALIGNMENT" : "TRANSACTION_HISTORY_RECONCILED") : "TRANSACTION_HISTORY_GAP",
      fifoAvailableFromHistory: positionReconciled && historyReconciled,
      anchorWindowLedgerQuantity,
      anchorWindowDifference,
      anchorWindowReconciled,
      anchorWindowStatus: anchor ? (anchorWindowReconciled ? "ANCHOR_WINDOW_RECONCILED" : "ANCHOR_WINDOW_GAP") : "CDSC_ANCHOR_REQUIRED",
      preAnchorEvidenceCount: preAnchorRows.length,
      inPeriodEvidenceCount: inPeriodRows.length,
      postAnchorEvidenceCount: afterAnchorRows.length,
      provisionalDateMatchCount,
      anchor,
      dateBuckets: securityBuckets
    };
  }).sort((a,b)=>a.symbol.localeCompare(b.symbol));

  return { version:"PC-030M20AL", readOnly:true, mutatesRealPortfolio:false, mutatesPracticePortfolio:false, latestStatement:latest, securities, dateBuckets };
}

function statementEvidenceSignature(statement = {}) {
  const compact = (statement.securities || []).map((s) => ({
    symbol:s.symbol, opening:n(s.openingBalance), purchases:n(s.purchases), sales:n(s.sales), closing:n(s.closingBalance),
    rows:(s.rows || []).map((r)=>[r.date,r.type,n(r.quantity),n(r.balance),text(r.broker)])
  }));
  return JSON.stringify({account:text(statement.accountNumber),start:statement.periodStart,end:statement.periodEnd,securities:compact});
}

export function buildHistoricalOwnershipChain(statements = []) {
  const register = buildMonthlyPositionRegister(statements);
  const bySymbol = new Map();
  for (const statement of register.statements) {
    for (const sec of statement.securities || []) {
      if (!bySymbol.has(sec.symbol)) bySymbol.set(sec.symbol, []);
      bySymbol.get(sec.symbol).push({
        periodStart:statement.periodStart, periodEnd:statement.periodEnd, statementId:statement.statementId,
        openingBalance:n(sec.openingBalance), purchases:n(sec.purchases), sales:n(sec.sales), closingBalance:n(sec.closingBalance),
        intraMonthReconciled:!!sec.intraMonthReconciled, rows:sec.rows || []
      });
    }
  }
  const securities = [...bySymbol.entries()].map(([symbol, months]) => {
    const continuity = [];
    for (let i=1;i<months.length;i+=1) {
      const previous=months[i-1], current=months[i];
      const difference=n(previous.closingBalance)-n(current.openingBalance);
      continuity.push({from:previous.periodEnd,to:current.periodStart,difference,reconciled:Math.abs(difference)<=EPSILON});
    }
    return {symbol,months,latestClosingQuantity:months.at(-1)?.closingBalance ?? null,
      monthCount:months.length,continuous:continuity.every(x=>x.reconciled),continuity,
      status:months.every(x=>x.intraMonthReconciled) && continuity.every(x=>x.reconciled) ? "OWNERSHIP_CHAIN_RECONCILED" : "OWNERSHIP_CHAIN_GAP"};
  }).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  return {version:"PC-030M20AL",readOnly:true,authoritativeForSettledOwnership:true,statementCount:register.statements.length,securities,continuityGapCount:register.continuityGapCount};
}

export async function saveMonthlyPositionStatement(statement) {
  const { userGetItem, userSetItem } = await import("../../auth/userStorage.js");
  const existing = parseArray(await userGetItem("cdscMonthlyPositionStatements"));
  const key = periodKey(statement);
  const samePeriod = existing.find(item => periodKey(item) === key && text(item.accountNumber) === text(statement.accountNumber));
  if (samePeriod) {
    if (statementEvidenceSignature(samePeriod) === statementEvidenceSignature(statement)) {
      return { ...buildMonthlyPositionRegister(existing), saveStatus:"DUPLICATE_IGNORED" };
    }
    const error = new Error(`A different CDSC statement is already stored for ${key}. Existing historical evidence was not overwritten.`);
    error.code = "CDSC_PERIOD_CONFLICT";
    throw error;
  }
  const next = [...existing, statement].sort((a,b)=>String(a.periodEnd||"").localeCompare(String(b.periodEnd||"")));
  await userSetItem("cdscMonthlyPositionStatements", JSON.stringify(next));
  return { ...buildMonthlyPositionRegister(next), saveStatus:"SAVED" };
}

export async function saveMonthlyPositionStatements(statements = []) {
  const results=[];
  for (const statement of statements) {
    try { const saved=await saveMonthlyPositionStatement(statement); results.push({periodEnd:statement.periodEnd,status:saved.saveStatus || "SAVED"}); }
    catch(error) { results.push({periodEnd:statement.periodEnd,status:"CONFLICT",message:error.message}); }
  }
  return {results,register:await loadMonthlyPositionRegister()};
}

export async function loadMonthlyPositionRegister() {
  const { userGetItem } = await import("../../auth/userStorage.js");
  const register=buildMonthlyPositionRegister(await userGetItem("cdscMonthlyPositionStatements"));
  return {...register,ownershipChain:buildHistoricalOwnershipChain(register.statements)};
}

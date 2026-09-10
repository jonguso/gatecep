const n = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};
const key = (value) => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
function value(row, names) {
  for (const [k, v] of Object.entries(row || {})) if (names.includes(key(k)) && v !== "") return v;
  return null;
}
function classify(description = "") {
  const d = String(description).toUpperCase();
  if (/OPENING|BROUGHT FORWARD|B\/F/.test(d)) return "OPENING_CASH";
  if (/\b(BUY|SELL|PURCHASE|SALE|TRADE)\b/.test(d)) return null;
  if (/WITHDRAW/.test(d)) return "WITHDRAWAL";
  if (/DEPOSIT|CREDIT TRANSFER|RECEIPT/.test(d)) return "DEPOSIT";
  if (/DIVIDEND/.test(d)) return "DIVIDEND";
  if (/INTEREST/.test(d)) return "INTEREST";
  if (/TAX|WITHHOLDING/.test(d)) return "TAX";
  if (/BROKER.*FEE|COMMISSION/.test(d)) return "BROKER_FEE";
  if (/REGULATORY|LEVY|CDSC|CMA|NSE/.test(d)) return "REGULATORY_FEE";
  return null;
}

export function normalizeBrokerCashStatementEvents(rows = [], { fileName = null, broker = null } = {}) {
  const result = [];
  let previousBalance = null;
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const date = value(row, ["DATE","TRANSACTIONDATE","POSTINGDATE","VALUEDATE"]);
    const description = value(row, ["DESCRIPTION","DETAILS","NARRATION","PARTICULARS","TRANSACTION","TYPE"]);
    const debit = n(value(row, ["DEBIT","WITHDRAWAL","MONEYOUT"]));
    const credit = n(value(row, ["CREDIT","DEPOSIT","MONEYIN"]));
    const amount = n(value(row, ["AMOUNT","NETAMOUNT","VALUE"]));
    const balance = n(value(row, ["BALANCE","LEDGERBALANCE","AVAILABLEBALANCE","CASHBALANCE","AVAILABLECASH","TRADINGSPACE"]));
    let signed = credit !== null ? Math.abs(credit) : debit !== null ? -Math.abs(debit) : amount;
    let type = classify(description);
    if (signed === null && balance !== null && previousBalance !== null) signed = balance - previousBalance;
    if (!type && signed !== null && !description) type = signed >= 0 ? "DEPOSIT" : "WITHDRAWAL";
    if (index === 0 && balance !== null && signed === null) { type = "OPENING_CASH"; signed = balance; }
    if (signed !== null && type) result.push({
      id: `cash-statement-${index}-${date || "undated"}`,
      date: date || null,
      type,
      amount: signed,
      description: description || null,
      sourceType: "BROKER_CASH_EVIDENCE",
      provenance: fileName || "CASH_STATEMENT",
      broker
    });
    if (balance !== null) previousBalance = balance;
  });
  return result;
}

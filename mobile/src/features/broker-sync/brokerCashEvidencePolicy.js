const clean = (value) => String(value ?? "").trim();

const MONTHS = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

export function normalizeBrokerStatementDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && value >= 20000 && value <= 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const text = clean(value);
  if (!text) return null;

  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dayFirst = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dayFirst) return validDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]));

  // Broker PDFs commonly use 03-Sep-2026. Hermes does not guarantee that
  // Date.parse understands this non-ISO format, so normalize it explicitly.
  const namedMonth = text.match(/\b(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](20\d{2})\b/);
  if (namedMonth) {
    const month = MONTHS[namedMonth[2].slice(0, 3).toUpperCase()];
    if (month) return validDate(Number(namedMonth[3]), month, Number(namedMonth[1]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

export function extractStatementEffectiveDate(rows = []) {
  const acceptedKeys = new Set([
    "STATEMENTDATE", "ASOFDATE", "BALANCEDATE", "VALUATIONDATE", "REPORTDATE", "EFFECTIVEDATE"
  ]);

  for (const row of Array.isArray(rows) ? rows : []) {
    const entries = Object.entries(row || {});
    for (const [key, value] of entries) {
      const normalizedKey = clean(key).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (acceptedKeys.has(normalizedKey)) {
        const date = normalizeBrokerStatementDate(value);
        if (date) return date;
      }

      const valueText = clean(value);
      const labelInValue = valueText.match(/(?:statement|as\s*of|balance|valuation|report|effective)\s*date\s*[:=-]?\s*(.+)$/i);
      if (labelInValue) {
        const date = normalizeBrokerStatementDate(labelInValue[1]);
        if (date) return date;
      }

      if (/(?:statement|asof|balance|valuation|report|effective)date/i.test(valueText.replace(/[^A-Za-z0-9]/g, ""))) {
        for (const [, candidate] of entries) {
          if (candidate === value) continue;
          const date = normalizeBrokerStatementDate(candidate);
          if (date) return date;
        }
      }
    }
  }

  // Transaction-style cash ledgers often omit a separate statement header.
  // In that case, the latest valid entry in an explicitly named Date column
  // is the balance effective date. Never substitute the file upload time.
  const dateColumnKeys = new Set(["DATE", "TRANSACTIONDATE", "POSTINGDATE", "VALUEDATE"]);
  const datedEntries = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    for (const [key, value] of Object.entries(row || {})) {
      const normalizedKey = clean(key).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!dateColumnKeys.has(normalizedKey)) continue;
      const date = normalizeBrokerStatementDate(value);
      if (date) datedEntries.push(date);
    }
  }

  return datedEntries.sort().at(-1) || null;
}

export function hasConnectedRealBrokerAccount(accounts = []) {
  return (Array.isArray(accounts) ? accounts : []).some((account) => {
    const mode = clean(account?.connectionMode).toUpperCase();
    const brokerId = clean(account?.brokerId || account?.id).toUpperCase();
    const status = clean(account?.status || "ACTIVE").toUpperCase();
    const excluded = brokerId === "SIM" || /PRACTICE|DEMO|SIMULATION/.test(mode);
    return !excluded && status !== "INACTIVE" && status !== "DISCONNECTED" && (account?.connected === true || account?.linked === true);
  });
}

export function requireVerifiedBrokerCashEvidence({ cashBalance, statementEffectiveDate, accountIdentity } = {}) {
  const amount = Number(cashBalance);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Verified broker cash evidence requires a valid balance.");
  const effectiveDate = normalizeBrokerStatementDate(statementEffectiveDate);
  if (!effectiveDate) throw new Error("The broker statement effective date is required.");
  if (!accountIdentity || accountIdentity.identityStatus !== "VERIFIED") {
    throw new Error("Verified broker account identity is required.");
  }
  return { cashBalance: amount, statementEffectiveDate: effectiveDate, accountIdentity };
}

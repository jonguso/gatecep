const text = (value) => String(value ?? "").trim();

const MONTHS = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function validYmd(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function ymd(year, month, day) {
  if (!validYmd(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function excelSerialToIsoDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return null;
  const wholeDays = Math.floor(serial);
  const d = new Date(EXCEL_EPOCH_UTC + wholeDays * 86400000);
  return d.toISOString().slice(0, 10);
}

export function normalizeEvidenceDate(value) {
  const rawValue = value ?? null;
  if (value === null || value === undefined || value === "") {
    return { rawValue, normalizedDate: null, method: "MISSING", valid: false };
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { rawValue, normalizedDate: value.toISOString().slice(0, 10), method: "DATE_OBJECT", valid: true };
  }

  const raw = text(value);

  // Spreadsheet serials must be detected before JavaScript Date parsing. Otherwise
  // a value such as "46245" can be misread as year 46245 instead of 2026-08-11.
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial >= 20000 && serial <= 100000) {
      const normalizedDate = excelSerialToIsoDate(serial);
      return { rawValue, normalizedDate, method: "EXCEL_1900_SERIAL", valid: Boolean(normalizedDate), serial };
    }
  }

  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) {
    const normalizedDate = ymd(Number(m[1]), Number(m[2]), Number(m[3]));
    return { rawValue, normalizedDate, method: "ISO_DATE", valid: Boolean(normalizedDate) };
  }

  m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const month = MONTHS[m[2].toUpperCase()];
    const normalizedDate = month === undefined ? null : ymd(year, month + 1, Number(m[1]));
    return { rawValue, normalizedDate, method: "DD_MMM_YYYY", valid: Boolean(normalizedDate) };
  }

  m = raw.match(/^(\d{1,2})[\/]([0-9]{1,2})[\/](\d{4})$/);
  if (m) {
    // Broker imports used by this project are interpreted as day/month/year only when
    // the first field cannot be a month. Otherwise preserve ambiguity instead of guessing.
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = Number(m[3]);
    if (a > 12 && b <= 12) {
      const normalizedDate = ymd(year, b, a);
      return { rawValue, normalizedDate, method: "DD_MM_YYYY", valid: Boolean(normalizedDate) };
    }
    if (b > 12 && a <= 12) {
      const normalizedDate = ymd(year, a, b);
      return { rawValue, normalizedDate, method: "MM_DD_YYYY", valid: Boolean(normalizedDate) };
    }
    return { rawValue, normalizedDate: null, method: "AMBIGUOUS_SLASH_DATE", valid: false };
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && parsed.getUTCFullYear() >= 1900 && parsed.getUTCFullYear() <= 2200) {
    return { rawValue, normalizedDate: parsed.toISOString().slice(0, 10), method: "SAFE_JS_DATE", valid: true };
  }

  return { rawValue, normalizedDate: null, method: "UNRECOGNIZED", valid: false };
}

export function normalizeTransactionDateEvidence(row = {}) {
  const rawExecutionDate = row.executionDate ?? row.tradeDate ?? row.date ?? row.createdAt ?? null;
  const rawSettlementDate = row.settlementDate ?? null;
  const execution = normalizeEvidenceDate(rawExecutionDate);
  const settlement = normalizeEvidenceDate(rawSettlementDate);
  return {
    rawExecutionDate,
    rawSettlementDate,
    executionDate: execution.normalizedDate,
    settlementDate: settlement.normalizedDate,
    executionDateMethod: execution.method,
    settlementDateMethod: settlement.method,
    effectiveDate: settlement.normalizedDate || execution.normalizedDate,
    effectiveDateRole: settlement.normalizedDate ? "SETTLEMENT_DATE" : execution.normalizedDate ? "TRADE_OR_EXECUTION_DATE" : "DATE_UNAVAILABLE",
    dateValid: Boolean(settlement.normalizedDate || execution.normalizedDate)
  };
}

export function classifyAgainstStatement(date, statement = {}) {
  if (!date) return "DATE_UNAVAILABLE";
  if (!statement || typeof statement !== "object") return "STATEMENT_PERIOD_UNAVAILABLE";
  const start = normalizeEvidenceDate(statement.periodStart).normalizedDate;
  const end = normalizeEvidenceDate(statement.periodEnd).normalizedDate;
  if (start && date < start) return "BEFORE_STATEMENT_PERIOD";
  if (end && date > end) return "AFTER_STATEMENT_PERIOD";
  if (start && end) return "IN_STATEMENT_PERIOD";
  return "STATEMENT_PERIOD_UNAVAILABLE";
}

export function calendarDayDifference(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86400000);
}

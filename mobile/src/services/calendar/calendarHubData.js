export const CALENDAR_TABS = ["This Month", "Next 6 Months", "Last 12 Months"];
const VERIFIED = new Set(["ISSUER", "EXCHANGE", "REGULATOR", "BROKER", "CUSTODIAN", "MANUAL_VERIFIED", "PROVIDER"]);

function isoLocal(date) {
  const year = date.getFullYear();
  return `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calendarRangeForTab(tab = "This Month", now = new Date()) {
  return { from: isoLocal(rangeStart(tab, now)), to: isoLocal(rangeEnd(tab, now)) };
}

export function buildVerifiedCalendarEvents(actions = [], tab = "This Month", now = new Date(), externalEvents = []) {
  const { from, to } = calendarRangeForTab(tab, now);
  const start = Date.parse(`${from}T00:00:00`);
  const end = Date.parse(`${to}T23:59:59`);
  const localEvents = actions.flatMap(toEvents);
  const importedEvents = (Array.isArray(externalEvents) ? externalEvents : []).map((event) => ({
    id: event.id,
    type: event.type,
    symbol: Array.isArray(event.symbols) && event.symbols.length ? event.symbols.join(", ") : "NSE",
    company: Array.isArray(event.symbols) && event.symbols.length ? event.symbols.join(", ") : "Nairobi Securities Exchange",
    date: String(event.date || "").slice(0, 10),
    title: event.title,
    detail: event.detail,
    verified: true,
    source: event.source,
    url: event.url,
    trustLevel: event.trustLevel || "REPORTED"
  }));
  const deduped = new Map();
  [...importedEvents, ...localEvents].forEach((event) => {
    const key = `${event.symbol}|${event.type}|${event.date}`;
    const existing = deduped.get(key);
    if (!existing || (event.trustLevel === "OFFICIAL" && existing.trustLevel !== "OFFICIAL")) deduped.set(key, event);
  });
  return [...deduped.values()].filter((event) => {
    const timestamp = Date.parse(`${event.date}T12:00:00`);
    return event.verified && Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function toEvents(action = {}) {
  const sourceType = String(action?.source?.type || action?.source || "").toUpperCase();
  const sourceReference = action?.source?.reference || action?.sourceReference;
  const verified = VERIFIED.has(sourceType) && Boolean(sourceReference);
  const source = action?.source?.provider || action?.source?.type || action?.source || "Verified corporate-action evidence";
  return [["EX_DATE", action.exDate], ["RECORD_DATE", action.recordDate], ["BOOK_CLOSURE", action.bookClosureDate], ["PAYMENT_DATE", action.paymentDate], ["EFFECTIVE_DATE", action.effectiveDate], ["ELECTION_DEADLINE", action.electionDeadline]].filter(([, date]) => date).map(([type, date]) => ({
    id: `${action.id || action.symbol}-${type}-${String(date).slice(0, 10)}`,
    type,
    symbol: action.symbol || "NSE",
    company: action.companyName || action.symbol || "NSE security",
    date: String(date).slice(0, 10),
    title: action.title || `${String(action.actionType || action.type || "Corporate action").replaceAll("_", " ")} · ${type.replaceAll("_", " ")}`,
    detail: action.description || "Verified corporate-action evidence.",
    verified,
    source,
    url: sourceReference,
    trustLevel: sourceType === "EXCHANGE" || sourceType === "ISSUER" || sourceType === "REGULATOR" ? "OFFICIAL" : "VERIFIED"
  }));
}

function rangeStart(tab, dateValue) {
  const date = new Date(dateValue);
  if (tab === "This Month") return new Date(date.getFullYear(), date.getMonth(), 1);
  if (tab === "Next 6 Months") return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
}

function rangeEnd(tab, dateValue) {
  const date = new Date(dateValue);
  if (tab === "This Month") return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  if (tab === "Next 6 Months") return new Date(date.getFullYear(), date.getMonth() + 6, date.getDate());
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getCalendarSummary(events = []) {
  return {
    total: events.length,
    dividends: events.filter((event) => ["EX_DATE", "RECORD_DATE", "BOOK_CLOSURE", "PAYMENT_DATE"].includes(event.type)).length,
    deadlines: events.filter((event) => event.type.includes("DEADLINE") || event.type === "BOOK_CLOSURE" || event.type === "RECORD_DATE").length,
    actions: new Set(events.flatMap((event) => String(event.symbol || "").split(",").map((symbol) => symbol.trim()).filter((symbol) => symbol && symbol !== "NSE"))).size
  };
}

export function buildCalendarMonthDays(events = [], visibleMonth = new Date()) {
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const byDate = events.reduce((index, event) => {
    const date = String(event?.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return index;
    if (!index[date]) index[date] = [];
    index[date].push(event);
    return index;
  }, {});

  return Array.from({ length: 42 }, (_, offset) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + offset);
    const dateKey = isoLocal(date);
    return {
      date: dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      events: byDate[dateKey] || []
    };
  });
}

export function monthLabel(visibleMonth = new Date()) {
  return new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(visibleMonth);
}

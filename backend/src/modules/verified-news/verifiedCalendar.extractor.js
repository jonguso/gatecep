import crypto from "crypto";
import { NSE_SECURITIES } from "../../data/nseSecurityMaster.js";
import { cleanText, matchSymbols } from "./verifiedNews.normalizer.js";

const MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
const DATE_TEXT = "(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s*[- ]\\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s*[- ]\\s*\\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2},?\\s+\\d{4})";
const LABELS = [
  { type: "EX_DATE", label: "ex(?:-dividend)? date" },
  { type: "RECORD_DATE", label: "record date" },
  { type: "BOOK_CLOSURE", label: "books? closure(?: date)?" },
  { type: "PAYMENT_DATE", label: "payment(?: date)?" },
  { type: "AGM_DATE", label: "(?:AGM|annual general meeting)(?: date)?" },
  { type: "RESULTS_DATE", label: "results? (?:release|announcement) date" },
  { type: "EFFECTIVE_DATE", label: "effective date" },
  { type: "ELECTION_DEADLINE", label: "election deadline" }
];

function isoDate(value) {
  const text = String(value || "").trim().replace(/,/g, "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : null;
  }
  let match = text.match(/^(\d{1,2})\s*[- ]\s*([A-Za-z]+)\s*[- ]\s*(\d{4})$/);
  if (!match) {
    const reversed = text.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(\d{4})$/);
    if (reversed) match = [reversed[0], reversed[2], reversed[1], reversed[3]];
  }
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  const day = Number(match[1]);
  const year = Number(match[3]);
  if (!month || day < 1 || day > 31 || year < 2000 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function titleFor(type, symbols, issuerName = "") {
  const labels = { EX_DATE: "Ex-dividend date", RECORD_DATE: "Dividend record date", BOOK_CLOSURE: "Book closure", PAYMENT_DATE: "Dividend payment date", AGM_DATE: "Annual General Meeting", RESULTS_DATE: "Financial results date", EFFECTIVE_DATE: "Corporate-action effective date", ELECTION_DEADLINE: "Election deadline" };
  return `${symbols.length ? symbols.join(", ") : issuerName || "NSE"} · ${labels[type] || type.replaceAll("_", " ")}`;
}

function hasNseIssuerEvidence(text) {
  const value = String(text || "").replace(/[^A-Za-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return /\bNairobi Securities Exchange (?:Plc|PLC)\b/.test(value) || /\bNSE (?:Plc|PLC)\b/.test(value);
}

function issuerIdentity(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\b(PLC|LTD|LIMITED|HOLDINGS|GROUP|KENYA)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchIssuerSymbol(issuerName) {
  const matches = new Set(matchSymbols(issuerName));
  const identity = issuerIdentity(issuerName);
  const ranked = NSE_SECURITIES.filter((security) => matches.has(security.symbol)).map((security) => {
    const company = issuerIdentity(security.name);
    const exact = Boolean(company) && company === identity;
    return { symbol: security.symbol, score: (exact ? 10000 : 0) + company.length };
  }).sort((left, right) => right.score - left.score || left.symbol.localeCompare(right.symbol));
  const symbol = ranked[0]?.symbol;
  if (!symbol || (symbol === "NSE" && !hasNseIssuerEvidence(issuerName))) return [];
  return [symbol];
}

function issuerSections(markdown) {
  const value = String(markdown || "");
  const headings = [...value.matchAll(/^###\s+(.+?)\s*$/gm)];
  return headings.map((heading, index) => {
    const start = Number(heading.index || 0);
    const end = index + 1 < headings.length ? Number(headings[index + 1].index || value.length) : value.length;
    const issuerName = cleanText(heading[1], 180);
    const text = value.slice(start, end);
    return {
      text,
      detail: cleanText(value.slice(start + heading[0].length, end), 420),
      issuerName,
      issuerScoped: true,
      symbols: matchIssuerSymbol(issuerName)
    };
  });
}

export function extractVerifiedCalendarEvents(items = []) {
  const events = [];
  const seen = new Set();
  for (const item of items) {
    const sections = issuerSections(item.calendarEvidence);
    const evidenceSegments = sections.length ? sections : [{
      text: `${item.title || ""} ${item.summary || ""} ${item.calendarEvidence || ""}`.slice(0, 22000),
      detail: item.summary,
      issuerName: "",
      issuerScoped: false,
      symbols: []
    }];
    for (const segment of evidenceSegments) {
      for (const definition of LABELS) {
        const expression = new RegExp(`\\b${definition.label}\\b\\s*(?:(?:is|on)\\s*)?[;:,.-]?\\s*(${DATE_TEXT})`, "ig");
        for (const match of segment.text.matchAll(expression)) {
        const eventDate = isoDate(match[1]);
        if (!eventDate) continue;
        const contextStart = Math.max(0, Number(match.index || 0) - 280);
        const contextEnd = Math.min(segment.text.length, Number(match.index || 0) + match[0].length + 160);
        const eventContext = segment.text.slice(contextStart, contextEnd);
        const nearbySymbols = matchSymbols(eventContext).filter((symbol) => symbol !== "NSE" || hasNseIssuerEvidence(eventContext));
        const symbols = segment.issuerScoped
          ? segment.symbols
          : (nearbySymbols.length ? nearbySymbols : (Array.isArray(item.matchedSymbols) ? item.matchedSymbols : []));
        const eventKey = crypto.createHash("sha256").update(`${item.canonicalUrl}|${definition.type}|${eventDate}|${symbols.join(",")}`).digest("hex");
        if (seen.has(eventKey)) continue;
        seen.add(eventKey);
        events.push({
          eventKey,
          eventType: definition.type,
          eventDate,
          title: titleFor(definition.type, symbols, segment.issuerName),
          detail: cleanText(segment.detail || item.summary || "Review the dated evidence at the original source.", 420),
          sourceUrl: item.canonicalUrl,
          sourceName: item.sourceName,
          trustLevel: item.trustLevel,
          matchedSymbols: symbols
        });
        }
      }
    }
  }
  return events;
}

export { isoDate, issuerSections, matchIssuerSymbol };

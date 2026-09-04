import assert from "node:assert/strict";
import fs from "node:fs";
import { extractVerifiedCalendarEvents, isoDate } from "../src/modules/verified-news/verifiedCalendar.extractor.js";
import { cleanCalendarEvidence, cleanText, normalizeApifyNewsItems } from "../src/modules/verified-news/verifiedNews.normalizer.js";

const events = extractVerifiedCalendarEvents([{
  canonicalUrl: "https://www.nse.co.ke/official-dividend",
  sourceName: "Nairobi Securities Exchange",
  trustLevel: "OFFICIAL",
  title: "ABSA dividend announcement",
  summary: "Book closure: 07-Sep- 2026 and payment date 24 September 2026.",
  calendarEvidence: "The publication was issued on 2 September 2026. Record date: 31-Feb-2026.",
  matchedSymbols: ["ABSA"]
}]);
assert.equal(events.length, 2);
assert.deepEqual(events.map((event) => event.eventType), ["BOOK_CLOSURE", "PAYMENT_DATE"]);
assert.deepEqual(events.map((event) => event.eventDate), ["2026-09-07", "2026-09-24"]);
assert.ok(events.every((event) => event.trustLevel === "OFFICIAL"));
assert.equal(isoDate("31-Feb-2026"), null);
assert.equal(isoDate("2026-09-03"), "2026-09-03");

const publicationOnly = extractVerifiedCalendarEvents([{
  canonicalUrl: "https://www.businessdailyafrica.com/article",
  sourceName: "Business Daily Africa",
  trustLevel: "REPORTED",
  title: "Market article",
  summary: "Published on September 2, 2026.",
  matchedSymbols: []
}]);
assert.equal(publicationOnly.length, 0);

const nseCorporatePage = extractVerifiedCalendarEvents([{
  canonicalUrl: "https://www.nse.co.ke/corporate-actions",
  sourceName: "Nairobi Securities Exchange",
  trustLevel: "OFFICIAL",
  title: "NSE Corporate Actions",
  summary: "2 hours ago — BOC Kenya Plc announced an interim dividend; Books Closure 07-Sep-2026; Payment 08-Oct-2026. Read more",
  calendarEvidence: "Nairobi Securities Exchange corporate actions. BOC Kenya Plc announced an interim dividend; Books Closure 07-Sep-2026; Payment 08-Oct-2026.",
  matchedSymbols: ["NSE", "BOC"]
}]);
assert.equal(nseCorporatePage.length, 2);
assert.deepEqual(nseCorporatePage.map((event) => event.eventType), ["BOOK_CLOSURE", "PAYMENT_DATE"]);
assert.deepEqual(nseCorporatePage.map((event) => event.eventDate), ["2026-09-07", "2026-10-08"]);
assert.ok(nseCorporatePage.every((event) => event.matchedSymbols.includes("BOC")));
assert.ok(nseCorporatePage.every((event) => !event.matchedSymbols.includes("NSE")));

const liveNseMarkdown = `### Jubilee Holdings Limited

Announced an Interim Dividend of Kes.2.00 on 28-Aug-2026; Books Closure 07-Sep-2026; Payment 08-Oct-2026.

### BOC Kenya Plc

Announced an Interim Dividend of Kes.4.00 on 21-Aug-2026; Books Closure 21-Sep-2026; Payment 19-Oct-2026.

### NCBA Group Plc

Announced an Interim Dividend of Kes.3.75 on 06-Aug-2026; Books Closure 28-Aug-2026; Payment Date; 8-Sep-2026

### Standard Chartered Bank Kenya Ltd

Announced an Interim Dividend of Kes.8.50 on 19-Aug-2026; Books Closure 10-Sep-2026; Payment Date; 24-Sep-2026

### Stanbic Holdings Plc

Announced an Interim Dividend of Kes.1.64 on 06-Aug-2026; Books Closure 01-Sep-2026; Payment Date; 05-Oct-2026

### Absa Bank Kenya Plc

Announced an Interim Dividend of Kes. 0.5 on 18-Aug-2026; Books Closure; 18-Sep-2026; Payment date; 15-Oct-2026

### Car & General (K) Ltd

Announced an Interim Dividend of Kes.1.00; On 13-Aug-2026; Books Closure 03-Sep-2026; Payment on 10-Sep-2026.

### KCB Group Plc

Announced an Interim Dividend of Kes.3.00; On 13-Aug-2026; Books Closure 02-Sep-2026; Payment on 10-Nov-2026.`;
assert.match(cleanCalendarEvidence(liveNseMarkdown), /^### Jubilee Holdings Limited/m);
assert.match(cleanCalendarEvidence(liveNseMarkdown), /^### KCB Group Plc/m);
const normalizedLiveNse = normalizeApifyNewsItems([{
  crawl: { httpStatusCode: 200, requestStatus: "handled" },
  metadata: { url: "https://www.nse.co.ke/corporate-actions/", title: "Corporate Actions" },
  markdown: liveNseMarkdown
}]);
assert.equal(normalizedLiveNse.accepted.length, 1);
const liveNseSections = extractVerifiedCalendarEvents(normalizedLiveNse.accepted);
assert.equal(liveNseSections.length, 16);
assert.ok(liveNseSections.every((event) => event.matchedSymbols.length === 1));
assert.deepEqual(new Set(liveNseSections.map((event) => event.matchedSymbols[0])), new Set(["JUB", "BOC", "NCBA", "SCBK", "SBIC", "ABSA", "CGEN", "KCB"]));
assert.equal(liveNseSections.find((event) => event.eventType === "PAYMENT_DATE" && event.matchedSymbols[0] === "NCBA")?.eventDate, "2026-09-08");
assert.equal(liveNseSections.find((event) => event.eventType === "BOOK_CLOSURE" && event.matchedSymbols[0] === "ABSA")?.eventDate, "2026-09-18");
assert.equal(liveNseSections.find((event) => event.eventType === "PAYMENT_DATE" && event.matchedSymbols[0] === "CGEN")?.eventDate, "2026-09-10");

const nseIssuer = extractVerifiedCalendarEvents([{
  canonicalUrl: "https://www.nse.co.ke/nse-plc-agm",
  sourceName: "Nairobi Securities Exchange",
  trustLevel: "OFFICIAL",
  title: "Nairobi Securities Exchange Plc",
  summary: "Nairobi Securities Exchange Plc AGM date 10-Oct-2026.",
  matchedSymbols: ["NSE"]
}]);
assert.equal(nseIssuer.length, 1);
assert.deepEqual(nseIssuer[0].matchedSymbols, ["NSE"]);
assert.equal(cleanText("2 hours ago — BOC dividend announcement. Read more"), "BOC dividend announcement.");

const titlelessCorporatePage = normalizeApifyNewsItems([{
  metadata: { url: "https://www.nse.co.ke/corporate-actions/" },
  markdown: "BOC Kenya Plc announced an interim dividend; Books Closure 07-Sep-2026; Payment 08-Oct-2026."
}]);
assert.equal(titlelessCorporatePage.rejected.length, 0);
assert.equal(titlelessCorporatePage.accepted.length, 1);
assert.equal(titlelessCorporatePage.accepted[0].title, "NSE Corporate Actions");
assert.equal(extractVerifiedCalendarEvents(titlelessCorporatePage.accepted).length, 2);

const titlelessUntrustedPage = normalizeApifyNewsItems([{
  metadata: { url: "https://example.com/corporate-actions/" },
  markdown: "Books Closure 07-Sep-2026."
}]);
assert.equal(titlelessUntrustedPage.accepted.length, 0);
assert.equal(titlelessUntrustedPage.rejected[0].reason, "SOURCE_NOT_ALLOWED");

const repository = fs.readFileSync("src/modules/verified-news/verifiedNews.repository.js", "utf8");
const collector = fs.readFileSync("src/modules/verified-news/verifiedNews.collector.js", "utf8");
const routes = fs.readFileSync("src/modules/verified-news/verifiedNews.routes.js", "utf8");
const migration = fs.readFileSync("src/database/migrations/011_verified_calendar_events.sql", "utf8");
assert.match(repository, /upsertVerifiedCalendarEvents/);
assert.match(repository, /ON CONFLICT \(event_key\) DO UPDATE/);
assert.match(repository, /'NSE'=ANY\(matched_symbols\)/);
assert.match(repository, /matched_symbols @> \$5::text\[\]/);
assert.match(repository, /cardinality\(matched_symbols\) > cardinality/);
assert.match(collector, /extractVerifiedCalendarEvents/);
assert.match(routes, /router\.get\("\/calendar", authRequired/);
assert.match(migration, /event_date DATE NOT NULL/);
assert.doesNotMatch(repository + collector + routes, /user_cash|user_portfolio|portfolioSnapshot|market_eod/i);

console.log("PASS — only explicitly labelled, valid event dates enter the verified calendar.");
console.log("PASS — article publication dates do not become deadlines or corporate-action dates.");
console.log("PASS — calendar events retain source, authority label, canonical link and matched NSE symbols.");
console.log("PASS — calendar persistence is isolated from prices, holdings, broker cash and performance history.");

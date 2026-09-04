import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeApifyNewsItems } from "../src/modules/verified-news/verifiedNews.normalizer.js";
import { buildNewsQueries } from "../src/modules/verified-news/newsQueryPolicy.js";

const sample = [
  { metadata: { canonicalUrl: "https://www.nse.co.ke/example?utm_source=test", title: "Absa Bank Kenya announces interim dividend", description: "Book closure details for shareholders.", datePublished: "2026-09-02T08:00:00Z" } },
  { searchResult: { url: "https://www.businessdailyafrica.com/bd/markets/equity-group-results", title: "Equity Group reports results", description: "The NSE-listed lender released its results." } },
  { metadata: { url: "https://example.com/copied", title: "Unapproved source" } }
];
const normalized = normalizeApifyNewsItems(sample);
assert.equal(normalized.accepted.length, 2);
assert.equal(normalized.rejected.length, 1);
assert.equal(normalized.accepted[0].trustLevel, "OFFICIAL");
assert.equal(normalized.accepted[0].category, "Dividends");
assert.ok(normalized.accepted[0].matchedSymbols.includes("ABSA"));
assert.equal(normalized.accepted[0].canonicalUrl, "https://www.nse.co.ke/example");
assert.equal(normalized.accepted[1].trustLevel, "REPORTED");
assert.equal(normalized.accepted[1].publishedAt, null);
assert.ok(normalized.accepted[1].matchedSymbols.includes("EQT"));

const failedCrawl = normalizeApifyNewsItems([{
  crawl: { httpStatusCode: 500, requestStatus: "failed" },
  metadata: { url: "https://www.nse.co.ke/corporate-actions/", title: "" },
  text: ""
}]);
assert.equal(failedCrawl.accepted.length, 0);
assert.equal(failedCrawl.rejected[0].reason, "CRAWL_FAILED");

const urlFallback = normalizeApifyNewsItems([{ metadata: { canonicalUrl: "https://google.com/cache", title: "NSE result" }, searchResult: { url: "https://www.nse.co.ke/corporate-actions/", title: "Corporate Actions" } }]);
assert.equal(urlFallback.accepted.length, 1);
assert.equal(urlFallback.accepted[0].canonicalUrl, "https://www.nse.co.ke/corporate-actions");
assert.equal(urlFallback.accepted[0].trustLevel, "OFFICIAL");

const queries = buildNewsQueries(new Date("2026-09-03T12:00:00Z"));
assert.equal(queries.length, 4);
assert.deepEqual(queries.map((item) => item.key), ["NSE", "NSE_CORPORATE_ACTIONS", "BUSINESS_DAILY", "STANDARD_BUSINESS"]);
assert.ok(queries.filter((item) => item.key !== "NSE_CORPORATE_ACTIONS").every((item) => item.query.includes("after:2026-08-27")));
assert.equal(queries.find((item) => item.key === "NSE_CORPORATE_ACTIONS").query, "https://www.nse.co.ke/corporate-actions/");
assert.equal(queries.find((item) => item.key === "NSE_CORPORATE_ACTIONS").scrapingTool, "browser-playwright");
assert.ok(queries.filter((item) => item.key !== "NSE_CORPORATE_ACTIONS").every((item) => !item.scrapingTool));

const adapter = fs.readFileSync("src/modules/verified-news/apifyNews.adapter.js", "utf8");
assert.match(adapter, /sourceQuery\.scrapingTool \|\| "raw-http"/);
assert.match(adapter, /dynamicContentWaitSecs/);

const repository = fs.readFileSync("src/modules/verified-news/verifiedNews.repository.js", "utf8");
const route = fs.readFileSync("src/modules/verified-news/verifiedNews.routes.js", "utf8");
const scheduler = fs.readFileSync("src/modules/verified-news/verifiedNews.scheduler.js", "utf8");
const server = fs.readFileSync("src/server.js", "utf8");
const migration = fs.readFileSync("src/database/migrations/010_verified_news.sql", "utf8");
assert.match(repository, /ON CONFLICT \(canonical_url\) DO UPDATE/);
assert.doesNotMatch(repository, /markdown|article_body|full_text/i);
assert.match(route, /router\.get\("\/", authRequired/);
assert.match(route, /router\.post\("\/collect", authRequired, requireImportKey/);
assert.match(scheduler, /NEWS_COLLECTION_ENABLED/);
assert.match(server, /app\.use\("\/verified-news", verifiedNewsRoutes\)/);
assert.match(migration, /trust_level IN \('OFFICIAL', 'REPORTED'\)/);
assert.doesNotMatch(repository + route + scheduler, /market_eod|user_cash|user_portfolio|portfolioSnapshot/i);

console.log("PASS — NSE, Business Daily and Standard use allowlisted, separately classified evidence.");
console.log("PASS — official/reporting labels, optional dates, canonical URLs and NSE symbol matching are enforced.");
console.log("PASS — storage contains summaries and source links, not full scraped article bodies.");
console.log("PASS — news collection cannot mutate prices, holdings, broker cash or portfolio history.");

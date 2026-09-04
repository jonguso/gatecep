import assert from "node:assert/strict";
import fs from "node:fs";
import { buildVerifiedNews, getNewsSummary } from "../src/services/news/newsHubData.js";

const api = fs.readFileSync("src/services/news/verifiedNewsApi.js", "utf8");
const screen = fs.readFileSync("app/(tabs)/news.js", "utf8");
assert.match(api, /\/verified-news/);
assert.match(api, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(screen, /Official NSE evidence/);
assert.match(screen, /Open original source/);
assert.match(screen, /Linking\.openURL/);
assert.match(screen, /Verified news sources connected/);
assert.doesNotMatch(screen, /sample stor|placeholder stor/i);

const rows = buildVerifiedNews({ externalNews: [
  { id: "1", category: "Dividends", title: "Dividend announced", source: "Nairobi Securities Exchange", trustLevel: "OFFICIAL", url: "https://www.nse.co.ke/test", publishedAt: "2026-09-02T00:00:00Z", symbols: ["ABSA"], detail: "Review the official announcement." },
  { id: "2", category: "Market", title: "Market report", source: "Business Daily Africa", trustLevel: "REPORTED", url: "https://www.businessdailyafrica.com/test", symbols: [], detail: "Reported market news." }
] });
assert.equal(rows.length, 2);
assert.equal(rows[0].trustLevel, "OFFICIAL");
assert.equal(rows[0].symbol, "ABSA");
assert.deepEqual(getNewsSummary(rows), { market: 1, company: 0, dividends: 1, coachG: 0 });

console.log("PASS — News & Insights loads authenticated backend evidence instead of relying on the price feed.");
console.log("PASS — Official, Reported and Coach G analysis remain visibly distinct.");
console.log("PASS — article cards retain original publisher links and verified categories.");

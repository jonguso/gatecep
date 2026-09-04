import assert from "node:assert/strict";
import fs from "node:fs";
import { buildSecurityEducationModel } from "../src/services/markets/securityEducationService.js";

const securityPage = fs.readFileSync("app/security/[symbol].js", "utf8");
const markets = fs.readFileSync("app/(tabs)/markets.js", "utf8");
const depth = fs.readFileSync("src/components/markets/MarketDepthModal.js", "utf8");
const logo = fs.readFileSync("src/components/markets/CompanyLogo.js", "utf8");

assert.match(markets, /<CompanyLogo security=\{row\}/);
assert.match(markets, /Tap a company to explore its price, market depth and verified fundamentals/);
assert.match(depth, /Explore company & learn/);
assert.match(depth, /router\.push\(`\/security\/\$\{security\.symbol\}`\)/);
assert.match(securityPage, /loadFundamentalRecord/);
assert.match(securityPage, /Fundamentals not yet available/);
assert.match(securityPage, /Investor learning checklist/);
assert.doesNotMatch(securityPage, /const DIVIDEND_YIELDS/);
assert.match(logo, /security\?\.logoUrl/);
assert.match(logo, /onError/);

const empty = buildSecurityEducationModel({ symbol: "ABSA" }, null);
assert.equal(empty.evidence.available, false);
assert.equal(empty.fields.pe, null);
assert.equal(empty.fields.dividendYield, null);

const verified = buildSecurityEducationModel(
  { symbol: "ABSA", sector: "Banking", logoUrl: "https://example.test/absa.png" },
  { provider: "VERIFIED_FILING", peRatio: 5.7, dividendYieldPercentage: 6.1, latestPeriod: { fiscalYear: 2025, earningsPerShare: 4.2, totalAssets: 1000 } }
);
assert.equal(verified.evidence.available, true);
assert.equal(verified.fields.pe, 5.7);
assert.equal(verified.fields.eps, 4.2);
assert.equal(verified.profile.logoUrl, "https://example.test/absa.png");

console.log("PASS — company logos render from explicit issuer evidence with a safe symbol fallback.");
console.log("PASS — market depth links to the full security learning journey.");
console.log("PASS — verified fundamentals populate analysis and missing metrics remain unavailable.");
console.log("PASS — hard-coded dividend estimates were removed from Security Details.");

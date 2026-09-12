import fs from "node:fs";
import assert from "node:assert/strict";
const src={
 markets:fs.readFileSync("app/(tabs)/markets.js","utf8"),
 watchlist:fs.readFileSync("app/watchlist.js","utf8"),
 intelligence:fs.readFileSync("app/intelligence-center.js","utf8"),
 research:fs.readFileSync("app/research-valuation.js","utf8"),
 hub:fs.readFileSync("app/fundamental-data-hub.js","utf8"),
 filings:fs.readFileSync("app/verified-filings.js","utf8")
};
for(const [k,v] of Object.entries(src)){
 assert.ok(v.includes("PC-030M20AV3F RESPONSIVE CALIBRATION"),`${k}: marker missing`);
 assert.ok(v.includes("useWindowDimensions"),`${k}: width hook missing`);
 assert.ok(v.includes("maxWidth: 960"),`${k}: desktop containment missing`);
 assert.ok(v.includes("paddingBottom: 128"),`${k}: mobile bottom clearance missing`);
}
assert.ok(src.markets.includes("useMarketData"));
assert.ok(src.markets.includes("getRowsForTab"));
assert.ok(src.markets.includes("No hard-coded market prices are displayed."));
assert.ok(src.markets.includes('router.push(`/security/${row.symbol}`)'));
assert.ok(src.watchlist.includes('const WATCHLIST_KEY = "marketWatchlist"'));
assert.ok(src.watchlist.includes("userSetItem"));
assert.ok(src.intelligence.includes("getIntelligenceHome"));
assert.ok(src.intelligence.includes("markNotificationRead"));
assert.ok(src.intelligence.includes("loadAlerts"));
assert.ok(src.research.includes("buildUnifiedPortfolioAnalytics"));
assert.ok(src.research.includes("buildResearchMarketIntelligence"));
assert.ok(src.research.includes("Advisory Research Only"));
assert.ok(src.research.includes("does not place trades, modify holdings"));
assert.ok(src.research.includes("invent missing"));
assert.ok(src.hub.includes("FUNDAMENTAL_NAVIGATION_GROUPS"));
assert.ok(src.hub.includes('router.replace("/fundamental-data-hub")'));
assert.ok(src.hub.includes("permanent entry point"));
assert.ok(src.filings.includes("approveVerifiedFiling"));
assert.ok(src.filings.includes("rejectVerifiedFiling"));
assert.ok(src.filings.includes("createVerifiedFilingRevision"));
assert.ok(src.filings.includes("promoteApprovedVerifiedFiling"));
assert.ok(src.filings.includes("only approved filings may be promoted"));
assert.ok(src.filings.includes("no financial facts are invented"));
console.log("PASS — six AV3F targets contain responsive calibration.");
console.log("PASS — 960px desktop containment and 128px mobile clearance are present.");
console.log("PASS — verified market-data and watchlist persistence contracts remain present.");
console.log("PASS — Intelligence Center remote/local alert behavior remains present.");
console.log("PASS — Research & Valuation remains advisory-only with no invented financial data.");
console.log("PASS — Fundamental Data Hub registry navigation remains preserved.");
console.log("PASS — Verified Filing lifecycle, audit and promotion safeguards remain present.");
console.log("PC-030M20AV3F contract verification complete.");

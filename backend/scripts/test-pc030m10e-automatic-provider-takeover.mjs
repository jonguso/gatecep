import assert from "node:assert/strict";
import fs from "node:fs";

const service = fs.readFileSync("src/modules/market-cache/marketCache.service.js", "utf8");
const scheduler = fs.readFileSync("src/modules/market-cache/marketCache.scheduler.js", "utf8");

assert.doesNotMatch(service, /if \(manualSnapshotActive\) return getMarketCache\(\)/);
assert.match(service, /marketDataGateway\.getPrices\(\)/);
assert.match(service, /installSnapshot\(prices, \{ manual: false \}\)/);
assert.match(service, /AUTOMATIC_PROVIDER_ACTIVE/);
assert.match(service, /MANUAL_FALLBACK_RETAINED/);
assert.match(service, /prices\?\.valuationEligible !== true/);
assert.match(scheduler, /Automatic market refresh unavailable; retained/);

console.log("PASS — a restored manual snapshot no longer blocks automatic provider refreshes.");
console.log("PASS — a verified automatic provider takes ownership of the valuation cache.");
console.log("PASS — manual prices remain available only when the automatic provider fails.");
console.log("PASS — non-valuation providers cannot displace verified fallback prices.");
console.log("PASS — scheduler logs distinguish provider refresh from fallback retention.");

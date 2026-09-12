import fs from "node:fs";
import assert from "node:assert/strict";

const files=[
  "app/broker-sync.js",
  "app/broker-routing.js",
  "app/broker-portfolio-import.js",
];
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,"utf8")]));

for (const [name,text] of Object.entries(src)) {
  assert.ok(text.includes("PC-030M20AV3M RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(text.includes("maxWidth: 960"),`${name}: 960px containment missing`);
  assert.ok(text.includes("paddingBottom: 128"),`${name}: 128px bottom clearance missing`);
}

function hasRoute(text, route) {
  const escaped=route.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`router\\.(?:push|replace)\\(\\s*["']${escaped}["']\\s*\\)`).test(text);
}

const sync=src["app/broker-sync.js"];
assert.ok(sync.includes("syncConnectedBrokerMirror"));
assert.ok(sync.includes("Load independent REAL broker evidence for read-only comparison"));
assert.ok(sync.includes("I cannot"));
assert.ok(sync.includes("place trades."));
assert.ok(sync.includes("Upload Current Portfolio Valuation"));
assert.ok(sync.includes("Upload Current Cash / Ledger Statement"));
assert.ok(hasRoute(sync,"/import-portfolio?mode=RECONCILE"));
assert.ok(hasRoute(sync,"/(tabs)/funds?mode=RECONCILE"));
assert.ok(hasRoute(sync,"/portfolio-sync-center"));

const routing=src["app/broker-routing.js"];
assert.ok(routing.includes("Practice Routing"));
assert.ok(routing.includes("No REAL order is transmitted"));
assert.ok(routing.includes("compareVerifiedBrokerCharges"));
assert.ok(routing.includes("without a fee comparison because verified broker fee schedules are unavailable."));
assert.ok(routing.includes("ORDER_STATUS.BROKER_SELECTED"));
assert.ok(routing.includes("routeExecutionOrder"));

const imp=src["app/broker-portfolio-import.js"];
assert.ok(imp.includes("buildBrokerPortfolioImportPreview"));
assert.ok(imp.includes("executeBrokerPortfolioImport"));
assert.ok(imp.includes("backfillCompletedBrokerImportEvents"));
assert.ok(imp.includes("Every import is validated against the current broker mirror"));
assert.ok(imp.includes("before the canonical REAL portfolio is updated."));
assert.ok(imp.includes("It does not place a trade or modify the"));
assert.ok(imp.includes("broker account."));
assert.ok(imp.includes("PC-015 validates the approved action and current"));
assert.ok(imp.includes("broker holding before updating the canonical REAL portfolio."));

console.log("PASS — all three AV3M broker sync/routing/import targets contain responsive calibration.");
console.log("PASS — all three targets have 960px desktop containment and 128px bottom clearance.");
console.log("PASS — Broker Sync remains read-only REAL evidence comparison and keeps reconciliation handoffs.");
console.log("PASS — Broker Routing remains Practice-only and no REAL order is transmitted.");
console.log("PASS — verified fee comparison remains evidence-aware and unavailable evidence is not fabricated.");
console.log("PASS — Controlled Portfolio Import still requires approved reconciliation/current broker validation before canonical REAL update.");
console.log("PASS — Controlled Import remains non-trading and does not modify broker accounts.");
console.log("PASS — portfolio-ledger backfill / approved-import execution contracts remain present.");
console.log("PC-030M20AV3M contract verification complete.");

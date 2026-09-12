import fs from "node:fs";
import assert from "node:assert/strict";

const calendar=fs.readFileSync("app/(tabs)/calendar.js","utf8");
const funds=fs.readFileSync("app/(tabs)/funds.js","utf8");
const news=fs.readFileSync("app/(tabs)/news.js","utf8");

for (const [name,src] of Object.entries({calendar,funds,news})) {
  assert.ok(src.includes("PC-030M20AV3J RESPONSIVE CALIBRATION"), `${name}: AV3J marker missing`);
  assert.ok(src.includes('maxWidth: 960'), `${name}: 960px containment missing`);
  assert.ok(src.includes('paddingBottom: 128'), `${name}: 128px clearance missing`);
}

assert.ok(calendar.includes("loadVerifiedCalendar"));
assert.ok(calendar.includes("loadCorporateActions"));
assert.ok(calendar.includes("buildVerifiedCalendarEvents"));
assert.ok(calendar.includes("Verified corporate actions and explicitly dated market events."));
assert.ok(calendar.includes('width: "14.2857%"'), "calendar: seven-column calendar geometry changed");

assert.ok(funds.includes('reason: "CASH_STATEMENT_UPDATE"'));
assert.ok(funds.includes("Connected REAL broker cash is read-only here."));
assert.ok(funds.includes("verified broker synchronization"));
assert.ok(funds.includes("complete reconciliation. This does not change GateCEP's REAL available cash."));
assert.ok(funds.includes("portfolio-sync-center"));

assert.ok(news.includes("loadVerifiedNews"));
assert.ok(news.includes("buildVerifiedNews"));
assert.ok(news.includes("buildPortfolioAwareInvestorAlerts"));
assert.ok(news.includes("GateCEP does not substitute placeholder news."));
assert.ok(news.includes("Original source"));

console.log("PASS — Calendar, Funds and News contain AV3J responsive residual calibration.");
console.log("PASS — all three core tabs have 960px desktop containment and 128px bottom clearance.");
console.log("PASS — Calendar verified-evidence contract and seven-column month grid remain present.");
console.log("PASS — Funds verified reconciliation / REAL cash read-only boundaries remain present.");
console.log("PASS — News verified-source / no-placeholder and portfolio-aware alert contracts remain present.");
console.log("PC-030M20AV3J contract verification complete.");

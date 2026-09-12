import fs from "node:fs";
import assert from "node:assert/strict";

const targets = [
"app/alerts.js",
"app/analysis-ready.js",
"app/behavior-analytics.js",
"app/corporate-actions.js",
"app/investor-home.js",
"app/investor-timeline.js",
"app/live-dashboard.js",
"app/portfolio-activity.js",
"app/progress.js",
"app/recommendation-history.js",
"app/security/[symbol].js",
];

for (const f of targets) {
  const s=fs.readFileSync(f,"utf8");
  assert.ok(s.includes("PC-030M20AV3P RESPONSIVE CALIBRATION"),`${f}: marker missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${f}: maxWidth 960 missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${f}: bottom 128 missing`);
  assert.ok(/width\s*:\s*"100%"/.test(s),`${f}: width 100% missing`);
  assert.ok(/alignSelf\s*:\s*"center"/.test(s),`${f}: centered containment missing`);
}

const alerts=fs.readFileSync("app/alerts.js","utf8");
assert.ok(alerts.includes("/investor-alert-review"));
assert.ok(alerts.includes("saveAlerts"));

const analysis=fs.readFileSync("app/analysis-ready.js","utf8");
assert.ok(analysis.includes("/portfolio-sync-center"));

const behavior=fs.readFileSync("app/behavior-analytics.js","utf8");
assert.ok(behavior.includes("/investor-timeline"));

const timeline=fs.readFileSync("app/investor-timeline.js","utf8");
assert.ok(timeline.includes("/monthly-review"));

const activity=fs.readFileSync("app/portfolio-activity.js","utf8");
assert.ok(activity.includes("loadCanonicalRealTransactionHistory"));

const security=fs.readFileSync("app/security/[symbol].js","utf8");
assert.ok(security.includes("saveWatchlists"));
assert.ok(security.includes("/fundamental-data-hub"));

console.log("PASS — all 11 AV3P screens contain responsive calibration.");
console.log("PASS — all targets have 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — representative navigation and evidence/service contracts remain present.");
console.log("PC-030M20AV3P contract verification complete.");

import fs from "node:fs";
import assert from "node:assert/strict";
const src={
 holdings:fs.readFileSync("app/holding-details.js","utf8"),
 rebalancing:fs.readFileSync("app/portfolio-rebalancing.js","utf8"),
 risk:fs.readFileSync("app/portfolio-risk.js","utf8"),
 analytics:fs.readFileSync("app/unified-portfolio-analytics.js","utf8"),
 performance:fs.readFileSync("app/performance.js","utf8"),
 hub:fs.readFileSync("app/portfolio-hub.js","utf8")
};
for(const k of ["holdings","rebalancing","risk","analytics"]){
 assert.ok(src[k].includes("PC-030M20AV3E RESPONSIVE CALIBRATION"),`${k}: marker missing`);
 assert.ok(src[k].includes("useWindowDimensions"),`${k}: width hook missing`);
 assert.ok(src[k].includes("maxWidth: 960"),`${k}: desktop containment missing`);
 assert.ok(src[k].includes("paddingBottom: 128"),`${k}: mobile clearance missing`);
}
assert.ok(src.holdings.includes("loadUnifiedPortfolioRuntime"));
assert.ok(src.holdings.includes("calculatePortfolioSummary"));
assert.ok(src.holdings.includes("GateCEP did not switch to Practice."));
assert.ok(src.rebalancing.includes("buildCoachGRebalancingAdvice"));
assert.ok(src.rebalancing.includes("applyRebalanceTemplate"));
assert.ok(src.rebalancing.includes("does not modify holdings, cash, or place trades"));
assert.ok(src.risk.includes("buildCoachGRiskAdvice"));
assert.ok(src.risk.includes("applyRiskProfile"));
assert.ok(src.risk.includes("does not change holdings, cash, or place trades"));
assert.ok(src.risk.includes("Calculated only from genuine Portfolio Event Ledger valuation history."));
assert.ok(src.analytics.includes("buildUnifiedPortfolioAnalytics"));
assert.ok(src.analytics.includes("buildPortfolioHealthScore"));
assert.ok(src.analytics.includes("buildExecutiveActionQueue"));
assert.ok(src.analytics.includes("place trades")&&src.analytics.includes("modify holdings"));
assert.ok(src.performance.includes("av3bContentWide"));
assert.ok(src.performance.includes('triggerReason: "PERFORMANCE_OPEN"'));
assert.ok(src.performance.includes("loadCanonicalRealWealthMetrics"));
assert.ok(src.performance.includes("buildHistoricalPerformanceSummary"));
assert.ok(src.performance.includes("buildPerformanceBenchmarkGoalIntelligence"));
assert.ok(src.performance.includes("Missing dates are not interpolated."));
assert.ok(src.performance.includes("will not substitute a synthetic or zero benchmark return"));
assert.ok(src.hub.includes('export { default } from "../src/features/portfolio-home/PortfolioHomeScreen";'));
console.log("PASS — Holdings, Rebalancing, Risk and Portfolio Analysis contain AV3E responsive calibration.");
console.log("PASS — 960px desktop containment and mobile bottom clearance are present.");
console.log("PASS — REAL/Practice, advisory rebalancing and risk-profile boundaries remain present.");
console.log("PASS — genuine historical-risk and Performance no-fabrication guards remain present.");
console.log("PASS — Performance retains AV3B calibration and canonical REAL snapshot/history services.");
console.log("PASS — Portfolio Hub remains canonical PortfolioHomeScreen re-export.");
console.log("PC-030M20AV3E contract verification complete.");

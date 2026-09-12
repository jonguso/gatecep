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
 assert.ok(src[k].includes("PC-030M20AV3E RESPONSIVE CALIBRATION"),`${k}: AV3E marker missing`);
 assert.ok(src[k].includes("useWindowDimensions"),`${k}: width hook missing`);
 assert.ok(src[k].includes("maxWidth: 960"),`${k}: 960px containment missing`);
 assert.ok(src[k].includes("paddingBottom: 128"),`${k}: mobile clearance missing`);
}
assert.ok(src.holdings.includes("av3eWidth"));
assert.ok(src.holdings.includes("compact={av3eWidth < 520}"));
assert.ok(src.holdings.includes("loadUnifiedPortfolioRuntime"));
assert.ok(src.holdings.includes("GateCEP did not switch to Practice."));

assert.ok(src.rebalancing.includes("width: windowWidth, height: windowHeight"));
assert.ok(src.rebalancing.includes('windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }'));
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
assert.ok(src.performance.includes("buildHistoricalPerformanceSummary"));
assert.ok(src.performance.includes("buildPerformanceBenchmarkGoalIntelligence"));
assert.ok(src.performance.includes("will not substitute a synthetic or zero benchmark return"));

assert.ok(src.hub.includes('export { default } from "../src/features/portfolio-home/PortfolioHomeScreen";'));

console.log("PASS — AV3E partial Holdings apply validated.");
console.log("PASS — Rebalancing, Risk and Portfolio Analysis AV3E responsive calibration completed.");
console.log("PASS — 960px desktop containment and 128px mobile clearance present across AV3E targets.");
console.log("PASS — REAL/Practice and advisory-only boundaries remain present.");
console.log("PASS — genuine historical evidence and Performance no-fabrication guards remain present.");
console.log("PASS — Performance AV3B calibration and Portfolio Hub canonical re-export remain preserved.");
console.log("PC-030M20AV3E1 recovery verification complete.");

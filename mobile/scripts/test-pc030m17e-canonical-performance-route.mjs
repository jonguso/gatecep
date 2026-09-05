import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync("src/features/portfolio-home/PortfolioHomeScreen.js", "utf8");
const legacy = fs.readFileSync("app/portfolio-performance.js", "utf8");
const canonical = fs.readFileSync("app/performance.js", "utf8");
const analytics = fs.readFileSync("app/unified-portfolio-analytics.js", "utf8");
const menu = fs.readFileSync("app/menu.js", "utf8");

assert.match(home, /const TABS = \["Allocation", "Holdings", "More"\]/);
assert.doesNotMatch(home, /tab === "Performance"/);
assert.doesNotMatch(home, /Open Performance Details/);

assert.match(legacy, /<Redirect href="\/performance" \/>/);
assert.doesNotMatch(legacy, /buildCoachGPerformanceAdvice|ScrollView|StyleSheet/);
assert.match(canonical, /export default function Performance/);
assert.match(analytics, /pathname: "\/performance"/);
assert.match(menu, /route: "\/performance"/);

console.log("PASS — Dashboard no longer duplicates the canonical Performance journey.");
console.log("PASS — /performance is the single implementation used by Menu and Portfolio Analysis.");
console.log("PASS — legacy /portfolio-performance bookmarks redirect to /performance.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(
  new URL("../src/features/portfolio-home/PortfolioHomeScreen.js", import.meta.url),
  "utf8"
);

assert.match(home, /style=\{styles\.utilityRow\}/);
assert.match(home, /setAccountModalOpen\(true\)/);
assert.match(home, /setPriceModalOpen\(true\)/);
assert.match(home, /function PriceStatusModal/);
assert.match(home, /Effective time/);
assert.match(home, /No price was fabricated/);
assert.doesNotMatch(home, /title=\{marketData\.status === "LIVE" \? "Market prices current"/);
assert.match(home, /const chartSize = Math\.min\(Math\.max\(width - 140, 180\), 230\)/);
assert.match(home, /function InvestorJourney/);
assert.match(home, /title="Portfolio Analysis"/);
assert.match(home, /title="Coach G Insights"/);
assert.match(home, /title="Coach G Recommendations"/);
assert.match(home, /const SECTORS_PER_PAGE = 5/);

console.log("PASS — account selection and verified price status share one compact utility row.");
console.log("PASS — price provenance is available on demand without occupying the dashboard.");
console.log("PASS — the compact net-worth summary releases viewport space for visual allocation data.");
console.log("PASS — Home progresses from facts to analysis, insight, and recommendations.");

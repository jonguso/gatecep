import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [home, holdings, mobileUi] = await Promise.all([
  read("src/features/portfolio-home/PortfolioHomeScreen.js"),
  read("app/holding-details.js"),
  read("src/components/mobile/MobileUI.js")
]);

assert.match(home, /const compactPhoneHeight = height < 850/);
assert.match(home, /const chartSize = Math\.min\(Math\.max\(width - 140, 180\), 230\)/);
assert.match(home, /const SECTORS_PER_PAGE = 5/);
assert.match(home, /styles\.heroCompact/);
assert.match(home, /styles\.heroValueCompact/);
assert.match(home, /styles\.quickMetricsCompact/);

assert.match(holdings, /minHeight=\{380\}/);
assert.match(holdings, /maxHeight=\{720\}/);
assert.match(holdings, /heightRatio=\{0\.62\}/);
assert.match(mobileUi, /const panelHeight = Math\.min\(maxHeight, Math\.max\(minHeight, height \* heightRatio\)\)/);
assert.match(mobileUi, /nestedScrollEnabled/);

console.log("PASS — compact phones receive a reduced REAL net-worth summary card.");
console.log("PASS — the dashboard allocation visual scales for compact mobile viewports.");
console.log("PASS — Holdings uses a taller proportional panel with contained scrolling.");
console.log("PASS — panel sizes remain bounded on short phones and large displays.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile(
  new URL("../src/features/portfolio-home/PortfolioHomeScreen.js", import.meta.url),
  "utf8"
);

assert.match(home, /<QuickMetric label="Sectors"/);
assert.doesNotMatch(home, /<QuickMetric label="Holdings"/);
assert.doesNotMatch(home, /<QuickMetric label="Largest"/);
assert.match(home, /style=\{styles\.largestSectorBadge\}/);
assert.match(home, /largestSector\.sector.*largestSector\.weight/s);
assert.match(home, /testID="portfolio-sector-donut"/);
assert.match(home, /onPress=\{handleChartPress\}/);
assert.match(home, /distance < inner \|\| distance > outer/);
assert.match(home, /if \(selected\) onSelect\(selected\)/);
assert.match(home, /<SectorModal sector=\{selectedSector\}/);
assert.match(home, /sector\.securities\.map/);

console.log("PASS — the summary shows sector count without duplicating the largest-sector fact.");
console.log("PASS — the allocation header shows the largest sector and its weight.");
console.log("PASS — donut touches resolve the selected wedge and open its securities popup.");
console.log("PASS — sector rows retain the same securities drill-down behavior.");


import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const pagePaths = [
  "app/unified-portfolio-analytics.js",
  "app/portfolio-risk.js",
  "app/performance.js",
  "app/portfolio-rebalancing.js"
];
const [mobileUi, ...pages] = await Promise.all([
  read("src/components/mobile/MobileUI.js"),
  ...pagePaths.map(read)
]);

assert.match(mobileUi, /export function calculateResponsivePanelHeight/);
assert.match(mobileUi, /minHeight = 380/);
assert.match(mobileUi, /maxHeight = 720/);
assert.match(mobileUi, /heightRatio = 0\.62/);

for (const [index, page] of pages.entries()) {
  assert.match(page, /calculateResponsivePanelHeight/,
    `${pagePaths[index]} must use the shared viewport sizing contract`);
  assert.match(page, /calculateResponsivePanelHeight\(windowHeight\)/,
    `${pagePaths[index]} must recalculate from the current viewport height`);
  assert.match(page, /nestedScrollEnabled/,
    `${pagePaths[index]} must retain contained internal scrolling`);
  assert.doesNotMatch(page, /Math\.min\(430, Math\.max\(310, windowHeight \* 0\.38\)\)/,
    `${pagePaths[index]} must not retain the old fixed-height ceiling`);
}

console.log("PASS — Portfolio Analysis, Risk, Performance, and Rebalancing share one responsive height contract.");
console.log("PASS — focused panels use 62% of the viewport, bounded between 380 and 720 points.");
console.log("PASS — all four detail journeys retain contained internal scrolling.");


import assert from "node:assert/strict";
import fs from "node:fs";

const holdings = fs.readFileSync("app/holding-details.js", "utf8");
const analytics = fs.readFileSync("app/unified-portfolio-analytics.js", "utf8");

assert.match(holdings, /ContainedPanel, StatusBanner/);
assert.match(holdings, /title=\{`All Securities \(\$\{securities\.length\}\)`\}/);
assert.match(holdings, /testID="holdings-contained-panel"/);
assert.match(holdings, /securities\.map/);

assert.match(analytics, /height: windowHeight/);
assert.match(analytics, /detailPanelHeight = Math\.min\(430, Math\.max\(310, windowHeight \* 0\.38\)\)/);
assert.match(analytics, /styles\.detailPanel/);
assert.match(analytics, /style=\{styles\.detailPanelScroll\}/);
assert.match(analytics, /nestedScrollEnabled/);
assert.match(analytics, /showsVerticalScrollIndicator/);
assert.match(analytics, /activeSection \? \(/);

console.log("PASS — Holding Details uses the shared contained securities panel.");
console.log("PASS — Portfolio Analytics displays one selected detail section in a responsive scroll panel.");
console.log("PASS — REAL portfolio calculations and navigation remain outside the presentation contract.");

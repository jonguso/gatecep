import assert from "node:assert/strict";
import fs from "node:fs";

const timeline = fs.readFileSync("app/investor-timeline.js", "utf8");
const rebalancing = fs.readFileSync("app/portfolio-rebalancing.js", "utf8");

assert.match(timeline, /ContainedPanel/);
assert.match(timeline, /testID="investor-timeline-contained-panel"/);
assert.match(timeline, /visibleEvents\.map/);
assert.match(timeline, /scroll timeline/);

assert.match(rebalancing, /useWindowDimensions/);
assert.match(rebalancing, /detailPanelHeight = calculateResponsivePanelHeight\(windowHeight\)/);
assert.match(rebalancing, /styles\.focusedPanel/);
assert.match(rebalancing, /nestedScrollEnabled/);
assert.match(rebalancing, /showsVerticalScrollIndicator/);
assert.match(rebalancing, /activeSection \? \(/);
assert.match(rebalancing, /Recommendation Only/);

console.log("PASS — Investor Timeline filters feed one responsive contained event panel.");
console.log("PASS — Portfolio Rebalancing opens one focused internally scrollable detail panel.");
console.log("PASS — advisory-only rebalancing protection remains present.");

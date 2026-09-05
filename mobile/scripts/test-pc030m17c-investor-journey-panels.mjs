import assert from "node:assert/strict";
import fs from "node:fs";

const performance = fs.readFileSync("app/performance.js", "utf8");
const risk = fs.readFileSync("app/portfolio-risk.js", "utf8");
const activity = fs.readFileSync("app/portfolio-activity.js", "utf8");
const wealth = fs.readFileSync("app/wealth-journey.js", "utf8");

for (const [name, source] of [["Performance", performance], ["Portfolio Risk", risk]]) {
  assert.match(source, /detailPanelHeight = Math\.min\(430, Math\.max\(310, windowHeight \* 0\.38\)\)/, `${name} responsive height`);
  assert.match(source, /style=\{styles\.detailPanelScroll\}/, `${name} detail scroll`);
  assert.match(source, /nestedScrollEnabled/, `${name} nested scroll`);
  assert.match(source, /showsVerticalScrollIndicator/, `${name} scroll indicator`);
  assert.match(source, /activeSection \? \(/, `${name} one selected section`);
}

assert.match(activity, /testID="portfolio-activity-contained-panel"/);
assert.match(activity, /title=\{`Activity \(\$\{events\.length\}\)`\}/);
assert.match(wealth, /testID="wealth-goals-contained-panel"/);
assert.match(wealth, /title=\{`Your Goals \(\$\{summary\.goals\.length\}\)`\}/);

assert.match(performance, /Canonical REAL All Accounts snapshot history/);
assert.match(risk, /Analytics Only/);
assert.doesNotMatch(activity, /gatecepSimulatedTrades|practiceSimulatedTrades|simulatedTrades/);
assert.match(activity, /Practice trades remain in Practice only/);
assert.match(wealth, /loadRealCurrentInvestorWealthJourney/);

console.log("PASS — Performance and Risk show one responsive detail panel at a time.");
console.log("PASS — Portfolio Activity and Wealth Journey contain their long record lists.");
console.log("PASS — historical evidence and REAL journey contracts remain present; Practice trades are excluded.");

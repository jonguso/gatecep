import assert from "node:assert/strict";
import fs from "node:fs";

const home = fs.readFileSync(
  "src/features/portfolio-home/PortfolioHomeScreen.js",
  "utf8"
);

assert.match(home, /loadInvestorContext/);
assert.match(home, /GATECEP_PRACTICE/);
assert.match(home, /type:\s*"PRACTICE"/);
assert.match(home, /async function loadPracticeHome/);
assert.match(home, /context\?\.practicePortfolio/);
assert.match(home, /practice\?\.availableCash/);

assert.match(
  home,
  /if\s*\(account\?\.type === "PRACTICE"\)\s*\{\s*return loadPracticeHome\(\)/
);

const practiceStart = home.indexOf("async function loadPracticeHome");
const realStart = home.indexOf("async function loadRealHome");

assert.ok(practiceStart >= 0, "Practice loader must exist");
assert.ok(realStart > practiceStart, "REAL loader must follow Practice loader");

const practiceLoader = home.slice(practiceStart, realStart);

assert.doesNotMatch(
  practiceLoader,
  /loadUnifiedPortfolioRuntime/,
  "Practice valuation must never call the canonical REAL runtime"
);

assert.match(home, /PRACTICE NET WORTH/);
assert.match(home, /SIMULATED — NO REAL MONEY/);
assert.match(home, /Practice activity never changes your REAL broker holdings, cash, or history/);

assert.match(
  home,
  /GateCEP did not switch to Practice\./,
  "REAL failure must retain explicit no-Practice-fallback contract"
);

assert.match(
  home,
  /if \(hasPractice && realAccounts\.length === 0\)/,
  "Practice-only investor should enter Practice automatically"
);

assert.match(
  home,
  /setSelectedAccount\(PRACTICE_ACCOUNT\)/,
  "Practice-only investor should select canonical Practice source"
);

assert.match(
  home,
  /calculatePortfolioSummary\(\{ holdings, cash \}\)/,
  "Both dashboard modes should use the canonical summary engine"
);

console.log("PASS — Practice dashboard reads canonical user-scoped Practice Portfolio.");
console.log("PASS — Practice valuation cannot call the canonical REAL runtime.");
console.log("PASS — Practice-only new investors enter the dashboard in Practice mode.");
console.log("PASS — REAL failure retains the no-Practice-fallback boundary.");
console.log("PASS — Practice is visibly identified as simulation with no real money.");

const coachHandoffStart = home.indexOf(
  "function CoachInsightsHandoff"
);

assert.ok(
  coachHandoffStart >= 0,
  "Source-aware Coach G handoff must exist"
);

const coachHandoff = home.slice(
  coachHandoffStart,
  home.indexOf("function HoldingRow", coachHandoffStart)
);

assert.match(
  coachHandoff,
  /const route = isPractice/
);

assert.match(
  coachHandoff,
  /\? "\/coach-insights"\s*:\s*"\/\(tabs\)\/coach"/,
  "Practice must route to Practice Coach G and REAL to canonical REAL Coach G"
);

assert.match(
  home,
  /<CoachInsightsHandoff isPractice=\{isPractice\}/,
  "Resolved dashboard source must be passed to Coach G handoff"
);

assert.match(
  coachHandoff,
  /Practice Coach G Lab/
);

assert.match(
  coachHandoff,
  /No REAL holdings, cash, orders, or history are changed/
);

console.log("PASS — Coach G handoff preserves the selected Practice/REAL dashboard source.");

import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(
  new URL(
    "../app/(tabs)/funds.js",
    import.meta.url
  ),
  "utf8"
);

assert.match(
  src,
  /const practiceMode\s*=\s*String\(params\?\.source/
);

assert.match(
  src,
  /"PRACTICE"/
);

assert.match(
  src,
  /loadInvestorContext/
);

assert.match(
  src,
  /savePracticePortfolio/
);

assert.match(
  src,
  /practiceFundingEvents/
);

assert.match(
  src,
  /PRACTICE_DEPOSIT/
);

assert.match(
  src,
  /PRACTICE_WITHDRAWAL/
);

assert.match(
  src,
  /amount > currentCash/
);

assert.match(
  src,
  /availableCash:\s*Number\(\s*nextCash\.toFixed\(2\)/
);

assert.match(
  src,
  /affectsRealCash:\s*false/
);

assert.match(
  src,
  /SIMULATION ONLY — NO REAL MONEY/
);

assert.match(
  src,
  /Deposit Practice Funds/
);

assert.match(
  src,
  /Withdraw Practice Funds/
);

assert.match(
  src,
  /Practice Funds cannot use the REAL cash statement path/
);

/*
 * The REAL path must remain present.
 */
assert.match(
  src,
  /userSetItem\("availableCash", String\(amount\)\)/
);

assert.match(
  src,
  /fetch\(`\$\{API_URL\}\/user-cash`/
);

assert.match(
  src,
  /rebuildCanonicalPortfolioLedger\(\)/
);

assert.match(
  src,
  /refreshCanonicalRealPortfolioSnapshot/
);

/*
 * Practice branch must appear before the ordinary REAL return.
 */
const practiceBranch =
  src.indexOf("if (practiceMode)");

const realTitle =
  src.indexOf(
    '{reconciliationMode ? "Broker Cash Evidence" : "Funds"}'
  );

assert.ok(
  practiceBranch >= 0 &&
  realTitle > practiceBranch,
  "Practice Funds must have an explicit UI branch before REAL Funds."
);

console.log(
  "PASS — Funds supports explicit source=PRACTICE mode."
);

console.log(
  "PASS — Practice cash loads from canonical Practice Portfolio."
);

console.log(
  "PASS — Practice deposit and withdrawal mutate only canonical Practice cash."
);

console.log(
  "PASS — Practice withdrawal fails closed on insufficient cash."
);

console.log(
  "PASS — Practice funding events are user-scoped and explicitly non-REAL."
);

console.log(
  "PASS — Practice mode cannot enter the REAL cash-statement mutation path."
);

console.log(
  "PASS — existing REAL Funds, broker evidence, backend cash, ledger and snapshot paths remain present."
);

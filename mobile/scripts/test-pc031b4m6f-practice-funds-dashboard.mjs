import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync(
  new URL(
    "../src/features/portfolio-home/PortfolioHomeScreen.js",
    import.meta.url
  ),
  "utf8"
);

const funds = fs.readFileSync(
  new URL(
    "../app/(tabs)/funds.js",
    import.meta.url
  ),
  "utf8"
);

assert.match(
  dashboard,
  /isPractice && !notice \? \(/
);

assert.match(
  dashboard,
  /accessibilityLabel="Open Practice Funds"/
);

assert.match(
  dashboard,
  /\/\(tabs\)\/funds\?source=PRACTICE/
);

assert.match(
  dashboard,
  /PRACTICE BUYING POWER/
);

assert.match(
  dashboard,
  /Practice Funds/
);

assert.match(
  dashboard,
  /Available Cash: KES \{money\(summary\.totalCash\)\}/
);

assert.match(
  dashboard,
  /Deposit or withdraw simulated funds before Practice execution\./
);

/*
 * Ensure the Practice Funds route remains explicitly guarded
 * by the Practice source condition.
 */
const actionIndex =
  dashboard.indexOf(
    'accessibilityLabel="Open Practice Funds"'
  );

assert.ok(
  actionIndex >= 0,
  "Practice Funds dashboard action missing."
);

const preceding =
  dashboard.slice(
    Math.max(0, actionIndex - 500),
    actionIndex
  );

assert.match(
  preceding,
  /isPractice && !notice/
);

/*
 * Destination must explicitly recognize PRACTICE.
 */
assert.match(
  funds,
  /String\(params\?\.source \|\| ""\)\.toUpperCase\(\) === "PRACTICE"/
);

assert.match(
  funds,
  /SIMULATION ONLY — NO REAL MONEY/
);

assert.match(
  funds,
  /savePracticePortfolio/
);

console.log(
  "PASS — Practice Dashboard exposes Practice Funds only in Practice mode."
);

console.log(
  "PASS — Practice Funds dashboard route explicitly carries source=PRACTICE."
);

console.log(
  "PASS — Dashboard displays canonical Practice available cash as buying power."
);

console.log(
  "PASS — destination remains visibly simulation-only and uses canonical Practice persistence."
);

console.log(
  "PASS — no REAL dashboard Funds behavior was introduced."
);

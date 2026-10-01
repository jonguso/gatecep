import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

let failures = 0;

function pass(message) {
  console.log(`PASS — ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL — ${message}`);
}

function source(relative) {
  return fs.readFileSync(
    path.join(root, relative),
    "utf8"
  );
}


/*
 * ============================================================
 * PRACTICE PORTFOLIO
 * ============================================================
 */

const practice =
  source(
    "src/features/practice/PracticePortfolio.jsx"
  );

if (
  /\},\s*\[\s*allocations,\s*marketRows\s*\]\s*\);/.test(
    practice
  )
) {
  pass(
    "Practice holdings recompute when market rows arrive."
  );
} else {
  fail(
    "Practice holdings do not depend on marketRows."
  );
}

if (
  /buildPracticeHoldings\s*\(\s*allocations,\s*marketRows\s*\)/.test(
    practice
  )
) {
  pass(
    "Practice holdings builder receives current market rows."
  );
} else {
  fail(
    "Practice holdings builder is not using current market rows."
  );
}

if (
  /if\s*\(\s*!practiceHoldings\.length\s*\)/.test(
    practice
  )
) {
  pass(
    "Practice creation still fails closed when no holdings can be built."
  );
} else {
  fail(
    "Practice empty-holdings safety guard is missing."
  );
}

if (
  /userSetItem\s*\(\s*["']practicePortfolio["']/.test(
    practice
  )
) {
  pass(
    "Practice portfolio remains persisted in user-scoped storage."
  );
} else {
  fail(
    "Practice portfolio persistence contract is missing."
  );
}


/*
 * ============================================================
 * ONBOARDING NAME
 * ============================================================
 */

const name =
  source(
    "app/onboarding/name.js"
  );

if (
  /useEffect\s*\(\s*\(\)\s*=>/.test(
    name
  ) &&
  /await\s+loadProfile\s*\(\s*\)/.test(
    name
  )
) {
  pass(
    "Name screen restores the current user's persisted profile."
  );
} else {
  fail(
    "Name screen does not restore persisted identity."
  );
}

if (
  /profile\?\.firstName/.test(name) &&
  /profile\?\.lastName/.test(name) &&
  /setFirst\s*\(/.test(name) &&
  /setLast\s*\(/.test(name)
) {
  pass(
    "Persisted first and last name are restored into the inputs."
  );
} else {
  fail(
    "Persisted identity is not restored into both name fields."
  );
}

if (
  /saveProfile\s*\(\s*\{\s*firstName,\s*lastName\s*\}\s*\)/.test(
    name
  )
) {
  pass(
    "Name submission continues through the canonical merge save."
  );
} else {
  fail(
    "Name submission no longer uses canonical profile save."
  );
}


/*
 * ============================================================
 * WELCOME JOURNEY IDENTITY CONTINUITY
 * ============================================================
 */

const welcome =
  source(
    "src/features/welcome/hooks/useWelcomeJourney.js"
  );

if (
  /userGetItem\s*\(\s*["']investorProfile["']\s*\)/.test(
    welcome
  )
) {
  pass(
    "Welcome Journey reads the existing investor profile before saving."
  );
} else {
  fail(
    "Welcome Journey still replaces the profile without reading it."
  );
}

if (
  /const\s+saved\s*=\s*\{\s*\.\.\.existingProfile,/.test(
    welcome
  )
) {
  pass(
    "Welcome Journey extends the existing investor profile."
  );
} else {
  fail(
    "Welcome Journey does not merge the existing investor profile."
  );
}

if (
  /firstName,\s*lastName,\s*profile\s*:/.test(
    welcome
  )
) {
  pass(
    "Root investor identity is preserved across questionnaire completion."
  );
} else {
  fail(
    "Root investor identity is not preserved."
  );
}

if (
  /profile\s*:\s*\{\s*\.\.\.existingNestedProfile,\s*\.\.\.answers,\s*firstName,\s*lastName,/.test(
    welcome
  )
) {
  pass(
    "Nested compatibility profile also retains investor identity."
  );
} else {
  fail(
    "Nested compatibility profile does not retain identity."
  );
}

if (
  /userSetItem\s*\(\s*["']investorProfile["']/.test(
    welcome
  )
) {
  pass(
    "Completed Welcome Journey remains user-scoped."
  );
} else {
  fail(
    "Welcome Journey investor profile persistence is missing."
  );
}


/*
 * ============================================================
 * MARKET HOOK CONTRACT
 * ============================================================
 */

const marketConsumers = [
  "src/features/practice/PracticePortfolio.jsx",
  "app/first-trade.js",
  "app/onboarding/smart-portfolio.js"
];

for (const relative of marketConsumers) {
  const text = source(relative);

  if (
    /import\s+useMarketData\s+from\s+["'][^"']*services\/markets\/useMarketData(?:\.js)?["']/.test(
      text
    )
  ) {
    pass(
      `${relative} retains the canonical default market-data import.`
    );
  } else {
    fail(
      `${relative} lost the canonical market-data import.`
    );
  }
}


if (failures) {
  console.error(
    `\nNew Investor runtime continuity FAILED: ${failures} issue(s).`
  );

  process.exit(1);
}

console.log(
  "\nNew Investor runtime continuity PASSED."
);

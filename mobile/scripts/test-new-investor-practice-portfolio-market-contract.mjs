import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const hookFile =
  path.join(
    root,
    "src/services/markets/useMarketData.js"
  );

const consumers = [
  "src/features/practice/PracticePortfolio.jsx",
  "app/first-trade.js",
  "app/onboarding/smart-portfolio.js"
];

let failures = 0;

function pass(message) {
  console.log(`PASS — ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL — ${message}`);
}

const hookSource =
  fs.readFileSync(hookFile, "utf8");

if (
  /export\s+default\s+function\s+useMarketData\s*\(/.test(
    hookSource
  )
) {
  pass(
    "canonical market-data hook exports useMarketData as default."
  );
} else {
  fail(
    "canonical market-data hook no longer has the expected default export."
  );
}

for (const relative of consumers) {
  const source =
    fs.readFileSync(
      path.join(root, relative),
      "utf8"
    );

  if (
    /import\s+useMarketData\s+from\s+["'][^"']*services\/markets\/useMarketData(?:\.js)?["']/.test(
      source
    )
  ) {
    pass(
      `${relative} uses the canonical default useMarketData import.`
    );
  } else {
    fail(
      `${relative} does not use the canonical default useMarketData import.`
    );
  }

  if (
    /import\s*\{\s*useMarketData\s*\}\s*from/.test(
      source
    )
  ) {
    fail(
      `${relative} still contains the invalid named useMarketData import.`
    );
  }
}

const practiceSource =
  fs.readFileSync(
    path.join(
      root,
      "src/features/practice/PracticePortfolio.jsx"
    ),
    "utf8"
  );

const creationRequirements = [
  [
    /async\s+function\s+createPracticePortfolio\s*\(/,
    "PracticePortfolio retains its existing creation function."
  ],
  [
    /onPress\s*=\s*\{\s*createPracticePortfolio\s*\}/,
    "Build button remains connected to createPracticePortfolio."
  ],
  [
    /userSetItem\s*\(\s*["']practicePortfolio["']/,
    "new investor practice portfolio remains user-scoped and persisted."
  ],
  [
    /userSetItem\s*\(\s*["']practicePortfolioCreated["']/,
    "practice portfolio creation marker remains persisted."
  ],
  [
    /existingPracticePortfolio\?\.status\s*===\s*["']ACTIVE["']/,
    "existing active practice portfolio remains protected from rebuilding."
  ],
  [
    /router\.replace\s*\(\s*["']\/\(tabs\)\/dashboard["']\s*\)/,
    "successful creation still returns the investor to Dashboard."
  ],
  [
    /No real money was used\./,
    "practice-only investor messaging remains intact."
  ]
];

for (
  const [pattern, message]
  of creationRequirements
) {
  if (pattern.test(practiceSource)) {
    pass(message);
  } else {
    fail(message);
  }
}

if (failures) {
  console.error(
    `\nNew Investor practice portfolio contract FAILED: ${failures} issue(s).`
  );
  process.exit(1);
}

console.log(
  "\nNew Investor practice portfolio market contract PASSED."
);

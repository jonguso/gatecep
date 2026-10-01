import fs from "node:fs";

const history = fs.readFileSync(
  new URL("../app/trade-history.js", import.meta.url),
  "utf8"
);

const checks = [
  [
    "Trade History uses canonical user-scoped storage reader",
    /userGetItem/.test(history)
  ],
  [
    "Trade History reads canonical Practice settlement history",
    /userGetItem\s*\(\s*[\r\n\s]*["']practiceSimulatedTrades["']\s*\)/
      .test(history)
  ],
  [
    "legacy global simulated-trades reader is removed",
    !/gatecepSimulatedTrades/.test(history)
  ],
  [
    "Trade History does not directly use AsyncStorage",
    !/AsyncStorage/.test(history)
  ],
  [
    "Trade History remains observer-only",
    !/userSetItem|userRemoveItem|userMergeItem/
      .test(history)
  ],
  [
    "Trade History does not own Practice settlement",
    !/settlePracticeExecutionOrder|markExecutionOrderFilled|queueExecutionOrders|routeExecutionOrderByMode/
      .test(history)
  ],
  [
    "Trade History does not read canonical REAL behavior history",
    !/canonicalRealBehaviorHistory|loadCanonicalRealTransactionHistory/
      .test(history)
  ],
  [
    "Trade History retains Practice presentation",
    history.includes("Practice Trade Records") &&
      history.includes("simulated trade")
  ]
];

let failed = false;

for (const [label, ok] of checks) {
  console.log(
    `${ok ? "PASS" : "FAIL"} — ${label}`
  );

  if (!ok) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log();
console.log(
  "PC-031B4M7C5D7H2 canonical Practice Trade History reader contract PASSED."
);

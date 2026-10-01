import fs from "node:fs";

const accounting = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionAccountingService.js",
    import.meta.url
  ),
  "utf8"
);

const basketStore = fs.readFileSync(
  new URL(
    "../src/services/trade/basketExecutionStore.js",
    import.meta.url
  ),
  "utf8"
);

const historyScreen = fs.readFileSync(
  new URL(
    "../app/trade-history.js",
    import.meta.url
  ),
  "utf8"
);

const executionHistory = fs.readFileSync(
  new URL(
    "../src/services/trade/practiceExecutionHistoryService.js",
    import.meta.url
  ),
  "utf8"
);

const checks = [
  [
    "canonical settlement history key is practiceSimulatedTrades",
    accounting.includes(
      'const PRACTICE_TRADE_HISTORY_KEY = "practiceSimulatedTrades"'
    )
  ],
  [
    "Trade History observes canonical Practice history",
    /userGetItem\s*\(\s*[\r\n\s]*["']practiceSimulatedTrades["']\s*\)/
      .test(historyScreen)
  ],
  [
    "Trade History has no legacy global reader",
    !historyScreen.includes(
      "gatecepSimulatedTrades"
    )
  ],
  [
    "settlement history evidence includes executionOrderId",
    accounting.includes(
      "executionOrderId"
    )
  ],
  [
    "settlement is durably idempotent",
    /practiceSettlements/.test(accounting)
  ],
  [
    "central OMS full-fill delegates to Practice settlement",
    /settlePracticeExecutionOrder/.test(
      basketStore
    )
  ],
  [
    "closed Practice execution archive remains separate from trade history",
    /practiceExecutionHistory/.test(
      executionHistory
    ) &&
      !/practiceSimulatedTrades/.test(
        executionHistory
      )
  ],
  [
    "Trade History remains observer-only",
    !/userSetItem|settlePracticeExecutionOrder|markExecutionOrderFilled/
      .test(historyScreen)
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
  "H4 static correlation contract PASSED."
);

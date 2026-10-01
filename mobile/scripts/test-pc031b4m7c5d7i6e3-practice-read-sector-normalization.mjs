import fs from "node:fs";

const path =
  "src/features/portfolio-home/PortfolioHomeScreen.js";

const source =
  fs.readFileSync(path, "utf8");

const checks = [];

function check(label, condition) {
  checks.push({
    label,
    pass: !!condition
  });
}

check(
  "Dashboard imports canonical security-master enrichment",
  source.includes(
    "applySecurityMaster"
  ) &&
    source.includes(
      'from "../../utils/nseSecurityMaster";'
    )
);

check(
  "Practice holdings are normalized in memory",
  source.includes(
    "const canonicalPracticeHoldings ="
  ) &&
    source.includes(
      "practiceHoldings.map((holding) =>"
    ) &&
    source.includes(
      "applySecurityMaster(holding)"
    )
);

const normalizeIndex =
  source.indexOf(
    "const canonicalPracticeHoldings ="
  );

const overlayIndex =
  source.indexOf(
    "const practiceValuation ="
  );

check(
  "Canonical sector normalization occurs before market-price overlay",
  normalizeIndex >= 0 &&
    overlayIndex > normalizeIndex
);

check(
  "Quote overlay consumes canonical Practice holdings",
  /overlayCanonicalNseQuotes\(\s*canonicalPracticeHoldings,\s*quoteSnapshot\s*\)/s.test(
    source
  )
);

check(
  "Dashboard displays the normalized and valued holdings",
  source.includes(
    "setHoldings(practiceValuation.holdings)"
  )
);

check(
  "Practice cash remains independent of sector normalization",
  source.includes(
    "setCash(practiceCash)"
  )
);

check(
  "Dashboard does not persist Practice portfolio during normalization",
  !source.includes(
    "savePracticePortfolio("
  ) &&
    !source.includes(
      'userSetItem("practicePortfolio"'
    )
);

check(
  "Dashboard does not mutate OMS during normalization",
  !source.includes(
    "updateExecutionOrder("
  ) &&
    !source.includes(
      "saveBasketExecution("
    ) &&
    !source.includes(
      "markExecutionOrderFilled("
    )
);

check(
  "Practice market-price overlay remains observational",
  source.includes(
    "no quote movement writes back to practicePortfolio"
  )
);

let failed = 0;

for (const item of checks) {
  console.log(
    `${item.pass ? "PASS" : "FAIL"} — ${item.label}`
  );

  if (!item.pass) {
    failed += 1;
  }
}

console.log("");
console.log(
  `PC-031B4M7C5D7I6E3: ${
    failed === 0 ? "PASS" : "FAIL"
  }`
);

process.exitCode =
  failed === 0 ? 0 : 1;

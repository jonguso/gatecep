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
  "Practice dashboard imports canonical NSE quote loader",
  source.includes(
    "loadCanonicalNseQuotes,"
  )
);

check(
  "Practice dashboard imports canonical NSE quote overlay",
  source.includes(
    "overlayCanonicalNseQuotes"
  )
);

check(
  "Practice load obtains canonical quote snapshot",
  source.includes(
    "await loadCanonicalNseQuotes()"
  )
);

check(
  "Practice valuation overlays quotes onto canonicalized loaded Practice holdings",
  source.includes(
    "overlayCanonicalNseQuotes("
  ) &&
    source.includes(
      "canonicalPracticeHoldings,"
    ) &&
    source.includes(
      "quoteSnapshot"
    )
);

check(
  "Dashboard displays overlaid Practice holdings",
  source.includes(
    "setHoldings(practiceValuation.holdings)"
  )
);

check(
  "Practice cash remains persisted Practice cash",
  source.includes(
    "setCash(practiceCash)"
  )
);

check(
  "Practice market-price evidence records quote coverage",
  source.includes(
    "updated: practiceValuation.updatedCount"
  ) &&
    source.includes(
      "total: practiceValuation.totalCount"
    )
);

check(
  "Practice price UI exposes current verified price state",
  source.includes(
    "PRACTICE PRICES"
  ) &&
    source.includes(
      '"Current ✓"'
    )
);

check(
  "Practice price UI exposes stale verified state",
  source.includes(
    '"Last Verified ⓘ"'
  )
);

check(
  "Practice exposes unavailable state",
  source.includes(
    '"Unavailable"'
  )
);

check(
  "Practice can inspect price evidence modal",
  source.includes(
    'accessibilityLabel="View Practice market price status"'
  ) &&
    source.includes(
      "isPractice={isPractice}"
    )
);

check(
  "Practice price explanation preserves recorded trade cost",
  source.includes(
    "never changes your recorded Practice trade cost"
  )
);

check(
  "Practice price explanation rejects fabricated movement",
  source.includes(
    "does not fabricate market movement"
  )
);

check(
  "Practice valuation does not persist Practice portfolio",
  !source.includes(
    "savePracticePortfolio("
  ) &&
    !source.includes(
      'userSetItem("practicePortfolio"'
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
  `PC-031B4M7C5D7I6C: ${
    failed === 0 ? "PASS" : "FAIL"
  }`
);

process.exitCode =
  failed === 0 ? 0 : 1;

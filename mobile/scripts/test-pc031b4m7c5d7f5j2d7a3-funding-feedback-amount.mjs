import fs from "node:fs";

const source = fs.readFileSync(
  new URL(
    "../app/orders-review.js",
    import.meta.url
  ),
  "utf8"
);

const start = source.indexOf(
  "async function queueOrder(order)"
);

const end = source.indexOf(
  "async function executeConfirmedHandoff()"
);

if (start < 0 || end <= start) {
  console.error(
    "FAIL — queueOrder source region not found"
  );
  process.exit(1);
}

const queueOrder = source.slice(start, end);

const checks = [
  [
    "individual prepare retains canonical preflight authority",
    /preflightCanonicalPracticeExecutionOrders\s*\(\s*prospectiveOrders\s*\)/
      .test(queueOrder)
  ],
  [
    "insufficient preflight can request canonical explanatory analysis",
    /analyzeCanonicalPracticeExecutionFunding\s*\(\s*prospectiveOrders\s*\)/
      .test(queueOrder)
  ],
  [
    "feedback consumes canonical additionalCashRequired",
    /analysis\?\.additionalCashRequired/
      .test(queueOrder)
  ],
  [
    "analysis enrichment occurs before queue mutation",
    queueOrder.indexOf(
      "analyzeCanonicalPracticeExecutionFunding"
    ) <
      queueOrder.indexOf(
        "queueSingleOrder(order.id)"
      )
  ],
  [
    "insufficient path still returns before queue mutation",
    /setPracticeFundingFeedback\([\s\S]*?return;[\s\S]*?queueSingleOrder\(order\.id\)/
      .test(queueOrder)
  ],
  [
    "feedback exposes required amount",
    /required:\s*explanatoryRequired/
      .test(queueOrder)
  ]
];

let failed = false;

for (const [label, ok] of checks) {
  console.log(
    `${ok ? "PASS" : "FAIL"} — ${label}`
  );

  if (!ok) failed = true;
}

if (failed) {
  process.exit(1);
}

console.log();
console.log(
  "PC-031B4M7C5D7F5J2D7A3 funding feedback amount contract PASSED."
);

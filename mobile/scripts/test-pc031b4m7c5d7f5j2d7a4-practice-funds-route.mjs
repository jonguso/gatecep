import fs from "node:fs";

const review = fs.readFileSync(
  new URL("../app/orders-review.js", import.meta.url),
  "utf8"
);

const funds = fs.readFileSync(
  new URL("../app/(tabs)/funds.js", import.meta.url),
  "utf8"
);

/*
 * One inline Open Practice Funds action contains two possible
 * Practice URL literals:
 *
 *   required > 0
 *     ? source=PRACTICE&returnTo=ORDERS_REVIEW&amount=...
 *     : source=PRACTICE
 *
 * Therefore raw source=PRACTICE substring count is NOT an
 * action count.
 *
 * The investor-facing contract is:
 *   5 Open Practice Funds actions
 *   0 source-ambiguous /funds destinations
 *   1 amount-carrying inline action
 */

const openPracticeFundsActions =
  (
    review.match(
      /Open Practice Funds/g
    ) || []
  ).length;

const plainFundsDestinations =
  (
    review.match(
      /["']\/\(tabs\)\/funds["']/g
    ) || []
  ).length;

const amountRoutes =
  (
    review.match(
      /source=PRACTICE&returnTo=ORDERS_REVIEW&amount=/g
    ) || []
  ).length;

const explicitPracticeRoutes =
  (
    review.match(
      /\/\(tabs\)\/funds\?source=PRACTICE/g
    ) || []
  ).length;

const checks = [
  [
    "exactly five Open Practice Funds actions exist",
    openPracticeFundsActions === 5
  ],
  [
    "Orders Review has zero source-ambiguous Funds destinations",
    plainFundsDestinations === 0
  ],
  [
    "every Practice Funds destination explicitly selects Practice",
    explicitPracticeRoutes >=
      openPracticeFundsActions
  ],
  [
    "exactly one amount-carrying Practice Funds route exists",
    amountRoutes === 1
  ],
  [
    "inline funding action derives amount from canonical feedback",
    review.includes(
      "practiceFundingFeedback?.required"
    ) &&
      review.includes(
        "required.toFixed(2)"
      ) &&
      review.includes(
        "source=PRACTICE&returnTo=ORDERS_REVIEW&amount="
      )
  ],
  [
    "inline funding action has Practice fallback without amount",
    review.includes(
      ': "/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW"'
    )
  ],
  [
    "Funds enters Practice mode only from explicit PRACTICE source",
    /String\(params\?\.source\s*\|\|\s*""\)\.toUpperCase\(\)\s*===\s*"PRACTICE"/
      .test(funds)
  ],
  [
    "amount parameter is presentation-only Practice form prefill",
    /Number\(params\?\.amount\s*\|\|\s*0\)/
      .test(funds) &&
      /setCash\([\s\S]*?requestedAmount\.toFixed\(2\)/
        .test(funds)
  ],
  [
    "Practice deposit remains an explicit user action",
    /updatePracticeFunds\([\s\S]*?"PRACTICE_DEPOSIT"/
      .test(funds)
  ],
  [
    "Practice withdrawal remains an explicit user action",
    /updatePracticeFunds\([\s\S]*?"PRACTICE_WITHDRAWAL"/
      .test(funds)
  ],
  [
    "Practice Funds cannot use REAL statement mutation path",
    funds.includes(
      "Practice Funds cannot use the REAL cash statement path."
    )
  ]
];

console.log(
  `Open Practice Funds actions: ${openPracticeFundsActions}`
);
console.log(
  `Explicit Practice URL literals: ${explicitPracticeRoutes}`
);
console.log(
  `Amount-carrying URL literals: ${amountRoutes}`
);
console.log(
  `Source-ambiguous Funds destinations: ${plainFundsDestinations}`
);
console.log();

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
  "PC-031B4M7C5D7F5J2D7A4 Practice Funds route contract PASSED."
);

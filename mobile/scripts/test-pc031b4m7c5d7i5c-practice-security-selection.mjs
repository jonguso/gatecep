import fs from "node:fs";

const reviewPath =
  "app/orders-review.js";
const storePath =
  "src/services/trade/basketExecutionStore.js";

const review =
  fs.readFileSync(reviewPath, "utf8");
const store =
  fs.readFileSync(storePath, "utf8");

const checks = [];

function check(label, condition) {
  checks.push({ label, pass: !!condition });
}

check(
  "Orders Review uses canonical market-data hook",
  review.includes(
    'import useMarketData from "../src/services/markets/useMarketData";'
  ) &&
    review.includes(
      "const market = useMarketData();"
    )
);

check(
  "Practice review exposes Change Security control",
  review.includes("Change Security") &&
    review.includes(
      "Select from verified market data"
    )
);

check(
  "Security picker searches canonical market rows",
  review.includes("marketRows={market.rows || []}") &&
    review.includes(
      'placeholder="Search symbol or company name"'
    )
);

check(
  "REAL orders do not receive Practice security control",
  review.includes(
    "{!isRealOrder ? ("
  )
);

check(
  "Dedicated canonical Practice replacement authority exists",
  store.includes(
    "export async function replacePracticeReviewOrderSecurity"
  )
);

check(
  "Replacement fails closed for REAL",
  store.includes(
    "REAL_SECURITY_REPLACEMENT_FORBIDDEN"
  )
);

check(
  "Replacement is restricted to editable lifecycle states",
  store.includes("ORDER_STATUS.DRAFT") &&
    store.includes("ORDER_STATUS.REVIEW") &&
    store.includes("ORDER_STATUS.PENDING") &&
    store.includes(
      "PRACTICE_SECURITY_REPLACEMENT_STATUS_FORBIDDEN"
    )
);

check(
  "Replacement validates market symbol and positive price",
  store.includes(
    "PRACTICE_SECURITY_REPLACEMENT_INVALID_MARKET_SECURITY"
  ) &&
    store.includes(
      "!Number.isFinite(price)"
    ) &&
    store.includes("price <= 0")
);

check(
  "Replacement recalculates gross from persisted quantity",
  store.includes(
    "const gross ="
  ) &&
    store.includes(
      "quantity * price"
    )
);

check(
  "Generic updateExecutionOrder remains available",
  store.includes(
    "export async function updateExecutionOrder"
  )
);

check(
  "No local static security universe added to Orders Review",
  !review.includes(
    "const STOCKS = ["
  )
);

let failed = 0;

for (const item of checks) {
  console.log(
    `${item.pass ? "PASS" : "FAIL"} — ${item.label}`
  );

  if (!item.pass) failed += 1;
}

console.log("");
console.log(
  `PC-031B4M7C5D7I5C: ${
    failed === 0 ? "PASS" : "FAIL"
  }`
);

process.exitCode = failed ? 1 : 0;

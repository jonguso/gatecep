import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL(
    "../src/features/broker-sync/brokerSyncService.js",
    import.meta.url
  ),
  "utf8"
);

console.log(
  "===== PC-POSTPROD-UAT-001F4C2 — ACCOUNT-SCOPED WRITERS ====="
);

assert.match(
  source,
  /loadBrokerAccountEvidence/
);

assert.match(
  source,
  /saveBrokerAccountEvidence/
);

console.log(
  "PASS — broker sync service imports account-scoped evidence store."
);

const valuationStart =
  source.indexOf(
    "export async function saveVerifiedUploadedBrokerMirror"
  );

const cashStart =
  source.indexOf(
    "export async function attachVerifiedBrokerCashEvidence"
  );

assert.ok(valuationStart >= 0);
assert.ok(cashStart > valuationStart);

const valuationBlock =
  source.slice(
    valuationStart,
    cashStart
  );

const cashBlock =
  source.slice(
    cashStart,
    source.indexOf(
      "/*",
      cashStart
    )
  );

assert.match(
  valuationBlock,
  /saveBrokerAccountEvidence/
);

assert.doesNotMatch(
  valuationBlock,
  /return\s+saveBrokerMirror\s*\(/
);

assert.match(
  valuationBlock,
  /accountIdentity\.brokerAccountKey/
);

console.log(
  "PASS — verified valuation persists by canonical broker account."
);

assert.match(
  cashBlock,
  /loadBrokerAccountEvidence/
);

assert.match(
  cashBlock,
  /requestedAccountKey/
);

assert.match(
  cashBlock,
  /saveBrokerAccountEvidence/
);

assert.doesNotMatch(
  cashBlock,
  /await\s+loadBrokerMirror\s*\(/
);

assert.doesNotMatch(
  cashBlock,
  /return\s+saveBrokerMirror\s*\(/
);

console.log(
  "PASS — cash joins and replaces only the matching account mirror."
);

assert.match(
  cashBlock,
  /accountIdentity\.cdsNumber\s*!==\s*mirror\.cdsNumber/
);

assert.match(
  cashBlock,
  /accountIdentity\.brokerAccountKey\s*!==\s*mirror\.brokerAccountKey/
);

console.log(
  "PASS — existing CDS/account identity match remains enforced."
);

console.log(
  "===== PC-POSTPROD-UAT-001F4C2 PASS ====="
);

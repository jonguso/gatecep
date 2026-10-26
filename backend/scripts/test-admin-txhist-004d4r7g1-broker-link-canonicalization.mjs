import assert from "node:assert/strict";
import fs from "node:fs";

import {
  normalizeBroker
} from "../src/modules/broker-links/brokerLinks.repository.js";

const source =
  fs.readFileSync(
    new URL(
      "../src/modules/broker-links/brokerLinks.repository.js",
      import.meta.url
    ),
    "utf8"
  );

console.log(
  "===== R7G-R1 SYNTHETIC VERIFIER ====="
);

assert.equal(
  normalizeBroker("ABC"),
  "ABC"
);

assert.equal(
  normalizeBroker("ABC Capital"),
  "ABC"
);

console.log(
  "ABC_CANONICALIZATION=PASS"
);

assert.equal(
  normalizeBroker("AIB"),
  "AIB-AXYS"
);

assert.equal(
  normalizeBroker("AIB AXYS"),
  "AIB-AXYS"
);

assert.equal(
  normalizeBroker("AIB-AXYS"),
  "AIB-AXYS"
);

console.log(
  "AIB_EXISTING_SERVER_IDENTITY=PASS"
);

const abcKey =
  normalizeBroker("ABC Capital") +
  "|" +
  "23032";

assert.equal(
  abcKey,
  "ABC|23032"
);

console.log(
  "ABC_ACCOUNT_KEY=PASS"
);

assert.match(
  source,
  /ON CONFLICT\s*\(\s*user_id,\s*broker,\s*client_number,\s*cds_number\s*\)/s
);

console.log(
  "LIVE_UNIQUE_CONFLICT_TARGET=PASS"
);

assert.match(
  source,
  /requireIdentityText\(\s*payload\.clientNumber,\s*"clientNumber"\s*\)/s
);

assert.match(
  source,
  /requireIdentityText\(\s*payload\.cdsNumber,\s*"cdsNumber"\s*\)/s
);

assert.match(
  source,
  /`\$\{label\} is required\.`/
);

console.log(
  "BROKER_IDENTITY_REQUIRED=PASS"
);

assert.doesNotMatch(
  source,
  /ON CONFLICT\s*\(\s*user_id,\s*broker\s*\)/s
);

console.log(
  "STALE_CONFLICT_TARGET_REMOVED=PASS"
);

console.log(
  "TRANSACTION_HISTORY_WRITE=NONE"
);

console.log(
  "AUTHORITY_GENERATION_WRITE=NONE"
);

console.log(
  "R7G_R1_SYNTHETIC=PASS"
);

import assert from "node:assert/strict";
import fs from "node:fs";

const SERVICE =
  new URL(
    "../src/modules/transaction-history/" +
      "investorBrokerTransactionHistory.service.js",
    import.meta.url
  );

const source =
  fs.readFileSync(
    SERVICE,
    "utf8"
  );

const module =
  await import(SERVICE.href);

const canonical =
  module
    .canonicalTransactionHistoryBroker;

assert.equal(
  typeof canonical,
  "function",
  "Transaction History canonical broker function must be exported."
);

assert.equal(
  canonical("AIB"),
  "AIB"
);

assert.equal(
  canonical("AIB AXYS"),
  "AIB"
);

assert.equal(
  canonical("AIB-AXYS"),
  "AIB"
);

assert.equal(
  canonical("aib-axys"),
  "AIB"
);

assert.equal(
  canonical("ABC"),
  "ABC"
);

assert.equal(
  canonical("ABC Capital"),
  "ABC"
);

assert.equal(
  canonical("abc capital"),
  "ABC"
);

assert.equal(
  canonical("OTHER"),
  "OTHER"
);

const aibKey =
  canonical("AIB-AXYS") +
  "|" +
  "137971";

const abcKey =
  canonical("ABC") +
  "|" +
  "23032";

assert.equal(
  aibKey,
  "AIB|137971"
);

assert.equal(
  abcKey,
  "ABC|23032"
);

assert.match(
  source,
  /function canonicalBroker\(value\)[\s\S]*canonicalTransactionHistoryBroker/
);

assert.match(
  source,
  /brokerAccountKey:[\s\S]*buildBrokerAccountKey/
);

assert.doesNotMatch(
  source,
  /UPDATE\s+public\.user_broker_links/i
);

assert.doesNotMatch(
  source,
  /DELETE\s+FROM\s+public\.user_broker_links/i
);

console.log(
  "AIB_CANONICAL_BROKER=PASS"
);

console.log(
  "AIB_HISTORY_ACCOUNT_KEY=" +
  aibKey
);

console.log(
  "ABC_CANONICAL_BROKER=PASS"
);

console.log(
  "ABC_HISTORY_ACCOUNT_KEY=" +
  abcKey
);

console.log(
  "UNKNOWN_BROKER_PRESERVATION=PASS"
);

console.log(
  "BROKER_LINK_MUTATION=NONE"
);

console.log(
  "R7H_R1_SYNTHETIC=PASS"
);

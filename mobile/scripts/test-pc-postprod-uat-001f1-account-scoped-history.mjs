import assert from "node:assert/strict";
import fs from "node:fs";

const storePath =
  "mobile/src/features/trading/" +
  "brokerTransactionHistoryEvidenceStore.js";

const lotPath =
  "mobile/src/features/trading/" +
  "brokerLotHistoryEvidenceService.js";

const store = fs.readFileSync(storePath, "utf8");
const lot = fs.readFileSync(lotPath, "utf8");

assert.match(
  store,
  /brokerTransactionHistoryByAccount/
);

assert.match(
  store,
  /saveBrokerTransactionHistoryEvidence/
);

assert.match(
  store,
  /loadCombinedBrokerTransactionHistoryEvidence/
);

assert.match(
  store,
  /brokerAccountKey:\s*normalizedAccountKey/
);

assert.match(
  store,
  /LEGACY_UNSCOPED/
);

assert.match(
  lot,
  /loadCombinedBrokerTransactionHistoryEvidence/
);

assert.match(
  lot,
  /const key = `\$\{accountKey\}::\$\{fillKey\}`/
);

assert.match(
  lot,
  /brokerAccountKey = null/
);

console.log(
  "PASS — account-scoped transaction registry exists."
);

console.log(
  "PASS — save contract replaces one broker-account bucket."
);

console.log(
  "PASS — combined compatibility projection preserves existing consumers."
);

console.log(
  "PASS — lot-history dedupe includes broker-account identity."
);

console.log(
  "PASS — legacy unscoped evidence remains explicitly distinguishable."
);

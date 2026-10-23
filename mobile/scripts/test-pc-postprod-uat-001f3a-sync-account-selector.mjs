import assert from "node:assert/strict";
import fs from "node:fs";

const path = "mobile/app/portfolio-sync-center.js";
const source = fs.readFileSync(path, "utf8");

assert.match(
  source,
  /buildBrokerAccountKey/
);

assert.match(
  source,
  /setBrokerAccounts\(connectedAccounts\)/
);

assert.match(
  source,
  /selectedBrokerAccountId/
);

assert.match(
  source,
  /loadBrokerLotHistoryEvidence\(\{\s*brokerAccountKey:/
);

assert.match(
  source,
  /function openTransactionUpload\(\)/
);

assert.match(
  source,
  /pathname:\s*"\/transactions-upload"/
);

assert.match(
  source,
  /brokerAccountKey:\s*selectedBrokerAccountKey/
);

assert.doesNotMatch(
  source,
  /router\.push\("\/transactions-upload\?mode=RECONCILE"\)/
);

assert.match(
  source,
  /Update This Account/
);

assert.match(
  source,
  /disabled=\{!selectedBrokerAccountKey\}/
);

assert.match(
  source,
  /onPress=\{\(\) => selectBrokerAccount\(account\)\}/
);

// Selection may read evidence, but must not save evidence.
const selectorFunction =
  source.match(
    /async function selectBrokerAccount\(account\) \{[\s\S]*?\n  \}/
  )?.[0] || "";

assert.ok(selectorFunction);

assert.doesNotMatch(
  selectorFunction,
  /saveBrokerTransactionHistoryEvidence|saveBrokerAccounts/,
  "Changing selection must not save broker evidence or broker-account records."
);

assert.match(
  selectorFunction,
  /userSetItem\(\s*SELECTED_EVIDENCE_ACCOUNT_KEY,\s*account\.id\s*\)/s,
  "Changing selection must persist only the reconciliation account choice."
);

console.log(
  "PASS — Sync Center retains connected broker accounts."
);
console.log(
  "PASS — transaction readiness is selected-account scoped."
);
console.log(
  "PASS — selected account routes canonical brokerAccountKey to upload."
);
console.log(
  "PASS — old unscoped transaction-upload route is removed."
);
console.log(
  "PASS — existing account evidence uses account-specific update semantics."
);
console.log(
  "PASS — changing account selection persists only UI choice and does not replace evidence."
);

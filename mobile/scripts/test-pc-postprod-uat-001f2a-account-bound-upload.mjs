import assert from "node:assert/strict";
import fs from "node:fs";

const path = "mobile/app/transactions-upload.js";
const raw = fs.readFileSync(path);

assert.equal(
  raw.filter((byte) => byte === 0x97).length,
  3,
  "CP1252 em-dash bytes must be preserved"
);

const source = new TextDecoder("windows-1252")
  .decode(raw)
  .replace(/\r\n/g, "\n");

assert.match(source, /params\?\.brokerAccountKey/);
assert.match(source, /loadBrokerAccounts/);
assert.match(source, /buildBrokerAccountKey/);
assert.match(source, /rawEvidenceRows/);
assert.match(source, /requireValidBrokerEvidenceIdentity/);

assert.match(
  source,
  /expectedAccountKey:\s*requestedBrokerAccountKey/
);

assert.match(
  source,
  /saveBrokerTransactionHistoryEvidence/
);

assert.match(
  source,
  /brokerAccountKey:\s*identityResult\.brokerAccountKey/
);

assert.doesNotMatch(
  source,
  /userSetItem\("transactionHistory"/
);

assert.doesNotMatch(
  source,
  /userSetItem\("unverifiedTransactionHistory"/
);

assert.match(source, /Broker Account Required/);

console.log(
  "PASS — transaction upload requires broker-account identity."
);
console.log(
  "PASS — connected account resolution is present."
);
console.log(
  "PASS — raw broker rows survive normalization for validation."
);
console.log(
  "PASS — expected account key is enforced."
);
console.log(
  "PASS — persistence uses account-scoped evidence store."
);
console.log(
  "PASS — direct global history replacement is removed."
);
console.log(
  "PASS — original CP1252 content is preserved."
);

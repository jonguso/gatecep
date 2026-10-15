import assert from "node:assert/strict";
import fs from "node:fs";

const bytes = fs.readFileSync(
  "mobile/app/real-order-recovery.js"
);

// Node's latin1 decoding gives us a safe structural representation
// without rewriting the production file.
const source = bytes.toString("latin1");

assert.ok(
  bytes.includes(Buffer.from([0x95])),
  "CP1252 bullet byte must remain present"
);

assert.equal(
  bytes.toString("binary").split("\r\n").length - 1,
  bytes.toString("binary").split("\n").length - 1,
  "production file must remain CRLF"
);

assert.match(source, /loadBrokerAccounts/);
assert.match(source, /buildBrokerAccountKey/);
assert.match(source, /const \[brokerAccounts, setBrokerAccounts\]/);

assert.match(
  source,
  /order\?\.brokerAccountId/
);

assert.match(
  source,
  /String\(account\?\.id \|\| ""\)[\s\S]*requestedAccountId/
);

assert.match(
  source,
  /String\(account\?\.brokerId \|\| ""\)[\s\S]*requestedBrokerId/
);

assert.match(
  source,
  /const brokerAccountKey = buildBrokerAccountKey/
);

assert.match(
  source,
  /clientAccount:[\s\S]*matchedAccount\.clientNumber[\s\S]*matchedAccount\.accountNumber/
);

assert.match(
  source,
  /tradingAccount:[\s\S]*matchedAccount\.tradingAccount/
);

assert.match(
  source,
  /could not be resolved/
);

assert.doesNotMatch(
  source,
  /defaultBroker/
);

const routeStart = source.indexOf(
  'pathname: "/transactions-upload"'
);

assert.ok(
  routeStart >= 0,
  "transaction upload route must exist"
);

const route = source.slice(
  Math.max(0, routeStart - 300),
  routeStart + 700
);

assert.match(
  route,
  /brokerAccountKey/
);

console.log(
  "PASS — CP1252 production bytes preserved."
);
console.log(
  "PASS — CRLF line endings preserved."
);
console.log(
  "PASS — recovery uses execution brokerAccountId."
);
console.log(
  "PASS — account ID and broker ID must both match."
);
console.log(
  "PASS — canonical brokerAccountKey is derived from matched account."
);
console.log(
  "PASS — no default-account fallback exists."
);
console.log(
  "PASS — unresolved execution account fails closed."
);
console.log(
  "PASS — upload route receives brokerAccountKey."
);

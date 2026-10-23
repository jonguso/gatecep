const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

console.log("===== PC-POSTPROD-UAT-002D2 — EVIDENCE IDENTITY + UI =====");

const root = process.cwd();

const identityPath = path.join(
  root,
  "mobile/src/features/broker-sync/brokerEvidenceIdentityService.js"
);

const centerPath = path.join(
  root,
  "mobile/app/portfolio-sync-center.js"
);

const uploadPath = path.join(
  root,
  "mobile/app/transactions-upload.js"
);

const identitySource = fs.readFileSync(identityPath, "utf8");
const centerSource = fs.readFileSync(centerPath, "latin1");
const uploadSource = fs.readFileSync(uploadPath, "latin1");

let executable = identitySource.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/\.\.\/auth\/userStorage(?:\.js)?["'];?/,
  ""
);

executable = executable.replace(/\bexport\s+/g, "");

executable += `
globalThis.__UAT002__ = {
  buildBrokerAccountKey,
  resolveEvidenceBrokerId,
  validateBrokerEvidenceIdentity,
  requireValidBrokerEvidenceIdentity
};
`;

const context = { console, globalThis: {} };
vm.createContext(context);
vm.runInContext(executable, context, { filename: identityPath });

const {
  buildBrokerAccountKey,
  resolveEvidenceBrokerId,
  requireValidBrokerEvidenceIdentity
} = context.globalThis.__UAT002__;

assert.equal(resolveEvidenceBrokerId("B12"), "AIB");
assert.equal(resolveEvidenceBrokerId("b12"), "AIB");
assert.equal(resolveEvidenceBrokerId("B14"), "ABC");

console.log("PASS — CDSC B12 maps to AIB and B14 maps to ABC.");

function validate({
  brokerId,
  clientAccount,
  memberCode,
  fileClientCode,
  expectedAccountKey
}) {
  return requireValidBrokerEvidenceIdentity({
    fileName: "broker-history.xlsx",
    userCds: "52470471",
    brokerId,
    clientAccount,
    internalIdentity: {
      brokerId: memberCode,
      clientCode: fileClientCode,
      tradingAccount: "52470471"
    },
    expectedAccountKey:
      expectedAccountKey ||
      buildBrokerAccountKey({ brokerId, clientAccount })
  });
}

assert.equal(
  validate({
    brokerId: "AIB",
    clientAccount: "137971",
    memberCode: "B12",
    fileClientCode: "137971"
  }).brokerAccountKey,
  "AIB|137971"
);

assert.equal(
  validate({
    brokerId: "ABC",
    clientAccount: "23032",
    memberCode: "B14",
    fileClientCode: "23032"
  }).brokerAccountKey,
  "ABC|23032"
);

console.log("PASS — AIB/B12/137971 and ABC/B14/23032 are accepted.");

assert.throws(
  () =>
    validate({
      brokerId: "AIB",
      clientAccount: "137971",
      memberCode: "B14",
      fileClientCode: "137971"
    }),
  /broker/i
);

assert.throws(
  () =>
    validate({
      brokerId: "ABC",
      clientAccount: "23032",
      memberCode: "B12",
      fileClientCode: "23032"
    }),
  /broker/i
);

console.log("PASS — cross-broker member codes remain rejected.");

assert.throws(
  () =>
    validate({
      brokerId: "AIB",
      clientAccount: "137971",
      memberCode: "B12",
      fileClientCode: "23032"
    }),
  /client|account/i
);

assert.throws(
  () =>
    validate({
      brokerId: "ABC",
      clientAccount: "23032",
      memberCode: "B14",
      fileClientCode: "137971"
    }),
  /client|account/i
);

console.log("PASS — cross-account client codes remain rejected.");

assert.match(
  centerSource,
  /const evidenceReady\s*=\s*valuationReady\s*&&\s*cashEvidenceReady\s*;/
);

assert.doesNotMatch(
  centerSource,
  /const evidenceReady\s*=\s*valuationReady\s*&&\s*cashEvidenceReady\s*&&\s*transactionHistoryReady/
);

assert.match(
  centerSource,
  /label="Transaction \/ Lot History"[\s\S]*?requirement="OPTIONAL"/
);

console.log("PASS — valuation + cash remain the only required evidence.");

assert.match(
  centerSource,
  /Select the broker account that owns the evidence below\./
);

assert.match(
  centerSource,
  /\{selected \? "SELECTED" : "SELECT"\}/
);

assert.match(
  centerSource,
  /onPress=\{\(\) => selectBrokerAccount\(account\)\}/
);

console.log("PASS — connected broker accounts remain selectable and visibly identified.");

const saveStart = uploadSource.indexOf(
  "async function saveTransactions()"
);

const validation = uploadSource.indexOf(
  "requireValidBrokerEvidenceIdentity({",
  saveStart
);

const saveEvidence = uploadSource.indexOf(
  "saveBrokerTransactionHistoryEvidence({",
  validation
);

const catchPosition = uploadSource.indexOf(
  'Alert.alert("Broker Evidence Rejected", message);',
  saveEvidence
);

assert.ok(saveStart >= 0);
assert.ok(validation > saveStart);
assert.ok(saveEvidence > validation);
assert.ok(catchPosition > saveEvidence);

assert.match(
  uploadSource,
  /setStatus\(`Evidence rejected: \$\{message\}`\)/
);

console.log("PASS — identity validation still occurs before evidence save.");
console.log("PASS — validation/save failures are handled instead of escaping to React.");
console.log("===== PC-POSTPROD-UAT-002D2 PASS =====");

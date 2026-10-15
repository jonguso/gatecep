const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

console.log(
  "===== PC-POSTPROD-UAT-001F3D3C-R1 — RUNTIME EVIDENCE IDENTITY ====="
);

const root = process.cwd();

const identityPath = path.join(
  root,
  "mobile/src/features/broker-sync/brokerEvidenceIdentityService.js"
);

const uploadPath = path.join(
  root,
  "mobile/app/transactions-upload.js"
);

const identitySource = fs.readFileSync(identityPath, "utf8");
const uploadSource = fs.readFileSync(uploadPath, "latin1");


// ------------------------------------------------------------
// Load only the pure identity logic.
//
// The production module imports React-Native userStorage using an
// extensionless bundler path. Direct Node ESM import cannot resolve
// that dependency, so the verifier removes that import and evaluates
// the identity functions without modifying production.
// ------------------------------------------------------------

let executableIdentitySource = identitySource.replace(
  /import\s*\{[\s\S]*?\}\s*from\s*["']\.\.\/\.\.\/auth\/userStorage(?:\.js)?["'];?/,
  ""
);

executableIdentitySource = executableIdentitySource.replace(
  /\bexport\s+/g,
  ""
);

executableIdentitySource += `
globalThis.__D3_IDENTITY_EXPORTS__ = {
  buildBrokerAccountKey,
  requireValidBrokerEvidenceIdentity
};
`;

const context = {
  console,
  globalThis: {}
};

vm.createContext(context);
vm.runInContext(
  executableIdentitySource,
  context,
  {
    filename: identityPath
  }
);

const {
  buildBrokerAccountKey,
  requireValidBrokerEvidenceIdentity
} = context.globalThis.__D3_IDENTITY_EXPORTS__;

assert.equal(
  typeof buildBrokerAccountKey,
  "function",
  "buildBrokerAccountKey must be available"
);

assert.equal(
  typeof requireValidBrokerEvidenceIdentity,
  "function",
  "requireValidBrokerEvidenceIdentity must be available"
);


// ------------------------------------------------------------
// Representative selected connected account.
// ------------------------------------------------------------

const selectedAccount = {
  brokerId: "ABC",
  clientAccount: "137971"
};

const selectedKey = buildBrokerAccountKey(selectedAccount);

assert.ok(
  selectedKey,
  "selected broker account must produce a canonical key"
);

const validEvidenceIdentity = {
  brokerId: "ABC",
  tradingAccount: "52470471",
  clientCode: "137971"
};

function validate({
  userCds = "52470471",
  fileName = "order-history-52470471.xlsx",
  internalIdentity = validEvidenceIdentity,
  expectedAccountKey = selectedKey,
  brokerId = selectedAccount.brokerId,
  clientAccount = selectedAccount.clientAccount,
  tradingAccount = null
} = {}) {
  return requireValidBrokerEvidenceIdentity({
    fileName,
    userCds,
    brokerId,
    clientAccount,
    tradingAccount,
    internalIdentity,
    expectedAccountKey
  });
}


// ------------------------------------------------------------
// 1. Matching identity accepted.
// ------------------------------------------------------------

const accepted = validate();

assert.equal(
  accepted.brokerAccountKey,
  selectedKey,
  "accepted evidence must remain bound to selected account"
);

console.log(
  "PASS — matching user CDS, broker, client account, and trading account are accepted."
);


// ------------------------------------------------------------
// 2. Wrong investor CDS rejected.
// Use a filename belonging to the wrong CDS as actual foreign evidence.
// ------------------------------------------------------------

assert.throws(
  () =>
    validate({
      fileName: "order-history-52730627.xlsx"
    }),
  /CDS|investor|user|another/i,
  "evidence belonging to another CDS account must be rejected"
);

console.log(
  "PASS — evidence belonging to another investor CDS is rejected."
);


// ------------------------------------------------------------
// 3. Wrong internal client account rejected.
// ------------------------------------------------------------

assert.throws(
  () =>
    validate({
      internalIdentity: {
        ...validEvidenceIdentity,
        clientCode: "999999"
      }
    }),
  /client|account/i,
  "mismatched internal client account must be rejected"
);

console.log(
  "PASS — wrong internal client account is rejected."
);


// ------------------------------------------------------------
// 4. Wrong internal broker rejected.
// ------------------------------------------------------------

assert.throws(
  () =>
    validate({
      internalIdentity: {
        ...validEvidenceIdentity,
        brokerId: "AIB"
      }
    }),
  /broker/i,
  "mismatched internal broker must be rejected"
);

console.log(
  "PASS — wrong internal broker is rejected."
);


// ------------------------------------------------------------
// 5. Wrong selected canonical account key rejected.
// ------------------------------------------------------------

const otherAccountKey = buildBrokerAccountKey({
  brokerId: "ABC",
  clientAccount: "999999"
});

assert.throws(
  () =>
    validate({
      expectedAccountKey: otherAccountKey
    }),
  /account|selected|broker/i,
  "evidence must not be accepted for another selected account"
);

console.log(
  "PASS — selected broker-account key mismatch is rejected."
);


// ------------------------------------------------------------
// 6. Verify production screen's fail-closed ordering.
// ------------------------------------------------------------

const cdsPos = uploadSource.indexOf(
  "const userCds = await loadVerifiedUserCds();"
);

const validatePos = uploadSource.indexOf(
  "requireValidBrokerEvidenceIdentity({",
  cdsPos
);

const partitionPos = uploadSource.indexOf(
  "partitionBrokerExecutionEvidence(transactions);",
  validatePos
);

const savePos = uploadSource.indexOf(
  "saveBrokerTransactionHistoryEvidence({",
  partitionPos
);

assert.ok(
  cdsPos >= 0,
  "transaction upload must load verified user CDS"
);

assert.ok(
  validatePos > cdsPos,
  "identity validation must occur after CDS load"
);

assert.ok(
  partitionPos > validatePos,
  "partition must occur only after identity validation"
);

assert.ok(
  savePos > partitionPos,
  "save must occur only after successful identity validation"
);

console.log(
  "PASS — identity validation occurs before partition and account-scoped save."
);


// ------------------------------------------------------------
// 7. Verify runtime identity inputs.
// ------------------------------------------------------------

assert.match(
  uploadSource,
  /internalIdentity:\s*[\r\n]+\s*evidenceInternalIdentity\s*\|\|\s*[\r\n]+\s*extractOrderHistoryIdentity\(rawEvidenceRows\)/,
  "screen must pass parsed/raw evidence identity"
);

assert.match(
  uploadSource,
  /userCds,/,
  "screen must pass verified user CDS"
);

assert.match(
  uploadSource,
  /expectedAccountKey:\s*requestedBrokerAccountKey/,
  "screen must enforce selected account key"
);

console.log(
  "PASS — validator receives verified CDS, evidence identity, and selected account key."
);


// ------------------------------------------------------------
// 8. Verify parser identity retention.
// ------------------------------------------------------------

assert.match(
  uploadSource,
  /result\.identity\s*\|\|\s*[\r\n]+\s*extractOrderHistoryIdentity\(rows\)/,
  "PDF parser identity must be retained"
);

const extractionMatches =
  uploadSource.match(
    /extractOrderHistoryIdentity\(rows\)/g
  ) || [];

assert.ok(
  extractionMatches.length >= 3,
  "PDF, CSV and spreadsheet paths must retain/extract identity"
);

console.log(
  "PASS — PDF/CSV/XLS/XLSX identity is retained or extracted."
);


// ------------------------------------------------------------
// 9. No direct global history persistence.
// ------------------------------------------------------------

assert.doesNotMatch(
  uploadSource,
  /userSetItem\(\s*["']transactionHistory["']/,
  "upload must not directly replace global verified history"
);

assert.doesNotMatch(
  uploadSource,
  /userSetItem\(\s*["']unverifiedTransactionHistory["']/,
  "upload must not directly replace global unverified history"
);

console.log(
  "PASS — upload cannot bypass account-scoped evidence storage."
);

console.log("");
console.log(
  "PC-POSTPROD-UAT-001F3D3C-R1 runtime identity behavior PASSED."
);

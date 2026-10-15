import fs from "node:fs";
import assert from "node:assert/strict";

console.log(
  "===== PC-POSTPROD-UAT-001F3C2 — MANUAL NOTE CONTAINMENT VERIFIER ====="
);

const importer = fs.readFileSync(
  new URL("../app/transaction-import.js", import.meta.url),
  "latin1"
);

const uploadCenter = fs.readFileSync(
  new URL("../app/broker-upload.js", import.meta.url),
  "latin1"
);

const brokers = fs.readFileSync(
  new URL("../app/brokers.js", import.meta.url),
  "latin1"
);

assert.ok(
  importer.includes('"manualTransactionNotes"'),
  "manual notes must have dedicated storage"
);

assert.ok(
  importer.includes('canAffectRealPortfolio: false'),
  "manual notes must explicitly be unable to affect REAL portfolio"
);

assert.ok(
  importer.includes('evidenceStatus: "UNVERIFIED_MANUAL_NOTE"'),
  "manual notes must remain explicitly unverified"
);

assert.ok(
  !importer.includes('userSetItem("transactionHistory"'),
  "legacy importer must not write verified broker history"
);

assert.ok(
  !importer.includes('userSetItem("unverifiedTransactionHistory"'),
  "legacy importer must not write broker-evidence unverified history"
);

assert.ok(
  !importer.includes('userSetItem("transactionsUploaded"'),
  "manual notes must not mark broker evidence complete"
);

assert.ok(
  !importer.includes('userSetItem(\n    "transactionUploadSummary"'),
  "manual notes must not replace broker upload summary"
);

assert.ok(
  !importer.includes("rebuildCanonicalPortfolioLedger"),
  "manual notes must not rebuild canonical REAL ledger"
);

assert.ok(
  !importer.includes("partitionBrokerExecutionEvidence"),
  "manual importer must not promote notes through broker evidence policy"
);

assert.ok(
  uploadCenter.includes('router.push("/portfolio-sync-center")'),
  "Upload Center transaction evidence must route to account-aware Sync Center"
);

assert.ok(
  brokers.includes('router.push("/portfolio-sync-center")'),
  "Brokers transaction evidence must route to account-aware Sync Center"
);

assert.ok(
  !uploadCenter.includes('router.push("/transaction-import")'),
  "Upload Center must not route broker evidence to manual importer"
);

assert.ok(
  !brokers.includes('router.push("/transaction-import")'),
  "Brokers must not route broker evidence to manual importer"
);

console.log("PASS — manual notes use isolated storage.");
console.log("PASS — manual notes cannot affect REAL portfolio.");
console.log("PASS — manual notes cannot write broker history compatibility keys.");
console.log("PASS — manual notes cannot mark transaction evidence complete.");
console.log("PASS — manual notes cannot rebuild canonical REAL ledger.");
console.log("PASS — broker upload callers use account-aware Sync Center.");
console.log("===== 001F3C2 PASS =====");

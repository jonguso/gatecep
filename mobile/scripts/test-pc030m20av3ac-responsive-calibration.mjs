import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/transaction-import.js","utf8");

for(const [rx,label] of [
  [/PC-030M20AV3AC RESPONSIVE CALIBRATION/,"marker"],
  [/width\s*:\s*"100%"/,"width"],
  [/maxWidth\s*:\s*960/,"maxWidth"],
  [/alignSelf\s*:\s*"center"/,"center"],
  [/paddingBottom\s*:\s*128/,"bottom clearance"],
]){
  assert.ok(rx.test(s),`transaction-import: ${label} missing`);
}

for(const token of [
  "requireSafeImportFile",
  "requireSafeImportRows",
  "partitionBrokerExecutionEvidence",
  "rebuildCanonicalPortfolioLedger",
  'await userSetItem("transactionHistory", JSON.stringify(verified));',
  'await userSetItem("unverifiedTransactionHistory", JSON.stringify(unverified));',
  'await userSetItem("transactionsUploaded", verified.length ? "true" : "false");',
  "Manual entries cannot become REAL execution evidence. Use a broker file containing the required evidence fields.",
  "REAL activity requires broker date, reference, broker identity, executed quantity and price, fees, and settlement evidence. Manual or incomplete rows remain UNVERIFIED.",
  'router.replace("/portfolio-sync-center")',
]){
  assert.ok(s.includes(token),`transaction-import: contract missing: ${token}`);
}

const partitionIndex=s.indexOf("partitionBrokerExecutionEvidence(transactions)");
const verifiedIndex=s.indexOf('await userSetItem("transactionHistory", JSON.stringify(verified));');
const unverifiedIndex=s.indexOf('await userSetItem("unverifiedTransactionHistory", JSON.stringify(unverified));');
const ledgerIndex=s.indexOf("await rebuildCanonicalPortfolioLedger();");

assert.ok(partitionIndex >= 0 && verifiedIndex > partitionIndex,
  "transaction-import: verified history must remain downstream of evidence partitioning");
assert.ok(unverifiedIndex > partitionIndex,
  "transaction-import: unverified history must remain downstream of evidence partitioning");
assert.ok(ledgerIndex > verifiedIndex && ledgerIndex > unverifiedIndex,
  "transaction-import: canonical ledger rebuild must remain after evidence persistence");

console.log("PASS — Transaction Import contains AV3AC responsive calibration.");
console.log("PASS — 960px centered desktop containment and 128px bottom clearance are present.");
console.log("PASS — verified/unverified broker execution evidence partition remains intact.");
console.log("PASS — manual/incomplete evidence remains UNVERIFIED.");
console.log("PASS — transactionsUploaded depends on verified evidence.");
console.log("PASS — canonical portfolio ledger rebuild order remains intact.");
console.log("PASS — Portfolio Sync Center completion handoff remains present.");
console.log("PC-030M20AV3AC contract verification complete.");

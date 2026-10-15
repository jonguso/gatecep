import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isCompletedLotExecution
} from "../src/features/trading/brokerLotHistoryEvidenceService.js";

assert.equal(
  Boolean(
    isCompletedLotExecution({
      symbol: "EQT",
      side: "BUY",
      quantity: 20,
      price: 69.5,
      date: "02-Apr-2026",
      status: "Fully Traded"
    })
  ),
  true
);

assert.equal(
  Boolean(
    isCompletedLotExecution({
      symbol: "EQT",
      side: "BUY",
      quantity: 20,
      price: 68,
      date: "01-Apr-2026",
      status: "Expired"
    })
  ),
  false
);

assert.equal(
  Boolean(
    isCompletedLotExecution({
      symbol: "KCB",
      side: "SELL",
      quantity: 100,
      price: 94.25,
      date: "31-Aug-2026",
      status: "Fully Traded"
    })
  ),
  true
);

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [center, trade, status, brokerUpload] =
  await Promise.all([
    read("app/portfolio-sync-center.js"),
    read("app/trade.js"),
    read("src/services/portfolio/syncStatus.js"),
    read("app/broker-upload.js")
  ]);


// ------------------------------------------------------------
// Protected Upload Sync contract:
//   REQUIRED — valuation
//   REQUIRED — cash / ledger
//   OPTIONAL — transaction / lot history
// ------------------------------------------------------------

assert.match(
  center,
  /Transaction \/ Lot History/
);

assert.match(
  center,
  /Complete the two required records; transaction history is optional supporting evidence/
);

assert.match(
  center,
  /const evidenceReady\s*=\s*valuationReady\s*&&\s*cashEvidenceReady\s*;/
);

assert.doesNotMatch(
  center,
  /const evidenceReady\s*=\s*valuationReady\s*&&\s*cashEvidenceReady\s*&&\s*transactionHistoryReady/
);

const continueBlock =
  center.match(
    /function continueJourney\(\)\s*\{[\s\S]*?(?=\n\s*function confirmReplacement\()/
  )?.[0] || "";

assert.match(
  continueBlock,
  /if \(!valuationReady\)/
);

assert.match(
  continueBlock,
  /if \(!cashEvidenceReady\)/
);

assert.doesNotMatch(
  continueBlock,
  /transactionHistoryReady/
);

assert.match(
  continueBlock,
  /confirmReplacement\(\)/
);


// Transaction history remains available and account-aware.

assert.match(
  center,
  /transactionHistoryReady/
);

assert.match(
  center,
  /openTransactionUpload/
);

assert.match(
  center,
  /brokerAccountKey:\s*selectedBrokerAccountKey/
);

assert.match(
  center,
  /Optional supporting evidence for this broker account/
);


// Original broker-upload contract must remain aligned.

assert.match(
  brokerUpload,
  /Required Uploads/
);

assert.match(
  brokerUpload,
  /Valuation and cash evidence/
);

assert.match(
  brokerUpload,
  /Optional Uploads/
);

assert.match(
  brokerUpload,
  /Supporting transaction evidence/
);


// Existing downstream transaction-history purposes remain intact.

assert.match(
  trade,
  /loadBrokerLotHistoryEvidence/
);

assert.match(
  status,
  /lotHistoryReady/
);


console.log(
  "PASS — Upload Sync requires portfolio valuation and cash/ledger evidence."
);

console.log(
  "PASS — transaction/lot history remains optional supporting evidence."
);

console.log(
  "PASS — optional transaction history does not block authoritative snapshot confirmation."
);

console.log(
  "PASS — transaction upload remains broker-account scoped."
);

console.log(
  "PASS — only completed executions qualify for analytical FIFO lot reconstruction."
);

console.log(
  "PASS — original Required Uploads / Optional Uploads contract remains aligned."
);

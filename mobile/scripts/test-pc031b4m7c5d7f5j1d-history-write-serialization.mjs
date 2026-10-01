import fs from "node:fs";
import assert from "node:assert/strict";

import nodePath from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir =
  nodePath.dirname(fileURLToPath(import.meta.url));

const mobileRoot =
  nodePath.resolve(scriptDir, "..");

function mobilePath(relativePath) {
  return nodePath.join(mobileRoot, relativePath);
}


const path =
  mobilePath("src/services/trade/practiceExecutionHistoryService.js");

const source =
  fs.readFileSync(
    path,
    "utf8"
  );

assert.match(
  source,
  /let\s+practiceExecutionHistoryWriteQueue\s*=\s*Promise\.resolve\s*\(\s*\)/,
  "Practice history must have a module-local write queue"
);

assert.match(
  source,
  /function\s+serializePracticeExecutionHistoryWrite\s*\(/,
  "Practice history must expose an internal serialization helper"
);

assert.match(
  source,
  /practiceExecutionHistoryWriteQueue\.then\s*\(\s*operation\s*,\s*operation\s*\)/s,
  "Next history write must run after either success or failure of the prior write"
);

assert.match(
  source,
  /practiceExecutionHistoryWriteQueue\s*=\s*run\.catch\s*\(\s*\(\s*\)\s*=>\s*undefined\s*\)/s,
  "A failed archive must not permanently poison the write queue"
);

const archiveStart =
  source.indexOf(
    "export async function archiveClosedPracticeExecution("
  );

assert.ok(
  archiveStart >= 0,
  "Archive function must remain present"
);

const archiveRegion =
  source.slice(
    archiveStart
  );

const validationIndex =
  archiveRegion.indexOf(
    "assertClosedPracticeExecution("
  );

const serializationIndex =
  archiveRegion.indexOf(
    "return serializePracticeExecutionHistoryWrite("
  );

const loadIndex =
  archiveRegion.indexOf(
    "await loadPracticeExecutionHistory()"
  );

const writeIndex =
  archiveRegion.indexOf(
    "await userSetItem("
  );

assert.ok(
  validationIndex >= 0,
  "Closed Practice validation must remain present"
);

assert.ok(
  serializationIndex > validationIndex,
  "Only validated closed Practice executions may enter the history write queue"
);

assert.ok(
  loadIndex > serializationIndex,
  "History read must occur inside the serialized operation"
);

assert.ok(
  writeIndex > loadIndex,
  "History write must follow the serialized history read"
);

assert.match(
  archiveRegion,
  /alreadyArchived:\s*true/,
  "Sequential idempotency must remain present"
);

assert.doesNotMatch(
  source,
  /\b(saveBasketExecution|clearBasketExecution|updateExecutionOrder|routeExecutionOrderByMode|markExecutionOrderFilled|settlePracticeExecutionOrder|savePracticePortfolio)\s*\(/,
  "Serialization service must not acquire OMS, routing, settlement, clear, or portfolio authority"
);

console.log(
  "PASS: Practice execution-history read/modify/write is serialized within the running app"
);

console.log(
  "PASS: failed history writes do not poison later archive attempts"
);

console.log(
  "PASS: closed/Practice validation and execution-id idempotency remain intact"
);

console.log(
  "PASS: history serialization acquires no OMS/accounting/REAL authority"
);

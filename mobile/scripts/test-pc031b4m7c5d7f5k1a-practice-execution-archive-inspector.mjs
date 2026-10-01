import fs from "node:fs";
import assert from "node:assert/strict";

const source =
  fs.readFileSync(
    "app/queue-manager.js",
    "utf8"
  );

assert.match(
  source,
  /practiceExecutionArchiveEvidence/,
  "Archive inspector state must exist"
);

assert.match(
  source,
  /async function inspectPracticeExecutionArchive\s*\(\s*\)/,
  "Archive inspector function must exist"
);

const start =
  source.indexOf(
    "async function inspectPracticeExecutionArchive()"
  );

const end =
  source.indexOf(
    "async function inspectPostSettlementIntegrity()",
    start
  );

assert.ok(
  start >= 0 &&
    end > start,
  "Archive inspector must be isolated before existing integrity inspector"
);

const region =
  source.slice(
    start,
    end
  );

assert.match(
  region,
  /AsyncStorage\.getItem\s*\(\s*"gatecep\.auth\.user"\s*\)/s,
  "Inspector must derive canonical authenticated namespace directly"
);

assert.match(
  region,
  /practiceExecutionHistory/,
  "Inspector must read durable Practice execution history"
);

assert.match(
  region,
  /activeBasketExecution/,
  "Inspector must correlate against current OMS execution"
);

assert.match(
  region,
  /AsyncStorage\.multiGet\s*\(/,
  "Inspector must use direct read-only AsyncStorage reads"
);

assert.match(
  region,
  /matchingRecords\.length\s*===\s*1/,
  "Runtime PASS must require exactly one matching archive"
);

assert.match(
  region,
  /archivedSymbolCount\s*\(\s*"SCOM"\s*\)\s*===\s*1/s,
  "Runtime PASS must require exactly one archived SCOM order"
);

assert.match(
  region,
  /archivedSymbolCount\s*\(\s*"BAMB"\s*\)\s*===\s*1/s,
  "Runtime PASS must require exactly one archived BAMB order"
);

assert.match(
  source,
  /Inspect Practice Execution Archive/,
  "Queue Manager must expose the read-only archive inspector"
);

assert.match(
  source,
  /\{practiceExecutionArchiveEvidence\s*\?\s*\(/,
  "Queue Manager must conditionally render archive evidence state"
);

assert.match(
  source,
  /<Text style=\{styles\.cardTitle\}>\s*Practice Execution Archive\s*<\/Text>/s,
  "Queue Manager must render the Practice Execution Archive evidence card"
);

assert.match(
  source,
  /Matching execution archives:/,
  "Archive evidence card must display matching archive count"
);

assert.match(
  source,
  /Archived FILLED:/,
  "Archive evidence card must display archived FILLED count"
);

assert.match(
  source,
  /Archived SCOM:/,
  "Archive evidence card must display archived SCOM count"
);

assert.match(
  source,
  /Archived BAMB:/,
  "Archive evidence card must display archived BAMB count"
);

/*
 * Ignore comments when checking executable authority.
 *
 * The inspector comment intentionally documents that it avoids
 * userGetItem(), which must not be mistaken for an invocation.
 */
const executableRegion =
  region
    .replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    )
    .replace(
      /(^|[^:])\/\/.*$/gm,
      "$1"
    );

assert.doesNotMatch(
  executableRegion,
  /\b(userGetItem|userSetItem|saveBasketExecution|clearBasketExecution|createBasketExecution|updateExecutionOrder|routeExecutionOrderByMode|markExecutionOrderFilled|settlePracticeExecutionOrder|savePracticePortfolio|archiveClosedPracticeExecution|runPracticeExecutionOrchestrator|resumePracticeExecutionOrchestrator)\s*\(/,
  "Archive inspector must have no executable migration/write/OMS/accounting/orchestrator authority"
);

console.log(
  "PASS: archive inspector uses direct authenticated AsyncStorage reads"
);

console.log(
  "PASS: current execution is correlated to exactly one durable archive"
);

console.log(
  "PASS: SCOM/BAMB and FILLED evidence are explicitly checked"
);

console.log(
  "PASS: archive inspector has no mutation or execution authority"
);

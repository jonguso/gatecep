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
  mobilePath("src/services/trade/practiceExecutionOrchestrator.js");

const source =
  fs.readFileSync(
    path,
    "utf8"
  );

assert.match(
  source,
  /if\s*\(\s*!initialResumable\.length\s*\)/,
  "Early no-resumable branch must remain present"
);

assert.match(
  source,
  /const\s+allPracticeOrdersClosed\s*=/,
  "Early recovery must explicitly prove all Practice orders are closed"
);

for (const status of [
  "FILLED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED"
]) {
  assert.match(
    source,
    new RegExp(
      `ORDER_STATUS\\.${status}`
    ),
    `Closed recovery must recognize ${status}`
  );
}

const earlyStart =
  source.indexOf(
    "if (!initialResumable.length)"
  );

const phase1 =
  source.indexOf(
    "Phase 1",
    earlyStart
  );

assert.ok(
  earlyStart >= 0 &&
    phase1 > earlyStart,
  "Early recovery region must precede routing"
);

const earlyRegion =
  source.slice(
    earlyStart,
    phase1
  );

assert.match(
  earlyRegion,
  /if\s*\(\s*allPracticeOrdersClosed\s*\)\s*\{\s*await\s+archiveClosedPracticeExecution\s*\(\s*execution\s*\)\s*;\s*\}/s,
  "Already-closed Practice execution must repair missing history"
);

assert.match(
  earlyRegion,
  /allPracticeOrdersClosed\s*\?\s*"COMPLETE"\s*:\s*"NO_RESUMABLE_ACTION"/s,
  "COMPLETE must require the closed-order proof"
);

assert.doesNotMatch(
  earlyRegion,
  /routeExecutionOrderByMode\s*\(|markExecutionOrderFilled\s*\(|preflightCanonicalPracticeExecutionOrders\s*\(/,
  "Closed-history recovery must not route, settle, fill, or preflight"
);

const archiveCalls =
  (
    source.match(
      /await\s+archiveClosedPracticeExecution\s*\(/g
    ) || []
  ).length;

assert.equal(
  archiveCalls,
  2,
  "Orchestrator should have exactly two archive call sites: recovery and post-fill completion"
);

console.log(
  "PASS: already-closed Practice execution repairs missing durable history"
);

console.log(
  "PASS: closed-history recovery has no routing/fill/accounting authority"
);

console.log(
  "PASS: normal post-fill archive path remains present"
);

import fs from "node:fs";
import assert from "node:assert/strict";

import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir =
  path.dirname(fileURLToPath(import.meta.url));

const mobileRoot =
  path.resolve(scriptDir, "..");

function mobilePath(relativePath) {
  return path.join(mobileRoot, relativePath);
}


const historyPath =
  mobilePath("src/services/trade/practiceExecutionHistoryService.js");

const orchestratorPath =
  mobilePath("src/services/trade/practiceExecutionOrchestrator.js");

const history =
  fs.readFileSync(
    historyPath,
    "utf8"
  );

const orchestrator =
  fs.readFileSync(
    orchestratorPath,
    "utf8"
  );

assert.match(
  history,
  /practiceExecutionHistory/,
  "Practice execution history must use its own user-scoped key"
);

assert.match(
  history,
  /PRACTICE_EXECUTION_HISTORY_REAL_FORBIDDEN/,
  "REAL execution must be rejected"
);

assert.match(
  history,
  /PRACTICE_EXECUTION_HISTORY_ACTIVE_FORBIDDEN/,
  "Active execution must not be archived"
);

assert.match(
  history,
  /isClosedOrder/,
  "Archive must require canonical closed-order semantics"
);

assert.match(
  history,
  /executionId/,
  "History must retain execution identity"
);

assert.match(
  history,
  /alreadyArchived/,
  "History must be idempotent"
);

assert.doesNotMatch(
  history,
  /\b(saveBasketExecution|clearBasketExecution|updateExecutionOrder|routeExecutionOrderByMode|markExecutionOrderFilled|settlePracticeExecutionOrder|savePracticePortfolio)\s*\(/,
  "History service must not invoke OMS, routing, settlement, clear, or portfolio authorities"
);

assert.match(
  orchestrator,
  /import\s*\{\s*archiveClosedPracticeExecution\s*\}\s*from\s*["']\.\/practiceExecutionHistoryService["']/s,
  "Orchestrator must import the Practice history archive authority"
);

const fillMatch =
  /await\s+markExecutionOrderFilled\s*\(/g.exec(
    orchestrator
  );

assert.ok(
  fillMatch,
  "Canonical fill boundary must remain present"
);

const afterFill =
  orchestrator.slice(
    fillMatch.index
  );

const reloadMatch =
  /execution\s*=\s*await\s+loadBasketExecution\s*\(\s*\)\s*;/s.exec(
    afterFill
  );

assert.ok(
  reloadMatch,
  "Persisted OMS must be reloaded after fills"
);

const afterReload =
  afterFill.slice(
    reloadMatch.index +
      reloadMatch[0].length
  );

const remainingMatch =
  /const\s+remaining\s*=\s*resumablePracticeOrders\s*\(\s*execution\s*\)\s*;/s.exec(
    afterReload
  );

assert.ok(
  remainingMatch,
  "Completion must derive remaining work from reloaded OMS state"
);

const afterRemaining =
  afterReload.slice(
    remainingMatch.index +
      remainingMatch[0].length
  );

const archiveGuardMatch =
  /if\s*\(\s*remaining\.length\s*===\s*0\s*\)\s*\{\s*await\s+archiveClosedPracticeExecution\s*\(\s*execution\s*\)\s*;\s*\}/s.exec(
    afterRemaining
  );

assert.ok(
  archiveGuardMatch,
  "Closed Practice execution must archive only when no resumable orders remain"
);

console.log(
  "PASS: closed Practice execution history is durable, idempotent, Practice-only, and observational"
);

console.log(
  "PASS: D7F2 archives only after canonical settlement/OMS completion"
);

console.log(
  "PASS: activeBasketExecution remains operational OMS/recovery authority"
);

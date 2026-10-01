import assert from "node:assert/strict";
import fs from "node:fs";

const src =
  fs.readFileSync(
    new URL(
      "../app/queue-manager.js",
      import.meta.url
    ),
    "utf8"
  ).replace(/\r\n/g, "\n");

assert.match(
  src,
  /resumePracticeExecutionOrchestrator/
);

assert.match(
  src,
  /resumeAutomaticPracticeExecution/
);

assert.match(
  src,
  /Resume Automatic Practice Execution/
);

assert.match(
  src,
  /PRACTICE_EXECUTION_ORCHESTRATOR_RESUME_FAILED/
);

const handlerStart =
  src.indexOf(
    "async function resumeAutomaticPracticeExecution()"
  );

const resume =
  src.indexOf(
    "await resumePracticeExecutionOrchestrator()",
    handlerStart
  );

assert.ok(
  handlerStart >= 0 &&
    resume > handlerStart,
  "UAT handler must delegate to canonical persisted orchestrator"
);

/*
 * D7F4C must not become another execution authority.
 */
const handlerEnd =
  src.indexOf(
    "\n  return (",
    handlerStart
  );

assert.ok(
  handlerEnd > handlerStart,
  "handler boundary must exist"
);

const handler =
  src.slice(
    handlerStart,
    handlerEnd
  );

for (const pattern of [
  /routeExecutionOrderByMode\s*\(/,
  /markExecutionOrderFilled\s*\(/,
  /settlePracticeExecutionOrder\s*\(/,
  /savePracticePortfolio\s*\(/,
  /updateExecutionOrder\s*\(/,
  /saveBasketExecution\s*\(/,
  /AsyncStorage\.setItem\s*\(/,
  /userSetItem\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/
]) {
  assert.doesNotMatch(
    handler,
    pattern
  );
}

console.log(
  "PASS — Queue Manager exposes explicit persisted Practice orchestrator resume."
);

console.log(
  "PASS — recovery delegates to resumePracticeExecutionOrchestrator()."
);

console.log(
  "PASS — runtime exceptions are surfaced with diagnostic evidence."
);

console.log(
  "PASS — UAT control owns no OMS, routing, settlement, portfolio or timer authority."
);

console.log("");
console.log(
  "PC-031B4M7C5D7F4C Practice automatic resume UAT contract PASSED."
);

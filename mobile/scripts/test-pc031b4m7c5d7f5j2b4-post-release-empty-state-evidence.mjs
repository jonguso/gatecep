import fs from "node:fs";
import assert from "node:assert/strict";

const source =
  fs.readFileSync(
    new URL("../app/queue-manager.js", import.meta.url),
    "utf8"
  );

const emptyStart =
  source.indexOf(
    "if (!execution || !orders.length)"
  );

const normalStart =
  source.indexOf(
    "async function resumeAutomaticPracticeExecution",
    emptyStart
  );

assert.ok(
  emptyStart >= 0 &&
  normalStart > emptyStart,
  "Queue Manager empty-state region must exist"
);

const emptyRegion =
  source.slice(
    emptyStart,
    normalStart
  );

assert.match(
  emptyRegion,
  /practiceExecutionReleaseEvidence\s*\?\s*\(/,
  "empty state must render release evidence"
);

assert.match(
  emptyRegion,
  /Practice Execution Release — UAT/,
  "empty state must identify release evidence"
);

assert.match(
  emptyRegion,
  /releasePass/,
  "empty state must expose PASS/CHECK evidence"
);

assert.match(
  emptyRegion,
  /releasedExecutionId/,
  "empty state must expose released execution ID"
);

assert.match(
  emptyRegion,
  /activeSlotReleased/,
  "empty state must expose active-slot release evidence"
);

assert.match(
  emptyRegion,
  /totalArchiveRecords/,
  "empty state must expose total archive count"
);

assert.match(
  emptyRegion,
  /matchingArchiveRecords/,
  "empty state must expose matching archive count"
);

assert.match(
  emptyRegion,
  /archivedOrderCount/,
  "empty state must expose archived order count"
);

assert.match(
  emptyRegion,
  /archivedFilledCount/,
  "empty state must expose archived FILLED count"
);

const executableEmptyRegion =
  emptyRegion
    .replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    )
    .replace(
      /\/\/.*$/gm,
      ""
    );

assert.doesNotMatch(
  executableEmptyRegion,
  /\b(clearBasketExecution|createBasketExecution|routeExecutionOrderByMode|markExecutionOrderFilled|markExecutionOrderPartial|updateExecutionOrder|settlePracticeExecutionOrder|savePracticePortfolio|resumePracticeExecutionOrchestrator)\s*\(/,
  "empty evidence view must have no OMS/accounting/release authority"
);

console.log(
  "PASS: released Practice evidence remains visible in Queue Manager empty state"
);

console.log(
  "PASS: empty evidence view exposes archive and active-slot release correlation"
);

console.log(
  "PASS: empty evidence view acquires no execution/accounting/release authority"
);

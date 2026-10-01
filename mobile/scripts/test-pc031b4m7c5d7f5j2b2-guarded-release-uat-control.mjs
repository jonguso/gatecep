import fs from "node:fs";
import assert from "node:assert/strict";

const source =
  fs.readFileSync(
    new URL("../app/queue-manager.js", import.meta.url),
    "utf8"
  );

assert.match(
  source,
  /\bclearBasketExecution\b/,
  "Queue Manager must import canonical clear authority"
);

assert.match(
  source,
  /async function releaseClosedPracticeExecutionForUAT\s*\(/,
  "guarded UAT release handler must exist"
);

const start =
  source.indexOf(
    "async function releaseClosedPracticeExecutionForUAT"
  );

const end =
  source.indexOf(
    "async function inspectPracticeExecutionArchive",
    start
  );

assert.ok(
  start >= 0 && end > start,
  "release handler region must exist"
);

const region =
  source.slice(start, end);

const clearCalls =
  [
    ...region.matchAll(
      /\bclearBasketExecution\s*\(/g
    )
  ].length;

assert.equal(
  clearCalls,
  1,
  "UAT release handler must call canonical clear exactly once"
);

assert.match(
  region,
  /currentMode\s*!==\s*"PRACTICE"/,
  "UAT release must require Practice mode"
);

assert.match(
  region,
  /allFilled/,
  "UAT release must require the preserved all-FILLED specimen"
);

assert.match(
  region,
  /window\.confirm/,
  "web UAT release must use synchronous web confirmation"
);

assert.match(
  region,
  /AsyncStorage\.multiGet/,
  "post-release evidence must use direct raw AsyncStorage reads"
);

assert.match(
  region,
  /setExecution\s*\(\s*null\s*\)/,
  "UI must clear its local execution after canonical release"
);

/*
 * Do not search comments for the literal text "load()".
 *
 * The application source intentionally documents:
 *   "Do NOT call load() here."
 *
 * What matters is executable invocation syntax.
 */
const executableRegion =
  region
    .replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    )
    .replace(
      /\/\/.*$/gm,
      ""
    );

assert.doesNotMatch(
  executableRegion,
  /(?:await\s+)?load\s*\(\s*\)\s*;/,
  "UAT handler must not execute Queue Manager load() after release"
);

assert.doesNotMatch(
  executableRegion,
  /\b(createBasketExecution|routeExecutionOrderByMode|markExecutionOrderFilled|markExecutionOrderPartial|updateExecutionOrder|settlePracticeExecutionOrder|savePracticePortfolio|resumePracticeExecutionOrchestrator)\s*\(/,
  "UAT release must acquire no executable creation/routing/fill/accounting/orchestrator authority"
);

assert.match(
  source,
  /Release Closed Practice Execution — UAT/,
  "UAT release button must be explicit"
);

assert.match(
  source,
  /\{practiceExecutionReleaseEvidence\s*\?\s*\(/,
  "post-release evidence card must render conditionally"
);

console.log(
  "PASS: UAT release delegates exactly once to canonical clearBasketExecution()"
);
console.log(
  "PASS: release is restricted to the preserved all-FILLED Practice specimen"
);
console.log(
  "PASS: post-release evidence uses direct AsyncStorage and does not auto-create"
);
console.log(
  "PASS: UAT control has no routing/fill/accounting/orchestrator authority"
);

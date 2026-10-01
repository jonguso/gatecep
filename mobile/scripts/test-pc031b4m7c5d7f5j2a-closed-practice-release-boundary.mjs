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


const source =
  fs.readFileSync(
    mobilePath("src/services/trade/basketExecutionStore.js"),
    "utf8"
  );

assert.match(
  source,
  /isClosedOrder/,
  "central store must use canonical closed-order lifecycle authority"
);

assert.match(
  source,
  /archiveClosedPracticeExecution/,
  "central store must use canonical Practice archive authority"
);

assert.match(
  source,
  /function assertExecutionClosedForRelease\s*\(/,
  "central store must define a release lifecycle guard"
);

assert.match(
  source,
  /ACTIVE_EXECUTION_RELEASE_FORBIDDEN/,
  "active execution release must fail closed"
);

assert.match(
  source,
  /NON_CLOSED_EXECUTION_RELEASE_FORBIDDEN/,
  "unknown/nonclosed execution release must fail closed"
);

assert.match(
  source,
  /async function prepareExecutionForRelease\s*\(/,
  "central store must prepare execution before release"
);

const prepareStart =
  source.indexOf(
    "async function prepareExecutionForRelease"
  );

const prepareEnd =
  source.indexOf(
    "export async function createBasketExecution",
    prepareStart
  );

assert.ok(
  prepareStart >= 0 &&
    prepareEnd > prepareStart,
  "prepareExecutionForRelease region must exist"
);

const prepareRegion =
  source.slice(
    prepareStart,
    prepareEnd
  );

assert.match(
  prepareRegion,
  /executionMode === "PRACTICE"/,
  "Practice archive dependency must be explicitly Practice-only"
);

assert.match(
  prepareRegion,
  /await archiveClosedPracticeExecution\s*\(\s*execution\s*\)/s,
  "closed Practice execution must archive before release"
);

const createStart =
  source.indexOf(
    "export async function createBasketExecution"
  );

const loadStart =
  source.indexOf(
    "export async function loadBasketExecution",
    createStart
  );

assert.ok(
  createStart >= 0 &&
    loadStart > createStart,
  "createBasketExecution region must exist"
);

const createRegion =
  source.slice(
    createStart,
    loadStart
  );

assert.match(
  createRegion,
  /ACTIVE_EXECUTION_REPLACEMENT_FORBIDDEN/,
  "existing active replacement guard must remain"
);

assert.match(
  createRegion,
  /if\s*\(\s*existing\s*&&\s*forceNew\s*\)\s*\{\s*await prepareExecutionForRelease\s*\(\s*existing\s*\)/s,
  "forceNew closed replacement must pass central release preparation"
);

const clearStart =
  source.indexOf(
    "export async function clearBasketExecution"
  );

const updateStart =
  source.indexOf(
    "export async function updateExecutionOrder",
    clearStart
  );

assert.ok(
  clearStart >= 0 &&
    updateStart > clearStart,
  "clearBasketExecution region must exist"
);

const clearRegion =
  source.slice(
    clearStart,
    updateStart
  );

const prepareCall =
  clearRegion.indexOf(
    "await prepareExecutionForRelease"
  );

const clearWrite =
  clearRegion.indexOf(
    "await userSetItem"
  );

assert.ok(
  prepareCall >= 0,
  "clear must prepare execution before release"
);

assert.ok(
  clearWrite > prepareCall,
  "activeBasketExecution may be emptied only after release preparation succeeds"
);

assert.doesNotMatch(
  prepareRegion,
  /\b(routeExecutionOrderByMode|markExecutionOrderFilled|settlePracticeExecutionOrder|savePracticePortfolio)\s*\(/,
  "release preparation must not acquire routing/fill/accounting authority"
);

console.log(
  "PASS: active/nonclosed execution release fails closed"
);
console.log(
  "PASS: CLOSED Practice archives before clear or forceNew replacement"
);
console.log(
  "PASS: CLOSED REAL has no Practice-history dependency"
);
console.log(
  "PASS: release boundary acquires no routing/fill/accounting authority"
);

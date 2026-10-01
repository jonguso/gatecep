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


const storePath =
  mobilePath("src/services/trade/basketExecutionStore.js");

const coachPath =
  mobilePath("app/coach-insights.js");

const tradePath =
  mobilePath("app/trade.js");

const observers = [
  mobilePath("app/queue-manager.js"),
  mobilePath("app/orders.js"),
  mobilePath("app/orders-review.js"),
  mobilePath("app/basket-execution.js")
];

function read(path) {
  return fs
    .readFileSync(path, "utf8")
    .replace(/\r\n/g, "\n");
}

function executableOnly(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function functionBlock(
  source,
  startMarker,
  endMarker
) {
  const start = source.indexOf(startMarker);

  assert.notEqual(
    start,
    -1,
    `missing start marker: ${startMarker}`
  );

  const end = source.indexOf(
    endMarker,
    start
  );

  assert.notEqual(
    end,
    -1,
    `missing end marker: ${endMarker}`
  );

  return source.slice(start, end);
}

const store = read(storePath);
const coach = read(coachPath);
const trade = read(tradePath);

const createBlock = functionBlock(
  store,
  "export async function createBasketExecution",
  "export async function loadBasketExecution"
);

const loadBlock = functionBlock(
  store,
  "export async function loadBasketExecution",
  "export async function saveBasketExecution"
);

const executableCreate =
  executableOnly(createBlock);

const executableLoad =
  executableOnly(loadBlock);

/*
 * I2.1
 *
 * Fresh execution creation may inspect only the active OMS
 * slot plus the current trade basket. Historical execution
 * archives and canonical trade history are not creation input.
 */
assert.match(
  executableCreate,
  /\bloadBasketExecution\s*\(/
);

assert.match(
  executableCreate,
  /\bloadTradeBasket\s*\(/
);

assert.doesNotMatch(
  executableCreate,
  /\bpracticeExecutionHistory\b/
);

assert.doesNotMatch(
  executableCreate,
  /\bpracticeSimulatedTrades\b/
);

assert.doesNotMatch(
  executableCreate,
  /\bpracticeSettlements\b/
);

console.log(
  "PASS — fresh execution creation does not read Practice history as OMS input."
);

/*
 * I2.2
 *
 * An empty active slot remains empty on load.
 * Loading must never create or recover an execution from
 * historical records.
 */
assert.match(
  executableLoad,
  /if\s*\(\s*!raw\s*\)\s*return\s+null\s*;/
);

assert.doesNotMatch(
  executableLoad,
  /\bcreateBasketExecution\s*\(/
);

assert.doesNotMatch(
  executableLoad,
  /\bloadTradeBasket\s*\(/
);

assert.doesNotMatch(
  executableLoad,
  /practiceExecutionHistory|practiceSimulatedTrades|practiceSettlements/
);

console.log(
  "PASS — empty active OMS load cannot reconstruct an execution from history."
);

/*
 * I2.3
 *
 * New OMS identity must be generated at creation time.
 * It must not derive execution/order IDs from a prior
 * execution or archive record.
 */
assert.match(
  executableCreate,
  /id:\s*`EXEC-\$\{Date\.now\(\)\}`/
);

assert.match(
  executableCreate,
  /id:\s*`EO-\$\{Date\.now\(\)\}-\$\{index\}`/
);

assert.doesNotMatch(
  executableCreate,
  /existing\?\.id\s*[,:]/
);

/*
 * Reading existing.orders is required for the authoritative
 * active-execution replacement guard. What must not happen is
 * reuse of those prior orders as the newly-created order set.
 */
assert.match(
  executableCreate,
  /existing\?\.orders\?\.some\(/
);

assert.doesNotMatch(
  executableCreate,
  /(?:const|let|var)\s+orders\s*=\s*existing\?\.orders/
);

assert.doesNotMatch(
  executableCreate,
  /orders:\s*existing\?\.orders/
);

assert.match(
  executableCreate,
  /const\s+orders\s*=\s*basket\.items\.map\(/
);

console.log(
  "PASS — existing orders are inspected only for replacement protection; new orders come from the current basket."
);

/*
 * I2.4
 *
 * Active execution replacement remains forbidden even when
 * forceNew is requested.
 */
assert.match(
  executableCreate,
  /ACTIVE_EXECUTION_REPLACEMENT_FORBIDDEN/
);

assert.match(
  executableCreate,
  /if\s*\(\s*hasActiveExecution\s*\)/
);

assert.match(
  executableCreate,
  /if\s*\(\s*forceNew\s*\)/
);

console.log(
  "PASS — forceNew cannot replace recoverable active OMS state."
);

/*
 * I2.5
 *
 * A CLOSED execution may be replaced only through the
 * canonical release preparation boundary.
 */
assert.match(
  executableCreate,
  /if\s*\(\s*existing\s*&&\s*forceNew\s*\)\s*\{[\s\S]*?await\s+prepareExecutionForRelease\s*\(\s*existing\s*\)/m
);

console.log(
  "PASS — CLOSED replacement remains guarded by canonical release preparation."
);

/*
 * I2.6
 *
 * Fresh execution creation persists only the new active OMS
 * execution. It must not write Practice archive/trade-history
 * collections.
 */
assert.match(
  executableCreate,
  /userSetItem\s*\(\s*ACTIVE_BASKET_EXECUTION_KEY\s*,\s*JSON\.stringify\s*\(\s*execution\s*\)/
);

assert.doesNotMatch(
  executableCreate,
  /userSetItem\s*\(\s*["'`](practiceExecutionHistory|practiceSimulatedTrades|practiceSettlements)["'`]/
);

console.log(
  "PASS — creation writes the active OMS slot without rewriting Practice history."
);

/*
 * I2.7
 *
 * Only the intended investor action owners may call
 * createBasketExecution. Observer screens remain load-only.
 */
assert.match(
  executableOnly(coach),
  /\bcreateBasketExecution\s*\(/
);

assert.match(
  executableOnly(trade),
  /\bcreateBasketExecution\s*\(/
);

for (const path of observers) {
  const source =
    executableOnly(read(path));

  assert.doesNotMatch(
    source,
    /\bcreateBasketExecution\s*\(/,
    `${path} acquired execution creation authority`
  );
}

console.log(
  "PASS — creation authority remains with investor action flows, not OMS observers."
);

/*
 * I2.8
 *
 * Current callers request a fresh execution explicitly.
 * Store-level protection remains authoritative.
 */
assert.match(
  executableOnly(coach),
  /createBasketExecution\s*\(\s*\{\s*forceNew:\s*true\s*\}\s*\)/
);

assert.match(
  executableOnly(trade),
  /createBasketExecution\s*\(\s*\{\s*forceNew:\s*true\s*\}\s*\)/
);

console.log(
  "PASS — current creation owners explicitly request fresh execution identity."
);

console.log();
console.log(
  "PC-031B4M7C5D7F5J2D7I2 fresh execution generation contract PASSED."
);

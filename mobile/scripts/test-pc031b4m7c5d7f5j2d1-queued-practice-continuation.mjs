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
    mobilePath("app/orders-review.js"),
    "utf8"
  );

function executableSource(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

assert.match(
  source,
  /async function continueQueuedPracticeExecution\s*\(\s*\)/,
  "queued Practice continuation handler must exist"
);

assert.match(
  source,
  /onPress=\{continueQueuedPracticeExecution\}/,
  "queued Practice CTA must delegate to continuation handler"
);

assert.doesNotMatch(
  source,
  /Continue to Practice Execution[\s\S]{0,220}router\.push\(\s*["']\/queue-manager["']\s*\)/,
  "queued Practice CTA must not be navigation-only"
);

const start =
  source.indexOf(
    "async function continueQueuedPracticeExecution()"
  );

const end =
  source.indexOf(
    "async function prepareHandoff()",
    start
  );

assert.ok(
  start >= 0 && end > start,
  "queued continuation handler region must exist"
);

const handler =
  executableSource(
    source.slice(start, end)
  );

assert.match(
  handler,
  /\brunPracticeExecutionOrchestrator\s*\(\s*\)/,
  "queued continuation must delegate to D7F2 orchestrator"
);

assert.match(
  handler,
  /router\.push\(\s*["']\/basket-execution["']\s*\)/,
  "successful queued continuation must open Basket Execution"
);

assert.doesNotMatch(
  handler,
  /\bqueueExecutionOrders\s*\(/,
  "queued continuation must not queue the execution again"
);

assert.doesNotMatch(
  handler,
  /\bqueueSingleOrder\s*\(/,
  "queued continuation must not queue individual orders again"
);

assert.doesNotMatch(
  handler,
  /\brouteExecutionOrderByMode\s*\(/,
  "queued continuation must not own routing"
);

assert.doesNotMatch(
  handler,
  /\bmarkExecutionOrderFilled\s*\(/,
  "queued continuation must not own settlement/fill"
);

assert.doesNotMatch(
  handler,
  /\bpreflightCanonicalPracticeExecutionOrders\s*\(/,
  "queued continuation must not duplicate D7F2 pre-settlement preflight"
);

assert.doesNotMatch(
  handler,
  /\buserSetItem\s*\(|AsyncStorage\.(?:setItem|multiSet|removeItem)\s*\(/,
  "queued continuation must not own storage mutation"
);

assert.match(
  handler,
  /if\s*\(\s*isRealExecution\s*\|\|\s*queuedOrders\.length\s*===\s*0\s*\)/,
  "queued continuation must fail closed outside queued Practice execution"
);

console.log(
  "PASS: queued Practice CTA delegates to persisted D7F2 orchestrator"
);

console.log(
  "PASS: already-QUEUED orders are not queued a second time"
);

console.log(
  "PASS: routing, settlement and funding authority remain in canonical services"
);

console.log(
  "PASS: successful continuation opens Basket Execution instead of Queue Manager"
);

console.log(
  "PASS: REAL execution is excluded from Practice queued continuation"
);

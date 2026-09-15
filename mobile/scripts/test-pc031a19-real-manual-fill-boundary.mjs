import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const store = await readFile(
  new URL(
    "../src/services/trade/basketExecutionStore.js",
    import.meta.url
  ),
  "utf8"
);

const orders = await readFile(
  new URL(
    "../app/orders.js",
    import.meta.url
  ),
  "utf8"
);

const queue = await readFile(
  new URL(
    "../app/queue-manager.js",
    import.meta.url
  ),
  "utf8"
);

const recovery = await readFile(
  new URL(
    "../src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js",
    import.meta.url
  ),
  "utf8"
);

const transition = await readFile(
  new URL(
    "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js",
    import.meta.url
  ),
  "utf8"
);

function functionBody(source, functionName, nextFunctionName) {
  const start = source.indexOf(
    `export async function ${functionName}`
  );

  assert.ok(
    start >= 0,
    `${functionName} must exist`
  );

  const end = nextFunctionName
    ? source.indexOf(
        `export async function ${nextFunctionName}`,
        start + 1
      )
    : -1;

  return end > start
    ? source.slice(start, end)
    : source.slice(start);
}

// --------------------------------------------------
// 1. Full manual fill retains REAL service guard.
// --------------------------------------------------
{
  const body = functionBody(
    store,
    "markExecutionOrderFilled",
    null
  );

  assert.match(
    body,
    /executionMode === "REAL"/
  );

  assert.match(
    body,
    /REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION/
  );

  assert.match(
    body,
    /status:\s*ORDER_STATUS\.FILLED/
  );

  assert.match(
    body,
    /executionMode:\s*"PRACTICE"/
  );

  console.log(
    "PASS: full manual fill remains service-guarded and Practice-only."
  );
}

// --------------------------------------------------
// 2. Partial manual fill now has equivalent REAL
// service guard.
// --------------------------------------------------
{
  const body = functionBody(
    store,
    "markExecutionOrderPartial",
    "markExecutionOrderFilled"
  );

  assert.match(
    body,
    /executionMode === "REAL"/
  );

  assert.match(
    body,
    /REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION/
  );

  assert.match(
    body,
    /status:\s*ORDER_STATUS\.PARTIAL_FILL/
  );

  assert.match(
    body,
    /executionMode:\s*"PRACTICE"/
  );

  assert.match(
    body,
    /isPractice:\s*true/
  );

  console.log(
    "PASS: partial manual fill is now service-guarded and Practice-only."
  );
}

// --------------------------------------------------
// 3. Queue Manager must use guarded partial service,
// not directly write PARTIAL_FILL.
// --------------------------------------------------
{
  assert.match(
    queue,
    /markExecutionOrderPartial/
  );

  assert.match(
    queue,
    /await markExecutionOrderPartial\(order\.id/
  );

  assert.doesNotMatch(
    queue,
    /updateExecutionOrder\(order\.id,\s*\{\s*status:\s*ORDER_STATUS\.PARTIAL_FILL/
  );

  console.log(
    "PASS: Queue Manager cannot directly manufacture PARTIAL_FILL through generic update."
  );
}

// --------------------------------------------------
// 4. Queue bulk fill remains Practice-only.
// --------------------------------------------------
{
  assert.match(
    queue,
    /ORDER_STATUS\.BROKER_RECEIVED,\s*ORDER_STATUS\.PARTIAL_FILL/
  );

  assert(
    (
      /\.toUpperCase\(\)\s*===\s*"PRACTICE"/.test(queue) ||
      (
        queue.includes(
          "buildExecutionStatusReadModel"
        ) &&
        queue.includes(
          "!statusView.isReal"
        )
      )
    ),
    "Queue Manager bulk full-fill selection remains Practice-only."
  );

  assert.match(
    queue,
    /markExecutionOrderFilled/
  );

  console.log(
    "PASS: Queue Manager bulk full-fill selection remains Practice-only."
  );
}

// --------------------------------------------------
// 5. Orders screen still blocks REAL manual fills
// before the Practice simulation path.
// --------------------------------------------------
{
  const realGuard = Math.max(
    orders.indexOf(
      'if (executionMode === "REAL")'
    ),
    orders.indexOf(
      "if (statusView.isReal)"
    )
  );

  const manualFill =
    orders.indexOf(
      "await markExecutionOrderFilled"
    );

  assert.ok(realGuard >= 0);
  assert.ok(manualFill > realGuard);

  assert.match(
    orders,
    /REAL orders cannot be manually filled/
  );

  assert.match(
    orders,
    /source:\s*"GATECEP_BROKER_PRACTICE"/
  );

  console.log(
    "PASS: Orders UI continues to block REAL manual fills and labels Practice simulation."
  );
}

// --------------------------------------------------
// 6. REAL broker receipt simulation remains guarded
// in the service.
// --------------------------------------------------
{
  const start =
    store.indexOf(
      "export async function markBrokerReceived"
    );

  const end =
    store.indexOf(
      "export async function markExecutionOrderPartial",
      start
    );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const body =
    store.slice(start, end);

  assert.match(
    body,
    /REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION/
  );

  assert.match(
    body,
    /executionMode:\s*"PRACTICE"/
  );

  console.log(
    "PASS: simulated broker receipt remains unavailable to REAL orders."
  );
}

// --------------------------------------------------
// 7. Verified REAL recovery must not call either
// manual fill function.
// --------------------------------------------------
{
  assert.doesNotMatch(
    recovery,
    /markExecutionOrderFilled|markExecutionOrderPartial/
  );

  assert.doesNotMatch(
    transition,
    /markExecutionOrderFilled|markExecutionOrderPartial/
  );

  assert.match(
    transition,
    /verifiedExecutionEvidence/
  );

  console.log(
    "PASS: verified REAL recovery remains independent from manual fill services."
  );
}

// --------------------------------------------------
// 8. REAL recovery remains evidence-derived and may
// converge to PARTIAL_FILL or FILLED only from
// verified broker execution evidence.
// --------------------------------------------------
{
  assert.match(
    transition,
    /ORDER_STATUS\.PARTIAL_FILL/
  );

  assert.match(
    transition,
    /ORDER_STATUS\.FILLED/
  );

  assert.match(
    transition,
    /status:\s*transitionStatus/
  );

  assert.match(
    transition,
    /verifiedExecutionEvidence/
  );

  assert.match(
    transition,
    /brokerOrderId/
  );

  assert.match(
    transition,
    /filledQuantity/
  );

  assert.match(
    transition,
    /averageFillPrice/
  );

  console.log(
    "PASS: REAL FILLED recovery remains evidence-derived rather than manually simulated."
  );
}

console.log("");
console.log(
  "PC-031A19 REAL manual fill boundary tests PASSED."
);

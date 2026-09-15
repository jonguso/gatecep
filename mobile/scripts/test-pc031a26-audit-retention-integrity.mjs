import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map()
};

const context = vm.createContext({
  console,
  Date,
  Error,
  JSON,
  Array,
  Number,
  String,
  Boolean,
  Object,
  Promise,
  Set,
  Map,
  Math
});

context.__state = state;

function moduleFrom(code, identifier) {
  return new vm.SourceTextModule(code, {
    context,
    identifier
  });
}

const storePath = new URL(
  "../src/services/trade/executionAuditStore.js",
  import.meta.url
);

const store = moduleFrom(
  await readFile(storePath, "utf8"),
  storePath.href
);

const storage = moduleFrom(
  `
  export async function userGetItem(key) {
    return globalThis.__state.storage.get(key) || null;
  }

  export async function userSetItem(key, value) {
    globalThis.__state.storage.set(key, value);
  }
  `,
  "mock:user-storage"
);

await storage.link(() => {
  throw new Error(
    "storage has no imports"
  );
});

await store.link(async (specifier) => {
  if (
    specifier ===
    "../auth/userStorage"
  ) {
    return storage;
  }

  throw new Error(
    `Unexpected audit-store dependency: ${specifier}`
  );
});

await storage.evaluate();
await store.evaluate();

const {
  addExecutionAuditEvent,
  loadExecutionAuditTrail,
  clearExecutionAuditTrail,
  filterAuditTrail
} = store.namespace;

const KEY =
  "executionAuditTrail";

async function addRealLifecycle({
  executionId = "EXEC-A26-REAL-1",
  orderId = "EO-A26-REAL-1",
  symbol = "SCOM",
  brokerId = "ABC",
  brokerAccountId = "ACC-ABC-1",
  attemptId = "ATTEMPT-A26-1",
  brokerReference = "ABC-A26-1"
} = {}) {
  const base = {
    executionId,
    orderId,
    executionMode: "REAL",
    symbol,
    brokerId,
    brokerAccountId,
    brokerName: "ABC Broker",
    submissionAttemptId: attemptId,
    submissionAttemptCount: 1
  };

  await addExecutionAuditEvent({
    ...base,
    eventType:
      "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

  await addExecutionAuditEvent({
    ...base,
    eventType:
      "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED",
    brokerStatus: "SUBMITTING"
  });

  await addExecutionAuditEvent({
    ...base,
    eventType:
      "REAL_SUBMISSION_UNCERTAIN",
    status: "BROKER_SELECTED",
    brokerStatus:
      "SUBMISSION_UNCERTAIN"
  });

  await addExecutionAuditEvent({
    ...base,
    eventType:
      "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE",
    status: "FILLED",
    brokerStatus: "FILLED",
    brokerOrderId: brokerReference,
    brokerReference,
    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION"
  });
}

function lifecycleTypes(events) {
  return [...events]
    .reverse()
    .map((event) => event.eventType);
}


// =========================================================
// Scenario 1:
// Unrelated Practice pressure cannot evict REAL lifecycle.
// =========================================================

state.storage.clear();

await addRealLifecycle();

for (let i = 0; i < 1000; i += 1) {
  await addExecutionAuditEvent({
    executionId:
      `EXEC-A26-PRACTICE-${i}`,
    orderId:
      `EO-A26-PRACTICE-${i}`,
    executionMode: "PRACTICE",
    symbol: "TEST",
    eventType: "INFO",
    status: "FILLED"
  });
}

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    1000
  );

  const realEvents =
    filterAuditTrail(events, {
      orderId: "EO-A26-REAL-1"
    });

  assert.equal(
    realEvents.length,
    4
  );

  assert.deepEqual(
    Array.from(
      lifecycleTypes(realEvents)
    ),
    [
      "REAL_ORDER_QUEUED",
      "REAL_SUBMISSION_STARTED",
      "REAL_SUBMISSION_UNCERTAIN",
      "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE"
    ]
  );

  console.log(
    "PASS: unrelated Practice pressure cannot evict or truncate the retained REAL lifecycle."
  );
}


// =========================================================
// Scenario 2:
// Boundary pressure still retains complete REAL lifecycle.
// =========================================================

state.storage.clear();

await addRealLifecycle();

for (let i = 0; i < 997; i += 1) {
  await addExecutionAuditEvent({
    executionId:
      `EXEC-A26-BOUNDARY-${i}`,
    orderId:
      `EO-A26-BOUNDARY-${i}`,
    executionMode: "PRACTICE",
    symbol: "TEST",
    eventType: "INFO",
    status: "FILLED"
  });
}

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    1000
  );

  const realEvents =
    filterAuditTrail(events, {
      orderId: "EO-A26-REAL-1"
    });

  assert.equal(
    realEvents.length,
    4
  );

  console.log(
    "PASS: retention boundary no longer preserves an arbitrary suffix of a REAL lifecycle."
  );
}


// =========================================================
// Scenario 3:
// REAL pressure evicts lifecycle groups atomically.
// Build 251 x 4-event REAL lifecycles = 1004 events.
// Only 250 complete four-event lifecycle groups may remain.
// =========================================================

state.storage.clear();

for (let i = 0; i < 251; i += 1) {
  await addRealLifecycle({
    executionId:
      `EXEC-A26-REAL-${i}`,
    orderId:
      `EO-A26-REAL-${i}`,
    symbol: "SCOM",
    attemptId:
      `ATTEMPT-A26-${i}`,
    brokerReference:
      `ABC-A26-${i}`
  });
}

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    1000
  );

  const oldest =
    filterAuditTrail(events, {
      orderId: "EO-A26-REAL-0"
    });

  const newest =
    filterAuditTrail(events, {
      orderId: "EO-A26-REAL-250"
    });

  assert.equal(
    oldest.length,
    0
  );

  assert.equal(
    newest.length,
    4
  );

  const orderCounts =
    new Map();

  for (const event of events) {
    const orderId =
      String(event.orderId || "");

    orderCounts.set(
      orderId,
      (orderCounts.get(orderId) || 0) + 1
    );
  }

  for (const count of orderCounts.values()) {
    assert.equal(
      count,
      4
    );
  }

  assert.equal(
    orderCounts.size,
    250
  );

  console.log(
    "PASS: REAL retention pressure evicts the oldest lifecycle atomically rather than truncating it."
  );
}


// =========================================================
// Scenario 4:
// Newest-first global chronology remains intact.
// =========================================================

{
  const events =
    await loadExecutionAuditTrail();

  for (
    let i = 1;
    i < events.length;
    i += 1
  ) {
    const previous =
      new Date(
        events[i - 1].createdAt
      ).getTime();

    const current =
      new Date(
        events[i].createdAt
      ).getTime();

    assert.ok(
      previous >= current
    );
  }

  console.log(
    "PASS: lifecycle-aware retention preserves newest-first audit chronology."
  );
}


// =========================================================
// Scenario 5:
// Malformed and non-array storage remain fail-closed.
// =========================================================

state.storage.set(
  KEY,
  "{not-valid-json"
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    0
  );
}

state.storage.set(
  KEY,
  JSON.stringify({
    unexpected: true
  })
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    0
  );

  console.log(
    "PASS: malformed/non-array audit storage continues to fail closed."
  );
}


// =========================================================
// Scenario 6:
// Explicit clear remains destructive by user request.
// =========================================================

state.storage.clear();

await addRealLifecycle();

await clearExecutionAuditTrail();

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    state.storage.get(KEY),
    ""
  );

  assert.equal(
    events.length,
    0
  );

  console.log(
    "PASS: explicit audit clear remains intentionally destructive."
  );
}


// =========================================================
// Scenario 7:
// Filtering remains valid with retained lifecycle groups.
// =========================================================

state.storage.clear();

await addRealLifecycle();

await addExecutionAuditEvent({
  executionId: "EXEC-OTHER",
  orderId: "EO-OTHER",
  executionMode: "PRACTICE",
  symbol: "KCB",
  eventType: "INFO",
  status: "FILLED"
});

{
  const events =
    await loadExecutionAuditTrail();

  const byOrder =
    filterAuditTrail(events, {
      orderId: "EO-A26-REAL-1"
    });

  const byExecution =
    filterAuditTrail(events, {
      executionId:
        "EXEC-A26-REAL-1"
    });

  assert.equal(
    byOrder.length,
    4
  );

  assert.equal(
    byExecution.length,
    4
  );

  console.log(
    "PASS: order/execution filtering still reconstructs the retained REAL lifecycle."
  );
}

console.log();
console.log(
  "PC-031A26 audit retention integrity tests PASSED."
);

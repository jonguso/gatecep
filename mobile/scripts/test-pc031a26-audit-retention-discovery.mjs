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
  throw new Error("storage has no imports");
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

async function addRealLifecycle() {
  const base = {
    executionId: "EXEC-A26-REAL-1",
    orderId: "EO-A26-REAL-1",
    executionMode: "REAL",
    symbol: "SCOM",
    brokerId: "ABC",
    brokerAccountId: "ACC-ABC-1",
    brokerName: "ABC Broker",
    submissionAttemptId: "ATTEMPT-A26-1",
    submissionAttemptCount: 1
  };

  await addExecutionAuditEvent({
    ...base,
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

  await addExecutionAuditEvent({
    ...base,
    eventType: "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED",
    brokerStatus: "SUBMITTING"
  });

  await addExecutionAuditEvent({
    ...base,
    eventType: "REAL_SUBMISSION_UNCERTAIN",
    status: "BROKER_SELECTED",
    brokerStatus: "SUBMISSION_UNCERTAIN"
  });

  await addExecutionAuditEvent({
    ...base,
    eventType:
      "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE",
    status: "FILLED",
    brokerStatus: "FILLED",
    brokerOrderId: "ABC-A26-1",
    brokerReference: "ABC-A26-1",
    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION"
  });
}


// =========================================================
// Scenario 1:
// Normal REAL lifecycle is reconstructable before pressure.
// =========================================================

state.storage.clear();

await addRealLifecycle();

{
  const events =
    await loadExecutionAuditTrail();

  const realEvents =
    filterAuditTrail(events, {
      orderId: "EO-A26-REAL-1"
    });

  assert.equal(
    realEvents.length,
    4
  );

  assert.deepEqual(
    [...realEvents]
      .reverse()
      .map((event) => event.eventType),
    [
      "REAL_ORDER_QUEUED",
      "REAL_SUBMISSION_STARTED",
      "REAL_SUBMISSION_UNCERTAIN",
      "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE"
    ]
  );

  console.log(
    "PASS: complete REAL lifecycle is reconstructable before retention pressure."
  );
}


// =========================================================
// Scenario 2:
// Fill the global retention window with unrelated Practice
// events and observe what happens to the older REAL order.
// =========================================================

for (let i = 0; i < 1000; i += 1) {
  await addExecutionAuditEvent({
    executionId:
      `EXEC-A26-PRACTICE-${i}`,
    orderId:
      `EO-A26-PRACTICE-${i}`,
    executionMode: "PRACTICE",
    symbol: "TEST",
    eventType: "INFO",
    status: "FILLED",
    message:
      `Practice retention pressure ${i}`
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

  console.log(
    `INFO: REAL lifecycle events remaining after pressure = ${realEvents.length}`
  );

  assert.equal(
    realEvents.length,
    0
  );

  console.log(
    "CONFIRMED GAP: global 1000-event retention can fully evict an older REAL execution lifecycle."
  );
}


// =========================================================
// Scenario 3:
// Partial lifecycle truncation is possible.
// =========================================================

state.storage.clear();

await addRealLifecycle();

for (let i = 0; i < 997; i += 1) {
  await addExecutionAuditEvent({
    executionId:
      `EXEC-A26-MIXED-${i}`,
    orderId:
      `EO-A26-MIXED-${i}`,
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

  console.log(
    `INFO: partial REAL lifecycle events remaining = ${realEvents.length}`
  );

  assert.ok(
    realEvents.length > 0 &&
    realEvents.length < 4
  );

  console.log(
    "CONFIRMED GAP: retention can preserve only part of one REAL order lifecycle."
  );
}


// =========================================================
// Scenario 4:
// Malformed JSON fails closed to empty audit.
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

  console.log(
    "PASS: malformed audit storage fails closed to an empty trail."
  );
}


// =========================================================
// Scenario 5:
// Non-array JSON also fails closed.
// =========================================================

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
    "PASS: non-array audit storage fails closed."
  );
}


// =========================================================
// Scenario 6:
// Clear is intentionally destructive.
// =========================================================

state.storage.clear();

await addRealLifecycle();

await clearExecutionAuditTrail();

{
  const raw =
    state.storage.get(KEY);

  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    raw,
    ""
  );

  assert.equal(
    events.length,
    0
  );

  console.log(
    "PASS: clearExecutionAuditTrail intentionally removes the complete local audit history."
  );
}


// =========================================================
// Scenario 7:
// orderId / executionId filtering works correctly.
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
      executionId: "EXEC-A26-REAL-1"
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
    "PASS: orderId and executionId filters isolate a complete lifecycle while retained."
  );
}


console.log();
console.log(
  "PC-031A26 retention discovery completed."
);

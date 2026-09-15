import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const KEY = "executionAuditTrail";

const state = {
  storage: new Map(),
  readDelayMs: 5,
  writeDelayMs: 5,
  writeLog: [],
  failNextWrite: false
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
  Math,
  setTimeout
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
  function delay(ms) {
    return new Promise((resolve) =>
      setTimeout(resolve, ms)
    );
  }

  export async function userGetItem(key) {
    await delay(
      globalThis.__state.readDelayMs
    );

    return (
      globalThis.__state.storage.get(key) ||
      null
    );
  }

  export async function userSetItem(key, value) {
    await delay(
      globalThis.__state.writeDelayMs
    );

    globalThis.__state.writeLog.push({
      key,
      value
    });

    if (
      globalThis.__state.failNextWrite
    ) {
      globalThis.__state.failNextWrite =
        false;

      throw new Error(
        "TEST_A28_AUDIT_WRITE_FAILURE"
      );
    }

    globalThis.__state.storage.set(
      key,
      value
    );
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
  clearExecutionAuditTrail
} = store.namespace;

function ids(events = []) {
  return new Set(
    Array.from(events).map(
      (event) => event.orderId
    )
  );
}


// =========================================================
// 1. ADD before CLEAR -> final trail empty
// =========================================================

state.storage.clear();
state.writeLog.length = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A28",
  orderId: "EO-A28-OLD",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

const addBeforeClear =
  addExecutionAuditEvent({
    executionId: "EXEC-A28",
    orderId: "EO-A28-PRE-CLEAR",
    executionMode: "REAL",
    symbol: "KCB",
    eventType: "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED"
  });

const clearAfterAdd =
  clearExecutionAuditTrail();

await Promise.all([
  addBeforeClear,
  clearAfterAdd
]);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(events.length, 0);
  assert.equal(state.storage.get(KEY), "");

  console.log(
    "PASS: ADD-before-CLEAR finishes with an empty audit trail."
  );
}


// =========================================================
// 2. CLEAR before ADD -> only post-clear event survives
// =========================================================

state.storage.clear();
state.writeLog.length = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A28",
  orderId: "EO-A28-OLD",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

const clearBeforeAdd =
  clearExecutionAuditTrail();

const addAfterClear =
  addExecutionAuditEvent({
    executionId: "EXEC-A28",
    orderId: "EO-A28-POST-CLEAR",
    executionMode: "REAL",
    symbol: "EQTY",
    eventType: "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED"
  });

await Promise.all([
  clearBeforeAdd,
  addAfterClear
]);

{
  const events =
    await loadExecutionAuditTrail();

  const orderIds =
    ids(events);

  assert.equal(events.length, 1);
  assert.equal(
    orderIds.has("EO-A28-OLD"),
    false
  );
  assert.equal(
    orderIds.has("EO-A28-POST-CLEAR"),
    true
  );

  console.log(
    "PASS: CLEAR-before-ADD retains only the post-clear audit event."
  );
}


// =========================================================
// 3. Multiple ADDs then CLEAR -> final empty
// =========================================================

state.storage.clear();
state.writeLog.length = 0;

const writes = [
  addExecutionAuditEvent({
    executionId: "EXEC-A28-BURST",
    orderId: "EO-A28-BURST-1",
    executionMode: "REAL",
    symbol: "SCOM",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  }),

  addExecutionAuditEvent({
    executionId: "EXEC-A28-BURST",
    orderId: "EO-A28-BURST-2",
    executionMode: "REAL",
    symbol: "KCB",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  }),

  addExecutionAuditEvent({
    executionId: "EXEC-A28-BURST",
    orderId: "EO-A28-BURST-3",
    executionMode: "REAL",
    symbol: "EQTY",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  })
];

const clearAfterBurst =
  clearExecutionAuditTrail();

await Promise.all([
  ...writes,
  clearAfterBurst
]);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(events.length, 0);

  console.log(
    "PASS: queued ADD burst followed by CLEAR leaves no stale history."
  );
}


// =========================================================
// 4. CLEAR then concurrent ADD burst
// =========================================================

state.storage.clear();
state.writeLog.length = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A28",
  orderId: "EO-A28-OLD",
  executionMode: "REAL",
  symbol: "OLD",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

const clearFirst =
  clearExecutionAuditTrail();

const postClearWrites =
  Array.from(
    { length: 10 },
    (_, index) =>
      addExecutionAuditEvent({
        executionId: "EXEC-A28-POST-CLEAR",
        orderId: `EO-A28-POST-${index}`,
        executionMode: "REAL",
        symbol: "SCOM",
        eventType: "REAL_ORDER_QUEUED",
        status: "QUEUED"
      })
  );

await Promise.all([
  clearFirst,
  ...postClearWrites
]);

{
  const events =
    await loadExecutionAuditTrail();

  const orderIds =
    ids(events);

  assert.equal(events.length, 10);
  assert.equal(
    orderIds.has("EO-A28-OLD"),
    false
  );

  for (
    let index = 0;
    index < 10;
    index += 1
  ) {
    assert.equal(
      orderIds.has(
        `EO-A28-POST-${index}`
      ),
      true
    );
  }

  console.log(
    "PASS: CLEAR followed by concurrent ADDs preserves every post-clear event."
  );
}


// =========================================================
// 5. Failed CLEAR must not poison later writes
// =========================================================

state.storage.clear();
state.writeLog.length = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A28",
  orderId: "EO-A28-BEFORE-FAILED-CLEAR",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

state.failNextWrite = true;

let clearFailed = false;

try {
  await clearExecutionAuditTrail();
} catch (error) {
  clearFailed =
    error?.message ===
    "TEST_A28_AUDIT_WRITE_FAILURE";
}

assert.equal(clearFailed, true);

await addExecutionAuditEvent({
  executionId: "EXEC-A28",
  orderId: "EO-A28-AFTER-FAILED-CLEAR",
  executionMode: "REAL",
  symbol: "KCB",
  eventType: "REAL_SUBMISSION_STARTED",
  status: "BROKER_SELECTED"
});

{
  const events =
    await loadExecutionAuditTrail();

  const orderIds =
    ids(events);

  assert.equal(
    orderIds.has(
      "EO-A28-BEFORE-FAILED-CLEAR"
    ),
    true
  );

  assert.equal(
    orderIds.has(
      "EO-A28-AFTER-FAILED-CLEAR"
    ),
    true
  );

  console.log(
    "PASS: failed CLEAR does not poison later serialized audit writes."
  );
}

console.log();
console.log(
  "PC-031A28 audit clear concurrency integrity tests PASSED."
);

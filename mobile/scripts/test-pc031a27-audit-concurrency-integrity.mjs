import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map(),
  readDelayMs: 5,
  writeDelayMs: 5,
  writeCount: 0,
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

    globalThis.__state.writeCount += 1;

    if (
      globalThis.__state.failNextWrite
    ) {
      globalThis.__state.failNextWrite =
        false;

      throw new Error(
        "TEST_A27_AUDIT_WRITE_FAILURE"
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
  loadExecutionAuditTrail
} = store.namespace;


function orderIds(events = []) {
  return new Set(
    Array.from(events).map(
      (event) => event.orderId
    )
  );
}


// =========================================================
// Scenario 1:
// Sequential writes still work.
// =========================================================

state.storage.clear();
state.writeCount = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-BASE",
  executionMode: "REAL",
  symbol: "BASE",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-SEQUENTIAL",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType:
    "REAL_SUBMISSION_STARTED",
  status: "BROKER_SELECTED"
});

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    2
  );

  console.log(
    "PASS: sequential audit writes remain intact."
  );
}


// =========================================================
// Scenario 2:
// Two concurrent writers must both survive.
// =========================================================

state.storage.clear();
state.writeCount = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-BASE",
  executionMode: "REAL",
  symbol: "BASE",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

await Promise.all([
  addExecutionAuditEvent({
    executionId: "EXEC-A27",
    orderId:
      "EO-A27-CONCURRENT-A",
    executionMode: "REAL",
    symbol: "SCOM",
    eventType:
      "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED",
    submissionAttemptId:
      "ATTEMPT-A27-A"
  }),

  addExecutionAuditEvent({
    executionId: "EXEC-A27",
    orderId:
      "EO-A27-CONCURRENT-B",
    executionMode: "REAL",
    symbol: "KCB",
    eventType:
      "REAL_RECOVERY_MATCHED",
    status: "FILLED",
    submissionAttemptId:
      "ATTEMPT-A27-B",
    brokerReference:
      "BROKER-A27-B",
    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION"
  })
]);

{
  const events =
    await loadExecutionAuditTrail();

  const ids =
    orderIds(events);

  assert.equal(
    events.length,
    3
  );

  assert.equal(
    ids.has(
      "EO-A27-CONCURRENT-A"
    ),
    true
  );

  assert.equal(
    ids.has(
      "EO-A27-CONCURRENT-B"
    ),
    true
  );

  console.log(
    "PASS: concurrent audit writers are serialized and neither legitimate event is lost."
  );
}


// =========================================================
// Scenario 3:
// A burst of concurrent writes is lossless.
// =========================================================

state.storage.clear();
state.writeCount = 0;

const burstCount = 25;

await Promise.all(
  Array.from(
    { length: burstCount },
    (_, index) =>
      addExecutionAuditEvent({
        executionId:
          "EXEC-A27-BURST",
        orderId:
          `EO-A27-BURST-${index}`,
        executionMode: "REAL",
        symbol: "SCOM",
        eventType:
          "REAL_ORDER_QUEUED",
        status: "QUEUED"
      })
  )
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    burstCount
  );

  const ids =
    orderIds(events);

  for (
    let index = 0;
    index < burstCount;
    index += 1
  ) {
    assert.equal(
      ids.has(
        `EO-A27-BURST-${index}`
      ),
      true
    );
  }

  console.log(
    "PASS: concurrent burst preserves every audit event."
  );
}


// =========================================================
// Scenario 4:
// One failed audit write must reject that write but must
// not poison the serialization chain for later writes.
// =========================================================

state.storage.clear();
state.writeCount = 0;

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-BEFORE-FAILURE",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

state.failNextWrite = true;

let failed = false;

try {
  await addExecutionAuditEvent({
    executionId: "EXEC-A27",
    orderId: "EO-A27-FAILURE",
    executionMode: "REAL",
    symbol: "KCB",
    eventType:
      "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED"
  });
} catch (error) {
  failed =
    error?.message ===
    "TEST_A27_AUDIT_WRITE_FAILURE";
}

assert.equal(
  failed,
  true
);

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-AFTER-FAILURE",
  executionMode: "REAL",
  symbol: "EQTY",
  eventType:
    "REAL_SUBMISSION_STARTED",
  status: "BROKER_SELECTED"
});

{
  const events =
    await loadExecutionAuditTrail();

  const ids =
    orderIds(events);

  assert.equal(
    ids.has(
      "EO-A27-BEFORE-FAILURE"
    ),
    true
  );

  assert.equal(
    ids.has(
      "EO-A27-FAILURE"
    ),
    false
  );

  assert.equal(
    ids.has(
      "EO-A27-AFTER-FAILURE"
    ),
    true
  );

  console.log(
    "PASS: failed audit persistence does not poison later serialized audit writes."
  );
}


// =========================================================
// Scenario 5:
// Serialization does not duplicate events.
// =========================================================

{
  const events =
    await loadExecutionAuditTrail();

  const afterFailure =
    Array.from(events).filter(
      (event) =>
        event.orderId ===
        "EO-A27-AFTER-FAILURE"
    );

  assert.equal(
    afterFailure.length,
    1
  );

  console.log(
    "PASS: serialization preserves exactly-once local audit insertion semantics."
  );
}


console.log();
console.log(
  "PC-031A27 audit concurrency integrity tests PASSED."
);

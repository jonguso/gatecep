import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const KEY = "executionAuditTrail";

const state = {
  storage: new Map(),
  barrierEnabled: false,
  blockedReads: [],
  writeLog: []
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
    const current =
      globalThis.__state.storage.get(key) || null;

    if (!globalThis.__state.barrierEnabled) {
      return current;
    }

    return await new Promise((resolve) => {
      globalThis.__state.blockedReads.push({
        key,
        current,
        resolve
      });

      if (
        globalThis.__state.blockedReads.length === 2
      ) {
        const blocked =
          globalThis.__state.blockedReads.splice(0);

        for (const item of blocked) {
          item.resolve(item.current);
        }
      }
    });
  }

  export async function userSetItem(key, value) {
    globalThis.__state.writeLog.push({
      key,
      value
    });

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
    specifier === "../auth/userStorage"
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


function eventTypes(events = []) {
  return Array.from(events).map(
    (event) => event.eventType
  );
}


// =========================================================
// Scenario 1:
// Sequential writes preserve both audit events.
// =========================================================

state.storage.clear();
state.writeLog.length = 0;
state.barrierEnabled = false;

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-BASE",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-A",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_SUBMISSION_STARTED",
  status: "BROKER_SELECTED"
});

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-B",
  executionMode: "REAL",
  symbol: "KCB",
  eventType: "REAL_SUBMISSION_STARTED",
  status: "BROKER_SELECTED"
});

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    3
  );

  const types =
    eventTypes(events);

  assert.equal(
    types.filter(
      (type) =>
        type === "REAL_SUBMISSION_STARTED"
    ).length,
    2
  );

  console.log(
    "PASS: sequential audit writes preserve both legitimate events."
  );
}


// =========================================================
// Scenario 2:
// Force two writers to read the same old snapshot before
// either writer can persist its modified copy.
// =========================================================

state.storage.clear();
state.writeLog.length = 0;
state.barrierEnabled = false;

await addExecutionAuditEvent({
  executionId: "EXEC-A27",
  orderId: "EO-A27-BASE",
  executionMode: "REAL",
  symbol: "BASE",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

state.writeLog.length = 0;
state.barrierEnabled = true;

const writerA =
  addExecutionAuditEvent({
    executionId: "EXEC-A27",
    orderId: "EO-A27-CONCURRENT-A",
    executionMode: "REAL",
    symbol: "SCOM",
    eventType:
      "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED",
    submissionAttemptId:
      "ATTEMPT-A27-A"
  });

const writerB =
  addExecutionAuditEvent({
    executionId: "EXEC-A27",
    orderId: "EO-A27-CONCURRENT-B",
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
  });

await Promise.all([
  writerA,
  writerB
]);

state.barrierEnabled = false;

{
  const events =
    await loadExecutionAuditTrail();

  const ids =
    new Set(
      Array.from(events).map(
        (event) => event.orderId
      )
    );

  const hasA =
    ids.has(
      "EO-A27-CONCURRENT-A"
    );

  const hasB =
    ids.has(
      "EO-A27-CONCURRENT-B"
    );

  console.log(
    `INFO: concurrent writer A retained = ${hasA}`
  );

  console.log(
    `INFO: concurrent writer B retained = ${hasB}`
  );

  console.log(
    `INFO: final audit event count = ${events.length}`
  );

  console.log(
    `INFO: storage writes performed = ${state.writeLog.length}`
  );

  assert.equal(
    state.writeLog.length,
    2
  );

  assert.equal(
    events.length,
    2
  );

  assert.notEqual(
    hasA,
    hasB
  );

  console.log(
    "CONFIRMED GAP: two concurrent audit writers can read the same prior snapshot and one legitimate audit event is silently overwritten."
  );
}


// =========================================================
// Scenario 3:
// The lost event is an audit-only durability failure;
// it does not manufacture duplicate events.
// =========================================================

{
  const events =
    await loadExecutionAuditTrail();

  const baseEvents =
    Array.from(events).filter(
      (event) =>
        event.orderId ===
        "EO-A27-BASE"
    );

  assert.equal(
    baseEvents.length,
    1
  );

  console.log(
    "PASS: concurrency race loses a legitimate audit write rather than duplicating prior audit evidence."
  );
}


console.log();
console.log(
  "PC-031A27 audit concurrency discovery completed."
);

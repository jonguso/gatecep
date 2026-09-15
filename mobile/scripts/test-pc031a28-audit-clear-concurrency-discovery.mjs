import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const KEY = "executionAuditTrail";

const state = {
  storage: new Map(),
  blockRead: false,
  blockedReadResolve: null,
  blockedReadValue: null
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

    if (!globalThis.__state.blockRead) {
      return current;
    }

    globalThis.__state.blockedReadValue =
      current;

    return await new Promise((resolve) => {
      globalThis.__state.blockedReadResolve =
        resolve;
    });
  }

  export async function userSetItem(key, value) {
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
  loadExecutionAuditTrail,
  clearExecutionAuditTrail
} = store.namespace;


// =========================================================
// Seed existing audit history.
// =========================================================

await addExecutionAuditEvent({
  executionId: "EXEC-A28",
  orderId: "EO-A28-OLD",
  executionMode: "REAL",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});


// =========================================================
// Force an add to capture the old trail and pause before
// it can continue.
// =========================================================

state.blockRead = true;

const pendingAdd =
  addExecutionAuditEvent({
    executionId: "EXEC-A28",
    orderId: "EO-A28-NEW",
    executionMode: "REAL",
    symbol: "KCB",
    eventType:
      "REAL_SUBMISSION_STARTED",
    status: "BROKER_SELECTED"
  });

while (
  !state.blockedReadResolve
) {
  await Promise.resolve();
}


// =========================================================
// Clear while the add is paused.
// =========================================================

await clearExecutionAuditTrail();

{
  const raw =
    state.storage.get(KEY);

  assert.equal(
    raw,
    ""
  );

  console.log(
    "PASS: clear removed the current stored audit trail while the writer was paused."
  );
}


// =========================================================
// Let the paused writer continue with its pre-clear snapshot.
// =========================================================

state.blockRead = false;

state.blockedReadResolve(
  state.blockedReadValue
);

await pendingAdd;

{
  const events =
    await loadExecutionAuditTrail();

  const ids =
    new Set(
      Array.from(events).map(
        (event) => event.orderId
      )
    );

  console.log(
    `INFO: old pre-clear event resurrected = ${ids.has("EO-A28-OLD")}`
  );

  console.log(
    `INFO: new writer event retained = ${ids.has("EO-A28-NEW")}`
  );

  console.log(
    `INFO: final event count = ${events.length}`
  );

  assert.equal(
    ids.has("EO-A28-OLD"),
    true
  );

  console.log(
    "CONFIRMED GAP: a writer that captured the trail before clear can persist afterward and resurrect cleared audit history."
  );
}

console.log();
console.log(
  "PC-031A28 audit clear concurrency discovery completed."
);

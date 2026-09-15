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
    return (
      globalThis.__state.storage.get(key) ||
      null
    );
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
  throw new Error("storage has no imports");
});

await store.link(async (specifier) => {
  if (specifier === "../auth/userStorage") {
    return storage;
  }

  throw new Error(
    `Unexpected dependency: ${specifier}`
  );
});

await storage.evaluate();
await store.evaluate();

const {
  addExecutionAuditEvent,
  loadExecutionAuditTrail
} = store.namespace;


// =========================================================
// Scenario 1:
// Legacy evidence is not rewritten merely by loading it.
// =========================================================

const legacyOriginal = [
  {
    id: "AUD-LEGACY-DUP",
    executionMode: "REAL",
    eventType: "REAL_LEGACY_ONE",
    status: "INFO",
    createdAt: "2026-09-01T10:00:00.000Z"
  },
  {
    id: "AUD-LEGACY-DUP",
    executionMode: "REAL",
    eventType: "REAL_LEGACY_TWO",
    status: "INFO",
    createdAt: "2026-09-01T10:01:00.000Z"
  },
  {
    executionMode: "REAL",
    eventType: "REAL_LEGACY_THREE",
    status: "INFO",
    createdAt: "2026-09-01T10:02:00.000Z"
  }
];

state.storage.set(
  "executionAuditTrail",
  JSON.stringify(legacyOriginal)
);

{
  const loaded =
    await loadExecutionAuditTrail();

  assert.deepEqual(
    Array.from(loaded),
    legacyOriginal
  );

  console.log(
    "PASS: legacy audit evidence is not rewritten during load."
  );
}


// =========================================================
// Scenario 2:
// Missing-ID legacy REAL records no longer collapse into
// one giant EVENT:UNIDENTIFIED retention lifecycle.
// =========================================================

const missingIdLegacy =
  Array.from(
    { length: 1000 },
    (_, index) => ({
      executionMode: "REAL",
      eventType:
        `REAL_LEGACY_MISSING_${index}`,
      status: "INFO",
      createdAt:
        new Date(
          Date.UTC(
            2026,
            8,
            1,
            0,
            0,
            index
          )
        ).toISOString()
    })
  );

state.storage.set(
  "executionAuditTrail",
  JSON.stringify(missingIdLegacy)
);

await addExecutionAuditEvent({
  executionMode: "REAL",
  orderId: "POST-A31-ORDER",
  symbol: "SCOM",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    1000
  );

  assert.ok(
    events.find(
      (event) =>
        event.orderId === "POST-A31-ORDER"
    )
  );

  const retainedLegacy =
    events.filter(
      (event) =>
        !event.orderId
    );

  assert.equal(
    retainedLegacy.length,
    999
  );

  console.log(
    "PASS: 1000 identifier-poor legacy REAL records are retained independently rather than collapsing into one UNIDENTIFIED lifecycle."
  );
}


// =========================================================
// Scenario 3:
// Duplicate non-empty legacy IDs also remain independent
// when no stronger lifecycle identity exists.
// =========================================================

const duplicateIdLegacy =
  Array.from(
    { length: 1000 },
    (_, index) => ({
      id: "AUD-LEGACY-DUPLICATE",
      executionMode: "REAL",
      eventType:
        `REAL_LEGACY_DUP_${index}`,
      status: "INFO",
      createdAt:
        new Date(
          Date.UTC(
            2026,
            8,
            2,
            0,
            0,
            index
          )
        ).toISOString()
    })
  );

state.storage.set(
  "executionAuditTrail",
  JSON.stringify(duplicateIdLegacy)
);

await addExecutionAuditEvent({
  executionMode: "REAL",
  orderId: "POST-A31-DUP-ORDER",
  symbol: "KCB",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    1000
  );

  assert.ok(
    events.find(
      (event) =>
        event.orderId ===
        "POST-A31-DUP-ORDER"
    )
  );

  assert.equal(
    events.filter(
      (event) =>
        event.id ===
        "AUD-LEGACY-DUPLICATE"
    ).length,
    999
  );

  console.log(
    "PASS: duplicate legacy fallback IDs no longer merge unrelated identifier-poor REAL audit records."
  );
}


// =========================================================
// Scenario 4:
// Strong lifecycle identity still takes precedence even if
// old event IDs are duplicated.
// =========================================================

state.storage.set(
  "executionAuditTrail",
  JSON.stringify([
    {
      id: "AUD-SAME",
      executionMode: "REAL",
      orderId: "ORDER-A",
      eventType: "REAL_ORDER_QUEUED",
      status: "QUEUED"
    },
    {
      id: "AUD-SAME",
      executionMode: "REAL",
      orderId: "ORDER-B",
      eventType: "REAL_ORDER_ROUTED",
      status: "ROUTED"
    }
  ])
);

await addExecutionAuditEvent({
  executionMode: "REAL",
  orderId: "ORDER-C",
  symbol: "EQTY",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

{
  const events =
    await loadExecutionAuditTrail();

  const orderIds =
    new Set(
      Array.from(events).map(
        (event) => event.orderId
      )
    );

  assert.equal(
    orderIds.has("ORDER-A"),
    true
  );

  assert.equal(
    orderIds.has("ORDER-B"),
    true
  );

  assert.equal(
    orderIds.has("ORDER-C"),
    true
  );

  console.log(
    "PASS: orderId remains stronger than duplicated legacy event.id."
  );
}


// =========================================================
// Scenario 5:
// New A30 identity generation remains intact.
// =========================================================

const one =
  await addExecutionAuditEvent({
    executionMode: "REAL",
    orderId: "A31-NEW-1",
    symbol: "SCOM",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

const two =
  await addExecutionAuditEvent({
    executionMode: "REAL",
    orderId: "A31-NEW-2",
    symbol: "KCB",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

assert.notEqual(
  one.id,
  two.id
);

console.log(
  "PASS: A30 unique identity generation remains intact."
);

console.log();
console.log(
  "PC-031A31 legacy audit identity integrity tests PASSED."
);

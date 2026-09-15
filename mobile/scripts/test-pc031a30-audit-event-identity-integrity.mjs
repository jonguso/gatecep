import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map()
};

const fixedMath = Object.create(Math);

/*
 * Force every random request to return the same value.
 * Identity must remain unique anyway.
 */
fixedMath.random = () => 0.123456789;

class FixedDate extends Date {
  constructor(...args) {
    if (args.length === 0) {
      super("2026-09-14T20:00:00.000Z");
    } else {
      super(...args);
    }
  }

  static now() {
    return 1789416000000;
  }
}

const context = vm.createContext({
  console,
  Date: FixedDate,
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
  Math: fixedMath
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
// Same timestamp + same random source still yields unique IDs.
// =========================================================

const first =
  await addExecutionAuditEvent({
    executionId: "EXEC-A30",
    orderId: "EO-A30-1",
    executionMode: "REAL",
    symbol: "SCOM",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

const second =
  await addExecutionAuditEvent({
    executionId: "EXEC-A30",
    orderId: "EO-A30-2",
    executionMode: "REAL",
    symbol: "KCB",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

assert.notEqual(
  first.id,
  second.id
);

console.log(
  "PASS: identical timestamp/random sources cannot create duplicate audit IDs."
);


// =========================================================
// Scenario 2:
// Concurrent writers also receive distinct IDs.
// =========================================================

const concurrent =
  await Promise.all(
    Array.from(
      { length: 25 },
      (_, index) =>
        addExecutionAuditEvent({
          executionId: "EXEC-A30-BURST",
          orderId: `EO-A30-BURST-${index}`,
          executionMode: "REAL",
          symbol: "SCOM",
          eventType: "REAL_ORDER_QUEUED",
          status: "QUEUED"
        })
    )
  );

{
  const ids =
    new Set(
      concurrent.map(
        (event) => event.id
      )
    );

  assert.equal(
    ids.size,
    25
  );

  console.log(
    "PASS: serialized concurrent audit writers receive 25 distinct event IDs."
  );
}


// =========================================================
// Scenario 3:
// Identifier-poor REAL records have independent fallback IDs.
// =========================================================

state.storage.clear();

const fallbackOne =
  await addExecutionAuditEvent({
    executionMode: "REAL",
    symbol: "SCOM",
    eventType: "REAL_TEST_FALLBACK_ONE",
    status: "INFO"
  });

const fallbackTwo =
  await addExecutionAuditEvent({
    executionMode: "REAL",
    symbol: "KCB",
    eventType: "REAL_TEST_FALLBACK_TWO",
    status: "INFO"
  });

assert.notEqual(
  fallbackOne.id,
  fallbackTwo.id
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    2
  );

  assert.equal(
    new Set(
      Array.from(events).map(
        (event) => event.id
      )
    ).size,
    2
  );

  console.log(
    "PASS: identifier-poor REAL events retain independent fallback audit identity."
  );
}


// =========================================================
// Scenario 4:
// UI-facing stored records always expose unique event IDs.
// =========================================================

{
  const events =
    await loadExecutionAuditTrail();

  const eventIds =
    Array.from(events).map(
      (event) => event.id
    );

  assert.equal(
    eventIds.length,
    new Set(eventIds).size
  );

  assert.equal(
    eventIds.every(Boolean),
    true
  );

  console.log(
    "PASS: persisted audit records provide unique non-empty React keys."
  );
}


// =========================================================
// Scenario 5:
// Existing persisted candidate collision is rejected.
//
// Simulate an older persisted record whose ID matches the
// candidate sequence after an in-memory sequence restart.
// =========================================================

state.storage.clear();

state.storage.set(
  "executionAuditTrail",
  JSON.stringify([
    {
      id:
        "AUD-1789416000000-1-4fzzzx",
      executionMode: "REAL",
      orderId: "EO-A30-EXISTING",
      eventType: "REAL_ORDER_QUEUED",
      status: "QUEUED",
      createdAt:
        "2026-09-14T20:00:00.000Z"
    }
  ])
);

/*
 * The module sequence has already advanced during earlier scenarios,
 * so this scenario primarily verifies that persisted identity remains
 * part of the uniqueness contract. The final trail must contain no
 * duplicate IDs regardless of candidate sequence position.
 */
const afterExisting =
  await addExecutionAuditEvent({
    executionMode: "REAL",
    orderId: "EO-A30-AFTER-EXISTING",
    symbol: "EQTY",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

{
  const events =
    await loadExecutionAuditTrail();

  const eventIds =
    Array.from(events).map(
      (event) => event.id
    );

  assert.equal(
    eventIds.length,
    new Set(eventIds).size
  );

  assert.notEqual(
    afterExisting.id,
    "AUD-1789416000000-1-4fzzzx"
  );

  console.log(
    "PASS: persisted audit identity remains unique when older IDs already exist."
  );
}

console.log();
console.log(
  "PC-031A30 audit event identity integrity tests PASSED."
);

import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map()
};

/*
 * Deliberately deterministic identity sources.
 * Two audit events created under these conditions receive exactly
 * the same Date.now() and Math.random() values.
 */
const fixedMath = Object.create(Math);
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
// Normal REAL order events with different orderIds.
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

console.log(
  `INFO: first generated audit id  = ${first.id}`
);

console.log(
  `INFO: second generated audit id = ${second.id}`
);

console.log(
  `INFO: generated IDs equal = ${first.id === second.id}`
);

assert.equal(
  first.id,
  second.id
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    2
  );

  const orderIds =
    new Set(
      Array.from(events).map(
        (event) => event.orderId
      )
    );

  assert.equal(
    orderIds.has("EO-A30-1"),
    true
  );

  assert.equal(
    orderIds.has("EO-A30-2"),
    true
  );

  console.log(
    "PASS: duplicate generated IDs do not merge normal REAL lifecycles when stronger order identity exists."
  );
}


// =========================================================
// Scenario 2:
// Identifier-poor REAL events force retention fallback to ID.
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

assert.equal(
  fallbackOne.id,
  fallbackTwo.id
);

{
  const events =
    await loadExecutionAuditTrail();

  console.log(
    `INFO: fallback events retained = ${events.length}`
  );

  console.log(
    `INFO: fallback IDs equal = ${fallbackOne.id === fallbackTwo.id}`
  );

  assert.equal(
    events.length,
    2
  );

  console.log(
    "INFO: duplicate fallback IDs currently cause the two identifier-poor REAL events to share one retention lifecycle key."
  );
}


// =========================================================
// Scenario 3:
// Demonstrate UI-key consequence.
// =========================================================

{
  const events =
    await loadExecutionAuditTrail();

  const uniqueIds =
    new Set(
      Array.from(events).map(
        (event) => event.id
      )
    );

  console.log(
    `INFO: stored event count = ${events.length}`
  );

  console.log(
    `INFO: unique audit ID count = ${uniqueIds.size}`
  );

  assert.equal(
    events.length,
    2
  );

  assert.equal(
    uniqueIds.size,
    1
  );

  console.log(
    "CONFIRMED CHARACTERISTIC: two legitimate stored audit events can have the same event.id when timestamp and random suffix collide."
  );

  console.log(
    "INFO: execution-audit UI would therefore receive duplicate React keys for these two records."
  );
}

console.log();
console.log(
  "PC-031A30 audit event identity discovery completed."
);

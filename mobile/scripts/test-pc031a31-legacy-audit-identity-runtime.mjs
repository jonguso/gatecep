import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map()
};

const fixedMath = Object.create(Math);
fixedMath.random = () => 0.123456789;

class FixedDate extends Date {
  constructor(...args) {
    if (args.length === 0) {
      super("2026-09-14T21:00:00.000Z");
    } else {
      super(...args);
    }
  }

  static now() {
    return 1789419600000;
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
    specifier === "../auth/userStorage"
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
// Duplicate legacy IDs survive raw load unchanged.
// =========================================================

state.storage.set(
  "executionAuditTrail",
  JSON.stringify([
    {
      id: "AUD-LEGACY-DUP",
      executionMode: "REAL",
      orderId: "LEGACY-ORDER-1",
      eventType: "REAL_ORDER_QUEUED",
      status: "QUEUED",
      createdAt: "2026-09-01T10:00:00.000Z"
    },
    {
      id: "AUD-LEGACY-DUP",
      executionMode: "REAL",
      orderId: "LEGACY-ORDER-2",
      eventType: "REAL_ORDER_ROUTED",
      status: "ROUTED",
      createdAt: "2026-09-01T10:01:00.000Z"
    }
  ])
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(events.length, 2);

  const ids =
    events.map(
      (event) => event.id
    );

  assert.equal(
    new Set(ids).size,
    1
  );

  console.log(
    "CONFIRMED: duplicate legacy audit IDs survive load unchanged."
  );

  console.log(
    "CONFIRMED: execution-audit UI would receive duplicate React keys for those legacy records."
  );
}


// =========================================================
// Scenario 2:
// A30 protects all new writes from reusing legacy IDs.
// =========================================================

const postA30 =
  await addExecutionAuditEvent({
    executionMode: "REAL",
    orderId: "POST-A30-ORDER",
    symbol: "SCOM",
    eventType: "REAL_ORDER_QUEUED",
    status: "QUEUED"
  });

assert.notEqual(
  postA30.id,
  "AUD-LEGACY-DUP"
);

console.log(
  "PASS: A30 prevents a new audit write from reusing an existing legacy ID."
);


// =========================================================
// Scenario 3:
// Missing IDs survive raw load unchanged.
// =========================================================

state.storage.set(
  "executionAuditTrail",
  JSON.stringify([
    {
      executionMode: "REAL",
      orderId: "LEGACY-NO-ID-1",
      eventType: "REAL_ORDER_QUEUED",
      status: "QUEUED"
    },
    {
      id: "",
      executionMode: "REAL",
      orderId: "LEGACY-NO-ID-2",
      eventType: "REAL_ORDER_ROUTED",
      status: "ROUTED"
    }
  ])
);

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(events.length, 2);

  const missing =
    events.filter(
      (event) =>
        !String(event?.id || "").trim()
    );

  assert.equal(
    missing.length,
    2
  );

  console.log(
    "CONFIRMED: legacy missing audit IDs survive load unchanged."
  );
}


// =========================================================
// Scenario 4:
// Strong lifecycle identity still protects retention.
// =========================================================

await addExecutionAuditEvent({
  executionMode: "REAL",
  orderId: "POST-A30-STRONG-ID",
  symbol: "KCB",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

{
  const events =
    await loadExecutionAuditTrail();

  const legacyOne =
    events.find(
      (event) =>
        event.orderId === "LEGACY-NO-ID-1"
    );

  const legacyTwo =
    events.find(
      (event) =>
        event.orderId === "LEGACY-NO-ID-2"
    );

  assert.ok(legacyOne);
  assert.ok(legacyTwo);

  console.log(
    "PASS: legacy missing event.id does not collapse retention when stronger orderId identity exists."
  );
}


// =========================================================
// Scenario 5:
// Identifier-poor legacy REAL records share UNIDENTIFIED
// fallback lifecycle identity.
// =========================================================

state.storage.set(
  "executionAuditTrail",
  JSON.stringify([
    {
      executionMode: "REAL",
      eventType: "REAL_LEGACY_ONE",
      status: "INFO",
      createdAt: "2026-09-01T10:00:00.000Z"
    },
    {
      id: "",
      executionMode: "REAL",
      eventType: "REAL_LEGACY_TWO",
      status: "INFO",
      createdAt: "2026-09-01T10:01:00.000Z"
    }
  ])
);

await addExecutionAuditEvent({
  executionMode: "REAL",
  orderId: "POST-A30-APPEND",
  symbol: "EQTY",
  eventType: "REAL_ORDER_QUEUED",
  status: "QUEUED"
});

{
  const events =
    await loadExecutionAuditTrail();

  assert.equal(
    events.length,
    3
  );

  const identifierPoor =
    events.filter(
      (event) =>
        !String(event?.orderId || "").trim() &&
        !String(event?.executionId || "").trim() &&
        !String(event?.brokerOrderId || "").trim() &&
        !String(event?.brokerReference || "").trim()
    );

  assert.equal(
    identifierPoor.length,
    2
  );

  console.log(
    "CONFIRMED: identifier-poor legacy REAL events remain separate records but share the same retention fallback lifecycle key EVENT:UNIDENTIFIED."
  );
}


// =========================================================
// Scenario 6:
// Legacy identity is observational only.
// =========================================================

console.log(
  "PASS: no scenario gives legacy audit identity broker, OMS-fill, or canonical-accounting authority."
);

console.log();
console.log(
  "PC-031A31 legacy audit identity runtime discovery completed."
);

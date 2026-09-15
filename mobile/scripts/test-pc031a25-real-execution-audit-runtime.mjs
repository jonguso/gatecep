import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  storage: new Map(),
  accounts: [],
  adapterPlan: [],
  adapterCalls: [],
  auditWriteFailure: false
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

async function source(relativePath) {
  const url = new URL(
    `../${relativePath}`,
    import.meta.url
  );

  return moduleFrom(
    await readFile(url, "utf8"),
    url.href
  );
}


// =========================================================
// Actual production modules under test.
// =========================================================

const auditStore = await source(
  "src/services/trade/executionAuditStore.js"
);

const basketStore = await source(
  "src/services/trade/basketExecutionStore.js"
);

const orderLifecycle = await source(
  "src/services/trade/orderLifecycle.js"
);

const evidencePolicy = await source(
  "src/features/broker-sync/brokerExecutionEvidencePolicy.js"
);

const matchCore = await source(
  "src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
);

const recoveryCore = await source(
  "src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
);

const recoveryService = await source(
  "src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
);


// =========================================================
// Runtime dependency mocks.
// =========================================================

const storage = moduleFrom(
  `
  export async function userGetItem(key) {
    return globalThis.__state.storage.get(key) || null;
  }

  export async function userSetItem(key, value) {
    if (
      key === "executionAuditTrail" &&
      globalThis.__state.auditWriteFailure
    ) {
      const error = new Error(
        "TEST_EXECUTION_AUDIT_STORAGE_FAILURE"
      );

      error.code =
        "TEST_EXECUTION_AUDIT_STORAGE_FAILURE";

      throw error;
    }

    globalThis.__state.storage.set(
      key,
      value
    );
  }

  export async function userRemoveItem(key) {
    globalThis.__state.storage.delete(key);
  }
  `,
  "mock:user-storage"
);

const eligibility = moduleFrom(
  `
  export async function buildRealOrderBrokerEligibility({
    order = {}
  } = {}) {
    return {
      available: true,
      reason:
        "BROKER_ELIGIBILITY_AVAILABLE",
      candidates: [
        {
          brokerAccountId:
            order.brokerAccountId,
          brokerId:
            order.brokerId,
          brokerName:
            "ABC Broker",
          side:
            order.side || "BUY",
          estimatedCharges: 0,
          requiredCash:
            Number(order.amount || 0),
          projectedAvailableCash:
            10000000,
          requiredQuantity:
            Number(order.quantity || 0),
          projectedAvailableQuantity:
            10000000,
          eligible: true,
          reason: "ELIGIBLE"
        }
      ]
    };
  }
  `,
  "mock:broker-eligibility"
);

const accounts = moduleFrom(
  `
  export async function loadBrokerAccounts() {
    return globalThis.__state.accounts;
  }
  `,
  "mock:broker-accounts"
);

const tradeBasket = moduleFrom(
  `
  export async function loadTradeBasket() {
    return null;
  }
  `,
  "mock:trade-basket"
);

const brokerAdapters = moduleFrom(
  `
  export async function placeBrokerOrder(order) {
    globalThis.__state.adapterCalls.push({
      ...order
    });

    const step =
      globalThis.__state.adapterPlan.shift();

    if (!step) {
      throw new Error(
        "TEST_ADAPTER_PLAN_EXHAUSTED"
      );
    }

    if (step.type === "SAFE_FAILURE") {
      const error = new Error(
        step.message ||
        "Certified pre-submission failure"
      );

      error.code =
        step.code ||
        "TEST_SAFE_ADAPTER_FAILURE";

      error.safeToRetry = true;
      error.beforeSubmission = true;

      throw error;
    }

    if (step.type === "THROW_UNCERTAIN") {
      const error = new Error(
        step.message ||
        "Unknown adapter outcome"
      );

      error.code =
        step.code ||
        "TEST_UNCERTAIN_ADAPTER_FAILURE";

      throw error;
    }

    if (step.type === "UNCERTAIN_RESPONSE") {
      return {
        ok: false,
        brokerId:
          step.adapterBrokerId ||
          order.brokerId,
        brokerName:
          step.brokerName ||
          "ABC Broker",
        status:
          step.status ||
          "MANUAL_CONFIRMATION_REQUIRED",
        message:
          step.message ||
          "Broker submission requires reconciliation.",
        submittedAt:
          step.submittedAt ||
          "2026-09-14T10:00:00.000Z"
      };
    }

    if (step.type === "CONFIRMED") {
      return {
        ok: true,
        brokerId:
          step.adapterBrokerId ||
          order.brokerId,
        brokerName:
          step.brokerName ||
          "ABC Broker",
        brokerOrderId:
          step.brokerOrderId,
        status:
          step.status ||
          "SUBMITTED",
        message:
          step.message ||
          "Broker accepted order.",
        submittedAt:
          step.submittedAt ||
          "2026-09-14T10:00:00.000Z"
      };
    }

    throw new Error(
      "TEST_UNKNOWN_ADAPTER_PLAN_STEP"
    );
  }
  `,
  "mock:broker-adapters"
);


// =========================================================
// Link production modules.
// =========================================================

await storage.link(() => {
  throw new Error("storage has no imports");
});

await eligibility.link(() => {
  throw new Error("eligibility has no imports");
});

await accounts.link(() => {
  throw new Error("accounts has no imports");
});

await tradeBasket.link(() => {
  throw new Error("trade basket has no imports");
});

await brokerAdapters.link(() => {
  throw new Error("broker adapters has no imports");
});

await orderLifecycle.link(() => {
  throw new Error("order lifecycle has no imports");
});

await auditStore.link(async (specifier) => {
  if (
    specifier ===
    "../auth/userStorage"
  ) {
    return storage;
  }

  throw new Error(
    `Unexpected audit dependency: ${specifier}`
  );
});

await evidencePolicy.link(async (specifier) => {
  throw new Error(
    `Unexpected evidence-policy dependency: ${specifier}`
  );
});

await matchCore.link(async (specifier) => {
  if (
    specifier ===
    "./brokerExecutionEvidencePolicy.js"
  ) {
    return evidencePolicy;
  }

  throw new Error(
    `Unexpected match-core dependency: ${specifier}`
  );
});

await recoveryCore.link(
  async (specifier) => {
    if (
      specifier ===
      "./realOrderExecutionEvidenceMatchCore.js"
    ) {
      return matchCore;
    }

    if (
      specifier ===
      "../../services/trade/orderLifecycle.js"
    ) {
      return orderLifecycle;
    }

    if (
      specifier ===
      "./brokerExecutionFillIdentity.js"
    ) {
      return moduleFrom(
        `
        export function brokerExecutionFillIdentity(row = {}) {
          const explicit =
            row?.fillReference ||
            row?.fillId ||
            row?.executionReference ||
            row?.executionId ||
            row?.tradeId ||
            row?.transactionId ||
            row?.dealNumber;

          if (explicit) {
            return String(explicit).trim();
          }

          const brokerReference =
            String(
              row?.brokerReference || ""
            ).trim();

          const executionDate =
            String(
              row?.executionDate ||
              row?.date ||
              ""
            ).trim();

          const symbol =
            String(
              row?.symbol || ""
            ).trim().toUpperCase();

          const side =
            String(
              row?.side || ""
            ).trim().toUpperCase();

          const quantity =
            String(
              row?.quantity ?? ""
            ).trim();

          const price =
            String(
              row?.price ?? ""
            ).trim();

          if (
            brokerReference ||
            executionDate ||
            symbol ||
            side ||
            quantity ||
            price
          ) {
            return [
              brokerReference,
              executionDate,
              symbol,
              side,
              quantity,
              price
            ].join("|");
          }

          return String(
            row?.id || ""
          ).trim();
        }
        `,
        "mock:broker-execution-fill-identity"
      );
    }

    throw new Error(
      `Unexpected recovery-core dependency: ${specifier}`
    );
  }
);

await basketStore.link(
  async (specifier) => {
    if (
      specifier ===
      "./brokerExecutionEligibilityService"
    ) {
      return eligibility;
    }

    if (
      specifier ===
      "../auth/userStorage"
    ) {
      return storage;
    }

    if (
      specifier ===
      "../brokers/brokerAdapters"
    ) {
      return brokerAdapters;
    }

    if (
      specifier ===
      "../brokers/brokerAccountStore"
    ) {
      return accounts;
    }

    if (
      specifier ===
      "./tradeBasketStore"
    ) {
      return tradeBasket;
    }

    if (
      specifier ===
      "./executionAuditStore"
    ) {
      return auditStore;
    }

    if (
      specifier ===
      "./orderLifecycle"
    ) {
      return orderLifecycle;
    }

    throw new Error(
      `Unexpected basket-store dependency: ${specifier}`
    );
  }
);

await recoveryService.link(
  async (specifier) => {
    if (
      specifier ===
      "../../services/trade/basketExecutionStore"
    ) {
      return basketStore;
    }

    if (
      specifier ===
      "./realOrderExecutionRecoveryTransitionCore.js"
    ) {
      return recoveryCore;
    }

    if (
      specifier ===
      "./realOrderExecutionEvidenceMatchCore.js"
    ) {
      return matchCore;
    }

    if (
      specifier ===
      "../../services/trade/executionAuditStore.js"
    ) {
      return auditStore;
    }

    throw new Error(
      `Unexpected recovery-service dependency: ${specifier}`
    );
  }
);


// =========================================================
// Evaluate.
// =========================================================

await storage.evaluate();
await eligibility.evaluate();
await accounts.evaluate();
await tradeBasket.evaluate();
await brokerAdapters.evaluate();
await orderLifecycle.evaluate();
await auditStore.evaluate();
await evidencePolicy.evaluate();
await matchCore.evaluate();
await recoveryCore.evaluate();
await basketStore.evaluate();
await recoveryService.evaluate();


// =========================================================
// Production functions.
// =========================================================

const {
  queueSingleOrder,
  routeExecutionOrderByMode,
  loadBasketExecution
} = basketStore.namespace;

const {
  loadExecutionAuditTrail
} = auditStore.namespace;

const {
  reconcileUncertainRealOrderFromVerifiedEvidence
} = recoveryService.namespace;


// =========================================================
// Fixtures/helpers.
// =========================================================

const ACTIVE_KEY =
  "activeBasketExecution";

const AUDIT_KEY =
  "executionAuditTrail";

const ACCOUNT = {
  id: "ACC-ABC-1",
  brokerId: "ABC",
  brokerName: "ABC Broker",
  name: "ABC Broker",
  connectionMode: "LIVE",
  status: "ACTIVE",
  connected: true,
  linked: true
};

state.accounts = [ACCOUNT];

function baseOrder(overrides = {}) {
  return {
    id: "EO-A25-1",
    basketItemId: "BI-A25-1",
    symbol: "SCOM",
    name: "Safaricom PLC",
    sector: "Telecommunication",
    side: "BUY",
    amount: 2500,
    quantity: 100,
    price: 25,
    executionMode: "REAL",
    brokerId: "ABC",
    brokerAccountId: "ACC-ABC-1",
    brokerName: "ABC Broker",
    status: "REVIEW",
    message: "Pending review",
    createdAt:
      "2026-09-14T09:00:00.000Z",
    updatedAt:
      "2026-09-14T09:00:00.000Z",
    ...overrides
  };
}

function executionWith(order) {
  return {
    id: "EXEC-A25-1",
    basketId: "BASKET-A25-1",
    source: "TEST",
    executionMode: "REAL",
    brokerId: null,
    brokerAccountId: null,
    status: "REVIEW",
    createdAt:
      "2026-09-14T09:00:00.000Z",
    updatedAt:
      "2026-09-14T09:00:00.000Z",
    orders: [order]
  };
}

function reset(order = baseOrder()) {
  state.storage.clear();
  state.adapterPlan = [];
  state.adapterCalls = [];
  state.auditWriteFailure = false;

  state.storage.set(
    ACTIVE_KEY,
    JSON.stringify(
      executionWith(order)
    )
  );
}

async function events() {
  return await loadExecutionAuditTrail();
}

async function currentOrder() {
  const execution =
    await loadBasketExecution();

  return execution?.orders?.find(
    (item) =>
      item.id === "EO-A25-1"
  );
}

function eventsOfType(
  list,
  eventType
) {
  return list.filter(
    (event) =>
      event.eventType === eventType
  );
}

function chronological(list) {
  return [...list].reverse();
}


// =========================================================
// Scenario 1:
// Queue -> SUBMITTING -> confirmed ROUTED.
// =========================================================

{
  reset();

  state.adapterPlan.push({
    type: "CONFIRMED",
    brokerOrderId: "ABC-A25-ROUTE-1"
  });

  await queueSingleOrder(
    "EO-A25-1"
  );

  const routed =
    await routeExecutionOrderByMode(
      "EO-A25-1"
    );

  const audit =
    await events();

  const ordered =
    chronological(audit);

  assert.deepEqual(
    ordered.map(
      (event) => event.eventType
    ),
    [
      "REAL_ORDER_QUEUED",
      "REAL_SUBMISSION_STARTED",
      "REAL_ORDER_ROUTED"
    ]
  );

  const queued =
    ordered[0];

  const started =
    ordered[1];

  const routedEvent =
    ordered[2];

  assert.equal(
    queued.orderId,
    "EO-A25-1"
  );

  assert.equal(
    started.orderId,
    queued.orderId
  );

  assert.equal(
    routedEvent.orderId,
    queued.orderId
  );

  assert.equal(
    started.brokerId,
    "ABC"
  );

  assert.equal(
    routedEvent.brokerId,
    "ABC"
  );

  assert.equal(
    started.brokerAccountId,
    "ACC-ABC-1"
  );

  assert.equal(
    routedEvent.brokerAccountId,
    "ACC-ABC-1"
  );

  assert.ok(
    started.submissionAttemptId
  );

  assert.equal(
    routedEvent.submissionAttemptId,
    started.submissionAttemptId
  );

  assert.equal(
    started.submissionAttemptCount,
    1
  );

  assert.equal(
    routedEvent.submissionAttemptCount,
    1
  );

  assert.equal(
    started.brokerOrderId,
    null
  );

  assert.equal(
    routedEvent.brokerOrderId,
    "ABC-A25-ROUTE-1"
  );

  assert.equal(
    routed?.orders?.find(
      (item) =>
        item.id === "EO-A25-1"
    )?.status,
    "ROUTED"
  );

  assert.equal(
    state.adapterCalls.length,
    1
  );

  // Audit storage is newest-first.
  assert.equal(
    audit[0].eventType,
    "REAL_ORDER_ROUTED"
  );

  assert.equal(
    audit[audit.length - 1].eventType,
    "REAL_ORDER_QUEUED"
  );

  console.log(
    "PASS: confirmed REAL route persists one coherent queue/submission/routed audit sequence."
  );
}


// =========================================================
// Scenario 2:
// Safe adapter failure -> same broker retry ->
// distinct attempt -> confirmed route.
// =========================================================

{
  reset(
    baseOrder({
      status: "QUEUED",
      queuedAt:
        "2026-09-14T09:30:00.000Z"
    })
  );

  state.adapterPlan.push(
    {
      type: "SAFE_FAILURE",
      code:
        "TEST_PRE_SUBMISSION_FAILURE"
    },
    {
      type: "CONFIRMED",
      brokerOrderId:
        "ABC-A25-RETRY-2"
    }
  );

  const first =
    await routeExecutionOrderByMode(
      "EO-A25-1"
    );

  const firstOrder =
    first.orders.find(
      (item) =>
        item.id === "EO-A25-1"
    );

  assert.equal(
    firstOrder.status,
    "BROKER_SELECTED"
  );

  assert.equal(
    firstOrder.brokerStatus,
    "ADAPTER_ERROR"
  );

  const attempt1 =
    firstOrder.submissionAttemptId;

  assert.ok(attempt1);

  assert.equal(
    firstOrder.submissionAttemptCount,
    1
  );

  const second =
    await routeExecutionOrderByMode(
      "EO-A25-1"
    );

  const secondOrder =
    second.orders.find(
      (item) =>
        item.id === "EO-A25-1"
    );

  const attempt2 =
    secondOrder.submissionAttemptId;

  assert.equal(
    secondOrder.status,
    "ROUTED"
  );

  assert.equal(
    secondOrder.brokerId,
    "ABC"
  );

  assert.equal(
    secondOrder.brokerAccountId,
    "ACC-ABC-1"
  );

  assert.notEqual(
    attempt2,
    attempt1
  );

  assert.equal(
    secondOrder.submissionAttemptCount,
    2
  );

  const ordered =
    chronological(
      await events()
    );

  assert.deepEqual(
    ordered.map(
      (event) => event.eventType
    ),
    [
      "REAL_SUBMISSION_STARTED",
      "REAL_SUBMISSION_SAFE_FAILURE",
      "REAL_SUBMISSION_STARTED",
      "REAL_ORDER_ROUTED"
    ]
  );

  const [
    firstStarted,
    safeFailure,
    secondStarted,
    routedEvent
  ] = ordered;

  assert.equal(
    firstStarted.submissionAttemptId,
    attempt1
  );

  assert.equal(
    safeFailure.submissionAttemptId,
    attempt1
  );

  assert.equal(
    secondStarted.submissionAttemptId,
    attempt2
  );

  assert.equal(
    routedEvent.submissionAttemptId,
    attempt2
  );

  assert.equal(
    firstStarted.submissionAttemptCount,
    1
  );

  assert.equal(
    secondStarted.submissionAttemptCount,
    2
  );

  for (const event of ordered) {
    assert.equal(
      event.orderId,
      "EO-A25-1"
    );

    assert.equal(
      event.brokerId,
      "ABC"
    );

    assert.equal(
      event.brokerAccountId,
      "ACC-ABC-1"
    );
  }

  assert.equal(
    state.adapterCalls.length,
    2
  );

  console.log(
    "PASS: safe retry keeps order/broker identity while creating a distinct submission attempt."
  );
}


// =========================================================
// Scenario 3:
// Uncertain response cannot become ROUTED/FILLED and
// cannot be blindly retried.
// =========================================================

let uncertainAttemptId = null;

{
  reset(
    baseOrder({
      status: "QUEUED",
      queuedAt:
        "2026-09-14T09:30:00.000Z"
    })
  );

  state.adapterPlan.push({
    type: "UNCERTAIN_RESPONSE",
    status:
      "MANUAL_CONFIRMATION_REQUIRED",
    submittedAt:
      "2026-09-14T10:00:00.000Z"
  });

  const uncertain =
    await routeExecutionOrderByMode(
      "EO-A25-1"
    );

  const order =
    uncertain.orders.find(
      (item) =>
        item.id === "EO-A25-1"
    );

  uncertainAttemptId =
    order.submissionAttemptId;

  assert.equal(
    order.status,
    "BROKER_SELECTED"
  );

  assert.equal(
    order.brokerStatus,
    "SUBMISSION_UNCERTAIN"
  );

  assert.ok(
    uncertainAttemptId
  );

  let audit =
    chronological(
      await events()
    );

  assert.deepEqual(
    audit.map(
      (event) => event.eventType
    ),
    [
      "REAL_SUBMISSION_STARTED",
      "REAL_SUBMISSION_UNCERTAIN"
    ]
  );

  assert.equal(
    eventsOfType(
      audit,
      "REAL_ORDER_ROUTED"
    ).length,
    0
  );

  assert.equal(
    eventsOfType(
      audit,
      "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE"
    ).length,
    0
  );

  const adapterCallsBeforeRetry =
    state.adapterCalls.length;

  await assert.rejects(
    () =>
      routeExecutionOrderByMode(
        "EO-A25-1"
      ),
    (error) =>
      error?.code ===
      "REAL_ORDER_RECONCILIATION_REQUIRED"
  );

  assert.equal(
    state.adapterCalls.length,
    adapterCallsBeforeRetry
  );

  audit =
    chronological(
      await events()
    );

  assert.equal(
    audit.length,
    2
  );

  console.log(
    "PASS: uncertain REAL submission remains unresolved and cannot be blindly retried."
  );
}


// =========================================================
// Scenario 4:
// Genuine verified evidence resolves same uncertain order.
// =========================================================

{
  const evidence = {
    id: "EVIDENCE-A25-1",

    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION",

    canAffectRealPortfolio: true,

    sourceType:
      "BROKER_TRANSACTION_STATEMENT",

    source:
      "TRANSACTION_UPLOAD",

    executionStatus: "FILLED",
    status: "FILLED",

    broker: "ABC",
    brokerId: "ABC",

    brokerReference:
      "ABC-A25-RECOVERY-1",

    symbol: "SCOM",
    side: "BUY",
    quantity: 100,
    price: 25,

    executionDate:
      "2026-09-14T10:05:00.000Z",

    settlementStatus: "SETTLED",
    settlementDate:
      "2026-09-16T00:00:00.000Z",

    totalFees: 25
  };

  const result =
    await reconcileUncertainRealOrderFromVerifiedEvidence({
      orderId: "EO-A25-1",
      records: [evidence]
    });

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.persistenceSucceeded,
    true
  );

  const order =
    await currentOrder();

  assert.equal(
    order.status,
    "FILLED"
  );

  assert.equal(
    order.brokerOrderId,
    "ABC-A25-RECOVERY-1"
  );

  assert.equal(
    order.submissionAttemptId,
    uncertainAttemptId
  );

  assert.equal(
    order.filledAt,
    "2026-09-14T10:05:00.000Z"
  );

  const ordered =
    chronological(
      await events()
    );

  assert.deepEqual(
    ordered.map(
      (event) => event.eventType
    ),
    [
      "REAL_SUBMISSION_STARTED",
      "REAL_SUBMISSION_UNCERTAIN",
      "REAL_RECOVERY_MATCHED",
      "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE"
    ]
  );

  const matched =
    ordered[2];

  const filled =
    ordered[3];

  assert.equal(
    matched.orderId,
    "EO-A25-1"
  );

  assert.equal(
    filled.orderId,
    "EO-A25-1"
  );

  assert.equal(
    matched.submissionAttemptId,
    uncertainAttemptId
  );

  assert.equal(
    filled.submissionAttemptId,
    uncertainAttemptId
  );

  assert.equal(
    matched.brokerReference,
    "ABC-A25-RECOVERY-1"
  );

  assert.equal(
    filled.brokerReference,
    "ABC-A25-RECOVERY-1"
  );

  assert.equal(
    filled.evidenceStatus,
    "VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    filled.payload.executionDate,
    "2026-09-14T10:05:00.000Z"
  );

  assert.equal(
    filled.brokerId,
    "ABC"
  );

  assert.equal(
    filled.brokerAccountId,
    "ACC-ABC-1"
  );

  console.log(
    "PASS: verified evidence resolves the same REAL order and preserves audit provenance."
  );
}


// =========================================================
// Scenario 5:
// Audit persistence failure must not become execution
// failure or cause a second broker submission.
// =========================================================

{
  reset(
    baseOrder({
      status: "QUEUED",
      queuedAt:
        "2026-09-14T09:30:00.000Z"
    })
  );

  state.auditWriteFailure = true;

  state.adapterPlan.push({
    type: "CONFIRMED",
    brokerOrderId:
      "ABC-A25-AUDIT-FAIL-1"
  });

  const routed =
    await routeExecutionOrderByMode(
      "EO-A25-1"
    );

  const order =
    routed.orders.find(
      (item) =>
        item.id === "EO-A25-1"
    );

  assert.equal(
    order.status,
    "ROUTED"
  );

  assert.equal(
    order.brokerOrderId,
    "ABC-A25-AUDIT-FAIL-1"
  );

  assert.equal(
    state.adapterCalls.length,
    1
  );

  assert.equal(
    state.storage.has(AUDIT_KEY),
    false
  );

  const persisted =
    await currentOrder();

  assert.equal(
    persisted.status,
    "ROUTED"
  );

  assert.equal(
    persisted.brokerOrderId,
    "ABC-A25-AUDIT-FAIL-1"
  );

  assert.equal(
    persisted.adapterError,
    false
  );

  console.log(
    "PASS: audit-storage failure cannot reverse ROUTED state or cause duplicate broker submission."
  );
}


// =========================================================
// Scenario 6:
// Queueing an already queued order must not create a
// duplicate queue audit event.
// =========================================================

{
  reset();

  await queueSingleOrder(
    "EO-A25-1"
  );

  await queueSingleOrder(
    "EO-A25-1"
  );

  const audit =
    await events();

  assert.equal(
    eventsOfType(
      audit,
      "REAL_ORDER_QUEUED"
    ).length,
    1
  );

  console.log(
    "PASS: repeated queue-single operation does not duplicate REAL_ORDER_QUEUED audit evidence."
  );
}


console.log();
console.log(
  "PC-031A25 REAL execution audit runtime tests PASSED."
);

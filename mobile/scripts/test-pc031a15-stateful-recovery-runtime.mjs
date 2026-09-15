import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const state = {
  execution: null,
  transitionDecision: null,
  updateResult: null,
  updateError: null,

  loadCalls: 0,
  transitionCalls: [],
  updateCalls: []
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
  Promise
});

context.__state = state;

function moduleFrom(code, identifier) {
  return new vm.SourceTextModule(
    code,
    {
      context,
      identifier
    }
  );
}

const servicePath = new URL(
  "../src/features/broker-sync/" +
    "realOrderExecutionEvidenceReconciliationService.js",
  import.meta.url
);

const service = moduleFrom(
  await readFile(servicePath, "utf8"),
  servicePath.href
);

const basketStore = moduleFrom(
  `
  export async function loadBasketExecution() {
    globalThis.__state.loadCalls += 1;
    return globalThis.__state.execution;
  }

  export async function updateExecutionOrder(
    orderId,
    patch
  ) {
    globalThis.__state.updateCalls.push({
      orderId,
      patch
    });

    if (globalThis.__state.updateError) {
      throw globalThis.__state.updateError;
    }

    return globalThis.__state.updateResult;
  }
  `,
  "mock:basket-store"
);

const transitionCore = moduleFrom(
  `
  export function buildRealOrderRecoveryTransition(
    args
  ) {
    globalThis.__state.transitionCalls.push(args);
    return globalThis.__state.transitionDecision;
  }
  `,
  "mock:transition-core"
);

const executionAuditStore = moduleFrom(
  `
  export async function addExecutionAuditEvent() {
    return null;
  }
  `,
  "mock:execution-audit-store"
);

const matchCore = moduleFrom(
  `
  export function findVerifiedEvidenceMatches() {
    return [];
  }

  export function buildVerifiedEvidenceMatchAudit() {
    return {
      status: "NO_VERIFIED_MATCH",
      matchCount: 0
    };
  }
  `,
  "mock:match-core"
);

await service.link(
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
      return transitionCore;
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
      return executionAuditStore;
    }

    throw new Error(
      `Unexpected dependency: ${specifier}`
    );
  }
);

await basketStore.evaluate();
await transitionCore.evaluate();
await matchCore.evaluate();
await executionAuditStore.evaluate();
await service.evaluate();

const reconcile =
  service.namespace
    .reconcileUncertainRealOrderFromVerifiedEvidence;

const ORDER_ID =
  "ORDER-A15-1";

const VERIFIED_RECORD = {
  id: "EVIDENCE-A15-1",
  status: "FILLED",
  brokerReference: "ABC-A15-1"
};

const UNIQUE_PATCH = {
  executionMode: "REAL",
  status: "FILLED",
  brokerStatus: "FILLED",
  brokerOrderId: "ABC-A15-1",
  filledQuantity: 100,
  remainingQuantity: 0,
  averageFillPrice: 25,
  filledAt:
    "2026-09-14T11:00:00.000Z"
};

function baseOrder(overrides = {}) {
  return {
    id: ORDER_ID,
    executionMode: "REAL",
    status: "BROKER_SELECTED",
    brokerStatus:
      "SUBMISSION_UNCERTAIN",
    symbol: "SCOM",
    side: "BUY",
    quantity: 100,
    ...overrides
  };
}

function reset({
  execution = {
    executionMode: "REAL",
    orders: [baseOrder()]
  },
  decision,
  updateResult = {
    id: "EXEC-A15-UPDATED",
    executionMode: "REAL",
    orders: [
      {
        ...baseOrder(),
        ...UNIQUE_PATCH
      }
    ]
  },
  updateError = null
} = {}) {
  state.execution = execution;
  state.transitionDecision = decision;
  state.updateResult = updateResult;
  state.updateError = updateError;

  state.loadCalls = 0;
  state.transitionCalls = [];
  state.updateCalls = [];
}

async function run() {
  return await reconcile({
    orderId: ORDER_ID,
    records: [VERIFIED_RECORD]
  });
}

function unresolved(
  status,
  extra = {}
) {
  return {
    resolved: false,
    status,
    orderId: ORDER_ID,
    matchCount: 0,
    patch: null,
    evidence: null,
    ...extra
  };
}

// 1. ORDER_NOT_FOUND -> no mutation.
{
  reset({
    execution: {
      executionMode: "REAL",
      orders: []
    },
    decision:
      unresolved(
        "ORDER_NOT_FOUND"
      )
  });

  const result = await run();

  assert.equal(
    state.loadCalls,
    1
  );

  assert.equal(
    state.transitionCalls.length,
    1
  );

  assert.equal(
    state.transitionCalls[0].order,
    undefined
  );

  assert.equal(
    state.updateCalls.length,
    0
  );

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "ORDER_NOT_FOUND"
  );

  console.log(
    "PASS: ORDER_NOT_FOUND performs no execution update."
  );
}

// 2. PRACTICE -> no mutation.
{
  reset({
    execution: {
      executionMode: "PRACTICE",
      orders: [
        baseOrder({
          executionMode: "PRACTICE"
        })
      ]
    },
    decision:
      unresolved(
        "NOT_REAL_ORDER"
      )
  });

  const result = await run();

  assert.equal(
    state.updateCalls.length,
    0
  );

  assert.equal(
    result.status,
    "NOT_REAL_ORDER"
  );

  console.log(
    "PASS: PRACTICE recovery performs no execution update."
  );
}

// 3. Non-recoverable REAL order -> no mutation.
{
  reset({
    decision:
      unresolved(
        "ORDER_NOT_RECOVERABLE",
        {
          brokerStatus: "ADAPTER_ERROR"
        }
      )
  });

  const result = await run();

  assert.equal(
    state.updateCalls.length,
    0
  );

  assert.equal(
    result.status,
    "ORDER_NOT_RECOVERABLE"
  );

  console.log(
    "PASS: non-recoverable REAL order performs no execution update."
  );
}

// 4. No verified match -> no mutation.
{
  reset({
    decision:
      unresolved(
        "NO_VERIFIED_MATCH"
      )
  });

  const result = await run();

  assert.equal(
    state.updateCalls.length,
    0
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  console.log(
    "PASS: no verified match performs no execution update."
  );
}

// 5. Ambiguous verified evidence -> no mutation.
{
  reset({
    decision: {
      resolved: false,
      status:
        "AMBIGUOUS_VERIFIED_MATCH",
      orderId: ORDER_ID,
      matchCount: 2,
      brokerReferences: [
        "ABC-A15-1",
        "ABC-A15-2"
      ],
      patch: null,
      evidence: null
    }
  });

  const result = await run();

  assert.equal(
    state.updateCalls.length,
    0
  );

  assert.equal(
    result.status,
    "AMBIGUOUS_VERIFIED_MATCH"
  );

  assert.equal(
    result.matchCount,
    2
  );

  console.log(
    "PASS: ambiguous verified evidence performs no execution update."
  );
}

// 6-8. Unique verified match -> exactly one update.
{
  const persistedExecution = {
    id: "EXEC-A15-PERSISTED",
    executionMode: "REAL",
    orders: [
      {
        ...baseOrder(),
        ...UNIQUE_PATCH
      }
    ]
  };

  reset({
    decision: {
      resolved: true,
      status:
        "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION",
      orderId: ORDER_ID,
      matchCount: 1,
      evidence:
        VERIFIED_RECORD,
      patch:
        UNIQUE_PATCH
    },
    updateResult:
      persistedExecution
  });

  const result = await run();

  assert.equal(
    state.loadCalls,
    1
  );

  assert.equal(
    state.transitionCalls.length,
    1
  );

  assert.equal(
    state.transitionCalls[0]
      .order.id,
    ORDER_ID
  );

  assert.equal(
    state.transitionCalls[0]
      .executionMode,
    "REAL"
  );

  assert.deepEqual(
    state.transitionCalls[0]
      .records,
    [VERIFIED_RECORD]
  );

  assert.equal(
    state.updateCalls.length,
    1
  );

  assert.equal(
    state.updateCalls[0]
      .orderId,
    ORDER_ID
  );

  assert.deepEqual(
    state.updateCalls[0]
      .patch,
    UNIQUE_PATCH
  );

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.status,
    "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    result.persistenceSucceeded,
    true
  );

  assert.equal(
    result.evidenceMatched,
    true
  );

  assert.equal(
    result.execution,
    persistedExecution
  );

  console.log(
    "PASS: unique verified match performs exactly one persisted execution update."
  );
}

// 9. Null persistence result must not fabricate success.
{
  reset({
    decision: {
      resolved: true,
      status:
        "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION",
      orderId: ORDER_ID,
      matchCount: 1,
      evidence:
        VERIFIED_RECORD,
      patch:
        UNIQUE_PATCH
    },
    updateResult: null
  });

  const result = await run();

  assert.equal(
    state.updateCalls.length,
    1
  );

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "RECONCILIATION_PERSISTENCE_FAILED"
  );

  assert.equal(
    result.evidenceMatched,
    true
  );

  assert.equal(
    result.persistenceSucceeded,
    false
  );

  assert.equal(
    result.execution,
    null
  );

  console.log(
    "PASS: null persistence result cannot fabricate resolved recovery."
  );
}

// 10. Persistence exception must propagate.
{
  const failure =
    new Error(
      "SIMULATED_EXECUTION_STORE_FAILURE"
    );

  reset({
    decision: {
      resolved: true,
      status:
        "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION",
      orderId: ORDER_ID,
      matchCount: 1,
      evidence:
        VERIFIED_RECORD,
      patch:
        UNIQUE_PATCH
    },
    updateError:
      failure
  });

  await assert.rejects(
    () => run(),
    /SIMULATED_EXECUTION_STORE_FAILURE/
  );

  assert.equal(
    state.updateCalls.length,
    1
  );

  console.log(
    "PASS: execution-store exception propagates instead of fabricating success."
  );
}

console.log("");
console.log(
  "PC-031A15 stateful recovery runtime tests PASSED."
);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "latin1");
}

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`PASS: ${message}`);
}

console.log("===== PC-031A22 REAL EXECUTION STATUS READ MODEL =====");

const model = read(
  "src/services/trade/realExecutionStatusReadModel.js"
);

const store = read(
  "src/services/trade/basketExecutionStore.js"
);

const recovery = read(
  "src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
);

assert(
  model.includes("export function buildExecutionStatusReadModel"),
  "canonical execution status read model exists"
);

assert(
  model.includes("Object.freeze"),
  "read model returns immutable presentation data"
);

assert(
  !model.includes("updateExecutionOrder") &&
    !model.includes("saveBasketExecution") &&
    !model.includes("placeBrokerOrder") &&
    !model.includes("userSetItem"),
  "read model has no execution, broker-routing, or persistence mutation path"
);

assert(
  model.includes('"SUBMITTING"') &&
    model.includes('"SUBMISSION_UNCERTAIN"') &&
    model.includes('"MANUAL_CONFIRMATION_REQUIRED"'),
  "read model recognizes all REAL reconciliation-required broker states"
);

assert(
  model.includes('brokerStatus === "ADAPTER_ERROR"') &&
    model.includes("canRetryRouting = true"),
  "definite adapter failure remains distinguishable from uncertain submission"
);

assert(
  model.includes('status === ORDER_STATUS.ROUTED') &&
    model.includes("This is not execution confirmation"),
  "ROUTED is explicitly not treated as execution confirmation"
);

assert(
  model.includes('status === ORDER_STATUS.FILLED') &&
    model.includes("Verified broker execution evidence"),
  "REAL FILLED presentation identifies verified broker evidence"
);

assert(
  model.includes("portfolioEffectClaimed: false"),
  "status presentation cannot claim or create canonical portfolio effects"
);

assert(
  store.includes(
    "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION"
  ),
  "existing REAL manual fill guard remains intact"
);

assert(
  recovery.includes(
    "const transitionStatus ="
  ) &&
    recovery.includes(
      "? ORDER_STATUS.FILLED"
    ) &&
    recovery.includes(
      ": ORDER_STATUS.PARTIAL_FILL"
    ) &&
    recovery.includes(
      "status: transitionStatus"
    ),
  "verified recovery transition remains the REAL PARTIAL_FILL/FILLED source"
);

assert(
  !model.includes("new Date("),
  "read model cannot fabricate execution timestamps"
);


// ---------------------------------------------------------
// Queue Manager convergence contract
// ---------------------------------------------------------

const queueManager = read(
  "app/queue-manager.js"
);

assert(
  queueManager.includes(
    'buildExecutionStatusReadModel'
  ),
  "Queue Manager consumes the canonical execution-status read model"
);

assert(
  queueManager.includes(
    "statusViewFor(order).recoveryRequired"
  ),
  "Queue Manager recovery detection uses canonical recoveryRequired"
);

assert(
  queueManager.includes(
    "statusViewFor(order).canRetryRouting"
  ),
  "Queue Manager routing/retry eligibility uses canonical canRetryRouting"
);

assert(
  queueManager.includes(
    "statusViewFor(order).isReal"
  ),
  "Queue Manager uses canonical REAL/PRACTICE interpretation"
);

assert(
  queueManager.includes(
    "statusViewFor(order).label"
  ),
  "Queue Manager displays the canonical investor-facing status label"
);

assert(
  queueManager.includes(
    "statusViewFor(order).explanation"
  ),
  "Queue Manager displays the canonical status explanation"
);

assert(
  !queueManager.includes('"SUBMISSION_UNCERTAIN"') &&
    !queueManager.includes('"MANUAL_CONFIRMATION_REQUIRED"') &&
    !queueManager.includes('"SUBMITTING"') &&
    !queueManager.includes('"ADAPTER_ERROR"'),
  "Queue Manager no longer independently interprets REAL broker submission states"
);

assert(
  queueManager.includes(
    "!statusViewFor(order).isReal"
  ),
  "Practice-only manual partial action is hidden from REAL orders"
);



// ---------------------------------------------------------
// Orders screen convergence contract
// ---------------------------------------------------------

const ordersScreen = read(
  "app/orders.js"
);

assert(
  ordersScreen.includes(
    "buildExecutionStatusReadModel"
  ),
  "Orders screen consumes the canonical execution-status read model"
);

assert(
  ordersScreen.includes(
    "statusView={statusViewFor(order)}"
  ),
  "Orders screen supplies canonical status interpretation to each order card"
);

assert(
  ordersScreen.includes(
    '"RECONCILIATION_REQUIRED"'
  ),
  "Orders Routed view keeps REAL reconciliation-required orders visible"
);

assert(
  ordersScreen.includes(
    "const canRoute = statusView.canRetryRouting"
  ),
  "Orders routing eligibility uses canonical canRetryRouting"
);

assert(
  ordersScreen.includes(
    "!statusView.isReal"
  ),
  "Orders simulated fill action remains Practice-only"
);

assert(
  ordersScreen.includes(
    "if (statusView.isReal)"
  ),
  "Orders manual-fill handler retains a canonical REAL safety guard"
);

assert(
  ordersScreen.includes(
    "{statusView.label}"
  ),
  "Orders displays the canonical investor-facing status label"
);

assert(
  ordersScreen.includes(
    "statusView.explanation"
  ),
  "Orders uses the canonical investor-facing explanation"
);

assert(
  ordersScreen.includes(
    "statusView.brokerStatus"
  ),
  "Orders exposes canonical broker status when available"
);

assert(
  !ordersScreen.includes(
    'const executionMode = String('
  ),
  "Orders no longer independently derives REAL/PRACTICE execution mode"
);


// ---------------------------------------------------------
// Orders Review convergence contract
// ---------------------------------------------------------

const ordersReview = read(
  "app/orders-review.js"
);

assert(
  ordersReview.includes(
    "buildExecutionStatusReadModel"
  ),
  "Orders Review consumes the canonical execution-status read model"
);

assert(
  ordersReview.includes(
    "statusView={statusViewFor(order)}"
  ),
  "Orders Review supplies canonical status interpretation to each review card"
);

assert(
  ordersReview.includes(
    "statusView.isReal"
  ),
  "Orders Review uses canonical per-order REAL/PRACTICE presentation"
);

assert(
  ordersReview.includes(
    "{statusView.label}"
  ),
  "Orders Review displays the canonical investor-facing status label"
);

assert(
  ordersReview.includes(
    "statusView.explanation"
  ),
  "Orders Review uses the canonical investor-facing explanation"
);

assert(
  ordersReview.includes(
    "statusView.brokerStatus"
  ),
  "Orders Review exposes canonical broker submission status when available"
);

assert(
  ordersReview.includes(
    "statusViewFor(order).recoveryRequired"
  ),
  "Orders Review surfaces REAL reconciliation-required orders"
);

assert(
  ordersReview.includes(
    'router.push("/real-order-recovery")'
  ),
  "Orders Review routes reconciliation-required investors to the canonical recovery screen"
);

assert(
  ordersReview.includes(
    "buildRealOrderBrokerEligibility"
  ) &&
    ordersReview.includes(
      "queueSingleOrder"
    ) &&
    ordersReview.includes(
      "queueExecutionOrders"
    ),
  "Orders Review retains existing broker eligibility and handoff authority"
);

assert(
  ordersReview.includes(
    'const isRealExecution = executionMode === "REAL"'
  ),
  "Orders Review retains basket-level REAL gating for broker eligibility"
);


// ---------------------------------------------------------
// REAL Order Recovery convergence contract
// ---------------------------------------------------------

const realOrderRecovery = read(
  "app/real-order-recovery.js"
);

assert(
  realOrderRecovery.includes(
    "buildExecutionStatusReadModel"
  ),
  "REAL Order Recovery consumes the canonical execution-status read model"
);

assert(
  realOrderRecovery.includes(
    ").recoveryRequired"
  ),
  "REAL Order Recovery derives recovery membership from canonical recoveryRequired"
);

assert(
  realOrderRecovery.includes(
    "{statusViewFor(order).label}"
  ),
  "REAL Order Recovery displays the canonical investor-facing recovery label"
);

assert(
  realOrderRecovery.includes(
    "{statusViewFor(order).explanation}"
  ),
  "REAL Order Recovery displays the canonical recovery explanation"
);

assert(
  realOrderRecovery.includes(
    "statusViewFor(order).brokerStatus"
  ),
  "REAL Order Recovery retains canonical broker submission-state visibility"
);

assert(
  !realOrderRecovery.includes(
    "RECOVERY_BROKER_STATUSES"
  ),
  "REAL Order Recovery no longer maintains a duplicate recovery broker-status set"
);

assert(
  !realOrderRecovery.includes(
    "function isRealRecoveryOrder"
  ),
  "REAL Order Recovery no longer independently interprets recovery eligibility"
);

assert(
  !realOrderRecovery.includes(
    "function recoveryMessage"
  ),
  "REAL Order Recovery no longer independently maps broker states to investor messages"
);

assert(
  realOrderRecovery.includes(
    "buildVerifiedEvidenceMatchAudit"
  ),
  "REAL Order Recovery preserves verified evidence match auditing"
);

assert(
  realOrderRecovery.includes(
    'userGetItem("transactionHistory")'
  ) &&
    realOrderRecovery.includes(
      'userGetItem("unverifiedTransactionHistory")'
    ),
  "REAL Order Recovery preserves stored evidence loading"
);

assert(
  realOrderRecovery.includes(
    'pathname: "/transactions-upload"'
  ) &&
    realOrderRecovery.includes(
      'mode: "RECONCILE"'
    ),
  "REAL Order Recovery preserves canonical transaction-evidence reconciliation handoff"
);

assert(
  !realOrderRecovery.includes(
    "markExecutionOrderFilled"
  ) &&
    !realOrderRecovery.includes(
      "routeExecutionOrderByMode"
    ),
  "REAL Order Recovery remains read-only with respect to manual fill and broker routing"
);


// ---------------------------------------------------------
// Basket Execution convergence contract
// ---------------------------------------------------------

const basketExecution = read(
  "app/basket-execution.js"
);

assert(
  basketExecution.includes(
    "buildExecutionStatusReadModel"
  ),
  "Basket Execution consumes the canonical execution-status read model"
);

assert(
  basketExecution.includes(
    '"RECONCILIATION_REQUIRED"'
  ),
  "Basket Execution keeps reconciliation-required REAL orders active and visible"
);

assert(
  basketExecution.includes(
    "statusViewFor(order).recoveryRequired"
  ),
  "Basket Execution derives unresolved REAL recovery state canonically"
);

assert(
  basketExecution.includes(
    "recoveryOrders.length === 0"
  ),
  "Basket Execution cannot declare completion while REAL recovery remains unresolved"
);

assert(
  basketExecution.includes(
    'router.push('
  ) &&
    basketExecution.includes(
      '"/real-order-recovery"'
    ),
  "Basket Execution routes unresolved REAL submissions to the canonical recovery screen"
);

assert(
  basketExecution.includes(
    "REAL Broker Reconciliation Required"
  ),
  "Basket Execution visibly warns when REAL broker reconciliation is required"
);

assert(
  basketExecution.includes(
    "if (recoveryOrders.length > 0)"
  ),
  "Basket Execution blocks clearing unresolved REAL recovery state"
);

assert(
  basketExecution.includes(
    "statusViewFor(order).label"
  ),
  "Basket Execution displays canonical investor-facing OMS status labels"
);

assert(
  basketExecution.includes(
    "statusViewFor(order).explanation"
  ),
  "Basket Execution displays canonical OMS status explanations"
);

assert(
  basketExecution.includes(
    "REAL Basket Execution Status"
  ),
  "Basket Execution no longer labels REAL OMS state as Practice simulation"
);

assert(
  !basketExecution.includes(
    "getActiveExecutionOrders"
  ),
  "Basket Execution no longer relies on a second raw active-order interpretation"
);

assert(
  basketExecution.includes(
    "brokerPlanMode"
  ) &&
    basketExecution.includes(
      "buildBrokerActionPlanText"
    ),
  "Basket Execution preserves the separate advisory Broker Action Plan mode"
);

assert(
  !basketExecution.includes(
    "markExecutionOrderFilled"
  ) &&
    !basketExecution.includes(
      "routeExecutionOrderByMode"
    ) &&
    !basketExecution.includes(
      "updateExecutionOrder"
    ),
  "Basket Execution remains free of REAL fill/routing mutation services"
);

console.log();

if (process.exitCode) {
  console.error(
    "PC-031A22 REAL EXECUTION STATUS CONVERGENCE FAILED"
  );
  process.exit(process.exitCode);
}

console.log(
  "PASS: PC-031A22 canonical REAL execution status convergence contract."
);

/*
 * PC-031B4M7C5D7F2
 *
 * Persisted Practice execution orchestrator.
 *
 * This service does not own:
 * - Practice accounting
 * - OMS persistence
 * - broker routing semantics
 * - REAL execution
 *
 * Existing canonical authorities remain:
 *
 * routeExecutionOrderByMode()
 *   -> Practice QUEUED -> BROKER_RECEIVED
 *
 * markExecutionOrderFilled()
 *   -> canonical Practice settlement
 *   -> durable idempotency marker/history
 *   -> OMS FILLED
 *
 * The orchestrator is intentionally restartable. It derives the
 * next action from persisted OMS state instead of depending on a
 * React component timer or an in-memory workflow cursor.
 */

import {
  loadBasketExecution,
  routeExecutionOrderByMode,
  markExecutionOrderFilled
} from "./basketExecutionStore";

import {
  preflightCanonicalPracticeExecutionOrders
} from "./practiceExecutionAccountingService";

import {
  ORDER_STATUS
} from "./orderLifecycle";

import {
  archiveClosedPracticeExecution
} from "./practiceExecutionHistoryService";

const PRACTICE_MODE = "PRACTICE";

function executionModeOf(order = {}, execution = {}) {
  return String(
    order?.executionMode ||
      execution?.executionMode ||
      PRACTICE_MODE
  ).toUpperCase();
}

function errorWithCode(code, extra = {}) {
  const error = new Error(code);
  error.code = code;

  Object.assign(
    error,
    extra
  );

  return error;
}

function practiceOrders(execution = {}) {
  return (execution?.orders || []).filter(
    (order) =>
      executionModeOf(
        order,
        execution
      ) === PRACTICE_MODE
  );
}

function resumablePracticeOrders(execution = {}) {
  return practiceOrders(execution).filter(
    (order) =>
      [
        ORDER_STATUS.QUEUED,
        ORDER_STATUS.ROUTED,
        ORDER_STATUS.BROKER_RECEIVED,
        ORDER_STATUS.PARTIAL_FILL
      ].includes(
        String(order?.status || "").toUpperCase()
      )
  );
}

function fillablePracticeOrders(execution = {}) {
  return practiceOrders(execution).filter(
    (order) =>
      [
        ORDER_STATUS.ROUTED,
        ORDER_STATUS.BROKER_RECEIVED,
        ORDER_STATUS.PARTIAL_FILL
      ].includes(
        String(order?.status || "").toUpperCase()
      )
  );
}

function queuedPracticeOrders(execution = {}) {
  return practiceOrders(execution).filter(
    (order) =>
      String(order?.status || "").toUpperCase() ===
      ORDER_STATUS.QUEUED
  );
}

function filledPracticeOrders(execution = {}) {
  return practiceOrders(execution).filter(
    (order) =>
      String(order?.status || "").toUpperCase() ===
      ORDER_STATUS.FILLED
  );
}

function assertPracticeExecution(execution) {
  if (!execution) {
    throw errorWithCode(
      "ACTIVE_EXECUTION_REQUIRED"
    );
  }

  const orders =
    execution?.orders || [];

  if (!orders.length) {
    throw errorWithCode(
      "EXECUTION_ORDERS_REQUIRED"
    );
  }

  const realOrders =
    orders.filter(
      (order) =>
        executionModeOf(
          order,
          execution
        ) === "REAL"
    );

  if (realOrders.length) {
    throw errorWithCode(
      "PRACTICE_ORCHESTRATOR_REAL_EXECUTION_FORBIDDEN",
      {
        realOrderIds:
          realOrders.map(
            (order) => order?.id
          )
      }
    );
  }

  return execution;
}

/*
 * Produce the deterministic full-fill trade evidence used by the
 * Practice broker simulator.
 *
 * No economic mutation happens here. markExecutionOrderFilled()
 * remains the only settlement boundary.
 */
function practiceFullFillTrade(order = {}) {
  const quantity =
    Number(order?.quantity || 0);

  const price =
    Number(
      order?.price ||
        order?.limitPrice ||
        0
    );

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw errorWithCode(
      "INVALID_PRACTICE_EXECUTION_QUANTITY",
      {
        orderId: order?.id || null
      }
    );
  }

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    throw errorWithCode(
      "INVALID_PRACTICE_EXECUTION_PRICE",
      {
        orderId: order?.id || null
      }
    );
  }

  return {
    executionMode: PRACTICE_MODE,
    isPractice: true,
    source:
      "GATECEP_BROKER_PRACTICE_ORCHESTRATOR",
    quantity,
    filledQuantity: quantity,
    remainingQuantity: 0,
    price
  };
}

/*
 * Read persisted state and describe whether the execution can be
 * resumed. This function itself performs no mutation.
 */
export async function inspectPracticeExecutionOrchestrator() {
  const execution =
    await loadBasketExecution();

  if (!execution) {
    return {
      ok: true,
      state: "NO_ACTIVE_EXECUTION",
      execution: null,
      totalOrders: 0,
      queuedOrders: 0,
      fillableOrders: 0,
      filledOrders: 0
    };
  }

  assertPracticeExecution(
    execution
  );

  const queued =
    queuedPracticeOrders(
      execution
    );

  const fillable =
    fillablePracticeOrders(
      execution
    );

  const filled =
    filledPracticeOrders(
      execution
    );

  return {
    ok: true,
    state:
      queued.length > 0
        ? "ROUTING_REQUIRED"
        : fillable.length > 0
        ? "SETTLEMENT_REQUIRED"
        : filled.length ===
            practiceOrders(execution).length
        ? "COMPLETE"
        : "NO_RESUMABLE_ACTION",
    execution,
    totalOrders:
      practiceOrders(execution).length,
    queuedOrders:
      queued.length,
    fillableOrders:
      fillable.length,
    filledOrders:
      filled.length
  };
}

/*
 * One persisted orchestration pass.
 *
 * IMPORTANT:
 * Aggregate affordability is checked BEFORE the first economic
 * settlement in this pass.
 *
 * QUEUED orders may be routed first because routing has no Practice
 * economic effect. After routing, persisted state is reloaded and
 * the complete fillable batch is preflighted before the first fill.
 *
 * If the app stops after any transition, calling this function
 * again resumes from persisted OMS state.
 */
export async function runPracticeExecutionOrchestrator() {
  let execution =
    await loadBasketExecution();

  assertPracticeExecution(
    execution
  );

  const initialResumable =
    resumablePracticeOrders(
      execution
    );

  if (!initialResumable.length) {
    const practiceOrderSet =
      practiceOrders(
        execution
      );

    const allPracticeOrdersClosed =
      practiceOrderSet.length > 0 &&
      practiceOrderSet.every(
        (order) =>
          [
            ORDER_STATUS.FILLED,
            ORDER_STATUS.CANCELLED,
            ORDER_STATUS.REJECTED,
            ORDER_STATUS.EXPIRED
          ].includes(
            String(
              order?.status || ""
            ).toUpperCase()
          )
      );

    /*
     * PC-031B4M7C5D7F5J1C
     *
     * Recovery may encounter an execution whose canonical
     * settlement/OMS completion succeeded before the historical
     * archive write completed.
     *
     * Repair that observational history here. This does not
     * route, fill, settle, clear, or otherwise mutate OMS.
     */
    if (allPracticeOrdersClosed) {
      await archiveClosedPracticeExecution(
        execution
      );
    }

    return {
      ok: true,
      state:
        allPracticeOrdersClosed
          ? "COMPLETE"
          : "NO_RESUMABLE_ACTION",
      execution,
      routedOrders: 0,
      filledOrders: 0
    };
  }

  /*
   * Phase 1 — broker routing.
   *
   * routeExecutionOrderByMode() is the canonical Practice routing
   * authority and currently persists QUEUED -> BROKER_RECEIVED.
   */
  const queued =
    queuedPracticeOrders(
      execution
    );

  let routedCount = 0;

  for (const order of queued) {
    await routeExecutionOrderByMode(
      order.id
    );

    routedCount += 1;
  }

  /*
   * Always reload after routing. The next phase must operate on
   * canonical persisted OMS state rather than stale objects.
   */
  execution =
    await loadBasketExecution();

  assertPracticeExecution(
    execution
  );

  const fillable =
    fillablePracticeOrders(
      execution
    );

  if (!fillable.length) {
    return {
      ok: true,
      state: "NO_FILLABLE_ORDERS",
      execution,
      routedOrders:
        routedCount,
      filledOrders: 0
    };
  }

  /*
   * Phase 2 — aggregate economic guard.
   *
   * This MUST happen before the first fill so an underfunded batch
   * cannot partially mutate the Practice Portfolio.
   */
  const preflight =
    await preflightCanonicalPracticeExecutionOrders(
      fillable
    );

  if (
    preflight?.ok === false ||
    Number(
      preflight?.additionalCashRequired ||
        0
    ) > 0
  ) {
    throw errorWithCode(
      "INSUFFICIENT_PRACTICE_CASH",
      {
        preflight
      }
    );
  }

  /*
   * Phase 3 — canonical settlement.
   *
   * markExecutionOrderFilled() owns:
   * - durable Practice settlement
   * - holdings/cash mutation
   * - Practice history
   * - OMS FILLED
   *
   * Its durable settlement marker makes this loop safe to resume
   * after an interrupted settlement attempt.
   */
  let filledCount = 0;

  for (const order of fillable) {
    await markExecutionOrderFilled(
      order.id,
      practiceFullFillTrade(
        order
      )
    );

    filledCount += 1;
  }

  execution =
    await loadBasketExecution();

  assertPracticeExecution(
    execution
  );

  const remaining =
    resumablePracticeOrders(
      execution
    );

  /*
   * PC-031B4M7C5D7F5J1
   *
   * Archive only after canonical OMS/accounting completion.
   * History remains observational and never controls routing,
   * settlement, recovery, or active execution state.
   */
  if (remaining.length === 0) {
    await archiveClosedPracticeExecution(
      execution
    );
  }


  return {
    ok: true,
    state:
      remaining.length === 0
        ? "COMPLETE"
        : "RESUMABLE",
    execution,
    routedOrders:
      routedCount,
    filledOrders:
      filledCount,
    remainingOrders:
      remaining.length
  };
}

/*
 * Explicit recovery alias.
 *
 * Recovery intentionally runs the exact same persisted-state
 * machine. There is no separate recovery settlement path.
 */
export async function resumePracticeExecutionOrchestrator() {
  return await runPracticeExecutionOrchestrator();
}

/*
 * PC-031B4M7C5D7F5J1
 *
 * Durable closed Practice execution history.
 *
 * This store is historical evidence only.
 *
 * It does NOT:
 * - route orders
 * - fill orders
 * - settle Practice accounting
 * - mutate holdings or cash
 * - clear activeBasketExecution
 * - participate in REAL execution
 *
 * activeBasketExecution remains the persisted OMS/recovery authority.
 */

import {
  userGetItem,
  userSetItem
} from "../auth/userStorage";

import {
  isActiveOrder,
  isClosedOrder
} from "./orderLifecycle";

const PRACTICE_EXECUTION_HISTORY_KEY =
  "practiceExecutionHistory";

const PRACTICE_MODE = "PRACTICE";

/*
 * PC-031B4M7C5D7F5J1D
 *
 * Serialize Practice execution-history read/modify/write operations
 * within the running app so concurrent archive requests cannot
 * overwrite one another.
 *
 * This queue protects historical evidence only. It is not an OMS,
 * routing, settlement, portfolio, or REAL execution lock.
 */
let practiceExecutionHistoryWriteQueue =
  Promise.resolve();

function serializePracticeExecutionHistoryWrite(
  operation
) {
  const run =
    practiceExecutionHistoryWriteQueue.then(
      operation,
      operation
    );

  practiceExecutionHistoryWriteQueue =
    run.catch(() => undefined);

  return run;
}

function executionModeOf(execution = {}) {
  return String(
    execution?.executionMode ||
      execution?.orders?.[0]?.executionMode ||
      ""
  )
    .trim()
    .toUpperCase();
}

function cloneExecution(execution = {}) {
  return JSON.parse(
    JSON.stringify(execution)
  );
}

function assertClosedPracticeExecution(execution) {
  if (!execution?.id) {
    const error =
      new Error(
        "PRACTICE_EXECUTION_HISTORY_ID_REQUIRED"
      );

    error.code =
      "PRACTICE_EXECUTION_HISTORY_ID_REQUIRED";

    throw error;
  }

  if (
    executionModeOf(execution) !==
    PRACTICE_MODE
  ) {
    const error =
      new Error(
        "PRACTICE_EXECUTION_HISTORY_REAL_FORBIDDEN"
      );

    error.code =
      "PRACTICE_EXECUTION_HISTORY_REAL_FORBIDDEN";

    throw error;
  }

  const orders =
    Array.isArray(execution?.orders)
      ? execution.orders
      : [];

  if (!orders.length) {
    const error =
      new Error(
        "PRACTICE_EXECUTION_HISTORY_ORDERS_REQUIRED"
      );

    error.code =
      "PRACTICE_EXECUTION_HISTORY_ORDERS_REQUIRED";

    throw error;
  }

  const activeOrders =
    orders.filter((order) =>
      isActiveOrder(order?.status)
    );

  if (activeOrders.length) {
    const error =
      new Error(
        "PRACTICE_EXECUTION_HISTORY_ACTIVE_FORBIDDEN"
      );

    error.code =
      "PRACTICE_EXECUTION_HISTORY_ACTIVE_FORBIDDEN";

    error.activeOrderIds =
      activeOrders.map(
        (order) => order?.id
      );

    throw error;
  }

  const nonClosedOrders =
    orders.filter(
      (order) =>
        !isClosedOrder(order?.status)
    );

  if (nonClosedOrders.length) {
    const error =
      new Error(
        "PRACTICE_EXECUTION_HISTORY_CLOSED_REQUIRED"
      );

    error.code =
      "PRACTICE_EXECUTION_HISTORY_CLOSED_REQUIRED";

    error.orderIds =
      nonClosedOrders.map(
        (order) => order?.id
      );

    throw error;
  }

  return true;
}

export async function loadPracticeExecutionHistory() {
  const raw =
    await userGetItem(
      PRACTICE_EXECUTION_HISTORY_KEY
    );

  if (!raw) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export async function archiveClosedPracticeExecution(
  execution
) {
  assertClosedPracticeExecution(
    execution
  );

  return serializePracticeExecutionHistoryWrite(
    async () => {
    const history =
      await loadPracticeExecutionHistory();

    const executionId =
      String(execution.id);

    const existing =
      history.find(
        (item) =>
          String(item?.executionId || item?.id) ===
          executionId
      );

    if (existing) {
      return {
        ok: true,
        alreadyArchived: true,
        record: existing
      };
    }

    const snapshot =
      cloneExecution(execution);

    const record = {
      executionId,
      archivedAt:
        new Date().toISOString(),
      executionMode:
        PRACTICE_MODE,
      source:
        snapshot?.source || null,
      basketId:
        snapshot?.basketId || null,
      createdAt:
        snapshot?.createdAt || null,
      completedAt:
        snapshot?.updatedAt || null,
      totalOrders:
        snapshot?.orders?.length || 0,
      filledOrders:
        snapshot?.orders?.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() ===
            "FILLED"
        ).length || 0,
      execution:
        snapshot
    };

    await userSetItem(
      PRACTICE_EXECUTION_HISTORY_KEY,
      JSON.stringify([
        record,
        ...history
      ])
    );

    return {
      ok: true,
      alreadyArchived: false,
      record
    };
    }
  );
}

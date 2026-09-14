import { userGetItem, userSetItem } from "../auth/userStorage";
import { placeBrokerOrder } from "../brokers/brokerAdapters";
import { loadBrokerAccounts } from "../brokers/brokerAccountStore";
import { loadTradeBasket } from "./tradeBasketStore";
import {
  ORDER_STATUS,
  isActiveOrder
} from "./orderLifecycle";

const ACTIVE_BASKET_EXECUTION_KEY = "activeBasketExecution";

export async function createBasketExecution({ forceNew = false } = {}) {
  const existing = await loadBasketExecution();

  if (!forceNew && existing?.orders?.some((order) => isActiveOrder(order.status))) {
    return existing;
  }

  const basket = await loadTradeBasket();

  if (!basket?.items?.length) {
    return null;
  }

  const now = new Date().toISOString();

  const orders = basket.items.map((item, index) =>
    normalizeOrder({
      id: `EO-${Date.now()}-${index}`,
      basketItemId: item.id || `BI-${index}`,
      symbol: item.symbol,
      name: item.name || item.symbol,
      sector: item.sector || "NSE",
      side: item.side || "BUY",
      amount: Number(item.amount || 0),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || item.limitPrice || 0),
      reason: item.reason || "Coach G recommendation",
      decisionSupport:
        item.decisionSupport && typeof item.decisionSupport === "object"
          ? item.decisionSupport
          : null,
      executionMode: basket.executionMode || "PRACTICE",
      brokerId:
        item.brokerId ||
        basket.brokerId ||
        ((basket.executionMode || "PRACTICE") === "PRACTICE"
          ? "GATECEP_PRACTICE"
          : null),
      brokerAccountId: item.brokerAccountId || basket.brokerAccountId || null,
      status: ORDER_STATUS.REVIEW,
      message: "Pending review before queue",
      createdAt: now,
      updatedAt: now
    })
  );

  const execution = normalizeExecution({
    id: `EXEC-${Date.now()}`,
    basketId: basket.id,
    source: basket.source || "COACH_G",
    executionMode: basket.executionMode || "PRACTICE",
    brokerId:
      basket.brokerId ||
      ((basket.executionMode || "PRACTICE") === "PRACTICE"
        ? "GATECEP_PRACTICE"
        : null),
    brokerAccountId: basket.brokerAccountId || null,
    status: ORDER_STATUS.REVIEW,
    createdAt: now,
    updatedAt: now,
    orders
  });

  await userSetItem(ACTIVE_BASKET_EXECUTION_KEY, JSON.stringify(execution));

  return execution;
}

export async function loadBasketExecution() {
  const raw = await userGetItem(ACTIVE_BASKET_EXECUTION_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.orders?.length ? normalizeExecution(parsed) : null;
  } catch {
    return null;
  }
}

export async function saveBasketExecution(execution) {
  if (!execution) return null;

  const next = normalizeExecution({
    ...execution,
    updatedAt: new Date().toISOString()
  });

  await userSetItem(ACTIVE_BASKET_EXECUTION_KEY, JSON.stringify(next));

  return next;
}

export async function clearBasketExecution() {
  await userSetItem(ACTIVE_BASKET_EXECUTION_KEY, "");
}

export async function updateExecutionOrder(orderId, patch = {}) {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  const orders = execution.orders.map((order) =>
    order.id === orderId
      ? normalizeOrder({
          ...order,
          ...patch,
          updatedAt: new Date().toISOString()
        })
      : normalizeOrder(order)
  );

  return await saveBasketExecution({
    ...execution,
    orders
  });
}

export async function cancelExecutionOrder(orderId) {
  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.CANCELLED,
    message: "Cancelled before routing"
  });
}

export async function queueExecutionOrders() {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  const orders = execution.orders.map((order) => {
    if (!isActiveOrder(order.status)) return normalizeOrder(order);

    return normalizeOrder({
      ...order,
      status: ORDER_STATUS.QUEUED,
      message: "Queued for broker routing",
      queuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  return await saveBasketExecution({
    ...execution,
    orders
  });
}

export async function routeExecutionOrder(orderId, broker = {}) {
  return await updateExecutionOrder(orderId, {
    brokerId: broker.id || broker.brokerId || "GATECEP_PRACTICE",
    brokerName: broker.name || broker.brokerName || "GateCEP Broker",
    status: ORDER_STATUS.ROUTED,
    message: "Routed to broker",
    routedAt: new Date().toISOString()
  });
}

function canonicalExecutionMode(value = "PRACTICE") {
  return String(value || "PRACTICE").toUpperCase() === "REAL"
    ? "REAL"
    : "PRACTICE";
}

function isPracticeBrokerIdentity(value = "") {
  const raw = String(value || "").trim().toUpperCase();

  return [
    "GATECEP_PRACTICE",
    "GATECEP PRACTICE",
    "GATECEP BROKER",
    "SIM",
    "SIMULATION BROKER",
    "GATECEP-DEMO",
    "GATECEP DEMO"
  ].includes(raw);
}

function isConnectedRealBrokerAccount(account = {}) {
  const brokerId = String(account?.brokerId || account?.id || "").trim();
  const mode = String(account?.connectionMode || "").toUpperCase();
  const status = String(account?.status || "ACTIVE").toUpperCase();

  return (
    !!brokerId &&
    !isPracticeBrokerIdentity(brokerId) &&
    !/PRACTICE|DEMO|SIMULATION/.test(mode) &&
    status !== "INACTIVE" &&
    status !== "DISCONNECTED" &&
    (account?.connected === true || account?.linked === true)
  );
}

async function resolveRealBrokerAccount(order = {}) {
  const accounts = (await loadBrokerAccounts()).filter(isConnectedRealBrokerAccount);

  const requestedAccountId = String(order?.brokerAccountId || "").trim();
  const requestedBrokerId = String(order?.brokerId || "").trim().toUpperCase();

  if (requestedAccountId) {
    const exactAccount = accounts.find(
      (account) => String(account?.id || "") === requestedAccountId
    );

    if (exactAccount) return exactAccount;
  }

  if (requestedBrokerId && !isPracticeBrokerIdentity(requestedBrokerId)) {
    const exactBroker = accounts.find(
      (account) =>
        String(account?.brokerId || account?.id || "").trim().toUpperCase() ===
        requestedBrokerId
    );

    if (exactBroker) return exactBroker;
  }

  return (
    accounts.find((account) => account?.defaultBroker === true) ||
    accounts[0] ||
    null
  );
}

export async function routeExecutionOrderByMode(orderId) {
  const execution = await loadBasketExecution();

  if (!execution) {
    throw new Error("ACTIVE_EXECUTION_REQUIRED");
  }

  const order = (execution.orders || []).find((item) => item.id === orderId);

  if (!order) {
    throw new Error("EXECUTION_ORDER_NOT_FOUND");
  }

  const executionMode = canonicalExecutionMode(
    order.executionMode || execution.executionMode
  );

  if (executionMode === "PRACTICE") {
    const now = new Date().toISOString();

    await routeExecutionOrder(orderId, {
      id: "GATECEP_PRACTICE",
      name: "GateCEP Broker"
    });

    return await updateExecutionOrder(orderId, {
      executionMode: "PRACTICE",
      brokerId: "GATECEP_PRACTICE",
      brokerName: "GateCEP Broker",
      brokerOrderId: `PRACTICE-${Date.now()}-${order.symbol}`,
      brokerStatus: "PRACTICE_RECEIVED",
      status: ORDER_STATUS.BROKER_RECEIVED,
      message: "GateCEP Broker received the Practice order.",
      submittedAt: now,
      brokerReceivedAt: now,
      adapterResponse: {
        ok: true,
        isPractice: true,
        brokerId: "GATECEP_PRACTICE",
        brokerName: "GateCEP Broker",
        status: "PRACTICE_RECEIVED",
        submittedAt: now,
        receivedAt: now
      },
      isPractice: true,
      updatedAt: now
    });
  }

  const account = await resolveRealBrokerAccount(order);

  if (!account) {
    const error = new Error("CONNECTED_REAL_BROKER_REQUIRED");
    error.code = "CONNECTED_REAL_BROKER_REQUIRED";
    throw error;
  }

  const brokerId = String(account.brokerId || account.id || "").trim();
  const brokerAccountId = account.id || order.brokerAccountId || null;
  const brokerName =
    account.brokerName ||
    account.name ||
    account.broker ||
    brokerId;

  const submittedOrder = {
    ...order,
    executionMode: "REAL",
    brokerId,
    brokerAccountId,
    brokerName
  };

  let brokerResponse;

  try {
    brokerResponse = await placeBrokerOrder(submittedOrder);
  } catch (error) {
    return await updateExecutionOrder(orderId, {
      executionMode: "REAL",
      brokerId,
      brokerAccountId,
      brokerName,
      status: ORDER_STATUS.BROKER_SELECTED,
      brokerStatus: "ADAPTER_ERROR",
      brokerOrderId: null,
      message:
        error?.message ||
        "Broker adapter failed before broker receipt could be confirmed.",
      adapterError: true,
      isPractice: false,
      updatedAt: new Date().toISOString()
    });
  }

  return await updateExecutionOrder(orderId, {
    executionMode: "REAL",
    brokerId: brokerResponse?.brokerId || brokerId,
    brokerAccountId,
    brokerName: brokerResponse?.brokerName || brokerName,
    brokerOrderId: brokerResponse?.brokerOrderId || null,
    brokerStatus:
      brokerResponse?.status ||
      (brokerResponse?.ok ? "SUBMITTED" : "PENDING_API"),
    status: ORDER_STATUS.ROUTED,
    message:
      brokerResponse?.message ||
      "Routed to broker adapter. Awaiting verified broker confirmation.",
    submittedAt: brokerResponse?.submittedAt || new Date().toISOString(),
    brokerReceivedAt: null,
    adapterResponse: brokerResponse || null,
    isPractice: false,
    updatedAt: new Date().toISOString()
  });
}

export async function markBrokerReceived(orderId, brokerPayload = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error(
      "REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION"
    );
    error.code = "REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION";
    throw error;
  }

  return await updateExecutionOrder(orderId, {
    executionMode: "PRACTICE",
    brokerId: order?.brokerId || "GATECEP_PRACTICE",
    brokerName: order?.brokerName || "GateCEP Broker",
    brokerOrderId: brokerPayload.brokerOrderId || brokerPayload.id || null,
    brokerStatus: brokerPayload.status || ORDER_STATUS.BROKER_RECEIVED,
    status: ORDER_STATUS.BROKER_RECEIVED,
    message: brokerPayload.message || "GateCEP Broker received Practice order",
    brokerReceivedAt: brokerPayload.receivedAt || new Date().toISOString(),
    isPractice: true
  });
}

export async function markExecutionOrderFilled(orderId, trade = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error("REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION");
    error.code = "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION";
    throw error;
  }

  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.FILLED,
    message: "Filled by GateCEP Broker in Practice",
    trade: {
      ...trade,
      executionMode: "PRACTICE",
      isPractice: true
    },
    filledAt: new Date().toISOString()
  });
}

export function getActiveExecutionOrders(execution = {}) {
  return (execution.orders || []).filter((order) => isActiveOrder(order.status));
}

export function normalizeExecution(execution = {}) {
  const orders = Array.isArray(execution.orders)
    ? execution.orders.map(normalizeOrder)
    : [];

  const activeOrders = orders.filter((order) => isActiveOrder(order.status));
  const completedOrders = orders.filter((order) => order.status === ORDER_STATUS.FILLED).length;
  const cancelledOrders = orders.filter((order) => order.status === ORDER_STATUS.CANCELLED).length;
  const rejectedOrders = orders.filter((order) => order.status === ORDER_STATUS.REJECTED).length;
  const failedOrders = rejectedOrders;
  const queuedOrders = orders.filter((order) => order.status === ORDER_STATUS.QUEUED).length;
  const routedOrders = orders.filter((order) =>
    [ORDER_STATUS.ROUTED, ORDER_STATUS.BROKER_RECEIVED, ORDER_STATUS.PARTIAL_FILL].includes(order.status)
  ).length;
  const reviewOrders = orders.filter((order) =>
    [ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING, ORDER_STATUS.DRAFT].includes(order.status)
  ).length;

  let status = execution.status || ORDER_STATUS.REVIEW;

  if (orders.length > 0 && activeOrders.length === 0) {
    status = ORDER_STATUS.FILLED;
  } else if (routedOrders > 0) {
    status = ORDER_STATUS.ROUTED;
  } else if (queuedOrders > 0) {
    status = ORDER_STATUS.QUEUED;
  } else if (reviewOrders > 0) {
    status = ORDER_STATUS.REVIEW;
  }

  const executionMode = canonicalExecutionMode(
    execution.executionMode || orders[0]?.executionMode
  );

  return {
    ...execution,
    executionMode,
    brokerId:
      execution.brokerId ||
      (executionMode === "PRACTICE" ? "GATECEP_PRACTICE" : null),
    status,
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    completedOrders,
    cancelledOrders,
    failedOrders,
    queuedOrders,
    routedOrders,
    reviewOrders,
    totalAmount: activeOrders.reduce(
      (sum, order) => sum + Number(order.amount || order.gross || 0),
      0
    ),
    orders,
    updatedAt: execution.updatedAt || new Date().toISOString()
  };
}

export function normalizeOrder(order = {}) {
  const price = Number(order.price || order.limitPrice || 0);
  const amount = Number(order.amount || 0);

  const quantity =
    Number(order.quantity || 0) > 0
      ? Number(order.quantity)
      : price > 0 && amount > 0
      ? Math.floor(amount / price)
      : 0;

  const gross = quantity * price;

  const executionMode = canonicalExecutionMode(order.executionMode);

  return {
    ...order,
    executionMode,
    brokerId:
      order.brokerId ||
      (executionMode === "PRACTICE" ? "GATECEP_PRACTICE" : null),
    symbol: String(order.symbol || "").toUpperCase(),
    side: order.side || "BUY",
    price,
    quantity,
    gross,
    amount: amount || gross,
    status: String(order.status || ORDER_STATUS.REVIEW).toUpperCase(),
    message: order.message || "Pending review"
  };
}

export async function deleteExecutionOrder(orderId) {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  const orders = execution.orders.filter((order) => order.id !== orderId);

  return await saveBasketExecution({
    ...execution,
    orders
  });
}

export async function queueSingleOrder(orderId) {
  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.QUEUED,
    message: "Queued for broker routing",
    queuedAt: new Date().toISOString()
  });
}
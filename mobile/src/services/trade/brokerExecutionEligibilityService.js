import { loadBrokerAccounts } from "../brokers/brokerAccountStore";
import { estimateBrokerOrderCharges } from "../brokers/brokerFeeAdviceService";
import { loadRealAvailableCashForSource } from "../../features/portfolio-cash/accountScopedPortfolioCashService";
import { loadUnifiedPortfolio } from "../portfolio/unifiedPortfolioApi";

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function isPracticeBrokerIdentity(value = "") {
  return [
    "GATECEP_PRACTICE",
    "GATECEP PRACTICE",
    "GATECEP BROKER",
    "SIM",
    "SIMULATION BROKER",
    "GATECEP-DEMO",
    "GATECEP DEMO"
  ].includes(upper(value));
}

export function isConnectedRealBrokerAccount(account = {}) {
  const brokerId = String(account?.brokerId || account?.id || "").trim();
  const mode = upper(account?.connectionMode);
  const status = upper(account?.status || "ACTIVE");

  return (
    !!brokerId &&
    !isPracticeBrokerIdentity(brokerId) &&
    !/PRACTICE|DEMO|SIMULATION/.test(mode) &&
    status !== "INACTIVE" &&
    status !== "DISCONNECTED" &&
    (account?.connected === true || account?.linked === true)
  );
}

function accountKey(account = {}) {
  return String(account?.id || account?.brokerAccountId || account?.brokerId || "")
    .trim()
    .toUpperCase();
}

function holdingAccountKey(holding = {}) {
  return String(
    holding?.brokerAccountId ||
      holding?.accountId ||
      holding?.brokerId ||
      holding?.broker ||
      ""
  )
    .trim()
    .toUpperCase();
}

function holdingSymbol(holding = {}) {
  return upper(holding?.symbol || holding?.ticker || holding?.securityCode);
}

function holdingQuantity(holding = {}) {
  return n(
    holding?.quantity ??
      holding?.shares ??
      holding?.units ??
      holding?.currentQuantity
  );
}

function orderGross(order = {}) {
  const quantity = n(order?.quantity);
  const price = n(order?.price ?? order?.limitPrice);
  const explicit = n(order?.gross ?? order?.amount);
  return quantity > 0 && price > 0 ? quantity * price : explicit;
}

function brokerName(account = {}) {
  return (
    account?.brokerName ||
    account?.name ||
    account?.broker ||
    account?.shortName ||
    account?.brokerId ||
    account?.id ||
    "Broker"
  );
}

function feeEstimate(account = {}, order = {}) {
  return estimateBrokerOrderCharges({
    schedule: account?.feeSchedule,
    consideration: orderGross(order)
  });
}

function reservationKey(order = {}) {
  return String(order?.brokerAccountId || "").trim().toUpperCase();
}

function buildReservations(orders = [], excludeOrderId = null) {
  const buyCash = new Map();
  const sellQty = new Map();

  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || order.id === excludeOrderId) continue;

    const key = reservationKey(order);
    if (!key) continue;

    const side = upper(order.side || "BUY");

    if (side === "BUY") {
      const required =
        n(order?.executionEligibility?.requiredCash) ||
        n(order?.estimatedTotalCost) ||
        n(order?.amount) ||
        orderGross(order);

      buyCash.set(key, n(buyCash.get(key)) + Math.max(0, required));
      continue;
    }

    if (side === "SELL") {
      const symbol = upper(order.symbol);
      if (!symbol) continue;
      const sellKey = `${key}::${symbol}`;
      sellQty.set(
        sellKey,
        n(sellQty.get(sellKey)) + Math.max(0, n(order.quantity))
      );
    }
  }

  return { buyCash, sellQty };
}

function accountHoldingQuantity(portfolio = {}, account = {}, symbol = "") {
  const key = accountKey(account);
  const targetSymbol = upper(symbol);

  return (Array.isArray(portfolio?.holdings) ? portfolio.holdings : [])
    .filter(
      (holding) =>
        holdingAccountKey(holding) === key &&
        holdingSymbol(holding) === targetSymbol
    )
    .reduce((total, holding) => total + holdingQuantity(holding), 0);
}

export async function buildRealOrderBrokerEligibility({
  order = {},
  executionOrders = []
} = {}) {
  const accounts = (await loadBrokerAccounts()).filter(
    isConnectedRealBrokerAccount
  );

  if (!accounts.length) {
    return {
      available: false,
      reason: "CONNECTED_REAL_BROKER_REQUIRED",
      candidates: []
    };
  }

  const portfolio = await loadUnifiedPortfolio();
  const reservations = buildReservations(executionOrders, order?.id);
  const side = upper(order?.side || "BUY");
  const gross = orderGross(order);

  const candidates = [];

  for (const account of accounts) {
    const key = accountKey(account);
    const fees = feeEstimate(account, order);
    const estimatedCharges =
      fees && Number.isFinite(Number(fees.totalCharges))
        ? Number(fees.totalCharges)
        : null;

    if (side === "BUY") {
      const availableCash = await loadRealAvailableCashForSource({
        ...account,
        id: account.id,
        brokerAccountId: account.id,
        accountId: account.id,
        brokerId: account.brokerId,
        broker: account.brokerName || account.name,
        name: account.brokerName || account.name,
        label: account.nickname || account.brokerName || account.name,
        type: "BROKER"
      });

      const reservedCash = n(reservations.buyCash.get(key));
      const projectedAvailableCash = Math.max(0, n(availableCash) - reservedCash);
      const requiredCash =
        gross + (estimatedCharges == null ? 0 : estimatedCharges);

      candidates.push({
        brokerAccountId: account.id,
        brokerId: account.brokerId || account.id,
        brokerName: brokerName(account),
        nickname: account.nickname || null,
        defaultBroker: account.defaultBroker === true,
        side,
        availableCash: n(availableCash),
        reservedCash,
        projectedAvailableCash,
        gross,
        estimatedCharges,
        requiredCash,
        feeEvidenceAvailable: estimatedCharges != null,
        feeEvidenceSource: fees?.evidenceSource || null,
        feeVerifiedAt: fees?.verifiedAt || null,
        eligible: projectedAvailableCash >= requiredCash,
        reason:
          projectedAvailableCash >= requiredCash
            ? "ELIGIBLE"
            : "INSUFFICIENT_TRADING_SPACE"
      });

      continue;
    }

    const heldQuantity = accountHoldingQuantity(portfolio, account, order?.symbol);
    const sellKey = `${key}::${upper(order?.symbol)}`;
    const reservedQuantity = n(reservations.sellQty.get(sellKey));
    const projectedAvailableQuantity = Math.max(0, heldQuantity - reservedQuantity);
    const requiredQuantity = Math.max(0, n(order?.quantity));

    candidates.push({
      brokerAccountId: account.id,
      brokerId: account.brokerId || account.id,
      brokerName: brokerName(account),
      nickname: account.nickname || null,
      defaultBroker: account.defaultBroker === true,
      side,
      heldQuantity,
      reservedQuantity,
      projectedAvailableQuantity,
      requiredQuantity,
      gross,
      estimatedCharges,
      feeEvidenceAvailable: estimatedCharges != null,
      feeEvidenceSource: fees?.evidenceSource || null,
      feeVerifiedAt: fees?.verifiedAt || null,
      eligible: projectedAvailableQuantity >= requiredQuantity,
      reason:
        projectedAvailableQuantity >= requiredQuantity
          ? "ELIGIBLE"
          : "INSUFFICIENT_BROKER_HOLDING"
    });
  }

  return {
    available: true,
    reason: "BROKER_ELIGIBILITY_AVAILABLE",
    candidates
  };
}

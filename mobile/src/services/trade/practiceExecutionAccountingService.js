import {
  loadInvestorContext,
  savePracticePortfolio
} from "../../features/investor/investorContextStore";
import {
  userGetItem,
  userSetItem
} from "../auth/userStorage";

const PRACTICE_TRADE_HISTORY_KEY = "practiceSimulatedTrades";

export const PRACTICE_EXECUTION_FEE_POLICY = Object.freeze({
  commissionRatePct: 1.2,
  otherChargesRatePct: 0.2,
  minimumCommission: 0,
  fixedCharges: 0
});

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/*
 * PC-031B4M7C5D7C1
 *
 * Canonical Practice execution currency boundary.
 *
 * Practice Funds persists cash at two decimal places, so Practice
 * execution accounting must use the same monetary precision.
 * Keep share quantities and security prices at their original
 * precision; normalize monetary results only.
 */
export function roundPracticeMoney(value) {
  const parsed = number(value);

  return (
    Math.round(
      (parsed + Number.EPSILON) * 100
    ) / 100
  );
}

function canonicalSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

export function buildPracticeExecutionEstimate({
  side,
  quantity,
  price,
  cash = 0
} = {}) {
  const canonicalSide = String(side || "BUY").toUpperCase();
  const qty = number(quantity);
  const tradePrice = number(price);

  if (qty <= 0 || tradePrice <= 0) {
    const error = new Error("INVALID_PRACTICE_FILL");
    error.code = "INVALID_PRACTICE_FILL";
    throw error;
  }

  /*
   * Currency values are normalized where money is created.
   *
   * This deliberately does not round quantity or tradePrice.
   * A security price may legitimately have more precision than
   * the Practice cash ledger, while settled monetary values use
   * the same two-decimal contract as Practice Funds.
   */
  const gross =
    roundPracticeMoney(
      qty * tradePrice
    );

  const brokerFee =
    roundPracticeMoney(
      gross *
        (
          PRACTICE_EXECUTION_FEE_POLICY
            .commissionRatePct / 100
        )
    );

  const regulatoryFee =
    roundPracticeMoney(
      gross *
        (
          PRACTICE_EXECUTION_FEE_POLICY
            .otherChargesRatePct / 100
        )
    );

  const fixedCharges =
    roundPracticeMoney(
      PRACTICE_EXECUTION_FEE_POLICY.fixedCharges
    );

  const totalFees =
    roundPracticeMoney(
      brokerFee +
      regulatoryFee +
      fixedCharges
    );

  const totalCost =
    roundPracticeMoney(
      canonicalSide === "BUY"
        ? gross + totalFees
        : Math.max(gross - totalFees, 0)
    );

  const cashBefore =
    roundPracticeMoney(cash);

  const remainingCash =
    roundPracticeMoney(
      canonicalSide === "BUY"
        ? cashBefore - totalCost
        : cashBefore + totalCost
    );

  return {
    qty,
    price: tradePrice,
    gross,
    brokerFee,
    regulatoryFee,
    fixedCharges,
    totalFees,
    totalCost,
    remainingCash
  };
}

export function applyPracticeExecutionToHoldings({
  currentPortfolio = [],
  symbol,
  name,
  sector,
  side,
  estimate
} = {}) {
  const nextPortfolio = Array.isArray(currentPortfolio)
    ? currentPortfolio.map((holding) => ({ ...holding }))
    : [];

  const canonicalSide = String(side || "BUY").toUpperCase();
  const securitySymbol = canonicalSymbol(symbol);

  if (!securitySymbol) {
    const error = new Error("PRACTICE_FILL_SYMBOL_REQUIRED");
    error.code = "PRACTICE_FILL_SYMBOL_REQUIRED";
    throw error;
  }

  const qty = number(estimate?.qty);
  const price = number(estimate?.price);
  const gross = number(estimate?.gross);
  const totalCost = number(estimate?.totalCost);

  const existingIndex = nextPortfolio.findIndex(
    (item) => canonicalSymbol(item?.symbol) === securitySymbol
  );

  const now = new Date().toISOString();

  if (canonicalSide === "BUY") {
    if (existingIndex >= 0) {
      const existing = nextPortfolio[existingIndex];

      const existingQty = number(existing.quantity);
      const existingAveragePrice = number(
        existing.averagePrice || existing.averageCost
      );
      const existingCostValue =
        existingQty * existingAveragePrice;

      const newQty = existingQty + qty;
      const newCostValue =
        existingCostValue + totalCost;
      const newAveragePrice =
        newQty > 0 ? newCostValue / newQty : price;
      const newMarketValue = newQty * price;

      nextPortfolio[existingIndex] = {
        ...existing,
        quantity: newQty,
        averagePrice: newAveragePrice,
        averageCost: newAveragePrice,
        costValue: newCostValue,
        investedValue: newCostValue,
        marketPrice: price,
        price,
        marketValue: newMarketValue,
        value: newMarketValue,
        profitLoss: newMarketValue - newCostValue,
        profitLossPct:
          newCostValue > 0
            ? ((newMarketValue - newCostValue) /
                newCostValue) *
              100
            : 0,
        source: "GATECEP_BROKER_PRACTICE",
        updatedAt: now
      };
    } else {
      const averagePrice =
        qty > 0 ? totalCost / qty : price;

      nextPortfolio.push({
        symbol: securitySymbol,
        name: name || securitySymbol,
        sector: sector || "Other",
        quantity: qty,
        averagePrice,
        averageCost: averagePrice,
        costValue: totalCost,
        investedValue: totalCost,
        marketPrice: price,
        price,
        marketValue: gross,
        value: gross,
        profitLoss: gross - totalCost,
        profitLossPct:
          totalCost > 0
            ? ((gross - totalCost) / totalCost) * 100
            : 0,
        source: "GATECEP_BROKER_PRACTICE",
        createdAt: now,
        updatedAt: now
      });
    }

    return nextPortfolio;
  }

  if (canonicalSide === "SELL") {
    if (existingIndex < 0) {
      const error = new Error(
        `You do not hold ${securitySymbol}.`
      );
      error.code = "PRACTICE_HOLDING_REQUIRED";
      throw error;
    }

    const existing = nextPortfolio[existingIndex];
    const existingQty = number(existing.quantity);

    if (qty > existingQty) {
      const error = new Error(
        `You only hold ${existingQty} shares of ${securitySymbol}.`
      );
      error.code = "PRACTICE_SELL_QUANTITY_EXCEEDED";
      throw error;
    }

    const remainingQty = existingQty - qty;

    if (remainingQty <= 0) {
      nextPortfolio.splice(existingIndex, 1);
    } else {
      nextPortfolio[existingIndex] = {
        ...existing,
        quantity: remainingQty,
        marketPrice: price,
        price,
        marketValue: remainingQty * price,
        value: remainingQty * price,
        source: "GATECEP_BROKER_PRACTICE",
        updatedAt: now
      };
    }

    return nextPortfolio;
  }

  const error = new Error("INVALID_PRACTICE_SIDE");
  error.code = "INVALID_PRACTICE_SIDE";
  throw error;
}

function normalizePracticeSettlements(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return { ...value };
}

function practiceSettlementFor(
  practice,
  orderId
) {
  const settlements =
    normalizePracticeSettlements(
      practice?.practiceSettlements
    );

  return (
    settlements[String(orderId)] ||
    null
  );
}

async function loadPracticeTradeHistory() {
  const historyRaw =
    await userGetItem(
      PRACTICE_TRADE_HISTORY_KEY
    );

  let history = [];

  try {
    history = historyRaw
      ? JSON.parse(historyRaw)
      : [];
  } catch {
    history = [];
  }

  return Array.isArray(history)
    ? history
    : [];
}

async function ensurePracticeTradeHistoryRecord(
  simulatedTrade
) {
  if (!simulatedTrade?.executionOrderId) {
    const error = new Error(
      "PRACTICE_HISTORY_EXECUTION_ORDER_REQUIRED"
    );

    error.code =
      "PRACTICE_HISTORY_EXECUTION_ORDER_REQUIRED";

    throw error;
  }

  const history =
    await loadPracticeTradeHistory();

  const exists =
    history.some(
      (item) =>
        String(
          item?.executionOrderId || ""
        ) ===
        String(
          simulatedTrade.executionOrderId
        )
    );

  if (exists) {
    return {
      repaired: false,
      alreadyPresent: true
    };
  }

  await userSetItem(
    PRACTICE_TRADE_HISTORY_KEY,
    JSON.stringify([
      simulatedTrade,
      ...history
    ])
  );

  return {
    repaired: true,
    alreadyPresent: false
  };
}

function buildPracticeSettlementMarker({
  order,
  accounting,
  simulatedTrade,
  settledAt
}) {
  return {
    executionOrderId:
      String(order.id),

    applied: true,

    practiceAccounting: {
      ...accounting,
      applied: true
    },

    simulatedTrade:
      simulatedTrade
        ? { ...simulatedTrade }
        : null,

    source:
      "GATECEP_BROKER_PRACTICE",

    settledAt
  };
}

export function preflightPracticeExecutionOrders({
  orders = [],
  practicePortfolio = {}
} = {}) {
  const candidates =
    Array.isArray(orders)
      ? orders
      : [];

  let workingCash =
    number(
      practicePortfolio?.availableCash
    );

  let workingHoldings =
    Array.isArray(
      practicePortfolio?.holdings
    )
      ? practicePortfolio.holdings.map(
          (holding) => ({
            ...holding
          })
        )
      : [];

  const settlements =
    normalizePracticeSettlements(
      practicePortfolio
        ?.practiceSettlements
    );

  const estimates = [];

  for (const order of candidates) {
    if (!order?.id) {
      const error =
        new Error(
          "PRACTICE_EXECUTION_ORDER_REQUIRED"
        );

      error.code =
        "PRACTICE_EXECUTION_ORDER_REQUIRED";

      throw error;
    }

    if (
      settlements[
        String(order.id)
      ]?.applied === true
    ) {
      continue;
    }

    const side =
      String(
        order?.side || "BUY"
      ).toUpperCase();

    const estimate =
      buildPracticeExecutionEstimate({
        side,
        quantity:
          order?.quantity,
        price:
          order?.price,
        cash:
          workingCash
      });

    if (
      side === "BUY" &&
      estimate.remainingCash < 0
    ) {
      const error =
        new Error(
          "INSUFFICIENT_PRACTICE_CASH"
        );

      error.code =
        "INSUFFICIENT_PRACTICE_CASH";

      error.requiredCash =
        number(
          estimate.totalCost
        );

      error.availableCash =
        number(
          workingCash
        );

      error.orderId =
        String(order.id);

      error.symbol =
        canonicalSymbol(
          order?.symbol
        );

      throw error;
    }

    workingHoldings =
      applyPracticeExecutionToHoldings({
        currentPortfolio:
          workingHoldings,

        symbol:
          order?.symbol,

        name:
          order?.name,

        sector:
          order?.sector,

        side,
        estimate
      });

    workingCash =
      number(
        estimate.remainingCash
      );

    estimates.push({
      orderId:
        String(order.id),

      side,

      symbol:
        canonicalSymbol(
          order?.symbol
        ),

      estimate
    });
  }

  return {
    ok: true,

    orderCount:
      estimates.length,

    startingCash:
      number(
        practicePortfolio
          ?.availableCash
      ),

    endingCash:
      workingCash,

    holdings:
      workingHoldings,

    estimates
  };
}

/*
 * PC-031B4M7C5D6B
 *
 * Pure funding analysis for a complete Practice execution
 * batch.
 *
 * Unlike preflightPracticeExecutionOrders(), this function
 * does not fail at the first cash deficit. It calculates the
 * additional external Practice funding that would be required
 * to make the complete candidate sequence affordable while
 * preserving the same fee and holdings rules used by canonical
 * Practice settlement.
 *
 * It performs no persistence and never mutates REAL state.
 */
export function analyzePracticeExecutionFunding({
  orders = [],
  practicePortfolio = {}
} = {}) {
  const candidates =
    Array.isArray(orders)
      ? orders
      : [];

  const startingCash =
    number(
      practicePortfolio?.availableCash
    );

  let workingCash =
    startingCash;

  let workingHoldings =
    Array.isArray(
      practicePortfolio?.holdings
    )
      ? practicePortfolio.holdings.map(
          (holding) => ({
            ...holding
          })
        )
      : [];

  const settlements =
    normalizePracticeSettlements(
      practicePortfolio
        ?.practiceSettlements
    );

  const estimates = [];

  let totalBuyCost = 0;
  let totalSellProceeds = 0;
  let additionalCashRequired = 0;
  let firstBlockedOrder = null;

  for (const order of candidates) {
    if (!order?.id) {
      const error =
        new Error(
          "PRACTICE_EXECUTION_ORDER_REQUIRED"
        );

      error.code =
        "PRACTICE_EXECUTION_ORDER_REQUIRED";

      throw error;
    }

    if (
      settlements[
        String(order.id)
      ]?.applied === true
    ) {
      continue;
    }

    const side =
      String(
        order?.side || "BUY"
      ).toUpperCase();

    let estimate =
      buildPracticeExecutionEstimate({
        side,
        quantity:
          order?.quantity,
        price:
          order?.price,
        cash:
          workingCash
      });

    if (side === "BUY") {
      totalBuyCost +=
        number(
          estimate.totalCost
        );

      if (
        estimate.remainingCash < 0
      ) {
        const deficit =
          Math.abs(
            number(
              estimate.remainingCash
            )
          );

        additionalCashRequired +=
          deficit;

        if (!firstBlockedOrder) {
          firstBlockedOrder = {
            orderId:
              String(order.id),

            symbol:
              canonicalSymbol(
                order?.symbol
              ),

            requiredCash:
              number(
                estimate.totalCost
              ),

            availableCash:
              number(
                workingCash
              ),

            deficit
          };
        }

        /*
         * Conceptually inject only the minimum amount needed
         * at this point so analysis can continue through the
         * rest of the batch. This is arithmetic only; nothing
         * is persisted.
         */
        workingCash +=
          deficit;

        estimate =
          buildPracticeExecutionEstimate({
            side,
            quantity:
              order?.quantity,
            price:
              order?.price,
            cash:
              workingCash
          });
      }
    } else if (side === "SELL") {
      totalSellProceeds +=
        number(
          estimate.totalCost
        );
    }

    workingHoldings =
      applyPracticeExecutionToHoldings({
        currentPortfolio:
          workingHoldings,

        symbol:
          order?.symbol,

        name:
          order?.name,

        sector:
          order?.sector,

        side,
        estimate
      });

    workingCash =
      number(
        estimate.remainingCash
      );

    estimates.push({
      orderId:
        String(order.id),

      side,

      symbol:
        canonicalSymbol(
          order?.symbol
        ),

      estimate
    });
  }

  return {
    ok:
      additionalCashRequired <= 0,

    orderCount:
      estimates.length,

    startingCash,

    totalBuyCost:
      number(
        totalBuyCost
      ),

    totalSellProceeds:
      number(
        totalSellProceeds
      ),

    additionalCashRequired:
      number(
        additionalCashRequired
      ),

    projectedEndingCash:
      number(
        workingCash
      ),

    firstBlockedOrder,

    holdings:
      workingHoldings,

    estimates
  };
}

export async function analyzeCanonicalPracticeExecutionFunding(
  orders = []
) {
  const context =
    await loadInvestorContext();

  const practice =
    context?.practicePortfolio || {};

  if (
    practice?.status !== "ACTIVE"
  ) {
    const error =
      new Error(
        "ACTIVE_PRACTICE_PORTFOLIO_REQUIRED"
      );

    error.code =
      "ACTIVE_PRACTICE_PORTFOLIO_REQUIRED";

    throw error;
  }

  return analyzePracticeExecutionFunding({
    orders,
    practicePortfolio:
      practice
  });
}

export async function preflightCanonicalPracticeExecutionOrders(
  orders = []
) {
  const context =
    await loadInvestorContext();

  const practice =
    context?.practicePortfolio || {};

  if (
    practice?.status !== "ACTIVE"
  ) {
    const error =
      new Error(
        "ACTIVE_PRACTICE_PORTFOLIO_REQUIRED"
      );

    error.code =
      "ACTIVE_PRACTICE_PORTFOLIO_REQUIRED";

    throw error;
  }

  return preflightPracticeExecutionOrders({
    orders,
    practicePortfolio:
      practice
  });
}

export async function settlePracticeExecutionOrder({
  order,
  trade = {}
} = {}) {
  if (!order?.id) {
    const error = new Error(
      "PRACTICE_EXECUTION_ORDER_REQUIRED"
    );
    error.code = "PRACTICE_EXECUTION_ORDER_REQUIRED";
    throw error;
  }

  const context = await loadInvestorContext();
  const practice = context?.practicePortfolio || {};
  const holdings = Array.isArray(practice?.holdings)
    ? practice.holdings
    : [];
  const cashBefore = number(practice?.availableCash);

  const durableSettlement =
    practiceSettlementFor(
      practice,
      order.id
    );

  if (
    durableSettlement?.applied === true
  ) {
    const durableTrade =
      durableSettlement?.simulatedTrade ||
      null;

    let historyRecovery = {
      repaired: false,
      alreadyPresent: false
    };

    if (durableTrade?.executionOrderId) {
      historyRecovery =
        await ensurePracticeTradeHistoryRecord(
          durableTrade
        );
    }

    return {
      alreadyApplied: true,

      historyRecovered:
        historyRecovery.repaired === true,

      accounting:
        durableSettlement
          .practiceAccounting ||
        durableSettlement,

      trade:
        durableTrade
    };
  }

  /*
   * OMS-local accounting evidence is not the canonical
   * economic settlement authority.
   *
   * If OMS says accounting was applied but the canonical
   * Practice settlement marker is absent, fail closed.
   * Recalculating the fill could debit/credit the Practice
   * portfolio a second time.
   */
  if (order?.practiceAccounting?.applied === true) {
    const error = new Error(
      "PRACTICE_CANONICAL_SETTLEMENT_EVIDENCE_REQUIRED"
    );

    error.code =
      "PRACTICE_CANONICAL_SETTLEMENT_EVIDENCE_REQUIRED";

    error.executionOrderId =
      order.id;

    throw error;
  }

  const side = String(
    trade?.side || order?.side || "BUY"
  ).toUpperCase();

  const estimate = buildPracticeExecutionEstimate({
    side,
    quantity:
      trade?.quantity || order?.quantity,
    price:
      trade?.price || order?.price,
    cash: cashBefore
  });

  if (
    side === "BUY" &&
    estimate.remainingCash < 0
  ) {
    const error = new Error(
      "INSUFFICIENT_PRACTICE_CASH"
    );
    error.code = "INSUFFICIENT_PRACTICE_CASH";
    throw error;
  }

  const nextPortfolio =
    applyPracticeExecutionToHoldings({
      currentPortfolio: holdings,
      symbol:
        trade?.symbol || order?.symbol,
      name:
        trade?.name || order?.name,
      sector:
        trade?.sector || order?.sector,
      side,
      estimate
    });

  const history =
    await loadPracticeTradeHistory();

  const existingTrade = history.find(
    (item) =>
      String(item?.executionOrderId || "") ===
      String(order.id)
  );

  if (existingTrade) {
    return {
      alreadyApplied: true,
      accounting:
        existingTrade.practiceAccounting || {
          applied: true,
          tradeId: existingTrade.id || null,
          executionOrderId: order.id
        }
    };
  }

  const appliedAt = new Date().toISOString();
  const tradeId =
    trade?.id ||
    `TRD-${Date.now()}-${canonicalSymbol(
      trade?.symbol || order?.symbol
    )}`;

  const accounting = {
    applied: true,
    appliedAt,
    tradeId,
    executionOrderId: order.id,
    quantity: estimate.qty,
    price: estimate.price,
    gross: estimate.gross,
    brokerFee: estimate.brokerFee,
    regulatoryFee: estimate.regulatoryFee,
    totalFees: estimate.totalFees,
    totalCost: estimate.totalCost,
    cashBefore,
    cashAfter: estimate.remainingCash
  };

  const simulatedTrade = {
    ...trade,
    id: tradeId,
    executionOrderId: order.id,
    symbol: canonicalSymbol(
      trade?.symbol || order?.symbol
    ),
    name:
      trade?.name ||
      order?.name ||
      canonicalSymbol(order?.symbol),
    sector:
      trade?.sector ||
      order?.sector ||
      "Other",
    side,
    quantity: estimate.qty,
    price: estimate.price,
    gross: estimate.gross,
    brokerFee: estimate.brokerFee,
    regulatoryFee: estimate.regulatoryFee,
    totalFees: estimate.totalFees,
    totalCost: estimate.totalCost,
    cashBefore,
    cashAfter: estimate.remainingCash,
    tradedAt:
      trade?.filledAt ||
      trade?.tradedAt ||
      appliedAt,
    filledAt:
      trade?.filledAt ||
      appliedAt,
    status: "SIMULATED_EXECUTED",
    settlementStatus: "SETTLED",
    executionMode: "PRACTICE",
    brokerId:
      trade?.brokerId ||
      order?.brokerId ||
      "GATECEP_PRACTICE",
    brokerName:
      trade?.brokerName ||
      order?.brokerName ||
      "GateCEP Broker",
    brokerOrderId:
      trade?.brokerOrderId ||
      order?.brokerOrderId ||
      null,
    source: "GATECEP_BROKER_PRACTICE",
    isPractice: true,
    isReal: false,
    practiceAccounting: accounting
  };

  const settledAt =
    new Date().toISOString();

  const settlementMarker =
    buildPracticeSettlementMarker({
      order,
      accounting,
      simulatedTrade,
      settledAt
    });

  const practiceSettlements = {
    ...normalizePracticeSettlements(
      practice?.practiceSettlements
    ),

    [String(order.id)]:
      settlementMarker
  };

  /*
   * Holdings, cash and the durable settlement
   * marker are persisted in the SAME canonical
   * Practice Portfolio write.
   *
   * A retry therefore cannot debit or credit
   * the Practice portfolio twice even if a
   * later history/OMS write was interrupted.
   */
  await savePracticePortfolio({
    ...practice,

    holdings:
      nextPortfolio,

    availableCash:
      estimate.remainingCash,

    practiceSettlements,

    status:
      "ACTIVE",

    lastActivityType:
      "GATECEP_BROKER_PRACTICE_FILL",

    lastPracticeSettlementAt:
      settledAt
  });

  await ensurePracticeTradeHistoryRecord(
    simulatedTrade
  );

  return {
    alreadyApplied: false,
    accounting,
    trade: simulatedTrade,
    holdings: nextPortfolio,
    availableCash: estimate.remainingCash
  };
}

import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const BROKER_MIRROR_KEY =
  "brokerMirrorPortfolio";

const BROKER_SYNC_STATUS_KEY =
  "brokerSyncStatus";

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function moneyNumber(value) {
  const number =
    Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

/*
 * ==========================================================
 * NORMALIZE BROKER HOLDINGS
 * ==========================================================
 */

export function normalizeBrokerHolding(
  holding = {}
) {
  const quantity =
    moneyNumber(
      holding.quantity ??
      holding.qty
    );

  const averagePrice =
    moneyNumber(
      holding.averagePrice ??
      holding.averageCost ??
      holding.costPrice
    );

  const marketPrice =
    moneyNumber(
      holding.marketPrice ??
      holding.lastPrice ??
      holding.price ??
      averagePrice
    );

  const marketValue =
    moneyNumber(
      holding.marketValue ??
      holding.value ??
      quantity *
        marketPrice
    );

  const costValue =
    moneyNumber(
      holding.costValue ??
      quantity *
        averagePrice
    );

  const profitLoss =
    marketValue -
    costValue;

  return {
    brokerHoldingId:
      holding.brokerHoldingId ||
      holding.id ||
      null,

    symbol:
      String(
        holding.symbol ||
        holding.ticker ||
        ""
      ).toUpperCase(),

    name:
      holding.name ||
      holding.companyName ||
      holding.symbol ||
      "",

    sector:
      holding.sector ||
      null,

    quantity,

    averagePrice,

    marketPrice,

    marketValue,

    costValue,

    profitLoss,

    profitLossPct:
      costValue > 0
        ? (
            profitLoss /
            costValue
          ) *
          100
        : 0
  };
}

/*
 * ==========================================================
 * NORMALIZE BROKER ACCOUNT
 * ==========================================================
 */

export function normalizeBrokerAccount(
  account = {}
) {
  const holdings =
    Array.isArray(
      account.holdings
    )
      ? account.holdings
          .map(
            normalizeBrokerHolding
          )
          .filter(
            (holding) =>
              holding.symbol
          )
      : [];

  const holdingsValue =
    holdings.reduce(
      (sum, holding) =>
        sum +
        moneyNumber(
          holding.marketValue
        ),
      0
    );

  const cashBalance =
    moneyNumber(
      account.cashBalance ??
      account.availableCash ??
      account.cash ??
      0
    );

  const totalValue =
    moneyNumber(
      account.totalValue ??
      holdingsValue +
        cashBalance
    );

  return {
    brokerAccountId:
      account.brokerAccountId ||
      account.accountId ||
      account.id ||
      null,

    broker:
      account.broker ||
      account.brokerName ||
      "Unknown Broker",

    accountName:
      account.accountName ||
      account.name ||
      "Broker Account",

    currency:
      account.currency ||
      "KES",

    status:
      account.status ||
      "CONNECTED",

    cashBalance,

    holdingsValue,

    totalValue,

    holdings,

    syncedAt:
      new Date().toISOString()
  };
}

/*
 * ==========================================================
 * SAVE BROKER MIRROR
 * ==========================================================
 */

export async function saveBrokerMirror(
  brokerAccount
) {
  const normalized =
    normalizeBrokerAccount(
      brokerAccount
    );

  const mirror = {
    type:
      "GATECEP_BROKER_MIRROR",

    status:
      "ACTIVE",

    source:
      "BROKER_SYNC",

    ...normalized,

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()
  };

  await userSetItem(
    BROKER_MIRROR_KEY,
    JSON.stringify(
      mirror
    )
  );

  await userSetItem(
    BROKER_SYNC_STATUS_KEY,
    JSON.stringify({
      broker:
        mirror.broker,

      status:
        "SYNCED",

      lastSyncAt:
        mirror.syncedAt,

      holdingsCount:
        mirror.holdings.length
    })
  );

  return mirror;
}

/*
 * ==========================================================
 * LOAD BROKER MIRROR
 * ==========================================================
 */

export async function loadBrokerMirror() {
  const raw =
    await userGetItem(
      BROKER_MIRROR_KEY
    );

  return parseStoredValue(
    raw
  );
}

/*
 * ==========================================================
 * LOAD SYNC STATUS
 * ==========================================================
 */

export async function loadBrokerSyncStatus() {
  const raw =
    await userGetItem(
      BROKER_SYNC_STATUS_KEY
    );

  return parseStoredValue(
    raw
  );
}

/*
 * ==========================================================
 * MOCK BROKER ADAPTER
 * ==========================================================
 *
 * Temporary development adapter.
 *
 * Later PC-009 phases replace this with:
 *
 * AIB adapter
 * ABC adapter
 * broker API adapters
 *
 * without changing GateCEP portfolio consumers.
 */

export async function syncMockBrokerAccount() {
  const mockAccount = {
    brokerAccountId:
      "DEMO-BROKER-001",

    broker:
      "GateCEP Broker Sandbox",

    accountName:
      "KES 10K UAT Account",

    currency:
      "KES",

    cashBalance:
      1655.35,

    holdings: [
      {
        symbol:
          "SCOM",

        name:
          "Safaricom",

        sector:
          "Telecommunication",

        quantity:
          81,

        averagePrice:
          34.6,

        marketPrice:
          34.6
      },

      {
        symbol:
          "KEGN",

        name:
          "KenGen",

        sector:
          "Energy",

        quantity:
          253,

        averagePrice:
          9.85,

        marketPrice:
          9.85
      },

      {
        symbol:
          "EQTY",

        name:
          "Equity Group",

        sector:
          "Banking",

        quantity:
          29,

        averagePrice:
          85,

        marketPrice:
          85
      }
    ]
  };

  return saveBrokerMirror(
    mockAccount
  );
}
import {
  userGetItem,
  userSetItem,
  userRemoveItem
} from "../../auth/userStorage";
import {
  loadBrokerAccounts
} from "../../services/brokers/brokerAccountStore";
import {
  syncBrokerPortfolio
} from "../../services/brokers/brokerPortfolioSync";

const BROKER_MIRROR_KEY =
  "brokerMirrorPortfolio";

const BROKER_SYNC_STATUS_KEY =
  "brokerSyncStatus";

const VERIFIED_REAL_MIRROR_MODES = new Set([
  "REAL_CONNECTED",
  "REAL_VERIFIED_UPLOAD"
]);

export function isVerifiedRealBrokerMirror(mirror) {
  return Boolean(
    mirror &&
      VERIFIED_REAL_MIRROR_MODES.has(String(mirror.runtimeMode || "")) &&
      !String(mirror.broker || "").toUpperCase().includes("SANDBOX") &&
      !String(mirror.source || "").toUpperCase().includes("PRACTICE")
  );
}

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
      brokerAccount?.source ||
      "UNVERIFIED_BROKER_MIRROR",

    runtimeMode:
      brokerAccount?.runtimeMode ||
      "UNVERIFIED",

    evidenceFileName:
      brokerAccount?.fileName ||
      null,

    cashEvidenceAvailable:
      brokerAccount?.cashEvidenceAvailable === true,

    cashEvidenceFileName:
      brokerAccount?.cashEvidenceFileName ||
      null,

    brokerId: brokerAccount?.brokerId || null,
    clientAccount: brokerAccount?.clientAccount || brokerAccount?.tradingAccount || null,
    tradingAccount: brokerAccount?.clientAccount || brokerAccount?.tradingAccount || null,
    cdsNumber: brokerAccount?.cdsNumber || null,
    brokerAccountKey: brokerAccount?.brokerAccountKey || null,
    brokerFileIdentifier: brokerAccount?.brokerFileIdentifier || null,
    identityStatus: brokerAccount?.identityStatus || null,

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
        mirror.holdings.length,

      source:
        mirror.source,

      runtimeMode:
        mirror.runtimeMode
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

  const mirror = parseStoredValue(raw);

  if (!isVerifiedRealBrokerMirror(mirror)) {
    if (mirror) {
      await userSetItem(
        "quarantinedLegacyBrokerMirror",
        JSON.stringify({
          mirror,
          quarantinedAt: new Date().toISOString(),
          reason: "UNVERIFIED_OR_SANDBOX_MIRROR"
        })
      );
      await userRemoveItem(BROKER_MIRROR_KEY);
      await userRemoveItem(BROKER_SYNC_STATUS_KEY);
    }

    return null;
  }

  return mirror;
}

/*
 * ==========================================================
 * LOAD SYNC STATUS
 * ==========================================================
 */

export async function loadBrokerSyncStatus() {
  const mirror = await loadBrokerMirror();

  if (!mirror) {
    return null;
  }

  const raw =
    await userGetItem(
      BROKER_SYNC_STATUS_KEY
    );

  const status = parseStoredValue(raw);

  return status?.runtimeMode === mirror.runtimeMode
    ? status
    : null;
}

export async function saveVerifiedUploadedBrokerMirror({
  holdings = [],
  cashBalance = null,
  broker = "Uploaded Broker Valuation",
  accountName = "Verified Valuation Upload",
  fileName = null,
  accountIdentity = null
} = {}) {
  if (!Array.isArray(holdings) || !holdings.length) {
    throw new Error("A verified broker upload must contain holdings.");
  }

  if (!accountIdentity || accountIdentity.identityStatus !== "VERIFIED" ||
      !accountIdentity.cdsNumber || !accountIdentity.brokerAccountKey) {
    throw new Error("Verified CDS, broker, and trading-account identity are required.");
  }

  return saveBrokerMirror({
    brokerAccountId: accountIdentity.brokerAccountKey,
    brokerId: accountIdentity.brokerId,
    clientAccount: accountIdentity.clientAccount || accountIdentity.tradingAccount,
    tradingAccount: accountIdentity.clientAccount || accountIdentity.tradingAccount,
    cdsNumber: accountIdentity.cdsNumber,
    brokerAccountKey: accountIdentity.brokerAccountKey,
    brokerFileIdentifier: accountIdentity.brokerFileIdentifier,
    identityStatus: accountIdentity.identityStatus,
    broker,
    accountName,
    currency: "KES",
    cashBalance: cashBalance ?? 0,
    cashEvidenceAvailable:
      cashBalance !== null && cashBalance !== undefined && cashBalance !== "",
    holdings,
    source: "BROKER_VALUATION_UPLOAD",
    runtimeMode: "REAL_VERIFIED_UPLOAD",
    fileName
  });
}

export async function attachVerifiedBrokerCashEvidence({
  cashBalance,
  fileName = null,
  broker = null,
  accountIdentity = null
} = {}) {
  const amount = Number(cashBalance);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Verified broker cash evidence requires a valid balance.");
  }

  const mirror = await loadBrokerMirror();

  if (!mirror || mirror.runtimeMode !== "REAL_VERIFIED_UPLOAD") {
    throw new Error(
      "Upload the current broker portfolio valuation before adding cash evidence."
    );
  }

  if (!accountIdentity || accountIdentity.identityStatus !== "VERIFIED" ||
      accountIdentity.cdsNumber !== mirror.cdsNumber ||
      accountIdentity.brokerAccountKey !== mirror.brokerAccountKey) {
    throw new Error("Cash evidence must match the valuation CDS, broker, and trading account.");
  }

  return saveBrokerMirror({
    ...mirror,
    broker: broker || mirror.broker,
    fileName: mirror.evidenceFileName,
    cashBalance: amount,
    cashEvidenceAvailable: true,
    cashEvidenceFileName: fileName,
    source: "BROKER_VALUATION_AND_CASH_UPLOAD",
    runtimeMode: "REAL_VERIFIED_UPLOAD"
  });
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
      1365.35,

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
  },

  {
    symbol:
      "COOP",

    name:
      "Co-operative Bank",

    sector:
      "Banking",

    quantity:
      9,

    averagePrice:
      35,

    marketPrice:
      35
  },

  {
    symbol:
      "EABL",

    name:
      "East African Breweries",

    sector:
      "Manufacturing",

    quantity:
      1,

    averagePrice:
      270,

    marketPrice:
      270
  },

  {
    symbol:
      "ABSA",

    name:
      "Absa Bank Kenya",

    sector:
      "Banking",

    quantity:
      10,

    averagePrice:
      29,

    marketPrice:
      29
  }
]
  };

  return saveBrokerMirror(
    mockAccount
  );
}

/*
 * Read connected broker accounts into the reconciliation mirror.
 * This does not mutate GateCEP's canonical REAL portfolio.
 */
export async function syncConnectedBrokerMirror() {
  const accounts = (await loadBrokerAccounts()).filter((account) => {
    const brokerId = String(account?.brokerId || account?.id || "").toUpperCase();
    const mode = String(account?.connectionMode || "").toUpperCase();

    return brokerId !== "SIM" && !mode.includes("PRACTICE") && !mode.includes("DEMO");
  });

  if (!accounts.length) {
    throw new Error("No connected broker account is available to synchronize.");
  }

  const results = [];

  for (const account of accounts) {
    results.push(await syncBrokerPortfolio(account));
  }

  const failed = results.find((result) => result?.ok === false);
  if (failed) {
    throw new Error(
      `Unable to synchronize ${failed?.brokerName || failed?.brokerId || "broker account"}.`
    );
  }

  const holdings = results.flatMap((result) => result?.holdings || []);
  const cashBalance = results.reduce(
    (total, result) => total + moneyNumber(result?.cash),
    0
  );
  const brokerNames = [...new Set(
    results.map((result) => result?.brokerName).filter(Boolean)
  )];

  return saveBrokerMirror({
    brokerAccountId:
      accounts.length === 1 ? accounts[0]?.id || null : "ALL_CONNECTED",
    broker:
      brokerNames.length === 1 ? brokerNames[0] : "All Connected Brokers",
    accountName:
      accounts.length === 1
        ? accounts[0]?.accountName || accounts[0]?.name || "Broker Account"
        : `${accounts.length} connected accounts`,
    currency: "KES",
    cashBalance,
    holdings,
    cashEvidenceAvailable: true,
    source: "CONNECTED_BROKER_ACCOUNTS",
    runtimeMode: "REAL_CONNECTED"
  });
}

import {
  listUserPortfolio,
  listUserPortfolioAccounts,
  addUserHolding,
  replaceUserPortfolioSnapshot,
  updateUserPositionSettlement
} from "./portfolio.repository.js";
import { getUserCashBalances } from "../cash/cash.repository.js";

export async function getUserPortfolio(userId, options = {}) {
  const [holdings, cashBalances] = await Promise.all([
    listUserPortfolio(userId, options),
    getUserCashBalances(userId, options)
  ]);

  const totalValue = holdings.reduce(
    (sum, item) => sum + Number(item.marketValue || 0),
    0
  );

  const totalProfitLoss = holdings.reduce(
    (sum, item) => sum + Number(item.profitLoss || 0),
    0
  );
  const availableCash = cashBalances.reduce(
    (sum, item) => sum + Number(item.cashBalance || 0),
    0
  );

  return {
    holdings,
    cashBalances,
    availableCash,
    summary: {
      totalHoldings: holdings.length,
      totalValue,
      totalProfitLoss,
      availableCash,
      netWorth: totalValue + availableCash
    }
  };
}

export async function getUserPortfolioAccounts(userId) {
  const accounts = await listUserPortfolioAccounts(userId);

  return {
    ok: true,
    accounts: [
      {
        broker: "ALL",
        label: "All Accounts",
        type: "ALL"
      },
      ...accounts
    ],
    version: "PortfolioAccounts-014A3"
  };
}
export async function createHolding(userId, payload) {
  return await addUserHolding(userId, payload);
}

export async function getUserPositions(userId, options = {}) {
  return await getUserPortfolio(userId, options);
}

export async function upsertUserPosition(userId, payload) {
  return await createHolding(userId, payload);
}

export async function settleUserPosition(userId, payload = {}) {
  return await updateUserPositionSettlement(userId, payload);
}

export async function replaceAuthoritativePortfolioSnapshot(userId, accountKey, holdings, cashBalance) {
  const saved = await replaceUserPortfolioSnapshot(userId, accountKey, holdings, cashBalance);
  return { ok: true, replacementMode: "AUTHORITATIVE_BROKER_SNAPSHOT", count: saved.holdings.length, holdings: saved.holdings, cashBalance: saved.cashBalance };
}

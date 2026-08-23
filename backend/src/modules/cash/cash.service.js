import {
  getUserCashBalances,
  upsertUserCashBalance
} from "./cash.repository.js";

export async function getCashSummary(userId, options = {}) {
  const balances = await getUserCashBalances(userId, options);

  const totalCash = balances.reduce(
    (sum, item) => sum + Number(item.cashBalance || 0),
    0
  );

  return {
    balances,
    summary: {
      totalCash,
      currency: "KES"
    }
  };
}

export async function saveCashBalance(userId, payload) {
  return await upsertUserCashBalance(userId, payload);
}

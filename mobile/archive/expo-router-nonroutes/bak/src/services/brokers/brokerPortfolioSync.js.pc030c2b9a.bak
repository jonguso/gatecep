import { loadBrokerAccounts } from "./brokerAccountStore";
import {
  getBrokerCashBalance,
  getBrokerPortfolio
} from "./brokerAdapters";
import { savePortfolio } from "../portfolio/portfolioStore";
import { userSetItem } from "../auth/userStorage";
import { buildSyncStatus } from "../portfolio/syncStatus";

export async function syncAllBrokerPortfolios() {
  const accounts = await loadBrokerAccounts();

  if (!accounts.length) {
    return {
      ok: false,
      message: "No broker accounts connected.",
      holdings: [],
      cash: 0,
      syncedAt: new Date().toISOString()
    };
  }

  const results = [];

  for (const account of accounts) {
    const result = await syncBrokerPortfolio(account);
    results.push(result);
  }

  const holdings = results.flatMap((item) => item.holdings || []);
  const cash = results.reduce((sum, item) => sum + Number(item.cash || 0), 0);

  const portfolio = await savePortfolio(holdings);

  await userSetItem("availableCash", String(cash));
  await userSetItem("statementUploaded", "true");
  await userSetItem("cashStatementUploaded", "true");
  await userSetItem(
    "brokerPortfolioSyncSummary",
    JSON.stringify({
      brokerCount: accounts.length,
      holdingCount: portfolio.length,
      cash,
      syncedAt: new Date().toISOString(),
      results
    })
  );

  await buildSyncStatus();

  return {
    ok: true,
    brokerCount: accounts.length,
    holdings: portfolio,
    cash,
    results,
    syncedAt: new Date().toISOString()
  };
}

export async function syncBrokerPortfolio(accountOrBrokerId) {
  const account =
    typeof accountOrBrokerId === "string"
      ? { brokerId: accountOrBrokerId }
      : accountOrBrokerId;

  const brokerId = account?.brokerId || account?.id || "SIM";

  const portfolioResponse = await getBrokerPortfolio(brokerId);
  const cashResponse = await getBrokerCashBalance(brokerId);

  const holdings = normalizeBrokerHoldings(
    portfolioResponse?.holdings || [],
    account
  );

  return {
    ok: portfolioResponse?.ok !== false && cashResponse?.ok !== false,
    brokerId,
    brokerName: account?.brokerName || account?.name || brokerId,
    brokerAccountId: account?.id || null,
    clientNumber: account?.clientNumber || null,
    holdings,
    cash: Number(cashResponse?.cash || 0),
    cashCurrency: cashResponse?.currency || "KES",
    portfolioResponse,
    cashResponse,
    syncedAt: new Date().toISOString()
  };
}

export function normalizeBrokerHoldings(rows = [], account = {}) {
  return rows
    .filter((row) => row?.symbol)
    .map((row) => {
      const quantity = Number(row.quantity || row.qty || row.shares || 0);
      const marketPrice = Number(
        row.marketPrice || row.price || row.lastPrice || row.currentPrice || 0
      );
      const averagePrice = Number(
        row.averagePrice || row.averageCost || row.costPrice || row.avgPrice || 0
      );

      const marketValue =
        Number(row.marketValue || row.value || 0) ||
        quantity * marketPrice;

      const costValue =
        Number(row.costValue || row.investedValue || 0) ||
        quantity * averagePrice;

      const profitLoss = marketValue - costValue;
      const profitLossPct =
        costValue > 0 ? (profitLoss / costValue) * 100 : 0;

      return {
        brokerAccountId: account?.id || null,
        brokerId: account?.brokerId || account?.id || null,
        broker: account?.brokerName || account?.name || row.broker || "BROKER",
        clientNumber: account?.clientNumber || null,
        source: "BROKER_PORTFOLIO_SYNC",
        symbol: String(row.symbol || "").trim().toUpperCase(),
        name: row.name || row.securityName || row.symbol,
        sector: row.sector || row.industry || "Unknown",
        quantity,
        averagePrice,
        averageCost: averagePrice,
        marketPrice,
        price: marketPrice,
        lastPrice: marketPrice,
        marketValue,
        value: marketValue,
        costValue,
        investedValue: costValue,
        profitLoss,
        profitLossPct,
        changePct: profitLossPct,
        syncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
}
import { userGetItem, userSetItem } from "../auth/userStorage";
import { loadUnifiedPortfolio } from "./unifiedPortfolioApi";
import { loadCanonicalRealTransactionHistory } from "../../features/wealth-journey/canonicalRealBehaviorHistoryService";

export async function buildSyncStatus() {
  const portfolio = await loadUnifiedPortfolio();
  const holdings = portfolio?.holdings || [];

  const cashRaw = await userGetItem("availableCash");
  const defaultBrokerRaw = await userGetItem("defaultBrokerProfile");
  const legacyBrokerRaw = await userGetItem("brokerProfile");

  const brokerSkippedRaw = await userGetItem("brokerProfileSkipped");

  const portfolioUploaded = await userGetItem("statementUploaded");
  const cashUploaded = await userGetItem("cashStatementUploaded");
  const transactionsUploaded = await userGetItem("transactionsUploaded");

  const statementSummaryRaw = await userGetItem("statementSummary");
  const txSummaryRaw = await userGetItem("transactionUploadSummary");

  const brokerRaw = defaultBrokerRaw || legacyBrokerRaw;
  const brokerProfile = brokerRaw ? JSON.parse(brokerRaw) : null;
  const transactions = await loadCanonicalRealTransactionHistory();

  const statementSummary = statementSummaryRaw
    ? JSON.parse(statementSummaryRaw)
    : null;

  const txSummary = txSummaryRaw ? JSON.parse(txSummaryRaw) : null;

  const brokerName =
    brokerProfile?.broker ||
    brokerProfile?.name ||
    brokerProfile?.brokerName ||
    brokerProfile?.selectedBroker ||
    brokerProfile?.firm ||
    brokerProfile?.company ||
    brokerProfile?.provider ||
    null;

  const brokerConnected = !!brokerName && brokerSkippedRaw !== "true";

  const portfolioValue = Number(
    portfolio?.totalMarketValue ||
      holdings.reduce(
        (sum, h) => sum + Number(h.marketValue || h.value || 0),
        0
      )
  );

  const status = {
    broker: brokerName || "No broker",
    brokerConnected,

    holdingsCount: holdings.length,
    availableCash: Number(cashRaw || 0),
    transactionCount: transactions.length,

    portfolioValue,
    portfolioSource: portfolio?.priceSource || portfolio?.source || "",

    portfolioUploaded: portfolioUploaded === "true",
    cashUploaded: cashUploaded === "true",
    transactionsUploaded: transactionsUploaded === "true" && transactions.length > 0,

    lastPortfolioSync: statementSummary?.uploadedAt || null,
    lastCashSync: statementSummary?.uploadedAt || null,
    lastTransactionSync: txSummary?.uploadedAt || null,

    updatedAt: new Date().toISOString()
  };

  await userSetItem("syncStatus", JSON.stringify(status));

  return status;
}

export async function getSyncStatus() {
  const raw = await userGetItem("syncStatus");

  if (raw) {
    return JSON.parse(raw);
  }

  return await buildSyncStatus();
}

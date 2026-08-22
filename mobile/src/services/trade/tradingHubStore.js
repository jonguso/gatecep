import { loadUnifiedPortfolio } from "../portfolio/unifiedPortfolioApi";
import { userGetItem } from "../auth/userStorage";
import { loadCanonicalRealAvailableCash } from "../../features/portfolio-cash/canonicalPortfolioCashService";

export async function loadTradingHubData() {
  const portfolioData = await loadUnifiedPortfolio();
  const portfolio = portfolioData?.holdings || [];

  const brokerRaw = await userGetItem("defaultBrokerProfile");
  const cashEvidence = await userGetItem("availableCash");
  const broker = brokerRaw ? JSON.parse(brokerRaw) : null;
  const cash = await loadCanonicalRealAvailableCash();

  return {
    broker,
    cash,
    cashAvailable: cashEvidence !== null && cashEvidence !== undefined && Number.isFinite(Number(cash)),
    portfolio,
    orders: [],
    execution: null,
    brokerControlled: true,
    loadedAt: new Date().toISOString()
  };
}

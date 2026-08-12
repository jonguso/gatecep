import { buildCanonicalRealWealthContext } from "../wealth-journey/canonicalRealWealthContextService";
import { resolvePortfolioSourceSelection } from "./portfolioSourcePolicy";

export async function buildCanonicalPortfolioView({
  selectedSourceId = null
} = {}) {
  const canonical =
    await buildCanonicalRealWealthContext();

  const selection =
    resolvePortfolioSourceSelection({
      catalog: canonical?.portfolioSources || {},
      selectedSourceId
    });

  return {
    canonical,
    selection,
    sourceOptions:
      canonical?.portfolioSources?.selectableSources || [],
    selectedPortfolio:
      selection?.selected || null,
    wealthActivation:
      canonical?.wealthActivation || null
  };
}

export function buildDashboardPortfolioSourceLabel(view = {}) {
  const selected = view?.selectedPortfolio;

  if (!selected) {
    return {
      title: "No Portfolio",
      subtitle: "Connect a broker, upload a portfolio, or use Practice."
    };
  }

  if (selected?.type === "PRACTICE") {
    return {
      title: "Practice Portfolio",
      subtitle: "Simulated learning portfolio · No real money"
    };
  }

  if (selected?.type === "ALL") {
    return {
      title: "All Accounts",
      subtitle: "Combined real broker and imported portfolios"
    };
  }

  return {
    title: selected?.name || "Portfolio",
    subtitle: "Real investment account"
  };
}

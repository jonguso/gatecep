import { getUserPortfolio } from "../portfolio/portfolio.service.js";
import { getCashSummary } from "../cash/cash.service.js";
import {
  getMarketCache,
  refreshMarketCache
} from "../market-cache/marketCache.service.js";


function n(value) {
  return Number(value || 0);
}

function money(value) {
  return Number(n(value).toFixed(2));
}

export async function getMarketIntelligenceHome(userId) {
  const [portfolio, cashData] = await Promise.all([
  getUserPortfolio(userId, { broker: "ALL" }),
  getCashSummary(userId)
]);

let allPrices = getMarketCache();

if (!allPrices?.count) {
  allPrices = await refreshMarketCache();
}

  const holdings = portfolio?.holdings || [];
  // Markets may display local EOD/demo rows, but a REAL portfolio may only be
  // revalued by a provider that explicitly passed the valuation contract.
  const valuationEligible = allPrices?.valuationEligible === true;
  const priceRows = valuationEligible ? (allPrices?.data || []) : [];

  const prices = {};
  for (const row of priceRows) {
    prices[String(row.symbol || "").toUpperCase().trim()] = row;
  }

  const revaluedHoldings = holdings.map((holding) => {
    const symbol = String(holding.symbol || "").toUpperCase().trim();
    const quote = prices[symbol];

    const quantity = n(holding.quantity);
    const avg = n(holding.averagePrice || holding.averageCost);
    const fallbackPrice = n(holding.marketPrice || holding.price);

    const livePrice = n(
      quote?.price || quote?.lastPrice || quote?.marketPrice || fallbackPrice
    );

    const previousClose = n(
      quote?.previousClose || quote?.prevClose || fallbackPrice
    );

    const marketValue = quantity * livePrice;
    const investedValue = quantity * avg;
    const gain = marketValue - investedValue;
    const dayChange = quantity * (livePrice - previousClose);
    const dayChangePct =
      previousClose > 0 ? ((livePrice - previousClose) / previousClose) * 100 : 0;

    return {
      ...holding,
      livePrice: money(livePrice),
      previousClose: money(previousClose),
      marketValue: money(marketValue),
      investedValue: money(investedValue),
      gain: money(gain),
      gainPct: investedValue > 0 ? money((gain / investedValue) * 100) : 0,
      dayChange: money(dayChange),
      dayChangePct: money(dayChangePct),
      priceSource: quote?.priceSource || quote?.source || "STORED_PRICE",
      quoteMatched: Boolean(quote),
      quoteSymbol: quote?.symbol || null,
      marketDate: quote?.marketDate || null
    };
  });

  const totalValue = revaluedHoldings.reduce((sum, h) => sum + n(h.marketValue), 0);
  const investedValue = revaluedHoldings.reduce((sum, h) => sum + n(h.investedValue), 0);
  const dayChange = revaluedHoldings.reduce((sum, h) => sum + n(h.dayChange), 0);

  const gain = totalValue - investedValue;
  const totalCash = n(cashData?.summary?.totalCash);
  const netWorth = totalValue + totalCash;

  const topMovers = [...revaluedHoldings]
    .sort((a, b) => Math.abs(n(b.dayChange)) - Math.abs(n(a.dayChange)))
    .slice(0, 5);

  const largestDrag = [...revaluedHoldings].sort(
    (a, b) => n(a.dayChange) - n(b.dayChange)
  )[0];

  const largestBoost = [...revaluedHoldings].sort(
    (a, b) => n(b.dayChange) - n(a.dayChange)
  )[0];

  const coachNarrative =
    dayChange < 0
      ? `Your portfolio is down KES ${money(Math.abs(dayChange))} today. The biggest drag is ${
          largestDrag?.symbol || "N/A"
        }. Coach G recommends staying calm and reviewing whether the move is market-wide or stock-specific.`
      : `Your portfolio is up KES ${money(dayChange)} today. The strongest contributor is ${
          largestBoost?.symbol || "N/A"
        }. Coach G recommends monitoring gains and keeping diversification in check.`;

  return {
    ok: true,
    summary: {
      totalValue: money(totalValue),
      investedValue: money(investedValue),
      totalCash: money(totalCash),
      netWorth: money(netWorth),
      totalGain: money(gain),
      totalGainPct: investedValue > 0 ? money((gain / investedValue) * 100) : 0,
      dayChange: money(dayChange),
      dayChangePct: totalValue > 0 ? money((dayChange / totalValue) * 100) : 0,
      holdingsCount: revaluedHoldings.length
    },
    marketFeed: {
      provider: allPrices?.provider || "UNKNOWN",
      valuationEligible,
      marketDate: allPrices?.marketDate || null,
      count: priceRows.length,
      matchedSymbols: revaluedHoldings.filter((h) => h.quoteMatched).length,
      unmatchedSymbols: revaluedHoldings
        .filter((h) => !h.quoteMatched)
        .map((h) => h.symbol)
    },
    coach: {
      headline: dayChange < 0 ? "Portfolio down today" : "Portfolio up today",
      narrative: coachNarrative,
      largestDrag,
      largestBoost
    },
    movers: topMovers,
    holdings: revaluedHoldings,
    generatedAt: new Date().toISOString(),
    version: "MarketIntelligence-018B"
  };
}

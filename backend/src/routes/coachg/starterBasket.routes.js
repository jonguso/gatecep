import express from "express";
import { marketDataGateway } from "../../services/marketData/MarketDataGateway.js";

const router = express.Router();

router.get("/:basket", async (req, res) => {
  const basket = String(req.params.basket || "").toLowerCase();
  const amount = Number(req.query.amount || 0);

  const baskets = {
    "dividend-basket": [
      { symbol: "BAT", name: "BAT Kenya", sector: "Manufacturing", dividendYield: 9.5, reason: "Strong historical dividend profile." },
      { symbol: "SCOM", name: "Safaricom", sector: "Telecommunication", dividendYield: 5.8, reason: "Large, liquid company with consistent dividend history." },
      { symbol: "KCB", name: "KCB Group", sector: "Banking", dividendYield: 6.2, reason: "Banking exposure with income potential." },
      { symbol: "COOP", name: "Co-operative Bank", sector: "Banking", dividendYield: 7.1, reason: "Stable banking counter with dividend appeal." },
      { symbol: "SCBK", name: "Standard Chartered", sector: "Banking", dividendYield: 8.4, reason: "Premium banking stock with strong income profile." }
    ],

    banking: [
      { symbol: "KCB", name: "KCB Group", sector: "Banking", dividendYield: 6.2, reason: "Large banking exposure." },
      { symbol: "EQT", name: "Equity Group", sector: "Banking", dividendYield: 5.5, reason: "Growth-oriented banking exposure." },
      { symbol: "ABSA", name: "Absa Bank Kenya", sector: "Banking", dividendYield: 8.1, reason: "Income-focused banking counter." },
      { symbol: "COOP", name: "Co-operative Bank", sector: "Banking", dividendYield: 7.1, reason: "Stable banking counter." },
      { symbol: "SCBK", name: "Standard Chartered", sector: "Banking", dividendYield: 8.4, reason: "High-quality banking income exposure." }
    ],

    etf: [
      { symbol: "SMWF", name: "Sanlam MSCI World ETF", sector: "ETF", dividendYield: 0, reason: "Global diversification." },
      { symbol: "GLD", name: "NewGold ETF", sector: "ETF", dividendYield: 0, reason: "Gold-linked diversification." }
    ],

    cash: []
  };

  const pricesResult = await marketDataGateway.getPrices();
  const marketPriceLookup = Object.fromEntries(
    (pricesResult.data || [])
      .map((item) => [String(item.symbol || item.code || "").trim().toUpperCase(), item])
      .filter(([symbol]) => symbol)
  );

  const stocks = (baskets[basket] || [])
    .map((stock) => {
      const market = marketPriceLookup[stock.symbol] || {};
      const price = Number(market.price || market.lastPrice || 0);

      if (!(price > 0)) return null;

      return {
        ...stock,
        price,
        priceSource: market.priceSource || market.provider || null,
        marketDate: market.marketDate || null
      };
    })
    .filter(Boolean);

  const affordableStocks = stocks.filter(
    (stock) => Number(stock.price || 0) <= amount
  );

  const perStock =
    affordableStocks.length > 0
      ? amount / affordableStocks.length
      : 0;

  let totalInvested = 0;

  const holdings = affordableStocks
    .map((stock) => {
      const price = Number(stock.price || 0);

      const shares =
        price > 0
          ? Math.floor(perStock / price)
          : 0;

      const investedValue =
        shares * price;

      totalInvested += investedValue;

      const expectedAnnualDividend =
        investedValue *
        (Number(stock.dividendYield || 0) / 100);

      return {
        ...stock,
        allocation: Number(perStock.toFixed(2)),
        shares,
        investedValue: Number(investedValue.toFixed(2)),
        expectedAnnualDividend: Number(expectedAnnualDividend.toFixed(2)),
        action: "BUY",
        reason: stock.reason
      };
    })
    .filter((stock) => stock.shares > 0);

  const unusedCash =
    Number((amount - totalInvested).toFixed(2));

  const totalExpectedAnnualDividend =
    holdings.reduce(
      (sum, item) =>
        sum + Number(item.expectedAnnualDividend || 0),
      0
    );

  res.json({
    ok: true,
    basket,
    amount,
    count: holdings.length,
    totalInvested: Number(totalInvested.toFixed(2)),
    unusedCash,
    totalExpectedAnnualDividend: Number(
      totalExpectedAnnualDividend.toFixed(2)
    ),
    holdings,
    advice:
      unusedCash > 0
        ? `KES ${unusedCash.toFixed(2)} could not be efficiently invested and should move to Cash.`
        : "Full basket amount was efficiently invested."
  });
});

export default router;

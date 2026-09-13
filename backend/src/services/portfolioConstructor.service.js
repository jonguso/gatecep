const SECURITY_UNIVERSE = [
  {
    symbol: "SCOM",
    name: "Safaricom",
    sector: "Telecommunication",
    dividendYield: 5.8,
    styles: ["dividend", "balanced_growth", "wealth_growth"]
  },
  {
    symbol: "KCB",
    name: "KCB Group",
    sector: "Banking",
    dividendYield: 6.2,
    styles: ["dividend", "balanced_growth", "wealth_growth"]
  },
  {
    symbol: "COOP",
    name: "Co-operative Bank",
    sector: "Banking",
    dividendYield: 7.1,
    styles: ["dividend", "balanced_growth"]
  },
  {
    symbol: "ABSA",
    name: "Absa Bank Kenya",
    sector: "Banking",
    dividendYield: 8.1,
    styles: ["dividend", "preservation"]
  },
  {
    symbol: "EQT",
    name: "Equity Group",
    sector: "Banking",
    dividendYield: 5.5,
    styles: ["wealth_growth", "balanced_growth"]
  },
  {
    symbol: "BAT",
    name: "BAT Kenya",
    sector: "Manufacturing",
    dividendYield: 9.5,
    styles: ["dividend", "preservation"]
  },
  {
    symbol: "EABL",
    name: "East African Breweries",
    sector: "Manufacturing",
    dividendYield: 4.8,
    styles: ["dividend", "balanced_growth"]
  },
  {
    symbol: "SMWF",
    name: "Sanlam MSCI World ETF",
    sector: "ETF",
    dividendYield: 0,
    styles: ["wealth_growth", "balanced_growth", "preservation"]
  },
  {
    symbol: "GLD",
    name: "NewGold ETF",
    sector: "ETF",
    dividendYield: 0,
    styles: ["preservation", "balanced_growth"]
  },
  {
    symbol: "KPLC",
    name: "Kenya Power",
    sector: "Energy",
    dividendYield: 0,
    styles: ["wealth_growth", "aggressive"]
  }
];

export function buildRecommendedPortfolio(profile, amount, marketPriceLookup = {}) {
  const investmentAmount = Number(amount || 0);
  const cashReserveAmount =
    investmentAmount * (profile.constraints.cashReserve / 100);

  let investableAmount =
    investmentAmount - cashReserveAmount;

  const sectorLimit =
    investmentAmount * (profile.constraints.sectorCap / 100);

  const maxSingleAmount =
    investmentAmount * (profile.constraints.maxSinglePosition / 100);

  const selectedUniverse = rankUniverse(profile)
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

  const sectorExposure = {};
  const portfolio = [];

  for (const stock of selectedUniverse) {
    if (investableAmount <= 0) break;

    const currentSectorValue =
      sectorExposure[stock.sector] || 0;

    if (currentSectorValue >= sectorLimit) continue;

    const allowedBySector =
      sectorLimit - currentSectorValue;

    const targetAmount = Math.min(
      maxSingleAmount,
      allowedBySector,
      investableAmount
    );

    const shares =
      stock.price > 0
        ? Math.floor(targetAmount / stock.price)
        : 0;

    if (shares <= 0) continue;

    const investedValue =
      shares * stock.price;

    const expectedAnnualDividend =
      investedValue *
      (Number(stock.dividendYield || 0) / 100);

    portfolio.push({
      ...stock,
      shares,
      targetAmount: Number(targetAmount.toFixed(2)),
      investedValue: Number(investedValue.toFixed(2)),
      expectedAnnualDividend: Number(expectedAnnualDividend.toFixed(2)),
      weight:
        investmentAmount > 0
          ? Number(((investedValue / investmentAmount) * 100).toFixed(2))
          : 0,
      reason: buildReason(profile, stock)
    });

    sectorExposure[stock.sector] =
      currentSectorValue + investedValue;

    investableAmount -= investedValue;
  }

  const totalInvested = portfolio.reduce(
    (sum, item) => sum + Number(item.investedValue || 0),
    0
  );

  const cash =
    investmentAmount - totalInvested;

  const sectorAllocation = buildSectorAllocation(
    portfolio,
    cash,
    investmentAmount
  );

  const totalExpectedAnnualDividend = portfolio.reduce(
    (sum, item) => sum + Number(item.expectedAnnualDividend || 0),
    0
  );

  return {
    amount: investmentAmount,
    portfolio,
    sectorAllocation,
    totalInvested: Number(totalInvested.toFixed(2)),
    cash: Number(cash.toFixed(2)),
    totalExpectedAnnualDividend: Number(totalExpectedAnnualDividend.toFixed(2))
  };
}

function rankUniverse(profile) {
  return [...SECURITY_UNIVERSE]
    .map((stock) => ({
      ...stock,
      score: scoreStock(profile, stock)
    }))
    .sort((a, b) => b.score - a.score);
}

function scoreStock(profile, stock) {
  let score = 50;

  const riskStyleMap = {
    conservative: "preservation",
    balanced: "balanced_growth",
    aggressive: "aggressive"
  };

  if (stock.styles.includes(profile.goal)) score += 25;
  if (stock.styles.includes(riskStyleMap[profile.risk])) score += 10;

  if (profile.goal === "dividend") {
    score += Number(stock.dividendYield || 0) * 2;
  }

  if (profile.risk === "conservative") {
    if (stock.sector === "ETF") score += 15;
    if (stock.dividendYield > 0) score += 10;
  }

  if (profile.risk === "aggressive") {
    if (stock.styles.includes("wealth_growth")) score += 15;
  }

  return score;
}

function buildSectorAllocation(portfolio, cash, totalAmount) {
  const map = {};

  for (const item of portfolio) {
    map[item.sector] =
      Number(map[item.sector] || 0) +
      Number(item.investedValue || 0);
  }

  if (cash > 0) {
    map.Cash = Number(cash);
  }

  return Object.entries(map)
    .map(([sector, value]) => ({
      sector,
      value: Number(value.toFixed(2)),
      weight:
        totalAmount > 0
          ? Number(((value / totalAmount) * 100).toFixed(2))
          : 0
    }))
    .sort((a, b) => b.weight - a.weight);
}

function buildReason(profile, stock) {
  if (profile.goal === "dividend" && stock.dividendYield > 0) {
    return "Selected for income potential and diversification fit.";
  }

  if (profile.risk === "conservative") {
    return "Selected to support stability and controlled risk.";
  }

  if (profile.risk === "aggressive") {
    return "Selected for growth-oriented exposure.";
  }

  return "Selected because it matches your goal and risk profile.";
}

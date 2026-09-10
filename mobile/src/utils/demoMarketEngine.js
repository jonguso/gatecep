const BASE_PRICES = {
  SCOM: 30.6,
  KCB: 45,
  EQT: 48,
  COOP: 16,
  EABL: 248,
  BAT: 520,
  KEGN: 45.5,
  KQ: 3.8,
  GLD: 5690,
  SMWF: 950
};

export function getDemoMarketPrice(symbol) {
  const base = BASE_PRICES[String(symbol || "").toUpperCase()] || 10;
  const movement = (Math.random() - 0.5) * 0.04;
  return Number((base * (1 + movement)).toFixed(2));
}

export function revalueHoldingsWithDemoPrices(holdings = []) {
  return holdings.map((item) => {
    const symbol = String(item.symbol || "").toUpperCase();
    const quantity = Number(item.quantity || 0);
    const marketPrice = getDemoMarketPrice(symbol);

    return {
      ...item,
      symbol,
      marketPrice: String(marketPrice),
      marketValue: quantity * marketPrice
    };
  });
}
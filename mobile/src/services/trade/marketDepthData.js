export function getMarketDepth(symbol = "SCOM") {
  const base = {
    SCOM: 31.75,
    EABL: 258.25,
    KCB: 70.75,
    EQT: 77.25,
    COOP: 31.35
  };

  const price = base[symbol] || 30;

  return {
    symbol,
    bestBid: price - 0.05,
    bestAsk: price,
    spread: 0.05,
    bids: [
      { price: price - 0.05, qty: 120000 },
      { price: price - 0.1, qty: 82500 },
      { price: price - 0.15, qty: 64000 },
      { price: price - 0.2, qty: 41800 },
      { price: price - 0.25, qty: 30200 }
    ],
    asks: [
      { price, qty: 95000 },
      { price: price + 0.05, qty: 64200 },
      { price: price + 0.1, qty: 55700 },
      { price: price + 0.15, qty: 33800 },
      { price: price + 0.2, qty: 26100 }
    ]
  };
}
export const MARKET_TABS = [
  "Summary",
  "Equities",
  "Gainers",
  "Losers",
  "Volume",
  "Turnover"
];

export const INDEX_ROWS = [
  {
    symbol: "^NASI",
    name: "NSE All Share Index",
    value: 211.57,
    change: 0.46,
    changePct: 0.22,
    trend: "UP"
  },
  {
    symbol: "^N20",
    name: "NSE 20 Share Index",
    value: 3568.33,
    change: 6.51,
    changePct: 0.18,
    trend: "UP"
  },
  {
    symbol: "^N25",
    name: "NSE 25 Share Index",
    value: 5838.13,
    change: 24.54,
    changePct: 0.42,
    trend: "UP"
  },
  {
    symbol: "^NBDI",
    name: "NSE Bonds Index",
    value: 1122.24,
    change: -4.28,
    changePct: -0.38,
    trend: "DOWN"
  }
];

export function getMarketSummary(rows = []) {
  const marketRows = Array.isArray(rows) ? rows : [];
  const gainers = marketRows.filter((row) => Number(row.changePct) > 0).length;
  const decliners = marketRows.filter((row) => Number(row.changePct) < 0).length;

  const turnover = marketRows.reduce(
    (sum, row) => sum + Number(row.turnover || 0),
    0
  );

  const volume = marketRows.reduce(
    (sum, row) => sum + Number(row.volume || 0),
    0
  );

  return {
    turnover,
    volume,
    securities: marketRows.length,
    gainers,
    decliners,
    breadth: gainers >= decliners ? "Positive" : "Weak",
    avgTradeSize: turnover / Math.max(volume, 1)
  };
}

export function getRowsForTab(tab, rows = []) {
  const marketRows = Array.isArray(rows) ? rows : [];
  if (tab === "Gainers") {
    return [...marketRows].filter((row) => Number(row.changePct) > 0).sort((a, b) => Number(b.changePct) - Number(a.changePct));
  }

  if (tab === "Losers") {
    return [...marketRows].filter((row) => Number(row.changePct) < 0).sort((a, b) => Number(a.changePct) - Number(b.changePct));
  }

  if (tab === "Volume") {
    return [...marketRows].sort((a, b) => Number(b.volume || 0) - Number(a.volume || 0));
  }

  if (tab === "Turnover") {
    return [...marketRows].sort((a, b) => Number(b.turnover || 0) - Number(a.turnover || 0));
  }

  return [...marketRows].sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
}

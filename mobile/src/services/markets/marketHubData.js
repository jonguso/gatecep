export const MARKET_TABS = [
  "Equities",
  "Summary",
  "Gainers",
  "Losers",
  "Volume",
  "Turnover"
];

export const MARKET_RANK_LIMITS = Object.freeze({
  Gainers: 10,
  Losers: 5,
  Volume: 10,
  Turnover: 5
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getTurnoverMetric(row = {}) {
  const reported = finiteNumber(row.turnover);
  if (reported > 0) {
    return { value: reported, estimated: false };
  }

  const price = finiteNumber(row.price);
  const volume = finiteNumber(row.volume);
  if (price > 0 && volume > 0) {
    return { value: price * volume, estimated: true };
  }

  return { value: 0, estimated: false };
}

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

  const turnoverMetrics = marketRows.map(getTurnoverMetric);
  const turnover = turnoverMetrics.reduce((sum, metric) => sum + metric.value, 0);

  const volume = marketRows.reduce(
    (sum, row) => sum + Number(row.volume || 0),
    0
  );

  return {
    turnover,
    turnoverEstimated: turnoverMetrics.some((metric) => metric.estimated),
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
    return [...marketRows]
      .filter((row) => finiteNumber(row.changePct) > 0)
      .sort((a, b) => finiteNumber(b.changePct) - finiteNumber(a.changePct))
      .slice(0, MARKET_RANK_LIMITS.Gainers);
  }

  if (tab === "Losers") {
    return [...marketRows]
      .filter((row) => finiteNumber(row.changePct) < 0)
      .sort((a, b) => finiteNumber(a.changePct) - finiteNumber(b.changePct))
      .slice(0, MARKET_RANK_LIMITS.Losers);
  }

  if (tab === "Volume") {
    return [...marketRows]
      .filter((row) => finiteNumber(row.volume) > 0)
      .sort((a, b) => finiteNumber(b.volume) - finiteNumber(a.volume))
      .slice(0, MARKET_RANK_LIMITS.Volume);
  }

  if (tab === "Turnover") {
    return [...marketRows]
      .filter((row) => getTurnoverMetric(row).value > 0)
      .sort((a, b) => getTurnoverMetric(b).value - getTurnoverMetric(a).value)
      .slice(0, MARKET_RANK_LIMITS.Turnover);
  }

  return [...marketRows].sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
}

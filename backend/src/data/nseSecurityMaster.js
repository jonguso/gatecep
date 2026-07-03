export const NSE_SECURITIES = [
  { symbol: "SCOM", name: "Safaricom PLC", sector: "Telecom" },
  { symbol: "KCB", name: "KCB Group", sector: "Banking" },
  { symbol: "COOP", name: "Co-operative Bank", sector: "Banking" },
  { symbol: "EQT", name: "Equity Group", sector: "Banking" },
  { symbol: "EABL", name: "East African Breweries", sector: "Consumer" },
  { symbol: "ABSA", name: "Absa Bank Kenya", sector: "Banking" },
  { symbol: "BAT", name: "BAT Kenya", sector: "Consumer" },
  { symbol: "KPLC", name: "Kenya Power", sector: "Energy" },
  { symbol: "SMWF", name: "Sanlam MSCI World ETF", sector: "ETF" },
  { symbol: "DTK", aliases: ["DTB"], name: "Diamond Trust Bank Kenya", sector: "Banking" },
  { symbol: "GLD", aliases:["NEWGOLD"], name: "ABSA NewGold ETF", sector: "ETF" },
  { symbol: "IM", aliases:["I&M", "I & M", "I AND M", "IMH"], name: "I&M Group", sector: "Banking" },
  { symbol: "KEGN", aliases:["KENGEN"], name: "KenGen PLC", sector: "Energy" },
  { symbol: "JUB", name: "Jubilee Insurance", sector: "Insurance" },
  { symbol: "KNRE", name: "Kenya Reinsurance", sector: "Insurance" },
  { symbol: "KPC", name: "Kenya Pipeline company", sector: "Energy" },
  { symbol: "KQ", name: "Kenya Airways", sector: "Transport" },
  { symbol: "SBIC", name: "Stanbic Holdings", sector: "Banking" },
  { symbol: "SCBK", name: "Standard Chartered Bank Kenya", sector: "Banking" }
];

export const nseSecurityMaster = NSE_SECURITIES;

export function normalizeNseSymbol(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function getSecurityBySymbol(symbol) {
  const value = normalizeNseSymbol(symbol);

  return (
    NSE_SECURITIES.find((item) => {
      const itemSymbol = normalizeNseSymbol(item.symbol);
      const aliases = Array.isArray(item.aliases)
        ? item.aliases.map(normalizeNseSymbol)
        : [];

      return itemSymbol === value || aliases.includes(value);
    }) || {
      symbol: value,
      name: value,
      sector: "Unknown"
    }
  );
}

export function applySecurityMaster(row = {}) {
  const symbol = normalizeNseSymbol(row.symbol || row.code || "");
  const security = getSecurityBySymbol(symbol);

  const currentName = String(row.name || "").trim();
  const currentSector = String(row.sector || "").trim();

  const shouldReplaceSector =
    !currentSector ||
    currentSector.toLowerCase() === "unknown" ||
    currentSector.toLowerCase() === "n/a";

  const shouldReplaceName =
    !currentName ||
    currentName.toLowerCase() === "unknown" ||
    currentName.toLowerCase() === "n/a";

  return {
    ...row,
    symbol: security.symbol,
    name: shouldReplaceName ? security.name : currentName,
    sector: shouldReplaceSector ? security.sector : currentSector
  };
}
export default NSE_SECURITIES;
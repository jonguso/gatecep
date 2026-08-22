export const NSE_SECURITIES = [
  { symbol: "EGAD", name: "Eaagads Ltd", sector: "Agriculture" },
  { symbol: "KAPC", name: "Kapchorua Tea Company Ltd", sector: "Agriculture" },
  { symbol: "KUKZ", name: "Kakuzi Ltd", sector: "Agriculture" },
  { symbol: "LIMT", name: "Limuru Tea Company Ltd", sector: "Agriculture" },
  { symbol: "SASN", name: "Sasini Tea and Coffee Ltd", sector: "Agriculture" },
  { symbol: "WTK", name: "Williamson Tea Kenya Ltd", sector: "Agriculture" },
  { symbol: "CGEN", name: "Car and General Kenya Ltd", sector: "Automotive" },
  { symbol: "ABSA", name: "Absa Bank Kenya Plc", sector: "Banking" },
  { symbol: "BKG", name: "BK Group Plc", sector: "Banking" },
  { symbol: "COOP", name: "Co-operative Bank of Kenya", sector: "Banking" },
  { symbol: "DTK", aliases: ["DTB"], name: "Diamond Trust Bank Kenya Ltd", sector: "Banking" },
  { symbol: "EQT", aliases: ["EQTY"], name: "Equity Group Holdings Ltd", sector: "Banking" },
  { symbol: "FMLY", name: "Family Bank Limited", sector: "Banking" },
  { symbol: "HFCK", name: "HF Group", sector: "Banking" },
  { symbol: "IM", aliases: ["I&M", "I & M", "I AND M", "IMH"], name: "I&M Holdings Plc", sector: "Banking" },
  { symbol: "KCB", name: "KCB Group", sector: "Banking" },
  { symbol: "NCBA", name: "NCBA Group Plc", sector: "Banking" },
  { symbol: "SBIC", name: "Stanbic Holdings Ltd", sector: "Banking" },
  { symbol: "SCBK", name: "Standard Chartered Bank Kenya Ltd", sector: "Banking" },
  { symbol: "KQ", name: "Kenya Airways Ltd", sector: "Commercial & Services" },
  { symbol: "LKL", name: "Longhorn Publishers Ltd", sector: "Commercial & Services" },
  { symbol: "NBV", name: "Nairobi Business Ventures Ltd", sector: "Commercial & Services" },
  { symbol: "NMG", name: "Nation Media Group", sector: "Commercial & Services" },
  { symbol: "SCAN", name: "WPP Scangroup Ltd", sector: "Commercial & Services" },
  { symbol: "SGL", name: "Standard Group Ltd", sector: "Commercial & Services" },
  { symbol: "SMER", name: "Sameer Africa Plc", sector: "Commercial & Services" },
  { symbol: "TPSE", name: "TPS Eastern Africa Plc", sector: "Commercial & Services" },
  { symbol: "UCHM", name: "Uchumi Supermarkets Plc", sector: "Commercial & Services" },
  { symbol: "XPRS", name: "Express Kenya Plc", sector: "Commercial & Services" },
  { symbol: "CABL", name: "East African Cables Plc", sector: "Construction & Allied" },
  { symbol: "CRWN", name: "Crown Paints Kenya Plc", sector: "Construction & Allied" },
  { symbol: "PORT", name: "East African Portland Cement", sector: "Construction & Allied" },
  { symbol: "KEGN", aliases: ["KENGEN"], name: "KenGen Plc", sector: "Energy" },
  { symbol: "KPC", name: "Kenya Pipeline Company", sector: "Energy" },
  { symbol: "KPLC", name: "Kenya Power & Lighting Company", sector: "Energy" },
  { symbol: "TOTL", name: "TotalEnergies Marketing Kenya Plc", sector: "Energy" },
  { symbol: "BRIT", name: "Britam Holdings Ltd", sector: "Insurance" },
  { symbol: "CIC", name: "CIC Insurance Group Ltd", sector: "Insurance" },
  { symbol: "JUB", name: "Jubilee Holdings Ltd", sector: "Insurance" },
  { symbol: "KNRE", name: "Kenya Re-Insurance Corporation", sector: "Insurance" },
  { symbol: "LBTY", name: "Liberty Kenya Holdings Ltd", sector: "Insurance" },
  { symbol: "SLAM", name: "Sanlam Allianz Holdings Kenya Plc", sector: "Insurance" },
  { symbol: "CTUM", name: "Centum Investment Company", sector: "Investment" },
  { symbol: "HAFR", name: "Home Afrika Ltd", sector: "Investment" },
  { symbol: "OCH", name: "Olympia Capital Holdings Ltd", sector: "Investment" },
  { symbol: "TCL", name: "Trans-Century Plc", sector: "Investment" },
  { symbol: "NSE", name: "Nairobi Securities Exchange Plc", sector: "Investment Services" },
  { symbol: "AMAC", name: "Africa Mega Agricorp Plc", sector: "Manufacturing & Allied" },
  { symbol: "BAT", name: "British American Tobacco Kenya", sector: "Manufacturing & Allied" },
  { symbol: "BOC", name: "BOC Kenya Ltd", sector: "Manufacturing & Allied" },
  { symbol: "CARB", name: "Carbacid Investments", sector: "Manufacturing & Allied" },
  { symbol: "EABL", name: "East African Breweries Ltd", sector: "Manufacturing & Allied" },
  { symbol: "EVRD", name: "Eveready East Africa Ltd", sector: "Manufacturing & Allied" },
  { symbol: "FTGH", name: "Flame Tree Group Holdings", sector: "Manufacturing & Allied" },
  { symbol: "SKL", aliases: ["SKL.O0000"], name: "Shri Krishana Overseas Ltd", sector: "Manufacturing & Allied" },
  { symbol: "SCOM", name: "Safaricom PLC", sector: "Telecom" },
  { symbol: "SMWF", name: "Sanlam MSCI World ETF", sector: "ETF" },
  { symbol: "GLD", aliases: ["NEWGOLD"], name: "Absa NewGold ETF", sector: "ETF" },
  { symbol: "LAPR", name: "Laptrust Imara I-REIT", sector: "REIT" },
  { symbol: "ALP", name: "ALP Industrial REIT", sector: "REIT" },
  { symbol: "TRFC", name: "TRIFIC Green USD I-REIT", sector: "REIT" }
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

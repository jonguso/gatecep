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

/*
 * PC-031B4M7C5D7I6E4D5B
 *
 * Current NSE security eligibility is intentionally separate
 * from historical identity resolution.
 *
 * getSecurityBySymbol() may still return an Unknown identity
 * so imported/historical holdings remain readable.
 *
 * These helpers answer the narrower question:
 * is this symbol represented by GateCEP's current canonical
 * NSE security universe?
 */
export function findCurrentNseSecurity(symbol) {
  const value = normalizeNseSymbol(symbol);

  if (!value) return null;

  return (
    NSE_SECURITIES.find((item) => {
      if (
        normalizeNseSymbol(item.symbol) === value
      ) {
        return true;
      }

      return (
        Array.isArray(item.aliases)
          ? item.aliases
          : []
      ).some(
        (alias) =>
          normalizeNseSymbol(alias) === value
      );
    }) || null
  );
}

export function isCurrentNseSecurity(symbol) {
  return Boolean(
    findCurrentNseSecurity(symbol)
  );
}

export function getSecurityBySymbol(symbol) {
  const value = normalizeNseSymbol(symbol);

  return (
    NSE_SECURITIES.find((item) => {
      if (normalizeNseSymbol(item.symbol) === value) return true;
      return (Array.isArray(item.aliases) ? item.aliases : []).some(
        (alias) => normalizeNseSymbol(alias) === value
      );
    }) || {
      symbol: value,
      name: value,
      sector: "Unknown"
    }
  );
}

export function applySecurityMaster(row = {}) {
  const symbol =
    normalizeNseSymbol(
      row.symbol || row.code || ""
    );

  const security =
    getSecurityBySymbol(symbol);

  const currentName =
    String(row.name || "").trim();

  const currentSector =
    String(row.sector || "").trim();

  const knownSecurity =
    security.sector !== "Unknown";

  const normalizedCurrentSector =
    currentSector.toLowerCase();

  const usableUnknownSector =
    currentSector &&
    normalizedCurrentSector !== "unknown" &&
    normalizedCurrentSector !== "n/a" &&
    normalizedCurrentSector !== "nse";

  /*
   * PC-031B4M7C5D7I6E4C
   *
   * NSE identifies the exchange/market. It is never used as
   * an economic sector.
   *
   * For a registered NSE security, the canonical security
   * master owns presentation identity and economic sector.
   * This repairs stale or legacy values such as:
   *
   *   SCOM / Telecommunication -> Telecom
   *   EABL / Consumer          -> Manufacturing & Allied
   *   KQ   / Transport         -> Commercial & Services
   *   KCB  / NSE               -> Banking
   *
   * Nairobi Securities Exchange Plc may have symbol "NSE",
   * but its canonical sector is "Investment Services".
   *
   * Unknown securities retain supplied metadata. GateCEP
   * does not fabricate an economic sector.
   *
   * This function performs in-memory enrichment only.
   */
  return {
    ...row,
    symbol: security.symbol,
    name:
      knownSecurity
        ? security.name
        : currentName || security.name,
    sector:
      knownSecurity
        ? security.sector
        : usableUnknownSector
          ? currentSector
          : "Unknown"
  };
}

export default NSE_SECURITIES;
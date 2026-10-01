/*
 * PC-032G4B1C8G3D4
 * APIFY FUNDAMENTAL PROVIDER ADAPTER
 *
 * Contract:
 * - normalization only;
 * - no network access;
 * - no repository writes;
 * - no portfolio/order/cash mutation;
 * - no fabricated financial values;
 * - Apify/provider observations are not automatically authoritative
 *   or verified filings.
 */

const cleanText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const finiteNumber = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value.replace(/,/g, "").trim()
      : value;

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
};

const firstValue = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );

const asArray = (value) =>
  Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

const normalizePeriodType = (value) => {
  const code =
    String(value ?? "")
      .trim()
      .toUpperCase();

  if (
    ["ANNUAL", "FY", "FULL_YEAR", "FULL YEAR"].includes(code)
  ) {
    return "ANNUAL";
  }

  if (
    ["INTERIM", "HY", "HALF_YEAR", "HALF YEAR"].includes(code)
  ) {
    return "INTERIM";
  }

  if (
    ["QUARTERLY", "QUARTER", "Q1", "Q2", "Q3", "Q4"].includes(code)
  ) {
    return "QUARTERLY";
  }

  if (code === "TTM") {
    return "TTM";
  }

  return null;
};

function normalizeSource(row = {}, payload = {}) {
  const sourceUrl = cleanText(
    firstValue(
      row.sourceUrl,
      row.sourceURL,
      row.url,
      row.source?.url,
      payload.sourceUrl,
      payload.sourceURL,
      payload.url
    )
  );

  const retrievedAt = cleanText(
    firstValue(
      row.retrievedAt,
      row.scrapedAt,
      row.fetchedAt,
      row.generatedAt,
      payload.retrievedAt,
      payload.generatedAt
    )
  );

  const publishedAt = cleanText(
    firstValue(
      row.publishedAt,
      row.reportDate,
      row.filingDate,
      row.source?.publishedAt
    )
  );

  return {
    id:
      cleanText(
        firstValue(
          row.providerRecordId,
          row.recordId,
          row.id
        )
      ),

    name: "Apify Fundamental Evidence",

    provider: "APIFY_FUNDAMENTALS",

    type: "FINANCIAL_DATA_VENDOR",

    authoritative: false,

    verified: false,

    url: sourceUrl,

    publishedAt,

    retrievedAt,

    fields: []
  };
}

function normalizePeriod(period = {}) {
  return {
    fiscalYear:
      finiteNumber(
        firstValue(
          period.fiscalYear,
          period.fiscal_year,
          period.year
        )
      ),

    periodType:
      normalizePeriodType(
        firstValue(
          period.periodType,
          period.period_type,
          period.type
        )
      ),

    periodEnd:
      cleanText(
        firstValue(
          period.periodEnd,
          period.period_end,
          period.endDate,
          period.date
        )
      ),

    revenue:
      finiteNumber(period.revenue),

    grossProfit:
      finiteNumber(
        firstValue(
          period.grossProfit,
          period.gross_profit
        )
      ),

    operatingIncome:
      finiteNumber(
        firstValue(
          period.operatingIncome,
          period.operating_income,
          period.ebit
        )
      ),

    ebitda:
      finiteNumber(period.ebitda),

    netIncome:
      finiteNumber(
        firstValue(
          period.netIncome,
          period.net_income,
          period.profitAfterTax,
          period.profit_after_tax
        )
      ),

    totalAssets:
      finiteNumber(
        firstValue(
          period.totalAssets,
          period.total_assets
        )
      ),

    totalLiabilities:
      finiteNumber(
        firstValue(
          period.totalLiabilities,
          period.total_liabilities
        )
      ),

    totalEquity:
      finiteNumber(
        firstValue(
          period.totalEquity,
          period.total_equity,
          period.shareholdersEquity
        )
      ),

    cash:
      finiteNumber(
        firstValue(
          period.cash,
          period.cashAndCashEquivalents,
          period.cash_and_cash_equivalents
        )
      ),

    totalDebt:
      finiteNumber(
        firstValue(
          period.totalDebt,
          period.total_debt
        )
      ),

    operatingCashFlow:
      finiteNumber(
        firstValue(
          period.operatingCashFlow,
          period.operating_cash_flow
        )
      ),

    capitalExpenditure:
      finiteNumber(
        firstValue(
          period.capitalExpenditure,
          period.capital_expenditure,
          period.capex
        )
      ),

    dividendsPaid:
      finiteNumber(
        firstValue(
          period.dividendsPaid,
          period.dividends_paid
        )
      ),

    eps:
      finiteNumber(
        firstValue(
          period.eps,
          period.earningsPerShare,
          period.earnings_per_share
        )
      ),

    dividendPerShare:
      finiteNumber(
        firstValue(
          period.dividendPerShare,
          period.dividend_per_share,
          period.dps
        )
      )
  };
}

function normalizeCompany(row = {}, payload = {}) {
  const symbol =
    cleanText(
      firstValue(
        row.symbol,
        row.ticker,
        row.securityCode,
        row.security_code
      )
    )?.toUpperCase() || null;

  const periods =
    asArray(
      firstValue(
        row.periods,
        row.financialPeriods,
        row.financial_periods,
        row.financials
      )
    )
      .map(normalizePeriod)
      .filter(
        (period) =>
          Object.values(period).some(
            (value) =>
              value !== null &&
              value !== undefined
          )
      );

  const source = normalizeSource(
    row,
    payload
  );

  return {
    symbol,

    name:
      cleanText(
        firstValue(
          row.name,
          row.companyName,
          row.company_name
        )
      ),

    sector:
      cleanText(row.sector),

    industry:
      cleanText(row.industry),

    exchange:
      cleanText(
        firstValue(
          row.exchange,
          payload.exchange,
          "NSE"
        )
      ),

    currency:
      cleanText(
        firstValue(
          row.currency,
          payload.currency,
          "KES"
        )
      ),

    currentPrice:
      finiteNumber(
        firstValue(
          row.currentPrice,
          row.current_price,
          row.price
        )
      ),

    priceUpdatedAt:
      cleanText(
        firstValue(
          row.priceUpdatedAt,
          row.price_updated_at,
          row.quotedAt,
          row.marketDate
        )
      ),

    sharesOutstanding:
      finiteNumber(
        firstValue(
          row.sharesOutstanding,
          row.shares_outstanding
        )
      ),

    marketCapitalization:
      finiteNumber(
        firstValue(
          row.marketCapitalization,
          row.market_capitalization,
          row.marketCap,
          row.market_cap
        )
      ),

    enterpriseValue:
      finiteNumber(
        firstValue(
          row.enterpriseValue,
          row.enterprise_value
        )
      ),

    periods,

    sources: [
      source
    ],

    provider: "APIFY_FUNDAMENTALS",

    providerRecordId:
      source.id
  };
}

export function adaptApifyFundamentalPayload(
  payload = {}
) {
  const rows =
    Array.isArray(payload)
      ? payload
      : asArray(
          firstValue(
            payload.companies,
            payload.data,
            payload.items,
            payload.records
          )
        );

  return {
    provider: "APIFY_FUNDAMENTALS",

    companies:
      rows
        .map(
          (row) =>
            normalizeCompany(
              row,
              Array.isArray(payload)
                ? {}
                : payload
            )
        )
        .filter(
          (company) =>
            company.symbol
        )
  };
}

export default adaptApifyFundamentalPayload;

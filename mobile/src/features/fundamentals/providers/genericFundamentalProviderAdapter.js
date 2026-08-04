/*
 * ============================================================
 * PC-024C
 * GENERIC PROVIDER ADAPTER
 * ============================================================
 *
 * Adapts common provider payload shapes without assuming
 * provider-specific proprietary field names.
 * ============================================================
 */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function adaptGenericFundamentalProviderPayload(
  payload = {}
) {
  const sourceCompanies =
    safeArray(
      payload?.companies ??
      payload?.data ??
      payload?.results ??
      payload
    );

  const companies =
    sourceCompanies.map(
      (company) => {
        return {
          symbol:
            normalizeSymbol(
              company?.symbol ??
              company?.ticker
            ),

          name:
            company?.name ??
            company?.companyName ??
            null,

          sector:
            company?.sector ??
            null,

          industry:
            company?.industry ??
            company?.subsector ??
            null,

          exchange:
            company?.exchange ??
            "NSE",

          currency:
            company?.currency ??
            "KES",

          currentPrice:
            company?.currentPrice ??
            company?.price ??
            company?.marketPrice ??
            null,

          priceUpdatedAt:
            company?.priceUpdatedAt ??
            company?.updatedAt ??
            null,

          sharesOutstanding:
            company?.sharesOutstanding ??
            null,

          marketCapitalization:
            company?.marketCapitalization ??
            company?.marketCap ??
            null,

          enterpriseValue:
            company?.enterpriseValue ??
            null,

          periods:
            safeArray(
              company?.periods ??
              company?.financials ??
              company?.history
            ),

          sources:
            safeArray(
              company?.sources
            ),

          metadata: {
            providerRecordId:
              company?.id ??
              null,

            importedFrom:
              payload?.provider ??
              "GENERIC_PROVIDER"
          }
        };
      }
    );

  return {
    companies
  };
}

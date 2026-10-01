/*
 * PC-032G4B1C8G3D5B
 * Backend-only Apify fundamental evidence retrieval.
 *
 * Retrieval only:
 * - no fundamental repository write;
 * - no verified-filing promotion;
 * - no portfolio/cash/order mutation;
 * - no fabricated financial values.
 */

import axios from "axios";

import {
  getSecurityBySymbol
} from "../../data/nseSecurityMaster.js";

const clean = (value) =>
  String(value ?? "").trim();

const finitePositiveInteger = (
  value,
  fallback,
  minimum,
  maximum
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(number)
    )
  );
};

function configuration() {
  const token =
    clean(process.env.APIFY_API_TOKEN);

  const actorId =
    clean(
      process.env.APIFY_FUNDAMENTALS_ACTOR_ID
    );

  if (!token) {
    throw new Error(
      "APIFY_API_TOKEN is required for fundamental evidence."
    );
  }

  if (!actorId) {
    throw new Error(
      "APIFY_FUNDAMENTALS_ACTOR_ID is not configured."
    );
  }

  let baseInput = {};

  const rawInput =
    clean(
      process.env.APIFY_FUNDAMENTALS_ACTOR_INPUT_JSON
    );

  if (rawInput) {
    try {
      baseInput = JSON.parse(rawInput);
    } catch {
      throw new Error(
        "APIFY_FUNDAMENTALS_ACTOR_INPUT_JSON must be valid JSON."
      );
    }
  }

  const runTimeoutSeconds =
    finitePositiveInteger(
      process.env.APIFY_FUNDAMENTALS_RUN_TIMEOUT_SECONDS,
      180,
      30,
      300
    );

  const maxItems =
    finitePositiveInteger(
      process.env.APIFY_FUNDAMENTALS_MAX_ITEMS,
      25,
      1,
      100
    );

  const maxTotalChargeUsd =
    Number(
      process.env.APIFY_FUNDAMENTALS_MAX_TOTAL_CHARGE_USD ??
      0.25
    );

  return {
    token,
    actorId,
    baseInput,
    runTimeoutSeconds,
    maxItems,
    maxTotalChargeUsd:
      Number.isFinite(maxTotalChargeUsd) &&
      maxTotalChargeUsd > 0
        ? maxTotalChargeUsd
        : 0.25
  };
}

function normalizeSymbol(value) {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "");
}

function resolveSourceUrl(row) {
  return (
    clean(
      row?.sourceUrl ||
      row?.sourceURL ||
      row?.url ||
      row?.source?.url
    ) || null
  );
}

function resolveRetrievedAt(row, fallback) {
  return (
    clean(
      row?.retrievedAt ||
      row?.scrapedAt ||
      row?.fetchedAt ||
      row?.generatedAt
    ) ||
    fallback
  );
}

function normalizeObservation(
  row,
  symbol,
  retrievedAt
) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const providerSymbol =
    normalizeSymbol(
      row.symbol ||
      row.ticker ||
      row.securityCode ||
      row.security_code
    );

  const requestedSecurity =
    getSecurityBySymbol(symbol);

  const providerSecurity =
    providerSymbol
      ? getSecurityBySymbol(providerSymbol)
      : requestedSecurity;

  const canonicalRequestedSymbol =
    normalizeSymbol(
      requestedSecurity?.symbol || symbol
    );

  const canonicalProviderSymbol =
    normalizeSymbol(
      providerSecurity?.symbol ||
      providerSymbol ||
      canonicalRequestedSymbol
    );

  if (
    providerSymbol &&
    canonicalProviderSymbol !==
      canonicalRequestedSymbol
  ) {
    return null;
  }

  return {
    ...row,

    providerSymbol:
      providerSymbol || null,

    symbol:
      canonicalRequestedSymbol,

    sourceUrl:
      resolveSourceUrl(row),

    retrievedAt:
      resolveRetrievedAt(
        row,
        retrievedAt
      ),

    provider:
      "APIFY_FUNDAMENTALS",

    evidenceStatus:
      "OBSERVED",

    authoritative:
      false,

    verified:
      false
  };
}

export async function retrieveApifyFundamentalEvidence({
  symbol,
  providerSymbol
} = {}) {
  const normalizedSymbol =
    normalizeSymbol(symbol);

  const normalizedProviderSymbol =
    normalizeSymbol(providerSymbol);

  if (!normalizedSymbol) {
    throw new Error(
      "A valid NSE security symbol is required."
    );
  }

  if (!normalizedProviderSymbol) {
    throw new Error(
      "A provider security symbol is required for fundamental evidence."
    );
  }

  const {
    token,
    actorId,
    baseInput,
    runTimeoutSeconds,
    maxItems,
    maxTotalChargeUsd
  } = configuration();

  const retrievedAt =
    new Date().toISOString();

  /*
   * Actor-specific static options may be supplied through
   * APIFY_FUNDAMENTALS_ACTOR_INPUT_JSON.
   *
   * Provider identity remains separate from GateCEP's
   * canonical NSE identity. The configured fundamentals
   * actor accepts Yahoo-style symbols[] input.
   */
  const input = {
    ...baseInput,

    symbols: [
      normalizedProviderSymbol
    ]
  };

  const response =
    await axios.post(
      `https://api.apify.com/v2/acts/${encodeURIComponent(
        actorId
      )}/run-sync-get-dataset-items`,
      input,
      {
        params: {
          format: "json",
          timeout: runTimeoutSeconds,
          maxItems,
          maxTotalChargeUsd
        },

        headers: {
          Authorization:
            `Bearer ${token}`,
          "Content-Type":
            "application/json"
        },

        timeout:
          (runTimeoutSeconds + 15) * 1000
      }
    );

  const rows =
    Array.isArray(response.data)
      ? response.data
      : [];

  const observations =
    rows
      .map(
        (row) =>
          normalizeObservation(
            row,
            normalizedSymbol,
            retrievedAt
          )
      )
      .filter(Boolean);

  return {
    provider:
      "APIFY_FUNDAMENTALS",

    symbol:
      normalizedSymbol,

    retrievedAt,

    evidenceStatus:
      observations.length
        ? "OBSERVED"
        : "UNAVAILABLE",

    authoritative:
      false,

    verified:
      false,

    count:
      observations.length,

    companies:
      observations
  };
}

export default {
  retrieveApifyFundamentalEvidence
};

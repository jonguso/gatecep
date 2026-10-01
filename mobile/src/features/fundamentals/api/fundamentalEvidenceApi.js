/*
 * PC-032G4B1C8G3D6C
 * Fundamental external-evidence API client.
 *
 * Contract:
 * - explicit retrieval only;
 * - authenticated GateCEP request;
 * - no client-side server secret;
 * - no repository persistence;
 * - no portfolio/order/cash mutation;
 * - returned evidence remains preview-only.
 */

import {
  API_URL
} from "../../../config/apiConfig";

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "");
}

export async function retrieveApifyFundamentalPreview({
  accessToken,
  symbol
} = {}) {
  if (!accessToken) {
    throw new Error(
      "Sign in before retrieving fundamental evidence."
    );
  }

  const normalizedSymbol =
    normalizeSymbol(symbol);

  if (!normalizedSymbol) {
    throw new Error(
      "Select or enter an NSE security symbol."
    );
  }

  const response =
    await fetch(
      `${API_URL}/fundamental-evidence/apify/preview`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`
        },

        body: JSON.stringify({
          symbol:
            normalizedSymbol
        })
      }
    );

  let payload = null;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `Unable to retrieve fundamental evidence (${response.status}).`
    );
  }

  if (
    payload?.previewOnly !== true ||
    payload?.persistence !== "NONE"
  ) {
    throw new Error(
      "Fundamental evidence endpoint returned an unsafe persistence contract."
    );
  }

  if (
    payload?.verifiedFiling !== false ||
    payload?.verified === true ||
    payload?.authoritative === true
  ) {
    throw new Error(
      "External provider evidence cannot be promoted to verified or authoritative automatically."
    );
  }

  return {
    ...payload,

    provider:
      "APIFY_FUNDAMENTALS",

    symbol:
      normalizedSymbol,

    previewOnly:
      true,

    persistence:
      "NONE",

    verifiedFiling:
      false,

    verified:
      false,

    authoritative:
      false
  };
}

/*
 * PC-032G5D7
 * Qualified issuer/regulator financial-evidence preview.
 *
 * The backend owns document retrieval, source qualification,
 * identity inspection, extraction, and response sanitization.
 *
 * Client contract:
 * - authenticated request only;
 * - preview/extraction only;
 * - no persistence;
 * - no automatic verification or authority;
 * - no filing, fundamental-repository, portfolio, order, or cash mutation.
 */
export async function retrieveIssuerFinancialEvidencePreview({
  accessToken,
  symbol,
  url
} = {}) {
  if (!accessToken) {
    throw new Error(
      "Sign in before retrieving issuer financial evidence."
    );
  }

  const normalizedSymbol =
    normalizeSymbol(symbol);

  if (!normalizedSymbol) {
    throw new Error(
      "Select or enter an NSE security symbol."
    );
  }

  const normalizedUrl =
    String(url || "")
      .trim();

  if (!normalizedUrl) {
    throw new Error(
      "Enter an issuer or regulator document URL."
    );
  }

  const response =
    await fetch(
      `${API_URL}/fundamental-evidence/issuer-document/preview`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`
        },

        body: JSON.stringify({
          symbol:
            normalizedSymbol,

          url:
            normalizedUrl
        })
      }
    );

  let payload = null;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
      `Unable to retrieve issuer financial evidence (${response.status}).`
    );
  }

  if (
    payload?.previewOnly !== true ||
    payload?.extractionOnly !== true ||
    payload?.persistence !== "NONE"
  ) {
    throw new Error(
      "Issuer financial evidence endpoint returned an unsafe preview contract."
    );
  }

  if (
    payload?.verifiedFiling !== false ||
    payload?.verified === true ||
    payload?.authoritative === true
  ) {
    throw new Error(
      "Issuer financial evidence cannot be promoted to verified or authoritative automatically."
    );
  }

  return {
    ...payload,

    symbol:
      normalizedSymbol,

    previewOnly:
      true,

    extractionOnly:
      true,

    persistence:
      "NONE",

    verifiedFiling:
      false,

    verified:
      false,

    authoritative:
      false
  };
}

export default {
  retrieveApifyFundamentalPreview,
  retrieveIssuerFinancialEvidencePreview
};

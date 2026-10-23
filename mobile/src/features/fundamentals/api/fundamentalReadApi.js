import {
  API_URL
} from "../../../config/apiConfig";

function requireAccessToken(
  accessToken
) {
  const token =
    String(
      accessToken || ""
    ).trim();

  if (!token) {
    throw new Error(
      "Sign in to load published fundamentals."
    );
  }

  return token;
}

function normalizeSymbol(
  symbol
) {
  const value =
    String(
      symbol || ""
    )
      .trim()
      .toUpperCase();

  if (!value) {
    throw new Error(
      "A security symbol is required."
    );
  }

  return value;
}

async function readJsonResponse(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function loadPublishedFundamental({
  accessToken,
  symbol
} = {}) {
  const token =
    requireAccessToken(
      accessToken
    );

  const targetSymbol =
    normalizeSymbol(
      symbol
    );

  const response =
    await fetch(
      `${API_URL}/fundamentals/${encodeURIComponent(
        targetSymbol
      )}`,
      {
        method:
          "GET",

        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

  const payload =
    await readJsonResponse(
      response
    );

  if (
    response.status === 404 &&
    payload?.code ===
      "FUNDAMENTAL_RECORD_NOT_FOUND"
  ) {
    return null;
  }

  if (!response.ok) {
    const error =
      new Error(
        payload?.message ||
        payload?.error ||
        `Unable to load published fundamentals (${response.status}).`
      );

    error.status =
      response.status;

    error.code =
      payload?.code ||
      null;

    throw error;
  }

  if (
    payload?.ok !== true ||
    !payload?.fundamentals ||
    typeof payload.fundamentals !==
      "object" ||
    Array.isArray(
      payload.fundamentals
    )
  ) {
    throw new Error(
      "Published fundamentals endpoint returned an invalid response."
    );
  }

  return {
    ...payload.fundamentals,

    symbol:
      payload.fundamentals.symbol ||
      payload.symbol ||
      targetSymbol,

    companyName:
      payload.companyName ||
      payload.fundamentals.companyName ||
      payload.fundamentals.name ||
      null,

    publication: {
      approvedFilingId:
        payload.approvedFilingId ||
        null,

      revisionNumber:
        payload.revisionNumber ??
        null,

      promotedAt:
        payload.promotedAt ||
        null
    }
  };
}

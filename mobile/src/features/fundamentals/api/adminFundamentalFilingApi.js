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
      "Admin authentication is required."
    );
  }

  return token;
}

function requireFilingId(
  filingId
) {
  const value =
    String(
      filingId || ""
    ).trim();

  if (!value) {
    throw new Error(
      "A filing ID is required."
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

function apiError({
  response,
  payload,
  fallback
}) {
  const error =
    new Error(
      payload?.message ||
      payload?.error ||
      `${fallback} (${response.status}).`
    );

  error.status =
    response.status;

  error.code =
    payload?.error ||
    null;

  if (
    Array.isArray(
      payload?.unsupportedFields
    )
  ) {
    error.unsupportedFields =
      payload.unsupportedFields;
  }

  return error;
}

export async function getAdminFundamentalFiling({
  accessToken,
  filingId
} = {}) {
  const token =
    requireAccessToken(
      accessToken
    );

  const id =
    requireFilingId(
      filingId
    );

  const response =
    await fetch(
      `${API_URL}/admin/fundamentals/filings/${encodeURIComponent(
        id
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

  if (!response.ok) {
    throw apiError({
      response,
      payload,
      fallback:
        "Unable to load fundamental filing"
    });
  }

  if (
    payload?.ok !== true ||
    !payload?.filing?.filingId
  ) {
    throw new Error(
      "Fundamental filing read endpoint returned an invalid response."
    );
  }

  return payload;
}


export async function createAdminFundamentalFiling({
  accessToken,
  filing
} = {}) {
  const token =
    requireAccessToken(
      accessToken
    );

  if (
    !filing ||
    typeof filing !== "object" ||
    Array.isArray(filing)
  ) {
    throw new Error(
      "A filing payload is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/fundamentals/filings`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`
        },

        body:
          JSON.stringify(
            filing
          )
      }
    );

  const payload =
    await readJsonResponse(
      response
    );

  if (!response.ok) {
    throw apiError({
      response,
      payload,
      fallback:
        "Unable to create fundamental filing"
    });
  }

  if (
    payload?.ok !== true ||
    !payload?.filing?.filingId
  ) {
    throw new Error(
      "Fundamental filing create endpoint returned an invalid response."
    );
  }

  return payload;
}

export async function transitionAdminFundamentalFiling({
  accessToken,
  filingId,
  action,
  note = null
} = {}) {
  const token =
    requireAccessToken(
      accessToken
    );

  const id =
    requireFilingId(
      filingId
    );

  const normalizedAction =
    String(
      action || ""
    )
      .trim()
      .toUpperCase();

  if (!normalizedAction) {
    throw new Error(
      "A filing lifecycle action is required."
    );
  }

  const body = {
    action:
      normalizedAction
  };

  const normalizedNote =
    String(
      note || ""
    ).trim();

  if (normalizedNote) {
    body.note =
      normalizedNote;
  }

  const response =
    await fetch(
      `${API_URL}/admin/fundamentals/filings/${encodeURIComponent(
        id
      )}/lifecycle`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`
        },

        body:
          JSON.stringify(
            body
          )
      }
    );

  const payload =
    await readJsonResponse(
      response
    );

  if (!response.ok) {
    throw apiError({
      response,
      payload,
      fallback:
        "Unable to transition fundamental filing"
    });
  }

  if (
    payload?.ok !== true ||
    !payload?.lifecycle
  ) {
    throw new Error(
      "Fundamental filing lifecycle endpoint returned an invalid response."
    );
  }

  return payload;
}

export async function promoteAdminFundamentalFiling({
  accessToken,
  filingId,
  reason,
  confirmed
} = {}) {
  const token =
    requireAccessToken(
      accessToken
    );

  const id =
    requireFilingId(
      filingId
    );

  const normalizedReason =
    String(
      reason || ""
    ).trim();

  if (!normalizedReason) {
    throw new Error(
      "A promotion reason is required."
    );
  }

  if (confirmed !== true) {
    throw new Error(
      "Fundamental filing promotion requires explicit confirmation."
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/fundamentals/filings/${encodeURIComponent(
        id
      )}/promote`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`
        },

        body:
          JSON.stringify({
            reason:
              normalizedReason,

            confirmed:
              true
          })
      }
    );

  const payload =
    await readJsonResponse(
      response
    );

  if (!response.ok) {
    throw apiError({
      response,
      payload,
      fallback:
        "Unable to promote fundamental filing"
    });
  }

  if (
    payload?.ok !== true ||
    !payload?.promotion
  ) {
    throw new Error(
      "Fundamental filing promotion endpoint returned an invalid response."
    );
  }

  return payload;
}

import { API_URL } from "../../../config/apiConfig";
import { getStoredAccessToken } from "../../auth/storage/authStorage";

async function parseResponse(response) {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `Investor DNA service returned an invalid response (${response.status})`
    );
  }
}

async function buildAuthHeaders() {
  const token = await getStoredAccessToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function normalizeInvestorDNAValue(value, mapping = {}) {
  const key = String(value || "").trim().toLowerCase();
  return mapping[key] || value;
}

function normalizeInvestorDNAPayload(payload = {}) {
  return {
    ...payload,

    goal: normalizeInvestorDNAValue(payload.goal, {
      growth: "WEALTH_GROWTH",
      wealth_growth: "WEALTH_GROWTH",
      income: "DIVIDEND_INCOME",
      dividend_income: "DIVIDEND_INCOME",
      retirement: "RETIREMENT",
      home: "HOME_PURCHASE",
      home_purchase: "HOME_PURCHASE"
    }),

    timeHorizon: normalizeInvestorDNAValue(payload.timeHorizon, {
      short: "1_3_YEARS",
      "1_3_years": "1_3_YEARS",
      medium: "3_5_YEARS",
      "3_5_years": "3_5_YEARS",
      long: "5_PLUS_YEARS",
      "5_plus_years": "5_PLUS_YEARS",
      very_long: "10_PLUS_YEARS",
      "10_plus_years": "10_PLUS_YEARS"
    }),

    marketDrop: normalizeInvestorDNAValue(payload.marketDrop, {
      calm: "WAIT",
      wait: "WAIT",
      guidance: "UNSURE",
      worried: "SELL",
      buy_more: "BUY_MORE",
      unsure: "UNSURE",
      sell: "SELL"
    }),

    experience: normalizeInvestorDNAValue(payload.experience, {
      first_step: "BEGINNER",
      learning: "BEGINNER",
      invested_before: "INTERMEDIATE",
      comfortable: "ADVANCED",
      beginner: "BEGINNER",
      intermediate: "INTERMEDIATE",
      advanced: "ADVANCED"
    }),

    contribution: normalizeInvestorDNAValue(payload.contribution, {
      monthly: "MONTHLY",
      flexible: "FLEXIBLE",
      quarterly: "QUARTERLY",
      one_time: "ONE_TIME"
    })
  };
}

export async function createInvestorDNA(payload = {}) {
  const response = await fetch(`${API_URL}/investor-dna`, {
    method: "POST",
    headers: await buildAuthHeaders(),
    body: JSON.stringify(normalizeInvestorDNAPayload(payload))
  });

  const data = await parseResponse(response);

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `Unable to create Investor DNA (${response.status})`
    );
  }

  return data;
}

export async function getInvestorDNA(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const response = await fetch(
    `${API_URL}/investor-dna/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: await buildAuthHeaders()
    }
  );

  const data = await parseResponse(response);

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `Unable to load Investor DNA (${response.status})`
    );
  }

  return data;
}
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

export async function createInvestorDNA(payload = {}) {
  const response = await fetch(`${API_URL}/investor-dna`, {
    method: "POST",
    headers: await buildAuthHeaders(),
    body: JSON.stringify(payload)
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
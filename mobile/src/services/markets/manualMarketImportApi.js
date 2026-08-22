import { API_URL } from "../../config/apiConfig";

async function request(path, payload, { accessToken, importKey } = {}) {
  if (!accessToken) throw new Error("Sign in before importing market prices.");
  if (!importKey) throw new Error("Enter the restricted market import key.");
  const response = await fetch(`${API_URL}/market-cache/manual-import/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Market-Import-Key": importKey
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    const routeHint = response.status === 404
      ? ` The backend route was not found at ${API_URL}; confirm that this app is using the intended backend.`
      : "";
    throw new Error(`${data?.error || "Market import failed."}${routeHint}`);
  }
  return data;
}

export async function previewMyStocksMarketCsv(payload, authorization) {
  return await request("preview", payload, authorization);
}

export async function commitMyStocksMarketCsv(payload, authorization) {
  return await request("commit", payload, authorization);
}

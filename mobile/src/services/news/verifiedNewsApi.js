import { API_URL } from "../../config/apiConfig";

export async function loadVerifiedNews({ accessToken, category = null, symbol = null, limit = 100 } = {}) {
  if (!accessToken) throw new Error("Sign in to load verified news.");
  const params = new URLSearchParams({ limit: String(limit) });
  if (category) params.set("category", category);
  if (symbol) params.set("symbol", symbol);
  const response = await fetch(`${API_URL}/verified-news?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (response.status === 401 || response.status === 403) throw new Error("Your session expired. Sign in again.");
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Verified news is temporarily unavailable.");
  return data;
}

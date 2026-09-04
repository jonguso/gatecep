import { API_URL } from "../../config/apiConfig";

export async function loadVerifiedCalendar({ accessToken, from, to } = {}) {
  if (!accessToken) throw new Error("Sign in to load the verified calendar.");
  const params = new URLSearchParams({ from, to, limit: "250" });
  const response = await fetch(`${API_URL}/verified-news/calendar?${params.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (response.status === 401 || response.status === 403) throw new Error("Your session expired. Sign in again.");
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Verified calendar events are temporarily unavailable.");
  return data;
}

import { API_URL } from "../../../config/apiConfig";

export async function askFloatingCoachG({ accessToken, question, screenContext = {} }) {
  if (!accessToken) throw new Error("Sign in before asking Coach G.");
  const response = await fetch(`${API_URL}/coach/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ question, screenContext })
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (response.status === 401 || response.status === 403) throw new Error("Your session expired. Sign in again.");
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Coach G is temporarily unavailable.");
  return data;
}

export async function transcribeFloatingCoachG({ accessToken, uri, mimeType = "audio/m4a" }) {
  if (!accessToken) throw new Error("Sign in before speaking to Coach G.");
  if (!uri) throw new Error("No voice recording is available.");

  const audioResponse = await fetch(uri);
  const audioBlob = await audioResponse.blob();
  const form = new FormData();
  form.append("audio", audioBlob, mimeType.includes("webm") ? "coach-g-question.webm" : "coach-g-question.m4a");

  const response = await fetch(`${API_URL}/coach/voice/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (response.status === 401 || response.status === 403) throw new Error("Your session expired. Sign in again.");
  if (!response.ok || !data?.ok) throw new Error(data?.error || "Coach G could not transcribe that recording.");
  return data;
}

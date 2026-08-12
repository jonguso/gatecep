import { API_URL } from "../../../config/apiConfig";
import { getStoredAccessToken } from "../../auth/storage/authStorage";
import { userGetItem } from "../../../auth/userStorage";

async function loadLocalBrokerFallback() {
  const [defaultRaw, legacyRaw] = await Promise.all([
    userGetItem("defaultBrokerProfile").catch(() => null),
    userGetItem("brokerProfile").catch(() => null)
  ]);

  const raw = defaultRaw || legacyRaw;
  if (!raw) return [];

  try {
    const broker = JSON.parse(raw);
    return broker ? [broker] : [];
  } catch {
    return [];
  }
}

export async function getUserBrokers() {
  try {
    const token = await getStoredAccessToken();

    const response = await fetch(`${API_URL}/user-brokers`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || "Unable to load brokers");
    }

    const cloudBrokers = Array.isArray(data)
      ? data
      : Array.isArray(data?.brokers)
        ? data.brokers
        : data?.broker
          ? [data.broker]
          : [];

    if (cloudBrokers.length) {
      return {
        ok: true,
        brokers: cloudBrokers,
        source: "CLOUD"
      };
    }
  } catch (error) {
    console.log("Cloud broker load fallback:", error.message);
  }

  return {
    ok: true,
    brokers: await loadLocalBrokerFallback(),
    source: "LOCAL_PROFILE"
  };
}

export async function addUserBroker(payload) {
  const token = await getStoredAccessToken();

  const response = await fetch(`${API_URL}/user-brokers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to add broker");
  }

  return data.broker;
}

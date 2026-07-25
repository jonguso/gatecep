import {
  userGetItem,
  userSetItem
} from "../auth/userStorage";

export async function saveProfile(partial = {}) {
  const raw = await userGetItem("investorProfile");

  let existing = {};

  if (raw) {
    try {
      existing =
        typeof raw === "string"
          ? JSON.parse(raw)
          : raw;
    } catch {
      existing = {};
    }
  }

  const merged = {
    ...existing,
    ...partial,
    updatedAt: new Date().toISOString()
  };

  await userSetItem(
    "investorProfile",
    JSON.stringify(merged)
  );

  return merged;
}

export async function loadProfile() {
  const raw = await userGetItem("investorProfile");

  if (!raw) {
    return null;
  }

  if (typeof raw === "object") {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
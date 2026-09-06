import { API_URL } from "../../../config/apiConfig";
import { getStoredAccessToken } from "../../auth/storage/authStorage";
import { userGetItem, userSetItem } from "../../../services/auth/userStorage";
import { mergeProfileSources } from "../investorProfileContract";

async function authHeaders() {
  const token = await getStoredAccessToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

export async function getInvestorProfile() {
  const response = await fetch(`${API_URL}/investor-profile`, {
    headers: await authHeaders()
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    const error = new Error(data.error || "Could not load investor profile");
    error.status = response.status;
    error.code = response.status === 404 ? "PROFILE_NOT_FOUND" : "PROFILE_LOAD_FAILED";
    throw error;
  }

  return data;
}

export async function saveInvestorProfile(profile) {
  const response = await fetch(`${API_URL}/investor-profile`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(profile)
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Could not save investor profile");
  }

  return data;
}

function extractProfile(data = {}) {
  const directProfile = [
    "name",
    "firstName",
    "goal",
    "risk",
    "experience",
    "investorType",
    "onboardingCompleted"
  ].some((field) => data?.[field] !== undefined)
    ? data
    : null;
  const candidate = data?.profile || data?.investorProfile || data?.data?.profile || directProfile;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  return Object.keys(candidate).length ? candidate : null;
}

function parseLocalProfile(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export async function restoreInvestorProfileFromCloud() {
  try {
    const data = await getInvestorProfile();
    const cloudProfile = extractProfile(data);

    if (!cloudProfile) {
      return { status: "MISSING", profile: null };
    }

    const localProfile = parseLocalProfile(
      await userGetItem("investorProfile").catch(() => null)
    );
    const merged = mergeProfileSources(localProfile, cloudProfile);
    const nameParts = String(merged?.name || "").trim().split(/\s+/).filter(Boolean);
    const restoredProfile = {
      ...merged,
      firstName: merged?.firstName || nameParts[0] || null,
      lastName: merged?.lastName || nameParts.slice(1).join(" ") || null,
      onboardingCompleted: true,
      profileSource: "CLOUD_INVESTOR_PROFILE"
    };

    await Promise.all([
      userSetItem("investorProfile", JSON.stringify(restoredProfile)),
      userSetItem("onboardingCompleted", "true")
    ]);

    return { status: "FOUND", profile: restoredProfile };
  } catch (error) {
    if (error?.code === "PROFILE_NOT_FOUND" || error?.status === 404) {
      return { status: "MISSING", profile: null };
    }

    return {
      status: "UNKNOWN",
      profile: null,
      error: error?.message || "Investor profile could not be verified."
    };
  }
}

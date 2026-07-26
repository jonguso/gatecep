import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getStoredUser
} from "../../features/auth/storage/authStorage";

import {
  getCurrentUserId as getLegacyCurrentUserId
} from "./authStore";

function normalizeId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized || null;
}

async function getCanonicalUserId() {
  /*
   * The backend-authenticated user ID is authoritative.
   * It remains stable even if username or email changes.
   */
  const authUser = await getStoredUser();

  const backendUserId = normalizeId(
    authUser?.id
  );

  if (backendUserId) {
    return backendUserId;
  }

  /*
   * Compatibility fallback for older sessions.
   */
  return normalizeId(
    await getLegacyCurrentUserId()
  );
}

async function getLegacyUserIds() {
  const authUser = await getStoredUser();

  const candidates = [
    authUser?.username,
    authUser?.email,
    await getLegacyCurrentUserId()
  ]
    .map(normalizeId)
    .filter(Boolean);

  return [...new Set(candidates)];
}

export async function userKey(key) {
  const userId =
    await getCanonicalUserId();

  return userId
    ? `gatecep:${userId}:${key}`
    : `gatecep:guest:${key}`;
}

export async function userGetItem(key) {
  const canonicalKey =
    await userKey(key);

  const canonicalValue =
    await AsyncStorage.getItem(
      canonicalKey
    );

  if (canonicalValue !== null) {
    return canonicalValue;
  }

  /*
   * One-time compatibility migration.
   *
   * Older GateCEP versions stored investor data
   * under username/email-derived namespaces.
   * When found, move the value into the stable
   * backend-user-ID namespace.
   */
  const legacyUserIds =
    await getLegacyUserIds();

  for (const legacyUserId of legacyUserIds) {
    const legacyKey =
      `gatecep:${legacyUserId}:${key}`;

    if (legacyKey === canonicalKey) {
      continue;
    }

    const legacyValue =
      await AsyncStorage.getItem(
        legacyKey
      );

    if (legacyValue !== null) {
      await AsyncStorage.setItem(
        canonicalKey,
        legacyValue
      );

      return legacyValue;
    }
  }

  return null;
}

export async function userSetItem(
  key,
  value
) {
  return AsyncStorage.setItem(
    await userKey(key),
    value
  );
}

export async function userRemoveItem(key) {
  return AsyncStorage.removeItem(
    await userKey(key)
  );
}

export async function userMergeItem(
  key,
  value
) {
  return AsyncStorage.mergeItem(
    await userKey(key),
    value
  );
}

export async function userClearNamespace() {
  const userId =
    await getCanonicalUserId();

  if (!userId) {
    return;
  }

  const keys =
    await AsyncStorage.getAllKeys();

  const prefix =
    `gatecep:${userId}:`;

  const userKeys = keys.filter(
    (key) => key.startsWith(prefix)
  );

  if (userKeys.length > 0) {
    await AsyncStorage.multiRemove(
      userKeys
    );
  }
}
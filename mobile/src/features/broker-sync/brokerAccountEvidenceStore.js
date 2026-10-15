/*
 * PC-POSTPROD-UAT-001F4C1
 *
 * Account-scoped staging for verified broker valuation + cash evidence.
 *
 * Invariants:
 * - one authoritative staged mirror per canonical broker account;
 * - replacing account A never removes B/C;
 * - valuation and cash remain separate readiness dimensions;
 * - legacy/global brokerMirrorPortfolio remains a compatibility projection;
 * - no REAL portfolio mutation occurs here.
 */

const REGISTRY_KEY =
  "brokerMirrorPortfolioByAccount";

const LEGACY_MIRROR_KEY =
  "brokerMirrorPortfolio";

let userStorageLoader =
  () => import("../../auth/userStorage.js");

function normalizeAccountKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function parseObject(value, fallback = {}) {
  if (!value) return fallback;

  if (typeof value === "object") {
    return value &&
      !Array.isArray(value)
      ? value
      : fallback;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}

function parseMirror(value) {
  if (!value) return null;

  if (typeof value === "object") {
    return Array.isArray(value)
      ? null
      : value;
  }

  try {
    const parsed = JSON.parse(value);

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function requireAccountKey(value) {
  const accountKey =
    normalizeAccountKey(value);

  if (!accountKey) {
    throw new Error(
      "Verified broker account identity is required."
    );
  }

  return accountKey;
}

function normalizeMirrorForAccount(
  mirror,
  brokerAccountKey
) {
  const accountKey =
    requireAccountKey(brokerAccountKey);

  if (!mirror || typeof mirror !== "object") {
    throw new Error(
      "Verified broker evidence mirror is required."
    );
  }

  const mirrorAccountKey =
    normalizeAccountKey(
      mirror.brokerAccountKey ||
      mirror.brokerAccountId
    );

  if (
    mirrorAccountKey &&
    mirrorAccountKey !== accountKey
  ) {
    throw new Error(
      "Broker evidence account does not match the selected broker account."
    );
  }

  return {
    ...mirror,
    brokerAccountId: accountKey,
    brokerAccountKey: accountKey
  };
}

async function storage() {
  return userStorageLoader();
}

export function __setBrokerAccountEvidenceStorageLoaderForTests(
  loader
) {
  if (typeof loader !== "function") {
    throw new Error(
      "Storage loader must be a function."
    );
  }

  userStorageLoader = loader;
}

export function __resetBrokerAccountEvidenceStorageLoaderForTests() {
  userStorageLoader =
    () => import("../../auth/userStorage.js");
}

export async function loadBrokerAccountEvidenceRegistry() {
  const { userGetItem } =
    await storage();

  const raw =
    await userGetItem(REGISTRY_KEY);

  const registry =
    parseObject(raw, {});

  const normalized = {};

  for (const [key, mirror] of Object.entries(registry)) {
    const accountKey =
      normalizeAccountKey(
        mirror?.brokerAccountKey ||
        mirror?.brokerAccountId ||
        key
      );

    if (!accountKey || !mirror) continue;

    normalized[accountKey] = {
      ...mirror,
      brokerAccountId: accountKey,
      brokerAccountKey: accountKey
    };
  }

  return normalized;
}

export async function loadBrokerAccountEvidence(
  brokerAccountKey
) {
  const accountKey =
    requireAccountKey(brokerAccountKey);

  const registry =
    await loadBrokerAccountEvidenceRegistry();

  return registry[accountKey] || null;
}

export async function saveBrokerAccountEvidence({
  brokerAccountKey,
  mirror
} = {}) {
  const accountKey =
    requireAccountKey(brokerAccountKey);

  const normalizedMirror =
    normalizeMirrorForAccount(
      mirror,
      accountKey
    );

  const {
    userSetItem
  } = await storage();

  const registry =
    await loadBrokerAccountEvidenceRegistry();

  const nextRegistry = {
    ...registry,
    [accountKey]: normalizedMirror
  };

  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify(nextRegistry)
  );

  /*
   * Compatibility projection:
   * existing consumers may continue reading brokerMirrorPortfolio
   * until F4C2/F4C3 bind them to selected-account evidence.
   */
  await userSetItem(
    LEGACY_MIRROR_KEY,
    JSON.stringify(normalizedMirror)
  );

  return normalizedMirror;
}

export async function removeBrokerAccountEvidence(
  brokerAccountKey
) {
  const accountKey =
    requireAccountKey(brokerAccountKey);

  const {
    userSetItem,
    userRemoveItem
  } = await storage();

  const registry =
    await loadBrokerAccountEvidenceRegistry();

  if (!registry[accountKey]) {
    return false;
  }

  const nextRegistry = {
    ...registry
  };

  delete nextRegistry[accountKey];

  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify(nextRegistry)
  );

  /*
   * Do not project another account automatically.
   * A caller selecting another account must explicitly load it.
   */
  const legacy =
    parseMirror(
      await (
        await storage()
      ).userGetItem(LEGACY_MIRROR_KEY)
    );

  if (
    normalizeAccountKey(
      legacy?.brokerAccountKey ||
      legacy?.brokerAccountId
    ) === accountKey
  ) {
    await userRemoveItem(
      LEGACY_MIRROR_KEY
    );
  }

  return true;
}

export async function projectBrokerAccountEvidence(
  brokerAccountKey
) {
  const accountKey =
    requireAccountKey(brokerAccountKey);

  const {
    userSetItem,
    userRemoveItem
  } = await storage();

  const mirror =
    await loadBrokerAccountEvidence(
      accountKey
    );

  if (!mirror) {
    await userRemoveItem(
      LEGACY_MIRROR_KEY
    );

    return null;
  }

  await userSetItem(
    LEGACY_MIRROR_KEY,
    JSON.stringify(mirror)
  );

  return mirror;
}

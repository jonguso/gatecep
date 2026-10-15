import {
  brokerExecutionFillIdentity
} from "../broker-sync/brokerExecutionFillIdentity.js";

const REGISTRY_KEY = "brokerTransactionHistoryByAccount";
const LEGACY_VERIFIED_KEY = "transactionHistory";
const LEGACY_UNVERIFIED_KEY = "unverifiedTransactionHistory";
const LEGACY_MIGRATION_KEY =
  "brokerTransactionHistoryLegacyProjectionVersion";

let userStorageLoader = () =>
  import("../../services/auth/userStorage.js");

async function loadUserStorage() {
  return userStorageLoader();
}

export function __setBrokerTransactionHistoryStorageLoaderForTests(
  loader
) {
  if (typeof loader !== "function") {
    throw new Error(
      "A storage loader function is required."
    );
  }

  userStorageLoader = loader;
}

export function __resetBrokerTransactionHistoryStorageLoaderForTests() {
  userStorageLoader = () =>
    import("../../services/auth/userStorage.js");
}

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function parseArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseRegistry(raw) {
  if (!raw) return {};

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  try {
    const parsed = JSON.parse(raw);

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function accountAwareIdentity(row = {}) {
  const accountKey = upper(
    row.brokerAccountKey ||
    row.accountKey
  );

  const fillIdentity =
    brokerExecutionFillIdentity(row) ||
    clean(
      row.id ||
      `${row.date || row.executionDate || ""}-` +
      `${row.symbol || ""}-` +
      `${row.side || row.type || ""}-` +
      `${row.quantity || row.filledQuantity || ""}-` +
      `${row.price || row.averagePrice || ""}`
    );

  return `${accountKey || "LEGACY_UNSCOPED"}::${fillIdentity}`;
}

function dedupeRows(rows = []) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = accountAwareIdentity(row);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function tagRows(rows = [], brokerAccountKey) {
  const normalizedAccountKey = upper(brokerAccountKey);

  return rows.map((row) => ({
    ...row,
    brokerAccountKey: normalizedAccountKey
  }));
}

export async function loadBrokerTransactionHistoryRegistry() {
  const { userGetItem } =
    await loadUserStorage();

  return parseRegistry(
    await userGetItem(REGISTRY_KEY)
  );
}

export async function loadCombinedBrokerTransactionHistoryEvidence({
  includeLegacy = true
} = {}) {
  const { userGetItem } =
    await loadUserStorage();

  const [
    registry,
    legacyVerifiedRaw,
    legacyUnverifiedRaw
  ] = await Promise.all([
    loadBrokerTransactionHistoryRegistry(),
    userGetItem(LEGACY_VERIFIED_KEY),
    userGetItem(LEGACY_UNVERIFIED_KEY)
  ]);

  const buckets = Object.values(registry);

  const scopedVerified = buckets.flatMap(
    (bucket) =>
      Array.isArray(bucket?.verified)
        ? bucket.verified
        : []
  );

  const scopedUnverified = buckets.flatMap(
    (bucket) =>
      Array.isArray(bucket?.unverified)
        ? bucket.unverified
        : []
  );

  /*
   * Legacy evidence is intentionally retained as unscoped compatibility
   * evidence until it can be deterministically attributed to a broker
   * account. Never silently assign it to the account currently selected.
   */
  const legacyVerified = includeLegacy
    ? parseArray(legacyVerifiedRaw).filter(
        (row) => !clean(row?.brokerAccountKey)
      )
    : [];

  const legacyUnverified = includeLegacy
    ? parseArray(legacyUnverifiedRaw).filter(
        (row) => !clean(row?.brokerAccountKey)
      )
    : [];

  return {
    registry,
    verified: dedupeRows([
      ...scopedVerified,
      ...legacyVerified
    ]),
    unverified: dedupeRows([
      ...scopedUnverified,
      ...legacyUnverified
    ]),
    accountKeys: Object.keys(registry),
    legacyVerifiedCount: legacyVerified.length,
    legacyUnverifiedCount: legacyUnverified.length
  };
}

export async function loadBrokerTransactionHistoryEvidence(
  brokerAccountKey
) {
  const normalizedAccountKey = upper(brokerAccountKey);

  if (!normalizedAccountKey) {
    throw new Error(
      "Broker account is required to load transaction evidence."
    );
  }

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const bucket = registry[normalizedAccountKey] || null;

  return {
    brokerAccountKey: normalizedAccountKey,
    ready:
      Array.isArray(bucket?.verified) &&
      bucket.verified.length > 0,
    verified: Array.isArray(bucket?.verified)
      ? bucket.verified
      : [],
    unverified: Array.isArray(bucket?.unverified)
      ? bucket.unverified
      : [],
    updatedAt: bucket?.updatedAt || null,
    fileName: bucket?.fileName || null,
    source: bucket?.source || null
  };
}

export async function saveBrokerTransactionHistoryEvidence({
  brokerAccountKey,
  verified = [],
  unverified = [],
  fileName = null,
  source = "BROKER_TRANSACTION_EVIDENCE"
} = {}) {
  const {
    userGetItem,
    userSetItem
  } = await loadUserStorage();

  const normalizedAccountKey = upper(brokerAccountKey);

  if (!normalizedAccountKey) {
    throw new Error(
      "Broker account is required before transaction evidence can be saved."
    );
  }

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const taggedVerified =
    tagRows(verified, normalizedAccountKey);

  const taggedUnverified =
    tagRows(unverified, normalizedAccountKey);

  const nextRegistry = {
    ...registry,
    [normalizedAccountKey]: {
      brokerAccountKey: normalizedAccountKey,
      verified: taggedVerified,
      unverified: taggedUnverified,
      fileName: fileName || null,
      source,
      updatedAt: new Date().toISOString()
    }
  };

  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify(nextRegistry)
  );

  /*
   * Compatibility projection:
   * existing canonical ledger/reconciliation/recovery consumers continue
   * reading the historical keys, but those keys now contain the combined
   * account-scoped evidence rather than whichever broker uploaded last.
   *
   * Existing unscoped legacy rows are retained until deterministic
   * migration is possible.
   */
  const legacyVerified = parseArray(
    await userGetItem(LEGACY_VERIFIED_KEY)
  ).filter(
    (row) => !clean(row?.brokerAccountKey)
  );

  const legacyUnverified = parseArray(
    await userGetItem(LEGACY_UNVERIFIED_KEY)
  ).filter(
    (row) => !clean(row?.brokerAccountKey)
  );

  const combinedVerified = dedupeRows([
    ...Object.values(nextRegistry).flatMap(
      (bucket) =>
        Array.isArray(bucket?.verified)
          ? bucket.verified
          : []
    ),
    ...legacyVerified
  ]);

  const combinedUnverified = dedupeRows([
    ...Object.values(nextRegistry).flatMap(
      (bucket) =>
        Array.isArray(bucket?.unverified)
          ? bucket.unverified
          : []
    ),
    ...legacyUnverified
  ]);

  await Promise.all([
    userSetItem(
      LEGACY_VERIFIED_KEY,
      JSON.stringify(combinedVerified)
    ),
    userSetItem(
      LEGACY_UNVERIFIED_KEY,
      JSON.stringify(combinedUnverified)
    ),
    userSetItem(
      LEGACY_MIGRATION_KEY,
      "ACCOUNT_SCOPED_COMPATIBILITY_V1"
    )
  ]);

  return {
    brokerAccountKey: normalizedAccountKey,
    verified: taggedVerified,
    unverified: taggedUnverified,
    combinedVerified,
    combinedUnverified,
    accountCount: Object.keys(nextRegistry).length
  };
}

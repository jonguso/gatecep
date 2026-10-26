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

function exchangeOrderNumber(row = {}) {
  return clean(
    row.exchangeOrderNo ||
    row.exchangeOrderNumber ||
    row.exchangeOrderId
  );
}

function immutableTransactionIdentity(
  row = {},
  fallbackAccountKey = ""
) {
  const accountKey = upper(
    row.brokerAccountKey ||
    row.accountKey ||
    fallbackAccountKey
  );

  const exchangeOrderNo =
    exchangeOrderNumber(row);

  if (!accountKey || !exchangeOrderNo) {
    return "";
  }

  return (
    accountKey +
    "::EXCHANGE_ORDER:" +
    exchangeOrderNo
  );
}

function isImportableExecution(row = {}) {
  const exchangeOrderNo =
    exchangeOrderNumber(row);

  /*
   * Historical broker execution authority:
   *
   * Total Traded Quantity is the ONLY quantity field that proves
   * a broker-uploaded historical order actually executed.
   *
   * Do not substitute:
   *   - Traded Quantity
   *   - Filled Quantity
   *   - generic Quantity / Order Quantity
   *
   * The historical classification policy preserves
   * totalTradedQuantity on canonical rows before they reach this
   * persistence boundary.
   */
  const totalTradedQuantity =
    Number(
      row.totalTradedQuantity ?? 0
    );

  return Boolean(exchangeOrderNo) &&
    Number.isFinite(totalTradedQuantity) &&
    totalTradedQuantity > 0;
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


/*
 * Explicit historical classification repair.
 *
 * This is deliberately separate from normal upload.
 *
 * It may move an existing immutable Exchange Order between
 * classification buckets, but it must never change the
 * economic transaction itself.
 */
export async function applyBrokerTransactionHistoryClassificationRepair({
  brokerAccountKey,
  promoteIdentities = []
} = {}) {
  const {
    userGetItem,
    userSetItem
  } = await loadUserStorage();

  const normalizedAccountKey =
    upper(brokerAccountKey);

  if (!normalizedAccountKey) {
    throw new Error(
      "Broker account is required before classification repair."
    );
  }

  const allowed =
    new Set(
      (Array.isArray(promoteIdentities)
        ? promoteIdentities
        : []
      )
        .map((value) => upper(value))
        .filter(Boolean)
    );

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const existingBucket =
    registry[normalizedAccountKey];

  if (!existingBucket) {
    throw new Error(
      "No transaction-history evidence exists for this broker account."
    );
  }

  const existingVerified =
    Array.isArray(existingBucket.verified)
      ? existingBucket.verified
      : [];

  const existingUnverified =
    Array.isArray(existingBucket.unverified)
      ? existingBucket.unverified
      : [];

  const verifiedIdentitySet =
    new Set(
      existingVerified
        .map((row) =>
          upper(
            immutableTransactionIdentity(
              row,
              normalizedAccountKey
            )
          )
        )
        .filter(Boolean)
    );

  const nextVerified = [
    ...existingVerified
  ];

  const nextUnverified = [];

  let promotedCount = 0;
  let skippedCount = 0;

  for (const row of existingUnverified) {
    const rowIdentity =
      upper(
        immutableTransactionIdentity(
          row,
          normalizedAccountKey
        )
      );

    if (
      !rowIdentity ||
      !allowed.has(rowIdentity)
    ) {
      nextUnverified.push(row);
      continue;
    }

    /*
     * Never duplicate an identity already in verified history.
     */
    if (verifiedIdentitySet.has(rowIdentity)) {
      nextUnverified.push(row);
      skippedCount += 1;
      continue;
    }

    /*
     * Move the ORIGINAL object unchanged.
     *
     * No price, quantity, side, symbol, date, status or manual
     * correction field is rewritten here.
     */
    nextVerified.push(row);
    verifiedIdentitySet.add(rowIdentity);
    promotedCount += 1;
  }

  const taggedVerified =
    tagRows(
      nextVerified,
      normalizedAccountKey
    );

  const taggedUnverified =
    tagRows(
      nextUnverified,
      normalizedAccountKey
    );

  const nextRegistry = {
    ...registry,

    [normalizedAccountKey]: {
      ...existingBucket,
      brokerAccountKey:
        normalizedAccountKey,
      verified:
        taggedVerified,
      unverified:
        taggedUnverified,
      updatedAt:
        new Date().toISOString()
    }
  };

  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify(nextRegistry)
  );

  /*
   * Rebuild compatibility projections from the repaired
   * account registry while retaining truly unscoped legacy rows.
   */
  const legacyVerified =
    parseArray(
      await userGetItem(LEGACY_VERIFIED_KEY)
    ).filter(
      (row) => !clean(row?.brokerAccountKey)
    );

  const legacyUnverified =
    parseArray(
      await userGetItem(LEGACY_UNVERIFIED_KEY)
    ).filter(
      (row) => !clean(row?.brokerAccountKey)
    );

  const combinedVerified =
    dedupeRows([
      ...Object.values(nextRegistry).flatMap(
        (bucket) =>
          Array.isArray(bucket?.verified)
            ? bucket.verified
            : []
      ),
      ...legacyVerified
    ]);

  const combinedUnverified =
    dedupeRows([
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
    brokerAccountKey:
      normalizedAccountKey,

    verified:
      taggedVerified,

    unverified:
      taggedUnverified,

    combinedVerified,
    combinedUnverified,

    repairSummary: {
      promotedCount,
      skippedCount,

      /*
       * Classification movement only.
       */
      economicRowsUpdated: 0,
      economicRowsDeleted: 0,
      economicRowsInserted: 0
    }
  };
}



/*
 * Explicit account-scoped transaction-history reset.
 *
 * This is a maintenance operation, not normal upload behavior.
 *
 * It removes ONLY the requested broker-account bucket from the
 * canonical registry and then rebuilds the compatibility
 * projections from all remaining account buckets plus truly
 * unscoped legacy evidence.
 *
 * Holdings, cash evidence, broker connections and other
 * portfolio evidence are outside this store and are untouched.
 */
/*
 * GLOBAL TRANSACTION-HISTORY CLEAN START
 *
 * This operation intentionally clears historical broker
 * transaction evidence for ALL broker accounts.
 *
 * It is NOT normal upload behavior.
 *
 * It clears:
 *   - account-scoped transaction-history registry
 *   - verified compatibility transaction history
 *   - unverified compatibility transaction history
 *   - legacy migration/projection marker
 *
 * It does NOT touch:
 *   - holdings
 *   - cash evidence
 *   - connected broker accounts
 *   - portfolio snapshots
 *   - orders
 *   - user profile
 */
export async function exportBrokerTransactionHistoryBackup() {
  const {
    userGetItem
  } = await loadUserStorage();

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const compatibilityVerified =
    parseArray(
      await userGetItem(LEGACY_VERIFIED_KEY)
    );

  const compatibilityUnverified =
    parseArray(
      await userGetItem(LEGACY_UNVERIFIED_KEY)
    );

  const projectionVersion =
    await userGetItem(
      LEGACY_MIGRATION_KEY
    );

  const accountSummaries =
    Object.entries(registry).map(
      ([brokerAccountKey, bucket]) => ({
        brokerAccountKey,

        verifiedCount:
          Array.isArray(bucket?.verified)
            ? bucket.verified.length
            : 0,

        unverifiedCount:
          Array.isArray(bucket?.unverified)
            ? bucket.unverified.length
            : 0
      })
    );

  const scopedVerifiedCount =
    accountSummaries.reduce(
      (sum, row) =>
        sum + row.verifiedCount,
      0
    );

  const scopedUnverifiedCount =
    accountSummaries.reduce(
      (sum, row) =>
        sum + row.unverifiedCount,
      0
    );

  return {
    schema:
      "GATECEP_TRANSACTION_HISTORY_BACKUP_V1",

    exportedAt:
      new Date().toISOString(),

    accountCount:
      accountSummaries.length,

    accountSummaries,

    scopedVerifiedCount,
    scopedUnverifiedCount,

    scopedTotalCount:
      scopedVerifiedCount +
      scopedUnverifiedCount,

    compatibilityVerifiedCount:
      compatibilityVerified.length,

    compatibilityUnverifiedCount:
      compatibilityUnverified.length,

    projectionVersion:
      projectionVersion || null,

    registry,

    compatibility: {
      verified:
        compatibilityVerified,

      unverified:
        compatibilityUnverified
    }
  };
}



export async function resetAllBrokerTransactionHistoryEvidence() {
  const {
    userGetItem,
    userSetItem,
    userRemoveItem
  } = await loadUserStorage();

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const accountKeys =
    Object.keys(registry);

  let verifiedCount = 0;
  let unverifiedCount = 0;

  for (const bucket of Object.values(registry)) {
    verifiedCount +=
      Array.isArray(bucket?.verified)
        ? bucket.verified.length
        : 0;

    unverifiedCount +=
      Array.isArray(bucket?.unverified)
        ? bucket.unverified.length
        : 0;
  }

  const legacyVerified =
    parseArray(
      await userGetItem(LEGACY_VERIFIED_KEY)
    );

  const legacyUnverified =
    parseArray(
      await userGetItem(LEGACY_UNVERIFIED_KEY)
    );

  /*
   * Canonical registry becomes empty.
   */
  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify({})
  );

  /*
   * Compatibility projections also become empty.
   *
   * For this intentional clean-start operation we do NOT
   * preserve old unscoped legacy transaction history.
   */
  await userSetItem(
    LEGACY_VERIFIED_KEY,
    JSON.stringify([])
  );

  await userSetItem(
    LEGACY_UNVERIFIED_KEY,
    JSON.stringify([])
  );

  /*
   * Force future compatibility state to be derived from the
   * new transaction-history contract.
   */
  if (typeof userRemoveItem === "function") {
    await userRemoveItem(
      LEGACY_MIGRATION_KEY
    );
  }

  return {
    clearedAccountKeys:
      accountKeys,

    clearedAccountCount:
      accountKeys.length,

    clearedVerifiedCount:
      verifiedCount,

    clearedUnverifiedCount:
      unverifiedCount,

    clearedScopedCount:
      verifiedCount +
      unverifiedCount,

    clearedLegacyVerifiedCount:
      legacyVerified.length,

    clearedLegacyUnverifiedCount:
      legacyUnverified.length,

    remainingAccountCount: 0,
    remainingVerifiedCount: 0,
    remainingUnverifiedCount: 0
  };
}



export async function resetBrokerTransactionHistoryEvidence({
  brokerAccountKey
} = {}) {
  const {
    userGetItem,
    userSetItem
  } = await loadUserStorage();

  const normalizedAccountKey =
    upper(brokerAccountKey);

  if (!normalizedAccountKey) {
    throw new Error(
      "Broker account is required before transaction history can be reset."
    );
  }

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const existingBucket =
    registry[normalizedAccountKey] || null;

  const removedVerifiedCount =
    Array.isArray(existingBucket?.verified)
      ? existingBucket.verified.length
      : 0;

  const removedUnverifiedCount =
    Array.isArray(existingBucket?.unverified)
      ? existingBucket.unverified.length
      : 0;

  /*
   * Copy the registry, then remove ONLY the target account.
   */
  const nextRegistry = {
    ...registry
  };

  delete nextRegistry[normalizedAccountKey];

  /*
   * Preserve only genuinely unscoped legacy rows.
   *
   * Account-scoped rows currently present in compatibility
   * projections are rebuilt from nextRegistry below.
   */
  const legacyVerified =
    parseArray(
      await userGetItem(LEGACY_VERIFIED_KEY)
    ).filter(
      (row) => !clean(row?.brokerAccountKey)
    );

  const legacyUnverified =
    parseArray(
      await userGetItem(LEGACY_UNVERIFIED_KEY)
    ).filter(
      (row) => !clean(row?.brokerAccountKey)
    );

  const combinedVerified =
    dedupeRows([
      ...Object.values(nextRegistry).flatMap(
        (bucket) =>
          Array.isArray(bucket?.verified)
            ? bucket.verified
            : []
      ),
      ...legacyVerified
    ]);

  const combinedUnverified =
    dedupeRows([
      ...Object.values(nextRegistry).flatMap(
        (bucket) =>
          Array.isArray(bucket?.unverified)
            ? bucket.unverified
            : []
      ),
      ...legacyUnverified
    ]);

  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify(nextRegistry)
  );

  await userSetItem(
    LEGACY_VERIFIED_KEY,
    JSON.stringify(combinedVerified)
  );

  await userSetItem(
    LEGACY_UNVERIFIED_KEY,
    JSON.stringify(combinedUnverified)
  );

  return {
    brokerAccountKey:
      normalizedAccountKey,

    existed:
      Boolean(existingBucket),

    removedVerifiedCount,
    removedUnverifiedCount,

    removedTotalCount:
      removedVerifiedCount +
      removedUnverifiedCount,

    remainingAccountKeys:
      Object.keys(nextRegistry),

    combinedVerifiedCount:
      combinedVerified.length,

    combinedUnverifiedCount:
      combinedUnverified.length
  };
}



/*
 * R7O-R4E7R44C
 *
 * Replace one broker account's DERIVED local transaction-history
 * cache from authenticated canonical server history.
 *
 * Canonical server history is authoritative.
 *
 * Unlike normal file upload, hydration is intentionally replacement
 * semantics for the selected broker account. This is required so an
 * Admin physical clear, or another-device canonical change, removes
 * stale local evidence on the investor device.
 *
 * Other broker-account buckets and genuinely unscoped legacy evidence
 * remain untouched.
 */
export async function replaceBrokerTransactionHistoryEvidenceFromCanonical({
  brokerAccountKey,
  verified = [],
  source = "CANONICAL_SERVER_HISTORY"
} = {}) {
  const {
    userGetItem,
    userSetItem
  } = await loadUserStorage();

  const normalizedAccountKey =
    upper(brokerAccountKey);

  if (!normalizedAccountKey) {
    throw new Error(
      "Broker account is required before canonical transaction history can be hydrated."
    );
  }

  const incoming =
    Array.isArray(verified)
      ? verified
      : [];

  const canonicalVerified = [];
  const identities = new Set();

  for (const rawRow of incoming) {
    const row = {
      ...rawRow,
      brokerAccountKey:
        normalizedAccountKey
    };

    if (!isImportableExecution(row)) {
      throw new Error(
        "Canonical transaction history contains an invalid execution."
      );
    }

    const identity =
      immutableTransactionIdentity(
        row,
        normalizedAccountKey
      );

    if (!identity) {
      throw new Error(
        "Canonical transaction history contains an execution without immutable identity."
      );
    }

    if (identities.has(identity)) {
      throw new Error(
        "Canonical transaction history contains a duplicate immutable execution identity."
      );
    }

    identities.add(identity);
    canonicalVerified.push(row);
  }

  const registry =
    await loadBrokerTransactionHistoryRegistry();

  const existingBucket =
    registry[normalizedAccountKey] || null;

  const nextRegistry = {
    ...registry
  };

  if (canonicalVerified.length > 0) {
    nextRegistry[normalizedAccountKey] = {
      brokerAccountKey:
        normalizedAccountKey,
      verified:
        canonicalVerified,
      unverified: [],
      updatedAt:
        new Date().toISOString(),
      fileName: null,
      source
    };
  } else {
    delete nextRegistry[normalizedAccountKey];
  }

  const legacyVerified =
    parseArray(
      await userGetItem(
        LEGACY_VERIFIED_KEY
      )
    ).filter(
      (row) =>
        !clean(row?.brokerAccountKey)
    );

  const legacyUnverified =
    parseArray(
      await userGetItem(
        LEGACY_UNVERIFIED_KEY
      )
    ).filter(
      (row) =>
        !clean(row?.brokerAccountKey)
    );

  const scopedBuckets =
    Object.values(nextRegistry);

  const combinedVerified =
    dedupeRows([
      ...scopedBuckets.flatMap(
        (bucket) =>
          Array.isArray(bucket?.verified)
            ? bucket.verified
            : []
      ),
      ...legacyVerified
    ]);

  const combinedUnverified =
    dedupeRows([
      ...scopedBuckets.flatMap(
        (bucket) =>
          Array.isArray(bucket?.unverified)
            ? bucket.unverified
            : []
      ),
      ...legacyUnverified
    ]);

  await userSetItem(
    REGISTRY_KEY,
    JSON.stringify(nextRegistry)
  );

  await userSetItem(
    LEGACY_VERIFIED_KEY,
    JSON.stringify(combinedVerified)
  );

  await userSetItem(
    LEGACY_UNVERIFIED_KEY,
    JSON.stringify(combinedUnverified)
  );

  return {
    brokerAccountKey:
      normalizedAccountKey,
    previousVerifiedCount:
      Array.isArray(existingBucket?.verified)
        ? existingBucket.verified.length
        : 0,
    canonicalVerifiedCount:
      canonicalVerified.length,
    removedAccountBucket:
      canonicalVerified.length === 0,
    verified:
      canonicalVerified,
    source
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

  const existingBucket =
    registry[normalizedAccountKey] || {};

  const existingVerified =
    Array.isArray(existingBucket?.verified)
      ? existingBucket.verified
      : [];

  const existingUnverified =
    Array.isArray(existingBucket?.unverified)
      ? existingBucket.unverified
      : [];

  /*
   * Historical transaction evidence is append-only during upload.
   *
   * Once an Exchange Order No exists for this broker account,
   * later uploads must not overwrite, reclassify, or delete it.
   * Manual historical corrections therefore remain authoritative
   * until the user intentionally edits them.
   */
  const knownIdentities =
    new Set(
      [
        ...existingVerified,
        ...existingUnverified
      ]
        .map((row) =>
          immutableTransactionIdentity(
            row,
            normalizedAccountKey
          )
        )
        .filter(Boolean)
    );

  const nextVerified = [
    ...existingVerified
  ];

  const nextUnverified = [
    ...existingUnverified
  ];

  let insertedVerifiedCount = 0;
  let insertedUnverifiedCount = 0;
  let skippedExistingCount = 0;
  let skippedInvalidCount = 0;

  function appendNewRows(
    incomingRows,
    target,
    classification
  ) {
    for (
      const rawRow of
      Array.isArray(incomingRows)
        ? incomingRows
        : []
    ) {
      const row = {
        ...rawRow,
        brokerAccountKey:
          normalizedAccountKey
      };

      if (!isImportableExecution(row)) {
        skippedInvalidCount += 1;
        continue;
      }

      const identity =
        immutableTransactionIdentity(
          row,
          normalizedAccountKey
        );

      if (
        !identity ||
        knownIdentities.has(identity)
      ) {
        skippedExistingCount += 1;
        continue;
      }

      knownIdentities.add(identity);
      target.push(row);

      if (classification === "VERIFIED") {
        insertedVerifiedCount += 1;
      } else {
        insertedUnverifiedCount += 1;
      }
    }
  }

  appendNewRows(
    verified,
    nextVerified,
    "VERIFIED"
  );

  appendNewRows(
    unverified,
    nextUnverified,
    "UNVERIFIED"
  );

  const taggedVerified =
    tagRows(
      nextVerified,
      normalizedAccountKey
    );

  const taggedUnverified =
    tagRows(
      nextUnverified,
      normalizedAccountKey
    );

  const mergeSummary = {
    existingVerifiedCount:
      existingVerified.length,
    existingUnverifiedCount:
      existingUnverified.length,
    insertedVerifiedCount,
    insertedUnverifiedCount,
    skippedExistingCount,
    skippedInvalidCount,

    /*
     * These are explicit financial-history invariants.
     * Transaction-history upload never mutates existing rows.
     */
    updatedExistingCount: 0,
    deletedCount: 0
  };

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
    accountCount: Object.keys(nextRegistry).length,
    mergeSummary
  };
}

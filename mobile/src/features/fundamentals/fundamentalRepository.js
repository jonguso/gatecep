import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  buildResearchReadyFundamentals,
  buildResearchReadyFundamentalsBatch,
  mergeCompanyFundamentals
} from "./fundamentalDataEngine";

/*
 * ============================================================
 * PC-024B
 * FUNDAMENTAL DATA REPOSITORY
 * ============================================================
 *
 * Persists normalized research-ready fundamentals locally.
 *
 * Safeguards:
 * - never invents missing values,
 * - never replaces valid values with null,
 * - keeps a schema version,
 * - supports clean reset and seed reloading,
 * - remains independent from portfolio and order storage.
 * ============================================================
 */

export const FUNDAMENTAL_REPOSITORY_SCHEMA_VERSION = 1;

export const FUNDAMENTAL_REPOSITORY_KEYS = {
  RECORDS:
    "@gatecep/fundamentals/records/v1",

  METADATA:
    "@gatecep/fundamentals/metadata/v1"
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function nowIso() {
  return new Date().toISOString();
}

function buildDefaultMetadata() {
  return {
    schemaVersion:
      FUNDAMENTAL_REPOSITORY_SCHEMA_VERSION,

    createdAt:
      nowIso(),

    updatedAt:
      nowIso(),

    seededAt:
      null,

    seedVersion:
      null,

    recordCount:
      0
  };
}

async function readJson(
  key,
  fallback
) {
  try {
    const stored =
      await AsyncStorage.getItem(
        key
      );

    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.warn(
      `Unable to read ${key}:`,
      error
    );

    return fallback;
  }
}

async function writeJson(
  key,
  value
) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify(value)
  );

  return value;
}

export async function loadFundamentalRepositoryMetadata() {
  const metadata =
    await readJson(
      FUNDAMENTAL_REPOSITORY_KEYS
        .METADATA,
      buildDefaultMetadata()
    );

  return {
    ...buildDefaultMetadata(),
    ...metadata,
    schemaVersion:
      FUNDAMENTAL_REPOSITORY_SCHEMA_VERSION
  };
}

export async function loadFundamentalRecords() {
  const records =
    await readJson(
      FUNDAMENTAL_REPOSITORY_KEYS
        .RECORDS,
      []
    );

  return safeArray(records)
    .filter(
      (record) =>
        normalizeSymbol(
          record?.symbol
        )
    );
}

export async function loadFundamentalRecord(
  symbol
) {
  const target =
    normalizeSymbol(symbol);

  if (!target) {
    return null;
  }

  const records =
    await loadFundamentalRecords();

  return records.find(
    (record) =>
      normalizeSymbol(
        record?.symbol
      ) === target
  ) || null;
}

export async function saveFundamentalRecords(
  records = []
) {
  const normalized =
    safeArray(records)
      .filter(
        (record) =>
          normalizeSymbol(
            record?.symbol
          )
      )
      .map(
        (record) => ({
          ...record,

          symbol:
            normalizeSymbol(
              record.symbol
            )
        })
      );

  await writeJson(
    FUNDAMENTAL_REPOSITORY_KEYS
      .RECORDS,
    normalized
  );

  const currentMetadata =
    await loadFundamentalRepositoryMetadata();

  await writeJson(
    FUNDAMENTAL_REPOSITORY_KEYS
      .METADATA,
    {
      ...currentMetadata,

      schemaVersion:
        FUNDAMENTAL_REPOSITORY_SCHEMA_VERSION,

      updatedAt:
        nowIso(),

      recordCount:
        normalized.length
    }
  );

  return normalized;
}

export async function saveFundamentalRecord({
  company,
  policy = {}
} = {}) {
  const prepared =
    buildResearchReadyFundamentals({
      company,

      policy
    });

  if (!prepared.symbol) {
    throw new Error(
      "A company symbol is required."
    );
  }

  const records =
    await loadFundamentalRecords();

  const index =
    records.findIndex(
      (record) =>
        normalizeSymbol(
          record?.symbol
        ) === prepared.symbol
    );

  if (index >= 0) {
    records[index] =
      prepared;
  } else {
    records.push(
      prepared
    );
  }

  await saveFundamentalRecords(
    records
  );

  return prepared;
}

export async function saveFundamentalRecordBatch({
  companies = [],
  policy = {}
} = {}) {
  const batch =
    buildResearchReadyFundamentalsBatch({
      companies,

      policy
    });

  const current =
    await loadFundamentalRecords();

  const bySymbol =
    new Map(
      current.map(
        (record) => [
          normalizeSymbol(
            record?.symbol
          ),
          record
        ]
      )
    );

  batch.results.forEach(
    (record) => {
      if (record?.symbol) {
        bySymbol.set(
          record.symbol,
          record
        );
      }
    }
  );

  await saveFundamentalRecords(
    Array.from(
      bySymbol.values()
    )
  );

  return batch;
}

export async function mergeAndSaveFundamentalRecord({
  symbol,
  incoming,
  policy = {}
} = {}) {
  const target =
    normalizeSymbol(
      symbol ||
      incoming?.symbol
    );

  if (!target) {
    throw new Error(
      "A company symbol is required."
    );
  }

  const existing =
    await loadFundamentalRecord(
      target
    );

  const merged =
    mergeCompanyFundamentals({
      existing:
        existing || {
          symbol:
            target
        },

      incoming: {
        ...incoming,

        symbol:
          target
      }
    });

  return saveFundamentalRecord({
    company:
      merged,

    policy
  });
}

export async function deleteFundamentalRecord(
  symbol
) {
  const target =
    normalizeSymbol(symbol);

  const records =
    await loadFundamentalRecords();

  const next =
    records.filter(
      (record) =>
        normalizeSymbol(
          record?.symbol
        ) !== target
    );

  await saveFundamentalRecords(
    next
  );

  return next.length !==
    records.length;
}

export async function clearFundamentalRepository() {
  await AsyncStorage.multiRemove([
    FUNDAMENTAL_REPOSITORY_KEYS
      .RECORDS,

    FUNDAMENTAL_REPOSITORY_KEYS
      .METADATA
  ]);

  return true;
}

export async function markFundamentalRepositorySeeded({
  seedVersion,
  recordCount
} = {}) {
  const metadata =
    await loadFundamentalRepositoryMetadata();

  return writeJson(
    FUNDAMENTAL_REPOSITORY_KEYS
      .METADATA,
    {
      ...metadata,

      schemaVersion:
        FUNDAMENTAL_REPOSITORY_SCHEMA_VERSION,

      seededAt:
        nowIso(),

      updatedAt:
        nowIso(),

      seedVersion:
        seedVersion ||
        null,

      recordCount:
        Number(
          recordCount ??
          metadata.recordCount ??
          0
        )
    }
  );
}

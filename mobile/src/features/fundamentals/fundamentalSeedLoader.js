import {
  NSE_FUNDAMENTAL_SEED_VERSION,
  NSE_FUNDAMENTAL_STARTER_SEED
} from "./seeds/nseFundamentalSeed";

import {
  loadFundamentalRecords,
  loadFundamentalRepositoryMetadata,
  markFundamentalRepositorySeeded,
  mergeAndSaveFundamentalRecord,
  saveFundamentalRecordBatch
} from "./fundamentalRepository";

/*
 * ============================================================
 * PC-024B
 * FUNDAMENTAL SEED LOADER
 * ============================================================
 */

export async function initializeFundamentalRepository({
  force = false,
  seed =
    NSE_FUNDAMENTAL_STARTER_SEED,
  seedVersion =
    NSE_FUNDAMENTAL_SEED_VERSION,
  policy = {}
} = {}) {
  const metadata =
    await loadFundamentalRepositoryMetadata();

  const currentRecords =
    await loadFundamentalRecords();

  const alreadySeeded =
    metadata?.seedVersion ===
      seedVersion &&
    currentRecords.length > 0;

  if (
    alreadySeeded &&
    !force
  ) {
    return {
      status:
        "ALREADY_INITIALIZED",

      seedVersion,

      added:
        0,

      total:
        currentRecords.length,

      records:
        currentRecords
    };
  }

  if (force) {
    const batch =
      await saveFundamentalRecordBatch({
        companies:
          seed,

        policy
      });

    await markFundamentalRepositorySeeded({
      seedVersion,

      recordCount:
        batch.results.length
    });

    return {
      status:
        "SEEDED",

      seedVersion,

      added:
        batch.results.length,

      total:
        batch.results.length,

      records:
        batch.results
    };
  }

  let added = 0;

  for (
    const company of seed
  ) {
    const before =
      await loadFundamentalRecords();

    const existed =
      before.some(
        (record) =>
          record?.symbol ===
          company?.symbol
      );

    await mergeAndSaveFundamentalRecord({
      symbol:
        company?.symbol,

      incoming:
        company,

      policy
    });

    if (!existed) {
      added += 1;
    }
  }

  const records =
    await loadFundamentalRecords();

  await markFundamentalRepositorySeeded({
    seedVersion,

    recordCount:
      records.length
  });

  return {
    status:
      "SEEDED",

    seedVersion,

    added,

    total:
      records.length,

    records
  };
}

export async function reloadFundamentalSeed(
  options = {}
) {
  return initializeFundamentalRepository({
    ...options,

    force:
      true
  });
}

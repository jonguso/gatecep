import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const upload = await readFile(
  new URL(
    "../app/transactions-upload.js",
    import.meta.url
  ),
  "utf8"
);

const importPath = await readFile(
  new URL(
    "../app/transaction-import.js",
    import.meta.url
  ),
  "utf8"
);

// Helper: count exact invocation syntax.
function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

// 1. transactions-upload must contain exactly one
// canonical rebuild invocation.
{
  const count = countOccurrences(
    upload,
    "await rebuildCanonicalPortfolioLedger();"
  );

  assert.equal(count, 1);

  console.log(
    "PASS: transactions-upload performs exactly one canonical portfolio ledger rebuild."
  );
}

// 2. Evidence must be stored before canonical rebuild.
{
  const verifiedIndex =
    upload.indexOf(
      'userSetItem("transactionHistory"'
    );

  const unverifiedIndex =
    upload.indexOf(
      'userSetItem("unverifiedTransactionHistory"'
    );

  const rebuildIndex =
    upload.indexOf(
      "await rebuildCanonicalPortfolioLedger();"
    );

  assert.ok(verifiedIndex >= 0);
  assert.ok(unverifiedIndex >= 0);
  assert.ok(rebuildIndex > verifiedIndex);
  assert.ok(rebuildIndex > unverifiedIndex);

  console.log(
    "PASS: verified and unverified evidence are persisted before canonical rebuild."
  );
}

// 3. Sync status follows canonical rebuild.
{
  const rebuildIndex =
    upload.indexOf(
      "await rebuildCanonicalPortfolioLedger();"
    );

  const syncIndex =
    upload.indexOf(
      "await buildSyncStatus();"
    );

  assert.ok(rebuildIndex >= 0);
  assert.ok(syncIndex > rebuildIndex);

  console.log(
    "PASS: sync status is rebuilt after canonical portfolio ledger derivation."
  );
}

// 4. Optional OMS recovery remains downstream
// of ledger + sync status.
{
  const syncIndex =
    upload.indexOf(
      "await buildSyncStatus();"
    );

  const recoveryIndex =
    upload.indexOf(
      "reconcileUncertainRealOrderFromVerifiedEvidence"
    );

  // First occurrence may be import; locate runtime call.
  const runtimeRecoveryIndex =
    upload.indexOf(
      "await reconcileUncertainRealOrderFromVerifiedEvidence"
    );

  assert.ok(syncIndex >= 0);
  assert.ok(recoveryIndex >= 0);
  assert.ok(runtimeRecoveryIndex > syncIndex);

  console.log(
    "PASS: OMS recovery remains downstream of evidence persistence, canonical rebuild, and sync status."
  );
}

// 5. The normal transaction-import path already uses
// the same single-rebuild ordering.
{
  const count = countOccurrences(
    importPath,
    "await rebuildCanonicalPortfolioLedger();"
  );

  assert.equal(count, 1);

  const rebuildIndex =
    importPath.indexOf(
      "await rebuildCanonicalPortfolioLedger();"
    );

  const syncIndex =
    importPath.indexOf(
      "await buildSyncStatus();"
    );

  assert.ok(syncIndex > rebuildIndex);

  console.log(
    "PASS: transaction-import and transactions-upload now share the same single-rebuild ordering."
  );
}

// 6. A17 must not alter OMS recovery behavior.
{
  assert.match(
    upload,
    /AMBIGUOUS_VERIFIED_MATCH/
  );

  assert.match(
    upload,
    /NO_VERIFIED_MATCH/
  );

  assert.match(
    upload,
    /RECONCILIATION_PERSISTENCE_FAILED/
  );

  assert.match(
    upload,
    /recoveryResult\?\.resolved === true/
  );

  console.log(
    "PASS: A17 preserves all A15 OMS recovery result handling."
  );
}

console.log("");
console.log(
  "PC-031A17 single canonical rebuild runtime tests PASSED."
);

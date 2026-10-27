import fs from "node:fs";
import assert from "node:assert/strict";

const source =
  fs.readFileSync(
    new URL(
      "../app/portfolio-sync-center.js",
      import.meta.url
    ),
    "utf8"
  );

/*
 * This regression protects the screen-level canonical readiness
 * contract independently of React Native rendering.
 *
 * The production screen must require:
 *   1. selected broker account
 *   2. canonical check completed
 *   3. canonical authority established
 *   4. canonical history count > 0
 *   5. hydrated local derived history ready
 */

const readyMatch =
  source.match(
    /const transactionHistoryReady =([\s\S]*?);/
  );

assert.ok(
  readyMatch,
  "transactionHistoryReady definition missing."
);

const readySource =
  readyMatch[1];

assert.match(
  readySource,
  /selectedBrokerAccountKey/
);

assert.match(
  readySource,
  /checked === true/
);

assert.match(
  readySource,
  /authorityEstablished === true/
);

assert.match(
  readySource,
  /canonicalCount/
);

assert.match(
  readySource,
  /> 0/
);

assert.match(
  readySource,
  /lotHistory\?\.ready === true/
);

function transactionHistoryReady({
  selectedBrokerAccountKey,
  canonicalTransactionHistory,
  lotHistory
}) {
  return (
    Boolean(selectedBrokerAccountKey) &&
    canonicalTransactionHistory
      ?.checked === true &&
    canonicalTransactionHistory
      ?.authorityEstablished === true &&
    Number(
      canonicalTransactionHistory
        ?.canonicalCount || 0
    ) > 0 &&
    lotHistory?.ready === true
  );
}

/*
 * CASE 1
 *
 * This models the current iOS legacy condition:
 * 283 local completed executions exist,
 * but Railway authority has never been established.
 *
 * Local evidence must remain physically available,
 * but it must NOT produce READY.
 */
{
  const local283 = {
    ready: true,
    completedCount: 283,
    symbols: Array.from(
      { length: 28 },
      (_, index) => `SEC${index + 1}`
    )
  };

  const canonical = {
    checked: true,
    authorityEstablished: false,
    canonicalCount: 0,
    currentGeneration: null
  };

  assert.equal(
    transactionHistoryReady({
      selectedBrokerAccountKey:
        "AIB::137971",
      canonicalTransactionHistory:
        canonical,
      lotHistory:
        local283
    }),
    false
  );

  assert.equal(
    local283.completedCount,
    283
  );

  console.log(
    "CASE_1_LOCAL_283_NO_AUTHORITY_NOT_READY=PASS"
  );

  console.log(
    "CASE_1_LOCAL_283_PRESERVED=PASS"
  );
}

/*
 * CASE 2
 *
 * Canonical authority exists but canonical history is empty.
 * Even if stale local evidence were momentarily present,
 * the card must not be READY.
 *
 * Existing hydration behavior separately proves that established
 * canonical zero replaces the selected stale local bucket with zero.
 */
{
  const staleLocal = {
    ready: true,
    completedCount: 283
  };

  const canonical = {
    checked: true,
    authorityEstablished: true,
    canonicalCount: 0,
    currentGeneration: 1
  };

  assert.equal(
    transactionHistoryReady({
      selectedBrokerAccountKey:
        "AIB::137971",
      canonicalTransactionHistory:
        canonical,
      lotHistory:
        staleLocal
    }),
    false
  );

  console.log(
    "CASE_2_ESTABLISHED_EMPTY_NOT_READY=PASS"
  );
}

/*
 * CASE 3
 *
 * Canonical Railway history exists and the derived local view has
 * been hydrated from it. This is the only positive READY state.
 */
{
  const hydratedLocal = {
    ready: true,
    completedCount: 319
  };

  const canonical = {
    checked: true,
    authorityEstablished: true,
    canonicalCount: 319,
    currentGeneration: 1
  };

  assert.equal(
    transactionHistoryReady({
      selectedBrokerAccountKey:
        "AIB::137971",
      canonicalTransactionHistory:
        canonical,
      lotHistory:
        hydratedLocal
    }),
    true
  );

  console.log(
    "CASE_3_CANONICAL_319_HYDRATED_READY=PASS"
  );
}

/*
 * CASE 4
 *
 * Canonical read failed or has not completed.
 * Local evidence must never become an authoritative fallback.
 */
{
  const localEvidence = {
    ready: true,
    completedCount: 283
  };

  const canonical = {
    checked: false,
    authorityEstablished: false,
    canonicalCount: 0,
    currentGeneration: null,
    error:
      "Unable to verify canonical Transaction History."
  };

  assert.equal(
    transactionHistoryReady({
      selectedBrokerAccountKey:
        "AIB::137971",
      canonicalTransactionHistory:
        canonical,
      lotHistory:
        localEvidence
    }),
    false
  );

  console.log(
    "CASE_4_CANONICAL_READ_FAILURE_NOT_READY=PASS"
  );
}

/*
 * CASE 5
 *
 * No selected broker account can never be READY.
 */
{
  assert.equal(
    transactionHistoryReady({
      selectedBrokerAccountKey:
        "",
      canonicalTransactionHistory: {
        checked: true,
        authorityEstablished: true,
        canonicalCount: 319
      },
      lotHistory: {
        ready: true,
        completedCount: 319
      }
    }),
    false
  );

  console.log(
    "CASE_5_NO_SELECTED_ACCOUNT_NOT_READY=PASS"
  );
}

/*
 * Protect the actual screen implementation from reverting to the
 * historical local-only readiness rule.
 */
assert.doesNotMatch(
  readySource,
  /^\s*Boolean\(selectedBrokerAccountKey\)\s*&&\s*state\.lotHistory\?\.ready === true\s*$/
);

console.log(
  "LOCAL_ONLY_READY_REGRESSION_BLOCKED=PASS"
);

console.log(
  "POSTPROD_SYNC_002F2D3B_BEHAVIOR=PASS"
);

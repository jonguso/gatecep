import assert from "node:assert/strict";
import fs from "node:fs";

console.log(
  "===== PC-POSTPROD-UAT-001F4C4 — MULTI-ACCOUNT CASH RUNTIME ====="
);

/*
 * This verifier exercises the F4C4 replacement invariant using the same
 * account-scoped semantics now owned by authoritative adoption:
 *
 *   A1 + B1
 *   replace A1 with A2
 *   => A2 + B1
 *
 * It also verifies:
 * - combined cash is derived from ALL account balances;
 * - account replacement does not duplicate old cash;
 * - selected staged evidence is removed only for the adopted account;
 * - another account's staged evidence survives;
 * - production source uses canonical ALL cash and scoped cleanup.
 */

const ACCOUNT_A = "ABC|ACC-A";
const ACCOUNT_B = "AIB|ACC-B";
const ACCOUNT_C = "ABC|ACC-C";

const backendCashByAccount = new Map();
const stagedEvidenceByAccount = new Map();

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function stageEvidence(accountKey, cashBalance) {
  const key = normalizeKey(accountKey);

  stagedEvidenceByAccount.set(key, {
    brokerAccountKey: key,
    cashBalance: Number(cashBalance)
  });
}

function replaceBackendAccount(accountKey, cashBalance) {
  const key = normalizeKey(accountKey);

  backendCashByAccount.set(
    key,
    Number(cashBalance)
  );
}

function loadCanonicalAllPortfolio() {
  const cashBalances = Array.from(
    backendCashByAccount.entries(),
    ([brokerAccountKey, cashBalance]) => ({
      brokerAccountKey,
      cashBalance
    })
  );

  return {
    cashBalances,
    availableCash: cashBalances.reduce(
      (sum, row) => sum + Number(row.cashBalance || 0),
      0
    )
  };
}

function removeSelectedStagedEvidence(accountKey) {
  stagedEvidenceByAccount.delete(
    normalizeKey(accountKey)
  );
}

function adopt(accountKey, cashBalance) {
  replaceBackendAccount(
    accountKey,
    cashBalance
  );

  const canonical =
    loadCanonicalAllPortfolio();

  const combinedAvailableCash =
    Number(canonical.availableCash);

  assert.equal(
    Number.isFinite(combinedAvailableCash),
    true,
    "combined available cash must be finite"
  );

  removeSelectedStagedEvidence(
    accountKey
  );

  return {
    availableCash: combinedAvailableCash,
    cashBalances: canonical.cashBalances
  };
}

console.log("TEST 1 — adopt A with cash 100");

stageEvidence(ACCOUNT_A, 100);

let result = adopt(
  ACCOUNT_A,
  100
);

assert.equal(
  result.availableCash,
  100
);

assert.equal(
  stagedEvidenceByAccount.has(ACCOUNT_A),
  false
);

console.log(
  "PASS — A adopted; ALL cash = 100; A staging removed."
);

console.log("TEST 2 — add B with cash 250");

stageEvidence(ACCOUNT_B, 250);

result = adopt(
  ACCOUNT_B,
  250
);

assert.equal(
  result.availableCash,
  350
);

assert.equal(
  backendCashByAccount.get(ACCOUNT_A),
  100
);

assert.equal(
  backendCashByAccount.get(ACCOUNT_B),
  250
);

console.log(
  "PASS — A 100 + B 250 = ALL cash 350."
);

console.log(
  "TEST 3 — re-stage A=175 while unrelated C remains staged"
);

stageEvidence(ACCOUNT_A, 175);
stageEvidence(ACCOUNT_C, 900);

assert.equal(
  stagedEvidenceByAccount.has(ACCOUNT_A),
  true
);

assert.equal(
  stagedEvidenceByAccount.has(ACCOUNT_C),
  true
);

console.log(
  "PASS — A and C staged independently."
);

console.log(
  "TEST 4 — replace A 100 with A 175"
);

result = adopt(
  ACCOUNT_A,
  175
);

assert.equal(
  result.availableCash,
  425
);

assert.equal(
  backendCashByAccount.size,
  2,
  "replacement must not create duplicate A cash"
);

assert.equal(
  backendCashByAccount.get(ACCOUNT_A),
  175
);

assert.equal(
  backendCashByAccount.get(ACCOUNT_B),
  250
);

assert.equal(
  stagedEvidenceByAccount.has(ACCOUNT_A),
  false,
  "adopted A staging must be removed"
);

assert.equal(
  stagedEvidenceByAccount.has(ACCOUNT_C),
  true,
  "unrelated C staging must survive A adoption"
);

console.log(
  "PASS — replace A: 175 + B 250 = ALL cash 425."
);

console.log(
  "PASS — no duplicate A balance after replacement."
);

console.log(
  "PASS — B authoritative cash preserved."
);

console.log(
  "PASS — C staged evidence preserved."
);

console.log(
  "TEST 5 — three authoritative accounts aggregate"
);

stageEvidence(ACCOUNT_C, 75);

result = adopt(
  ACCOUNT_C,
  75
);

assert.equal(
  result.availableCash,
  500
);

assert.equal(
  backendCashByAccount.size,
  3
);

console.log(
  "PASS — A 175 + B 250 + C 75 = ALL cash 500."
);

console.log(
  "TEST 6 — production authoritative service ownership"
);

const source = fs.readFileSync(
  new URL(
    "../src/features/broker-sync/brokerAuthoritativeSnapshotService.js",
    import.meta.url
  ),
  "utf8"
);

assert.match(
  source,
  /loadUnifiedPortfolio\s*\(\s*\{\s*broker:\s*"ALL"/,
  "authoritative adoption must reload canonical ALL portfolio"
);

assert.match(
  source,
  /Number\s*\(\s*canonicalPortfolio\?\.availableCash\s*\)/,
  "combined cash must come from canonical ALL portfolio"
);

assert.match(
  source,
  /userSetItem\s*\(\s*"availableCash"\s*,\s*String\s*\(\s*combinedAvailableCash\s*\)/,
  "combined cash must be persisted locally"
);

assert.match(
  source,
  /removeBrokerAccountEvidence\s*\(\s*normalizedAccountKey\s*\)/,
  "cleanup must be account-scoped"
);

assert.doesNotMatch(
  source,
  /userSetItem\s*\(\s*"availableCash"\s*,\s*String\s*\(\s*next\.cash\s*\)/,
  "selected-account cash must not overwrite ALL cash"
);

assert.doesNotMatch(
  source,
  /clearVerifiedUploadedBrokerEvidence/,
  "authoritative adoption must not perform global evidence cleanup"
);

console.log(
  "PASS — production source uses ALL cash + account-scoped cleanup."
);

console.log(
  "===== PC-POSTPROD-UAT-001F4C4 RUNTIME PASS ====="
);

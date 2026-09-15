import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, "..");

let failed = false;

function read(relativePath) {
  return fs.readFileSync(
    path.join(mobileRoot, relativePath),
    "utf8"
  );
}

function assert(condition, message) {
  if (condition) {
    console.log(`PASS: ${message}`);
  } else {
    failed = true;
    console.error(`FAIL: ${message}`);
  }
}

console.log(
  "===== PC-031A23 REAL EXECUTION IDENTITY CONTINUITY ====="
);

const store = read(
  "src/services/trade/basketExecutionStore.js"
);

const matcher = read(
  "src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
);

const recovery = read(
  "src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
);

const reconciliation = read(
  "src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
);

const evidencePolicy = read(
  "src/features/broker-sync/brokerExecutionEvidencePolicy.js"
);

const canonicalLedger = read(
  "src/features/trading/canonicalPortfolioLedgerService.js"
);

const transactionsUpload = read(
  "app/transactions-upload.js"
);


// ---------------------------------------------------------
// Queue + assigned broker identity
// ---------------------------------------------------------

assert(
  store.includes(
    "await assertRealOrderBrokerAssignment(order, execution)"
  ),
  "REAL order broker assignment is validated before queue/handoff"
);

assert(
  store.includes(
    "const account = await resolveRealBrokerAccount(order)"
  ),
  "REAL handoff resolves the exact assigned connected broker account"
);

assert(
  store.includes(
    'error.code = "REAL_ORDER_RETRY_BROKER_MISMATCH"'
  ),
  "REAL retry rejects broker/account identity drift"
);

assert(
  store.includes(
    "existingSubmissionBrokerAccountId || brokerAccountId"
  ) &&
    store.includes(
      "existingSubmissionBrokerId || brokerId"
    ),
  "REAL submission pins broker account and broker identity"
);


// ---------------------------------------------------------
// Submission identity
// ---------------------------------------------------------

assert(
  store.includes(
    'brokerStatus: "SUBMITTING"'
  ) &&
    store.includes(
      "submissionAttemptId"
    ) &&
    store.includes(
      "submissionAttemptCount"
    ),
  "REAL broker handoff persists submission attempt identity before adapter invocation"
);

assert(
  store.includes(
    "brokerResponse = await placeBrokerOrder(submittedOrder)"
  ),
  "broker adapter receives the already-pinned submitted order"
);

assert(
  !store.includes(
    "brokerId: brokerResponse?.brokerId || brokerId"
  ),
  "adapter response cannot overwrite canonical assigned brokerId"
);

assert(
  store.includes(
    "adapterReportedBrokerId:"
  ),
  "adapter-reported broker identity is retained only as audit metadata"
);

const pinnedBrokerAccountPairs =
  store.match(
    /brokerId,\s*brokerAccountId,/g
  ) || [];

assert(
  pinnedBrokerAccountPairs.length >= 2,
  "adapter result branches preserve canonical broker/account identity"
);


// ---------------------------------------------------------
// Retry/reconciliation safety
// ---------------------------------------------------------

assert(
  store.includes(
    "REAL_ORDER_ALREADY_HAS_BROKER_REFERENCE"
  ),
  "REAL order with broker reference cannot be blindly resubmitted"
);

assert(
  store.includes(
    "REAL_ORDER_RECONCILIATION_REQUIRED"
  ),
  "uncertain REAL submission cannot enter automatic retry"
);


// ---------------------------------------------------------
// Evidence matching identity
// ---------------------------------------------------------

assert(
  matcher.includes(
    "never fall back to heuristic identity matching"
  ) &&
    matcher.includes(
      "text(record?.brokerReference) ==="
    ),
  "known brokerOrderId forces exact broker-reference evidence matching"
);

assert(
  matcher.includes(
    "symbolMatch"
  ) &&
    matcher.includes(
      "sideMatch"
    ) &&
    matcher.includes(
      "quantityMatch"
    ) &&
    matcher.includes(
      "brokerMatch"
    ) &&
    matcher.includes(
      "submissionWindowMatch"
    ),
  "reference-less recovery requires the full broker/order identity heuristic"
);


// ---------------------------------------------------------
// Recovery identity
// ---------------------------------------------------------

assert(
  recovery.includes(
    "order?.brokerOrderId ||"
  ) &&
    recovery.includes(
      "latestEvidence?.brokerReference ||"
    ),
  "recovery preserves an existing genuine brokerOrderId or adopts verified evidence reference"
);

assert(
  recovery.includes(
    "submissionAttemptId:"
  ) &&
    recovery.includes(
      "order?.submissionAttemptId ||"
    ),
  "verified recovery retains the originating submissionAttemptId"
);

assert(
  reconciliation.includes(
    "await updateExecutionOrder("
  ) &&
    reconciliation.includes(
      "decision.patch"
    ),
  "verified recovery persists onto the same OMS order identity"
);


// ---------------------------------------------------------
// Verified evidence accounting authority
// ---------------------------------------------------------

assert(
  evidencePolicy.includes(
    'evidenceStatus: missing.length ? "UNVERIFIED" : "VERIFIED_BROKER_EXECUTION"'
  ) &&
    evidencePolicy.includes(
      "canAffectRealPortfolio: missing.length === 0"
    ),
  "only complete broker execution evidence becomes REAL accounting authority"
);

assert(
  canonicalLedger.includes(
    ".filter(isCompletedLotExecution)"
  ) &&
    canonicalLedger.includes(
      ".filter((row) => row.canAffectRealPortfolio === true)"
    ),
  "canonical REAL ledger remains fail-closed on completed verified evidence"
);

assert(
  canonicalLedger.includes(
    'userGetItem("transactionHistory")'
  ),
  "canonical accounting reads broker transaction evidence rather than OMS FILLED state"
);


// ---------------------------------------------------------
// Upload ordering
// ---------------------------------------------------------

const rebuildPos =
  transactionsUpload.indexOf(
    "await rebuildCanonicalPortfolioLedger()"
  );

const reconcilePos =
  transactionsUpload.indexOf(
    "await reconcileUncertainRealOrderFromVerifiedEvidence({"
  );

assert(
  rebuildPos >= 0 &&
    reconcilePos >= 0 &&
    rebuildPos < reconcilePos,
  "verified broker evidence updates canonical accounting before OMS recovery"
);

assert(
  transactionsUpload.includes(
    'await userSetItem("transactionHistory", JSON.stringify(verified))'
  ),
  "canonical ledger source is the verified authoritative imported evidence set"
);


// ---------------------------------------------------------
// Separation contract
// ---------------------------------------------------------

assert(
  !recovery.includes(
    "rebuildCanonicalPortfolioLedger"
  ) &&
    !reconciliation.includes(
      "rebuildCanonicalPortfolioLedger"
    ),
  "OMS recovery cannot manufacture or directly rebuild REAL accounting evidence"
);


console.log();

if (failed) {
  console.error(
    "PC-031A23 REAL EXECUTION IDENTITY CONTINUITY FAILED"
  );
  process.exitCode = 1;
} else {
  console.log(
    "PASS: PC-031A23 REAL execution identity continuity contract."
  );
}

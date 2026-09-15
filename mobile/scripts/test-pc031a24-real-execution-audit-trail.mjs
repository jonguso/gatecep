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
  "===== PC-031A24 REAL EXECUTION AUDIT TRAIL ====="
);

const auditStore = read(
  "src/services/trade/executionAuditStore.js"
);

const executionStore = read(
  "src/services/trade/basketExecutionStore.js"
);

const recoveryService = read(
  "src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
);

const recoveryCore = read(
  "src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
);

const canonicalLedger = read(
  "src/features/trading/canonicalPortfolioLedgerService.js"
);

const auditUi = read(
  "app/execution-audit.js"
);


// ---------------------------------------------------------
// Audit schema
// ---------------------------------------------------------

for (const field of [
  "executionId",
  "orderId",
  "executionMode",
  "brokerStatus",
  "brokerId",
  "brokerAccountId",
  "brokerOrderId",
  "adapterReportedBrokerId",
  "submissionAttemptId",
  "submissionAttemptCount",
  "evidenceStatus",
  "brokerReference"
]) {
  assert(
    auditStore.includes(field),
    `execution audit schema carries ${field}`
  );
}


// ---------------------------------------------------------
// Audit remains observational / non-authoritative
// ---------------------------------------------------------

assert(
  executionStore.includes(
    "async function safeAddExecutionAuditEvent"
  ),
  "execution audit writes are best-effort and non-blocking"
);

assert(
  executionStore.includes(
    '"EXECUTION_AUDIT_WRITE_FAILED"'
  ),
  "execution audit write failures are isolated from OMS state"
);

assert(
  recoveryService.includes(
    "async function safeAddRecoveryAuditEvent"
  ),
  "recovery audit writes are best-effort and non-blocking"
);

assert(
  recoveryService.includes(
    '"REAL_RECOVERY_AUDIT_WRITE_FAILED"'
  ),
  "recovery audit failures are isolated from recovery state"
);

assert(
  !auditStore.includes("placeBrokerOrder") &&
    !auditStore.includes("updateExecutionOrder") &&
    !auditStore.includes("markExecutionOrderFilled") &&
    !auditStore.includes("rebuildCanonicalPortfolioLedger"),
  "execution audit store has no broker, OMS fill, or accounting authority"
);


// ---------------------------------------------------------
// Queue coverage
// ---------------------------------------------------------

const queuedEventMatches =
  executionStore.match(
    /eventType:\s*"REAL_ORDER_QUEUED"/g
  ) || [];

assert(
  queuedEventMatches.length === 2,
  "REAL queue auditing exists exactly once for queue-all and once for queue-single"
);

assert(
  executionStore.includes(
    "previous?.status !== ORDER_STATUS.QUEUED"
  ),
  "queue-all avoids duplicate audit for an already queued order"
);

assert(
  executionStore.includes(
    "order?.status !== ORDER_STATUS.QUEUED"
  ),
  "queue-single avoids duplicate audit for an already queued order"
);


// ---------------------------------------------------------
// REAL submission lifecycle
// ---------------------------------------------------------

for (const eventType of [
  "REAL_SUBMISSION_STARTED",
  "REAL_SUBMISSION_SAFE_FAILURE",
  "REAL_SUBMISSION_UNCERTAIN",
  "REAL_ORDER_ROUTED"
]) {
  assert(
    executionStore.includes(`"${eventType}"`),
    `REAL submission lifecycle audits ${eventType}`
  );
}

assert(
  executionStore.includes(
    "submissionAttemptId,"
  ) &&
    executionStore.includes(
      "submissionAttemptCount,"
    ),
  "REAL audit carries submission-attempt identity"
);

assert(
  executionStore.includes(
    "brokerAccountId,"
  ),
  "REAL audit carries canonical broker-account identity"
);

assert(
  executionStore.includes(
    "adapterReportedBrokerId:"
  ),
  "adapter-reported broker identity remains audit metadata"
);


// ---------------------------------------------------------
// Persist first, audit second
// ---------------------------------------------------------

const submittingPersist =
  executionStore.indexOf(
    "const submittingExecution ="
  );

const submittingAudit =
  executionStore.indexOf(
    'eventType: "REAL_SUBMISSION_STARTED"'
  );

assert(
  submittingPersist >= 0 &&
    submittingAudit > submittingPersist,
  "SUBMITTING OMS state is persisted before audit"
);

const failedPersist =
  executionStore.indexOf(
    "const failedExecution ="
  );

const safeFailureAudit =
  executionStore.indexOf(
    '"REAL_SUBMISSION_SAFE_FAILURE"'
  );

assert(
  failedPersist >= 0 &&
    safeFailureAudit > failedPersist,
  "adapter failure OMS state is persisted before audit"
);

const uncertainPersist =
  executionStore.indexOf(
    "const uncertainExecution ="
  );

const uncertainAudit =
  executionStore.indexOf(
    'eventType: "REAL_SUBMISSION_UNCERTAIN"',
    uncertainPersist
  );

assert(
  uncertainPersist >= 0 &&
    uncertainAudit > uncertainPersist,
  "uncertain adapter response is persisted before audit"
);

const routedPersist =
  executionStore.indexOf(
    "const routedExecution ="
  );

const routedAudit =
  executionStore.indexOf(
    'eventType: "REAL_ORDER_ROUTED"'
  );

assert(
  routedPersist >= 0 &&
    routedAudit > routedPersist,
  "ROUTED OMS state is persisted before audit"
);


// ---------------------------------------------------------
// Verified recovery lifecycle
// ---------------------------------------------------------

for (const eventType of [
  "REAL_RECOVERY_MATCHED",
  "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE",
  "REAL_RECOVERY_PERSISTENCE_FAILED"
]) {
  assert(
    recoveryService.includes(`"${eventType}"`),
    `REAL recovery lifecycle audits ${eventType}`
  );
}

assert(
  recoveryService.includes(
    "decision?.evidence?.brokerReference"
  ),
  "recovery audit retains genuine broker evidence reference"
);

assert(
  recoveryService.includes(
    "decision?.evidence?.evidenceStatus"
  ),
  "recovery audit retains evidence verification status"
);

assert(
  recoveryService.includes(
    "order?.submissionAttemptId"
  ),
  "recovery audit remains linked to original submission attempt"
);

assert(
  recoveryCore.includes(
    "VERIFIED_BROKER_EXECUTION"
  ),
  "REAL FILLED recovery remains evidence-derived"
);


// ---------------------------------------------------------
// Recovery persistence precedes success audit
// ---------------------------------------------------------

const recoveryPersist =
  recoveryService.indexOf(
    "await updateExecutionOrder("
  );

const recoveryMatchedAudit =
  recoveryService.indexOf(
    'eventType: "REAL_RECOVERY_MATCHED"'
  );

assert(
  recoveryPersist >= 0 &&
    recoveryMatchedAudit > recoveryPersist,
  "recovery OMS transition is attempted before successful recovery audit"
);


// ---------------------------------------------------------
// Canonical accounting remains independent
// ---------------------------------------------------------

assert(
  canonicalLedger.includes(
    ".filter(isCompletedLotExecution)"
  ) &&
    canonicalLedger.includes(
      ".filter((row) => row.canAffectRealPortfolio === true)"
    ),
  "canonical REAL accounting remains fail-closed on verified completed evidence"
);

assert(
  !canonicalLedger.includes(
    "executionAuditTrail"
  ),
  "canonical ledger never derives portfolio effects from audit records"
);

assert(
  !recoveryService.includes(
    "rebuildCanonicalPortfolioLedger"
  ),
  "recovery audit integration cannot directly rebuild canonical accounting"
);


// ---------------------------------------------------------
// Existing audit destination is reused
// ---------------------------------------------------------

assert(
  auditUi.includes(
    "<Text style={styles.title}>Execution Audit</Text>"
  ),
  "existing execution audit screen is reused"
);

assert(
  auditUi.includes(
    'value="Practice + REAL"'
  ),
  "audit UI declares Practice and REAL coverage"
);

assert(
  !auditUi.includes(
    "Practice-only local audit trail"
  ),
  "obsolete Practice-only description is removed"
);

assert(
  auditUi.includes(
    "observational only"
  ),
  "audit UI explicitly states non-authoritative behavior"
);

assert(
  auditUi.includes(
    "event.submissionAttemptId"
  ) &&
    auditUi.includes(
      "event.brokerOrderId"
    ) &&
    auditUi.includes(
      "event.brokerReference"
    ),
  "audit UI exposes submission and broker-reference provenance"
);


console.log();

if (failed) {
  console.error(
    "PC-031A24 REAL EXECUTION AUDIT TRAIL FAILED"
  );
  process.exitCode = 1;
} else {
  console.log(
    "PASS: PC-031A24 REAL execution audit trail contract."
  );
}

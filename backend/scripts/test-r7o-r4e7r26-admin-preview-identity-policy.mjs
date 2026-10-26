import assert from "node:assert/strict";

import {
  verifyAdminReconciliationEvidenceIdentity
} from "../src/modules/admin/adminReconciliationEvidenceIdentity.service.js";

function verify({
  broker = "AIB-AXYS",
  clientNumber = "137971",
  cdsNumber = "52470471",
  brokerId = null,
  clientCode = null,
  tradingAccount = null,
  fileName = "order-history-52470471.csv"
} = {}) {
  return verifyAdminReconciliationEvidenceIdentity({
    broker: {
      broker,
      clientNumber,
      cdsNumber
    },
    extraction: {
      fileType: "csv",
      identity: {
        brokerId,
        clientCode,
        tradingAccount
      }
    },
    fileName
  });
}

/*
 * 1. Matching explicit document CDS must pass even if
 *    filename contains a different numeric suffix.
 */
{
  const result = verify({
    tradingAccount: "52470471",
    fileName: "renamed-order-history-99999999.csv"
  });

  assert.equal(
    result.identityVerified,
    true
  );

  assert.equal(
    result.checks.cdsNumber.matches,
    true
  );

  assert.equal(
    result.checks.fileCdsNumber.matches,
    false
  );

  assert.equal(
    result.mismatches.includes(
      "fileCdsNumber"
    ),
    false
  );

  console.log(
    "MATCHING_DOCUMENT_CDS_OVERRIDES_FILENAME=PASS"
  );
}

/*
 * 2. Explicit mismatching document CDS must still fail.
 */
{
  const result = verify({
    tradingAccount: "99999999",
    fileName: "order-history-52470471.csv"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.equal(
    result.mismatches.includes(
      "cdsNumber"
    ),
    true
  );

  console.log(
    "MISMATCHING_DOCUMENT_CDS_REJECTED=PASS"
  );
}

/*
 * 3. If document CDS is absent, matching filename can
 *    serve as fallback corroboration.
 */
{
  const result = verify({
    tradingAccount: null,
    fileName: "order-history-52470471.csv"
  });

  assert.equal(
    result.identityVerified,
    true
  );

  assert.equal(
    result.checks.cdsNumber.present,
    false
  );

  assert.equal(
    result.checks.fileCdsNumber.matches,
    true
  );

  console.log(
    "MATCHING_FILENAME_CDS_FALLBACK=PASS"
  );
}

/*
 * 4. If document CDS is absent and filename asserts a
 *    different CDS, reject.
 */
{
  const result = verify({
    tradingAccount: null,
    fileName: "order-history-99999999.csv"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.equal(
    result.mismatches.includes(
      "fileCdsNumber"
    ),
    true
  );

  console.log(
    "MISMATCHING_FILENAME_FALLBACK_REJECTED=PASS"
  );
}

/*
 * 5. No document CDS and no filename identity must fail
 *    closed.
 */
{
  const result = verify({
    tradingAccount: null,
    fileName: "order-history.csv"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.equal(
    result.missing.includes(
      "cdsNumber"
    ),
    true
  );

  console.log(
    "NO_CDS_EVIDENCE_FAILS_CLOSED=PASS"
  );
}

/*
 * 6. Explicit client mismatch remains a rejection.
 */
{
  const result = verify({
    clientCode: "999999",
    tradingAccount: "52470471"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.equal(
    result.mismatches.includes(
      "clientNumber"
    ),
    true
  );

  console.log(
    "CLIENT_NUMBER_MISMATCH_REJECTED=PASS"
  );
}

console.log(
  "R7O_R4E7R26_IDENTITY_POLICY_TEST=PASS"
);

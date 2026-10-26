import assert from "node:assert/strict";

import {
  verifyAdminReconciliationEvidenceIdentity
} from "../src/modules/admin/adminReconciliationEvidenceIdentity.service.js";

function verify({
  persistedBroker = "AIB-AXYS",
  clientNumber = "137971",
  cdsNumber = "52470471",
  brokerId = "B12",
  clientCode = "137971",
  tradingAccount = "52470471",
  fileName = "order-history-52470471.csv"
} = {}) {
  return verifyAdminReconciliationEvidenceIdentity({
    broker: {
      broker: persistedBroker,
      clientNumber,
      cdsNumber
    },
    extraction: {
      fileType: "csv",
      reportType: "transactions",
      identity: {
        brokerId,
        clientCode,
        tradingAccount
      }
    },
    fileName
  });
}

{
  const result = verify();

  assert.equal(
    result.identityVerified,
    true,
    "B12 must resolve to selected AIB/AIB-AXYS broker."
  );

  assert.deepEqual(
    result.mismatches,
    []
  );

  console.log(
    "PASS — B12 transaction evidence matches AIB-AXYS."
  );
}

{
  const result = verify({
    brokerId: "B14"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.ok(
    result.mismatches.includes("broker")
  );

  console.log(
    "PASS — wrong broker member code fails closed."
  );
}

{
  const result = verify({
    clientCode: "999999"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.ok(
    result.mismatches.includes(
      "clientNumber"
    )
  );

  console.log(
    "PASS — wrong client account fails closed."
  );
}

{
  const result = verify({
    tradingAccount: "99999999"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.ok(
    result.mismatches.includes(
      "cdsNumber"
    )
  );

  console.log(
    "PASS — wrong CDS account fails closed."
  );
}

{
  const result = verify({
    tradingAccount: "",
    fileName:
      "order-history-52470471.csv"
  });

  assert.equal(
    result.identityVerified,
    true
  );

  console.log(
    "PASS — filename CDS remains fallback evidence."
  );
}

{
  const result = verify({
    tradingAccount: "",
    fileName:
      "order-history-99999999.csv"
  });

  assert.equal(
    result.identityVerified,
    false
  );

  assert.ok(
    result.mismatches.includes(
      "fileCdsNumber"
    )
  );

  console.log(
    "PASS — wrong fallback filename CDS fails closed."
  );
}

console.log(
  "R7O_R4E7R29A_IDENTITY_CONTRACT=PASS"
);

import assert from "node:assert/strict";

import {
  verifyAdminReconciliationEvidenceIdentity
} from "../src/modules/admin/adminReconciliationEvidenceIdentity.service.js";

let passed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${passed}: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

function verify({
  persistedBroker = "AIB-AXYS",
  persistedClient = "137971",
  persistedCds = "52470471",
  extractedBroker = "AIB",
  extractedClient = "137971",
  extractedCds = "52470471"
} = {}) {
  return verifyAdminReconciliationEvidenceIdentity({
    broker: {
      broker: persistedBroker,
      clientNumber: persistedClient,
      cdsNumber: persistedCds
    },
    extraction: {
      identity: {
        brokerId: extractedBroker,
        clientCode: extractedClient,
        tradingAccount: extractedCds,
        clientName: "TEST INVESTOR"
      }
    }
  });
}

check(
  "AIB evidence matches persisted AIB-AXYS account",
  () => {
    const result = verify();

    assert.equal(
      result.identityVerified,
      true
    );
  }
);

check(
  "broker aliases normalize to AIB",
  () => {
    const result = verify();

    assert.equal(
      result.checks.broker.expected,
      "AIB"
    );

    assert.equal(
      result.checks.broker.actual,
      "AIB"
    );

    assert.equal(
      result.checks.broker.matches,
      true
    );
  }
);

check(
  "client number matches exactly",
  () => {
    const result = verify();

    assert.equal(
      result.checks.clientNumber.matches,
      true
    );
  }
);

check(
  "CDS number matches exactly",
  () => {
    const result = verify();

    assert.equal(
      result.checks.cdsNumber.matches,
      true
    );
  }
);

check(
  "verified evidence has no missing fields",
  () => {
    assert.deepEqual(
      verify().missing,
      []
    );
  }
);

check(
  "verified evidence has no mismatches",
  () => {
    assert.deepEqual(
      verify().mismatches,
      []
    );
  }
);

check(
  "whitespace around identifiers is normalized",
  () => {
    const result = verify({
      persistedClient: " 137971 ",
      persistedCds: " 52470471 ",
      extractedClient: " 137971 ",
      extractedCds: " 52470471 "
    });

    assert.equal(
      result.identityVerified,
      true
    );
  }
);

check(
  "embedded whitespace is normalized",
  () => {
    const result = verify({
      extractedClient: "137 971",
      extractedCds: "5247 0471"
    });

    assert.equal(
      result.identityVerified,
      true
    );
  }
);

check(
  "wrong broker fails closed",
  () => {
    const result = verify({
      extractedBroker: "ABC"
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.mismatches,
      ["broker"]
    );
  }
);

check(
  "wrong client number fails closed",
  () => {
    const result = verify({
      extractedClient: "999999"
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.mismatches,
      ["clientNumber"]
    );
  }
);

check(
  "wrong CDS number fails closed",
  () => {
    const result = verify({
      extractedCds: "99999999"
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.mismatches,
      ["cdsNumber"]
    );
  }
);

check(
  "multiple mismatches are all reported",
  () => {
    const result = verify({
      extractedBroker: "ABC",
      extractedClient: "999999",
      extractedCds: "99999999"
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.mismatches,
      [
        "broker",
        "clientNumber",
        "cdsNumber"
      ]
    );
  }
);

check(
  "missing extracted broker fails closed",
  () => {
    const result = verify({
      extractedBroker: ""
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      ["broker"]
    );
  }
);

check(
  "missing extracted client fails closed",
  () => {
    const result = verify({
      extractedClient: ""
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      ["clientNumber"]
    );
  }
);

check(
  "missing extracted CDS fails closed",
  () => {
    const result = verify({
      extractedCds: ""
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      ["cdsNumber"]
    );
  }
);

check(
  "missing persisted CDS fails closed",
  () => {
    const result = verify({
      persistedCds: ""
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      ["cdsNumber"]
    );
  }
);

check(
  "missing persisted client fails closed",
  () => {
    const result = verify({
      persistedClient: ""
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      ["clientNumber"]
    );
  }
);

check(
  "missing persisted broker fails closed",
  () => {
    const result = verify({
      persistedBroker: ""
    });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      ["broker"]
    );
  }
);

check(
  "missing extraction identity fails closed",
  () => {
    const result =
      verifyAdminReconciliationEvidenceIdentity({
        broker: {
          broker: "AIB-AXYS",
          clientNumber: "137971",
          cdsNumber: "52470471"
        },
        extraction: {}
      });

    assert.equal(
      result.identityVerified,
      false
    );

    assert.deepEqual(
      result.missing,
      [
        "broker",
        "clientNumber",
        "cdsNumber"
      ]
    );
  }
);

check(
  "missing extraction object fails closed",
  () => {
    const result =
      verifyAdminReconciliationEvidenceIdentity({
        broker: {
          broker: "AIB-AXYS",
          clientNumber: "137971",
          cdsNumber: "52470471"
        }
      });

    assert.equal(
      result.identityVerified,
      false
    );
  }
);

check(
  "clientName does not control verification",
  () => {
    const result =
      verifyAdminReconciliationEvidenceIdentity({
        broker: {
          broker: "AIB-AXYS",
          clientNumber: "137971",
          cdsNumber: "52470471"
        },
        extraction: {
          identity: {
            brokerId: "AIB",
            clientCode: "137971",
            tradingAccount: "52470471",
            clientName:
              "DIFFERENT DISPLAY NAME"
          }
        }
      });

    assert.equal(
      result.identityVerified,
      true
    );
  }
);

check(
  "comparison exposes normalized expected values",
  () => {
    const result = verify();

    assert.deepEqual(
      {
        broker:
          result.checks.broker.expected,
        client:
          result.checks.clientNumber.expected,
        cds:
          result.checks.cdsNumber.expected
      },
      {
        broker: "AIB",
        client: "137971",
        cds: "52470471"
      }
    );
  }
);

check(
  "comparison exposes normalized actual values",
  () => {
    const result = verify();

    assert.deepEqual(
      {
        broker:
          result.checks.broker.actual,
        client:
          result.checks.clientNumber.actual,
        cds:
          result.checks.cdsNumber.actual
      },
      {
        broker: "AIB",
        client: "137971",
        cds: "52470471"
      }
    );
  }
);

check(
  "verification result contains only diagnostic data",
  () => {
    const result = verify();

    assert.deepEqual(
      Object.keys(result).sort(),
      [
        "checks",
        "identityVerified",
        "mismatches",
        "missing"
      ].sort()
    );
  }
);

if (process.exitCode) {
  console.error(
    `ADMIN_003D6_R8H9_FAIL=${passed}/24`
  );
  process.exit(1);
}

assert.equal(
  passed,
  24
);

console.log(
  "ADMIN_003D6_R8H9_PASS=24/24"
);

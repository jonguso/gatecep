import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routePath =
  new URL(
    "../src/modules/admin/admin.routes.js",
    import.meta.url
  );

const source =
  readFileSync(
    routePath,
    "utf8"
  );

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

const previewStart =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links/:brokerLinkId/evidence-preview"'
  );

assert.notEqual(
  previewStart,
  -1,
  "Evidence preview route was not found."
);

const contextStart =
  source.indexOf(
    '"/reconciliation-targets/:userId/broker-links/:brokerLinkId/context"',
    previewStart
  );

assert.notEqual(
  contextStart,
  -1,
  "Context route boundary was not found."
);

const preview =
  source.slice(
    previewStart,
    contextStart
  );

check(
  "preview route is POST",
  () => {
    const prefix =
      source.slice(
        Math.max(0, previewStart - 30),
        previewStart
      );

    assert.match(
      prefix,
      /router\.post\(\s*$/
    );
  }
);

check(
  "preview requires authentication",
  () => {
    assert.match(
      preview,
      /\bauthRequired\b/
    );
  }
);

check(
  "preview requires ADMIN authorization",
  () => {
    assert.match(
      preview,
      /\brequireAdmin\b/
    );
  }
);

check(
  "preview accepts exactly one file field",
  () => {
    assert.match(
      preview,
      /reconciliationEvidenceUpload\.single\("file"\)/
    );
  }
);

check(
  "preview revalidates target and broker server-side",
  () => {
    assert.match(
      preview,
      /getAdminReconciliationBroker\s*\(/
    );
  }
);

check(
  "target identity comes from route userId",
  () => {
    assert.match(
      preview,
      /targetUserId\s*:\s*req\.params\.userId/
    );
  }
);

check(
  "broker identity comes from route brokerLinkId",
  () => {
    assert.match(
      preview,
      /brokerLinkId\s*:\s*req\.params\.brokerLinkId/
    );
  }
);

check(
  "missing evidence is rejected",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_REQUIRED/
    );
  }
);

check(
  "non-PDF evidence is rejected",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_TYPE_UNSUPPORTED/
    );
  }
);

check(
  "preview invokes canonical PDF parser",
  () => {
    assert.match(
      preview,
      /extractBrokerPdf\s*\(/
    );
  }
);

check(
  "parser receives uploaded in-memory buffer",
  () => {
    assert.match(
      preview,
      /req\.file\.buffer/
    );
  }
);

check(
  "parser receives requested report type",
  () => {
    assert.match(
      preview,
      /requestedReportType/
    );
  }
);

check(
  "response explicitly declares preview-only",
  () => {
    assert.match(
      preview,
      /previewOnly\s*:\s*true/
    );
  }
);

check(
  "response returns server-validated target",
  () => {
    assert.match(
      preview,
      /target\s*:\s*context\.target/
    );
  }
);

check(
  "response returns server-validated broker",
  () => {
    assert.match(
      preview,
      /broker\s*:\s*context\.broker/
    );
  }
);

check(
  "response returns server-derived account key",
  () => {
    assert.match(
      preview,
      /context\.brokerAccountKey/
    );
  }
);

check(
  "response returns extraction separately",
  () => {
    assert.match(
      preview,
      /\bextraction\b/
    );
  }
);

check(
  "5 MB upload limit exists",
  () => {
    assert.match(
      source,
      /fileSize\s*:\s*5\s*\*\s*1024\s*\*\s*1024/
    );
  }
);

check(
  "oversized evidence has stable error code",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_TOO_LARGE/
    );
  }
);

check(
  "extraction failure has stable error code",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_EXTRACTION_FAILED/
    );
  }
);

check(
  "preview does not save broker mirror",
  () => {
    assert.doesNotMatch(
      preview,
      /saveBrokerMirror/
    );
  }
);

check(
  "preview does not replace authoritative portfolio",
  () => {
    assert.doesNotMatch(
      preview,
      /replaceAuthoritative|replaceUserPortfolio/
    );
  }
);

check(
  "preview does not write investor local storage",
  () => {
    assert.doesNotMatch(
      preview,
      /userSetItem|userGetItem/
    );
  }
);

check(
  "preview does not trust body broker identity",
  () => {
    assert.doesNotMatch(
      preview,
      /req\.body\.(broker|clientNumber|cdsNumber|brokerLinkId|targetUserId)/
    );
  }
);

check(
  "preview does not claim identity verification",
  () => {
    assert.doesNotMatch(
      preview,
      /identityVerified\s*:\s*true/
    );
  }
);

check(
  "preview contains no SQL mutation",
  () => {
    assert.doesNotMatch(
      preview,
      /\b(?:INSERT|UPDATE|DELETE)\b/i
    );
  }
);

if (process.exitCode) {
  console.error(
    `ADMIN_003D6_R8H5_FAIL=${passed}/26`
  );
  process.exit(1);
}

assert.equal(
  passed,
  26
);

console.log(
  "ADMIN_003D6_R8H5_PASS=26/26"
);

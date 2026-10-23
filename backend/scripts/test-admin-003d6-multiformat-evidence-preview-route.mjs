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
  "multiformat extractor is imported",
  () => {
    assert.match(
      source,
      /extractAdminReconciliationEvidence/
    );

    assert.match(
      source,
      /adminReconciliationEvidenceExtraction\.service\.js/
    );
  }
);

check(
  "Admin route no longer directly imports PDF extractor",
  () => {
    assert.doesNotMatch(
      source,
      /brokerPdfExtraction\.service\.js/
    );
  }
);

check(
  "preview route remains POST",
  () => {
    const prefix =
      source.slice(
        Math.max(
          0,
          previewStart - 30
        ),
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
  "preview uses controlled single-file upload wrapper",
  () => {
    assert.match(
      preview,
      /\breconciliationEvidenceUploadSingle\b/
    );
  }
);

check(
  "upload wrapper accepts exactly file field",
  () => {
    assert.match(
      source,
      /reconciliationEvidenceUpload\.single\("file"\)/
    );
  }
);

check(
  "upload remains memory-backed",
  () => {
    assert.match(
      source,
      /storage\s*:\s*multer\.memoryStorage\(\)/
    );
  }
);

check(
  "upload remains limited to 5 MB",
  () => {
    assert.match(
      source,
      /fileSize\s*:\s*5\s*\*\s*1024\s*\*\s*1024/
    );
  }
);

check(
  "oversized upload remains typed",
  () => {
    assert.match(
      source,
      /RECONCILIATION_EVIDENCE_TOO_LARGE/
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
  "target comes only from route userId",
  () => {
    assert.match(
      preview,
      /targetUserId\s*:\s*[\r\n\s]*req\.params\.userId/
    );
  }
);

check(
  "broker link comes only from route brokerLinkId",
  () => {
    assert.match(
      preview,
      /brokerLinkId\s*:\s*[\r\n\s]*req\.params\.brokerLinkId/
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
  "original server filename is retained",
  () => {
    assert.match(
      preview,
      /req\.file\.originalname/
    );
  }
);

check(
  "route permits valuation report type",
  () => {
    assert.match(
      preview,
      /requestedReportType\s*!==\s*"valuation"/
    );
  }
);

check(
  "route permits cash report type",
  () => {
    assert.match(
      preview,
      /requestedReportType\s*!==\s*"cash"/
    );
  }
);

check(
  "other report types are rejected before extraction",
  () => {
    const reportGateIndex =
      preview.indexOf(
        'requestedReportType !== "valuation"'
      );

    const extractionIndex =
      preview.indexOf(
        "const extraction ="
      );

    assert.ok(
      reportGateIndex >= 0
    );

    assert.ok(
      extractionIndex >
        reportGateIndex
    );

    assert.match(
      preview,
      /RECONCILIATION_REPORT_TYPE_UNSUPPORTED/
    );
  }
);

check(
  "transaction history is not admitted to portfolio receipt path",
  () => {
    assert.doesNotMatch(
      preview,
      /requestedReportType\s*===\s*"transactions"/
    );

    assert.match(
      preview,
      /Admin portfolio preview currently accepts valuation or cash evidence\./
    );
  }
);

check(
  "preview invokes server multiformat extractor",
  () => {
    assert.match(
      preview,
      /extractAdminReconciliationEvidence\s*\(\s*\{/
    );
  }
);

check(
  "extractor receives uploaded in-memory buffer",
  () => {
    assert.match(
      preview,
      /buffer\s*:\s*[\r\n\s]*req\.file\.buffer/
    );
  }
);

check(
  "extractor receives original filename",
  () => {
    assert.match(
      preview,
      /fileName\s*:\s*[\r\n\s]*originalName/
    );
  }
);

check(
  "extractor receives upload MIME type",
  () => {
    assert.match(
      preview,
      /mimeType\s*:\s*[\r\n\s]*req\.file\.mimetype/
    );
  }
);

check(
  "extractor receives requested report type",
  () => {
    assert.match(
      preview,
      /reportType\s*:\s*[\r\n\s]*requestedReportType/
    );
  }
);

check(
  "identity verification occurs after extraction",
  () => {
    const extractionIndex =
      preview.indexOf(
        "const extraction ="
      );

    const verificationIndex =
      preview.indexOf(
        "const identityVerification ="
      );

    assert.ok(
      extractionIndex >= 0
    );

    assert.ok(
      verificationIndex >
        extractionIndex
    );
  }
);

check(
  "identity verifier receives persisted broker context",
  () => {
    assert.match(
      preview,
      /broker\s*:\s*context\.broker/
    );
  }
);

check(
  "identity verifier receives extraction",
  () => {
    assert.match(
      preview,
      /verifyAdminReconciliationEvidenceIdentity\s*\(\s*\{[\s\S]*?\bextraction\b/
    );
  }
);

check(
  "identity verifier receives original filename",
  () => {
    const verifierStart =
      preview.indexOf(
        "verifyAdminReconciliationEvidenceIdentity"
      );

    const receiptStart =
      preview.indexOf(
        "let evidenceReceipt"
      );

    assert.ok(
      verifierStart >= 0 &&
      receiptStart > verifierStart
    );

    const verifierBlock =
      preview.slice(
        verifierStart,
        receiptStart
      );

    assert.match(
      verifierBlock,
      /fileName\s*:\s*[\r\n\s]*originalName/
    );
  }
);

check(
  "receipt creation requires verified identity",
  () => {
    const conditionIndex =
      preview.indexOf(
        "identityVerification?.identityVerified === true"
      );

    const receiptIndex =
      preview.indexOf(
        "createVerifiedAdminReconciliationEvidenceReceipt"
      );

    assert.ok(
      conditionIndex >= 0
    );

    assert.ok(
      receiptIndex >
        conditionIndex
    );
  }
);

check(
  "receipt binds authenticated Admin actor",
  () => {
    assert.match(
      preview,
      /actorUserId\s*:\s*[\r\n\s]*req\.user\.id/
    );
  }
);

check(
  "receipt binds server-validated target",
  () => {
    assert.match(
      preview,
      /targetUserId\s*:\s*[\r\n\s]*context\.target\.id/
    );
  }
);

check(
  "receipt binds selected broker link",
  () => {
    assert.match(
      preview,
      /brokerLinkId\s*:\s*[\r\n\s]*req\.params\.brokerLinkId/
    );
  }
);

check(
  "receipt binds server-derived broker account key",
  () => {
    assert.match(
      preview,
      /brokerAccountKey\s*:\s*[\r\n\s]*context\.brokerAccountKey/
    );
  }
);

check(
  "receipt stores server-owned uploaded bytes",
  () => {
    assert.match(
      preview,
      /fileBuffer\s*:\s*[\r\n\s]*req\.file\.buffer/
    );
  }
);

check(
  "receipt stores server extraction",
  () => {
    assert.match(
      preview,
      /fileBuffer\s*:[\s\S]*?\bextraction\s*,/
    );
  }
);

check(
  "receipt stores identity verification",
  () => {
    assert.match(
      preview,
      /identityVerification\s*[\r\n\s]*\}\s*\)/
    );
  }
);

check(
  "response remains explicitly preview-only",
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
      /brokerAccountKey\s*:\s*[\r\n\s]*context\.brokerAccountKey/
    );
  }
);

check(
  "response returns server extraction",
  () => {
    assert.match(
      preview,
      /\bextraction\s*,/
    );
  }
);

check(
  "response returns identity verification",
  () => {
    assert.match(
      preview,
      /\bidentityVerification\s*,/
    );
  }
);

check(
  "response exposes only receipt id report type and expiry",
  () => {
    assert.match(
      preview,
      /evidenceReceipt\s*:[\s\S]*?id\s*:[\s\S]*?evidenceReceipt\.id[\s\S]*?reportType\s*:[\s\S]*?evidenceReceipt\.reportType[\s\S]*?expiresAt\s*:[\s\S]*?evidenceReceipt\.expiresAt/
    );
  }
);

check(
  "route does not fabricate successful identity",
  () => {
    assert.doesNotMatch(
      preview,
      /identityVerified\s*:\s*true/
    );
  }
);

check(
  "route does not trust body broker identity",
  () => {
    assert.doesNotMatch(
      preview,
      /req\.body\.(broker|clientNumber|cdsNumber|brokerLinkId|targetUserId)/
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
  "preview does not use investor local storage",
  () => {
    assert.doesNotMatch(
      preview,
      /userSetItem|userGetItem/
    );
  }
);

check(
  "preview contains no direct SQL mutation",
  () => {
    assert.doesNotMatch(
      preview,
      /\b(?:INSERT|UPDATE|DELETE)\b/i
    );
  }
);

check(
  "typed extractor errors are preserved",
  () => {
    assert.match(
      preview,
      /Number\.isInteger\(error\?\.status\)/
    );

    assert.match(
      preview,
      /error\.code\s*\|\|\s*[\r\n\s]*"RECONCILIATION_EVIDENCE_REJECTED"/
    );
  }
);

check(
  "unexpected extraction failures remain typed",
  () => {
    assert.match(
      preview,
      /RECONCILIATION_EVIDENCE_EXTRACTION_FAILED/
    );
  }
);

if (process.exitCode) {
  console.error(
    `ADMIN_003D6_R8J5C7D4H3I3C3B_FAIL=${passed}/51`
  );
  process.exit(1);
}

assert.equal(
  passed,
  51,
  "Expected exactly 51 multiformat preview route checks"
);

console.log();
console.log(
  `ADMIN_003D6_R8J5C7D4H3I3C3B_PASS=${passed}/51`
);

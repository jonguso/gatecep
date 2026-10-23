import fs from "node:fs";

const routePath =
  "backend/src/modules/fundamental-evidence/fundamentalEvidence.routes.js";

const servicePath =
  "backend/src/modules/fundamental-evidence/issuerFinancialEvidencePreview.service.js";

const route =
  fs.readFileSync(
    routePath,
    "utf8"
  );

const service =
  fs.readFileSync(
    servicePath,
    "utf8"
  );

let failures = 0;

function check(name, condition) {
  const pass = Boolean(condition);

  console.log(
    name + "=" +
      (pass ? "PASS" : "FAIL")
  );

  if (!pass) {
    failures += 1;
  }
}

console.log(
  "===== ROUTE CONTRACT ====="
);

check(
  "UPLOAD_ROUTE_EXISTS",
  route.includes(
    '"/issuer-document/upload-preview"'
  )
);

check(
  "AUTH_REQUIRED",
  /"\/issuer-document\/upload-preview"[\s\S]*?authRequired/.test(
    route
  )
);

check(
  "MEMORY_ONLY",
  /issuerDocumentUpload\s*=\s*multer\(\{[\s\S]*?multer\.memoryStorage\(\)/.test(
    route
  )
);

check(
  "SIZE_LIMIT_20MB",
  /fileSize:\s*20\s*\*\s*1024\s*\*\s*1024/.test(
    route
  )
);

check(
  "SINGLE_FILE_FIELD",
  /issuerDocumentUpload\.single\("file"\)/.test(
    route
  )
);

check(
  "SYMBOL_REQUIRED",
  route.includes(
    "A security symbol is required."
  )
);

check(
  "FILE_REQUIRED",
  route.includes(
    "An issuer or regulator PDF is required."
  )
);

check(
  "PDF_SIGNATURE_REQUIRED",
  route.includes(
    'toString("ascii") === "%PDF-"'
  )
);

check(
  "INVALID_PDF_415",
  /!pdfBySignature[\s\S]*?status\(415\)/.test(
    route
  )
);

check(
  "BUFFER_SERVICE_USED",
  /previewIssuerFinancialEvidenceFromBuffer\(\{[\s\S]*?documentBuffer:\s*req\.file\.buffer/.test(
    route
  )
);

check(
  "LOCAL_UPLOAD_PROVENANCE",
  route.includes(
    'retrievalMethod: "LOCAL_PDF_UPLOAD"'
  )
);

console.log(
  "===== SAFE PREVIEW CONTRACT ====="
);

check(
  "ROUTE_PERSISTENCE_NONE",
  route.includes(
    'persistence: "NONE"'
  )
);

check(
  "ROUTE_UNVERIFIED",
  route.includes(
    "verifiedFiling: false"
  ) &&
  route.includes(
    "verified: false"
  )
);

check(
  "ROUTE_NON_AUTHORITATIVE",
  route.includes(
    "authoritative: false"
  )
);

check(
  "SERVICE_FORCES_PERSISTENCE_NONE",
  /previewRetrieval\s*=\s*\{[\s\S]*?persistence:\s*"NONE"/.test(
    service
  )
);

check(
  "SERVICE_FORCES_UNVERIFIED",
  /previewRetrieval\s*=\s*\{[\s\S]*?verifiedFiling:\s*false[\s\S]*?verified:\s*false/.test(
    service
  )
);

check(
  "SERVICE_FORCES_NON_AUTHORITATIVE",
  /previewRetrieval\s*=\s*\{[\s\S]*?authoritative:\s*false/.test(
    service
  )
);

check(
  "SERVICE_CHECKS_IDENTITY_BOUNDARY",
  service.includes(
    "Issuer document identity inspection violated the preview-only evidence contract."
  )
);

check(
  "SERVICE_CHECKS_EXTRACTION_BOUNDARY",
  service.includes(
    "Issuer financial extraction violated the preview-only evidence contract."
  )
);

console.log(
  "===== NEGATIVE BOUNDARY ====="
);

const middlewareBeforeHandler =
  /issuerDocumentUpload\.single\("file"\),[\s\S]*?async \(req, res\) => \{/.test(
    route
  );

check(
  "MULTER_PRECEDES_HANDLER",
  middlewareBeforeHandler
);

if (middlewareBeforeHandler) {
  console.log(
    "OVERSIZE_JSON_ENVELOPE=NOT_GUARANTEED"
  );

  console.log(
    "OVERSIZE_OBSERVATION=Multer size rejection occurs before route try/catch"
  );
}

console.log(
  "===== MUTATION GUARD ====="
);

const routeStart =
  route.indexOf(
    '"/issuer-document/upload-preview"'
  );

const routeEnd =
  route.indexOf(
    "export default router;",
    routeStart
  );

const uploadRoute =
  routeStart >= 0 &&
  routeEnd > routeStart
    ? route.slice(
        routeStart,
        routeEnd
      )
    : "";

const forbidden = [
  "createFiling",
  "submitExtractionWorkspaceToFilings",
  "promoteApprovedVerifiedFiling",
  "saveFundamental",
  "saveFundamentals",
  "fundamentalRepository",
  "portfolio",
  "order",
  "cash"
];

for (const token of forbidden) {
  check(
    "NO_" +
      token
        .replace(/[^a-z0-9]/gi, "_")
        .toUpperCase(),
    !uploadRoute.includes(token)
  );
}

console.log(
  "CONTRACT_FAILURES=" +
    failures
);

if (failures) {
  process.exitCode = 1;
}

import assert from "node:assert/strict";

import {
  normalizeIssuerDocumentCandidates,
  qualifyDiscoveredCandidateMetadata
} from "../src/modules/fundamental-evidence/apifyIssuerDocumentDiscovery.adapter.js";

import {
  validateIssuerDocumentUrl
} from "../src/modules/fundamental-evidence/issuerDocumentUrlPolicy.js";

console.log(
  "===== FUND-010F13G — CMA CANDIDATE PREFILTER REGRESSION ====="
);

const rows = [
  {
    url:
      "https://annualreport.cma.or.ke/media/BANKING/Kenya%20Commercial%20Bank/documents/2021_HLT0cUC.pdf"
  },
  {
    url:
      "https://annualreport.cma.or.ke/media/BANKING/Kenya%20Commercial%20Bank/documents/2025.pdf"
  },
  {
    url:
      "https://annualreport.cma.or.ke/media/MANUFACTURING%20AND%20ALLIED/British%20American%20Tobacco%20Kenya/documents/2022.pdf"
  }
];

const candidates =
  normalizeIssuerDocumentCandidates({
    symbol: "KCB",
    fiscalYear: 2025,
    rows
  });

assert.equal(
  candidates.length,
  1
);

assert.equal(
  candidates[0].url,
  rows[1].url
);

assert.equal(
  candidates[0]
    .metadataQualification,
  "CMA_IDENTITY_YEAR_MATCH"
);

assert.equal(
  candidates[0]
    .discoveryMetadata
    .issuerPathName,
  "Kenya Commercial Bank"
);

assert.equal(
  candidates[0]
    .discoveryMetadata
    .fiscalYear,
  2025
);

console.log(
  "PASS — real F13E KCB/CMA result set reduces 3 candidates to exact FY2025 filing."
);

const kcbSource =
  validateIssuerDocumentUrl({
    symbol: "KCB",
    url: rows[1].url
  });

assert.equal(
  kcbSource.ok,
  true
);

const unresolvedYear =
  qualifyDiscoveredCandidateMetadata({
    security: {
      symbol: "KCB",
      name: "KCB Group"
    },
    url:
      "https://annualreport.cma.or.ke/media/BANKING/KCB%20Group/documents/annual_report_final.pdf",
    source:
      kcbSource.source,
    fiscalYear: 2025
  });

assert.equal(
  unresolvedYear.ok,
  true
);

assert.equal(
  unresolvedYear
    .metadataQualification,
  "CMA_IDENTITY_MATCH_YEAR_UNRESOLVED"
);

console.log(
  "PASS — unresolved CMA filename year remains discoverable for later PDF identity inspection."
);

const issuerCandidate =
  normalizeIssuerDocumentCandidates({
    symbol: "SCOM",
    fiscalYear: 2025,
    rows: [
      {
        url:
          "https://www.safaricom.co.ke/investor-relations/opaque-final-report.pdf"
      }
    ]
  });

assert.equal(
  issuerCandidate.length,
  1
);

assert.equal(
  issuerCandidate[0]
    .metadataQualification,
  "NOT_CMA_STRUCTURED_PATH"
);

console.log(
  "PASS — issuer fallback with opaque filename is not subjected to CMA path rules."
);

console.log(
  "PASS — FUND-010F13G CMA candidate prefilter contract."
);

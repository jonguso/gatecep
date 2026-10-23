import assert from "node:assert/strict";

import {
  normalizeIssuerDocumentCandidates,
  qualifyDiscoveredCandidateMetadata
} from "../src/modules/fundamental-evidence/apifyIssuerDocumentDiscovery.adapter.js";

import {
  getSecurityBySymbol
} from "../src/data/nseSecurityMaster.js";

console.log(
  "===== FUND-010F13J — EXACT CMA ISSUER + YEAR REGRESSION ====="
);

const KCB_2021 =
  "https://annualreport.cma.or.ke/media/BANKING/Kenya%20Commercial%20Bank/documents/2021_HLT0cUC.pdf";

const KCB_2025 =
  "https://annualreport.cma.or.ke/media/BANKING/Kenya%20Commercial%20Bank/documents/2025.pdf";

const BAT_2022 =
  "https://annualreport.cma.or.ke/media/MANUFACTURING%20AND%20ALLIED/British%20American%20Tobacco%20Kenya/documents/2022.pdf";

const kcbCandidates =
  normalizeIssuerDocumentCandidates({
    symbol: "KCB",
    fiscalYear: 2025,
    rows: [
      { url: KCB_2021 },
      { url: KCB_2025 },
      { url: BAT_2022 }
    ]
  });

assert.equal(
  kcbCandidates.length,
  1
);

assert.equal(
  kcbCandidates[0].url,
  KCB_2025
);

assert.equal(
  kcbCandidates[0]
    .metadataQualification,
  "CMA_IDENTITY_YEAR_MATCH"
);

assert.equal(
  kcbCandidates[0]
    .discoveryMetadata
    .issuerPathName,
  "Kenya Commercial Bank"
);

assert.equal(
  kcbCandidates[0]
    .discoveryMetadata
    .fiscalYear,
  2025
);

console.log(
  "PASS — real F13E KCB set reduces 3 -> exact KCB FY2025 candidate."
);

const kcbSecurity =
  getSecurityBySymbol("KCB");

const wrongYear =
  qualifyDiscoveredCandidateMetadata({
    security: kcbSecurity,
    url: KCB_2021,
    source: {
      sourceType: "REGULATOR",
      host: "annualreport.cma.or.ke"
    },
    fiscalYear: 2025
  });

assert.equal(
  wrongYear.ok,
  false
);

assert.equal(
  wrongYear.metadataQualification,
  "CMA_FISCAL_YEAR_MISMATCH"
);

console.log(
  "PASS — correct CMA issuer with explicit wrong year is rejected."
);

const wrongIssuer =
  qualifyDiscoveredCandidateMetadata({
    security: kcbSecurity,
    url: BAT_2022,
    source: {
      sourceType: "REGULATOR",
      host: "annualreport.cma.or.ke"
    },
    fiscalYear: 2025
  });

assert.equal(
  wrongIssuer.ok,
  false
);

assert.equal(
  wrongIssuer.metadataQualification,
  "CMA_ISSUER_PATH_MISMATCH"
);

console.log(
  "PASS — wrong CMA issuer is rejected before retrieval."
);

const EQT_2025 =
  "https://annualreport.cma.or.ke/media/BANKING/Equity%20Bank/documents/2025_O8urC5F.pdf";

const eqtCandidates =
  normalizeIssuerDocumentCandidates({
    symbol: "EQT",
    fiscalYear: 2025,
    rows: [
      { url: EQT_2025 }
    ]
  });

assert.equal(
  eqtCandidates.length,
  1
);

assert.equal(
  eqtCandidates[0]
    .discoveryMetadata
    .fiscalYear,
  2025
);

console.log(
  "PASS — Equity CMA suffix filename resolves FY2025."
);

const COOP_2025 =
  "https://annualreport.cma.or.ke/media/BANKING/Co-operative%20Bank%20of%20Kenya/documents/2025.pdf";

const coopCandidates =
  normalizeIssuerDocumentCandidates({
    symbol: "COOP",
    fiscalYear: 2025,
    rows: [
      { url: COOP_2025 }
    ]
  });

assert.equal(
  coopCandidates.length,
  1
);

console.log(
  "PASS — Co-operative Bank CMA identity resolves exactly."
);

const unresolvedYear =
  qualifyDiscoveredCandidateMetadata({
    security: kcbSecurity,
    url:
      "https://annualreport.cma.or.ke/media/BANKING/Kenya%20Commercial%20Bank/documents/annual_report_final.pdf",
    source: {
      sourceType: "REGULATOR",
      host: "annualreport.cma.or.ke"
    },
    fiscalYear: 2025
  });

assert.equal(
  unresolvedYear.ok,
  true
);

assert.equal(
  unresolvedYear.metadataQualification,
  "CMA_IDENTITY_MATCH_YEAR_UNRESOLVED"
);

console.log(
  "PASS — matching CMA issuer with unresolved filename year remains eligible for deep PDF identity validation."
);

console.log(
  "PASS — FUND-010F13J exact CMA issuer/year contract."
);

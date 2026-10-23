import assert from "node:assert/strict";

import {
  discoverIssuerFinancialDocuments
} from "../src/modules/fundamental-evidence/apifyIssuerDocumentDiscovery.adapter.js";

console.log(
  "===== FUND-010F13D — CMA PRIMARY EXECUTION REGRESSION ====="
);

/*
 * Discovery configuration requires a token before the injected
 * client is called. This is a synthetic test value only.
 */
process.env.APIFY_API_TOKEN =
  "TEST_ONLY_NOT_A_REAL_TOKEN";

function mockClient(responses) {
  const calls = [];

  return {
    calls,

    async post(url, body, config) {
      calls.push({
        url,
        body,
        config
      });

      const response =
        responses[calls.length - 1];

      if (!response) {
        throw new Error(
          "Unexpected mock provider call."
        );
      }

      return {
        data: response
      };
    }
  };
}

/* ---------------------------------------------------------- */
/* SCOM: CMA success must short-circuit issuer fallback.       */
/* ---------------------------------------------------------- */

const scomPrimary =
  mockClient([
    [
      {
        title:
          "Safaricom annual report from CMA",
        url:
          "https://annualreport.cma.or.ke/media/TELECOMMUNICATIONS/Safaricom%20Plc/documents/2025.pdf"
      }
    ]
  ]);

const scomPrimaryResult =
  await discoverIssuerFinancialDocuments({
    symbol: "SCOM",
    fiscalYear: 2025,
    httpClient: scomPrimary
  });

assert.equal(
  scomPrimary.calls.length,
  1
);

assert.match(
  scomPrimary.calls[0].body.query,
  /site:annualreport\.cma\.or\.ke/i
);

assert.doesNotMatch(
  scomPrimary.calls[0].body.query,
  /site:safaricom\.co\.ke/i
);

assert.equal(
  scomPrimaryResult.acquisitionRole,
  "PRIMARY"
);

assert.equal(
  scomPrimaryResult.qualifiedCandidates.length,
  1
);

assert.equal(
  scomPrimaryResult.qualifiedCandidates[0]
    .source.sourceType,
  "REGULATOR"
);

console.log(
  "PASS — CMA success short-circuits SCOM issuer fallback."
);

/* ---------------------------------------------------------- */
/* SCOM: CMA miss must invoke issuer fallback.                 */
/* ---------------------------------------------------------- */

const scomFallback =
  mockClient([
    [],
    [
      {
        title:
          "Safaricom issuer annual report",
        url:
          "https://www.safaricom.co.ke/investor-relations/fy2025.pdf"
      }
    ]
  ]);

const scomFallbackResult =
  await discoverIssuerFinancialDocuments({
    symbol: "SCOM",
    fiscalYear: 2025,
    httpClient: scomFallback
  });

assert.equal(
  scomFallback.calls.length,
  2
);

assert.match(
  scomFallback.calls[0].body.query,
  /site:annualreport\.cma\.or\.ke/i
);

assert.doesNotMatch(
  scomFallback.calls[0].body.query,
  /site:safaricom\.co\.ke/i
);

assert.match(
  scomFallback.calls[1].body.query,
  /site:safaricom\.co\.ke/i
);

assert.doesNotMatch(
  scomFallback.calls[1].body.query,
  /site:annualreport\.cma\.or\.ke/i
);

assert.equal(
  scomFallbackResult.acquisitionRole,
  "FALLBACK"
);

assert.equal(
  scomFallbackResult.qualifiedCandidates.length,
  1
);

assert.equal(
  scomFallbackResult.qualifiedCandidates[0]
    .source.sourceType,
  "ISSUER"
);

console.log(
  "PASS — CMA miss triggers SCOM issuer fallback."
);

/* ---------------------------------------------------------- */
/* KCB: no issuer fallback is configured.                      */
/* ---------------------------------------------------------- */

const kcbMiss =
  mockClient([
    []
  ]);

const kcbMissResult =
  await discoverIssuerFinancialDocuments({
    symbol: "KCB",
    fiscalYear: 2025,
    httpClient: kcbMiss
  });

assert.equal(
  kcbMiss.calls.length,
  1
);

assert.match(
  kcbMiss.calls[0].body.query,
  /site:annualreport\.cma\.or\.ke/i
);

assert.equal(
  kcbMissResult.acquisitionRole,
  null
);

assert.equal(
  kcbMissResult.qualifiedCandidates.length,
  0
);

assert.equal(
  kcbMissResult.attempts.length,
  1
);

assert.equal(
  kcbMissResult.attempts[0].acquisitionRole,
  "PRIMARY"
);

console.log(
  "PASS — KCB CMA miss stops without invented issuer fallback."
);

/* ---------------------------------------------------------- */
/* CMA rows from an unrelated host must not suppress fallback. */
/* ---------------------------------------------------------- */

const unqualifiedPrimary =
  mockClient([
    [
      {
        title: "Search noise",
        url:
          "https://example.com/safaricom-2025.pdf"
      }
    ],
    [
      {
        title:
          "Qualified Safaricom issuer report",
        url:
          "https://www.safaricom.co.ke/investor-relations/fy2025.pdf"
      }
    ]
  ]);

const unqualifiedPrimaryResult =
  await discoverIssuerFinancialDocuments({
    symbol: "SCOM",
    fiscalYear: 2025,
    httpClient: unqualifiedPrimary
  });

assert.equal(
  unqualifiedPrimary.calls.length,
  2
);

assert.equal(
  unqualifiedPrimaryResult.acquisitionRole,
  "FALLBACK"
);

assert.equal(
  unqualifiedPrimaryResult.attempts[0]
    .candidateCount,
  1
);

assert.equal(
  unqualifiedPrimaryResult.attempts[0]
    .qualifiedCandidateCount,
  0
);

console.log(
  "PASS — unqualified CMA-search noise does not block issuer fallback."
);

console.log(
  "PASS — FUND-010F13D CMA-first execution contract."
);

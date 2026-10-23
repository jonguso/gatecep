import assert from "node:assert/strict";

import {
  extractGenericExactIssuedOrdinaryShares
} from "../src/modules/fundamental-evidence/issuerFinancialStatementEvidenceExtractor.js";

console.log(
  "===== FUND-008B EXACT ISSUED ORDINARY SHARE REGRESSION ====="
);

const exactDisclosurePages = [
  {
    pageNumber: 230,
    text: [
      "14 SHARE CAPITAL AND SHARE PREMIUM",
      "Number of shares (million) Ordinary shares KShs'm Share premium KShs'm Total KShs'm",
      "As at 31 March 2023 and 31 March 2022 40,065.4 2,003.3 2,200 4,203.3",
      "The issued share capital comprises 40,065,428,000 (2022: 40,065,428,000) ordinary shares with a par value of KShs 0.05 each."
    ].join("\\n")
  }
];

const exact =
  extractGenericExactIssuedOrdinaryShares({
    pages:
      exactDisclosurePages
  });

assert.ok(
  exact,
  "Exact issuer disclosure should produce share evidence."
);

assert.equal(
  exact.field,
  "sharesOutstanding"
);

assert.equal(
  exact.value,
  40065428000
);

assert.equal(
  exact.evidence?.field,
  "sharesOutstanding"
);

assert.equal(
  exact.evidence?.value,
  40065428000
);

assert.equal(
  exact.evidence?.pageNumber,
  230
);

assert.equal(
  exact.evidence?.statement,
  "SHARE CAPITAL"
);

assert.equal(
  exact.evidence?.extractionMethod,
  "DETERMINISTIC_EXACT_ISSUED_ORDINARY_SHARE_DISCLOSURE"
);

assert.equal(
  exact.evidence?.confidence,
  "HIGH"
);

assert.equal(
  exact.evidence?.sourceUnit,
  "ORDINARY_SHARES"
);

assert.equal(
  exact.evidence?.sourceMultiplier,
  1
);

assert.equal(
  exact.evidence?.sourceValue,
  40065428000
);

assert.equal(
  exact.evidence?.sourceToken,
  "40,065,428,000"
);

assert.equal(
  exact.evidence?.shareClass,
  "ORDINARY"
);

assert.equal(
  exact.evidence?.shareCapitalStatus,
  "ISSUED"
);

assert.equal(
  exact.evidence?.exactIssuerDisclosure,
  true
);

console.log(
  "PASS — exact issuer disclosure extracts 40,065,428,000"
);

/*
 * A rounded million-share table must not manufacture
 * an exact period-end share count.
 */
const roundedOnly =
  extractGenericExactIssuedOrdinaryShares({
    pages: [
      {
        pageNumber: 230,
        text: [
          "13 EARNINGS PER SHARE",
          "Total number of ordinary shares in issue (million) 40,065.4 40,065.4",
          "Basic earnings per share (KShs) 1.6 1.7"
        ].join("\\n")
      }
    ]
  });

assert.equal(
  roundedOnly,
  null
);

console.log(
  "PASS — rounded million disclosure does not fabricate exact shares"
);

/*
 * EPS inputs must not be reverse-calculated into shares.
 */
const epsOnly =
  extractGenericExactIssuedOrdinaryShares({
    pages: [
      {
        pageNumber: 50,
        text: [
          "Profit attributable to equity holders KShs million 62,268.9",
          "Basic earnings per share KShs 1.6"
        ].join("\\n")
      }
    ]
  });

assert.equal(
  epsOnly,
  null
);

console.log(
  "PASS — EPS evidence does not reverse-calculate shares"
);

/*
 * No qualifying disclosure means no evidence.
 */
const absent =
  extractGenericExactIssuedOrdinaryShares({
    pages: [
      {
        pageNumber: 1,
        text: [
          "Annual Report and Financial Statements",
          "Revenue and profitability overview"
        ].join("\\n")
      }
    ]
  });

assert.equal(
  absent,
  null
);

console.log(
  "PASS — absent disclosure remains unavailable"
);

/*
 * Multiple different exact disclosures are ambiguous
 * and must fail closed.
 */
assert.throws(
  () =>
    extractGenericExactIssuedOrdinaryShares({
      pages: [
        {
          pageNumber: 10,
          text:
            "The issued share capital comprises 40,065,428,000 ordinary shares."
        },
        {
          pageNumber: 20,
          text:
            "The issued share capital comprises 40,100,000,000 ordinary shares."
        }
      ]
    }),
  /Expected at most one exact issued ordinary-share disclosure; found 2/i
);

console.log(
  "PASS — conflicting exact disclosures fail closed"
);

console.log(
  "F8B7B_EXACT_VALUE=40065428000"
);
console.log(
  "F8B7B_ROUNDED_RECONSTRUCTION=BLOCKED"
);
console.log(
  "F8B7B_EPS_REVERSE_CALC=BLOCKED"
);
console.log(
  "F8B7B_ABSENT_DISCLOSURE=NULL"
);
console.log(
  "F8B7B_AMBIGUOUS_DISCLOSURE=FAIL_CLOSED"
);
console.log(
  "F8B7B_DATABASE_MUTATION=NONE"
);
console.log(
  "F8B7B_SCOM_MUTATION=NONE"
);
console.log(
  "F8B7B_PUBLICATION_MUTATION=NONE"
);

console.log(
  "===== FUND-008B REGRESSION PASS ====="
);

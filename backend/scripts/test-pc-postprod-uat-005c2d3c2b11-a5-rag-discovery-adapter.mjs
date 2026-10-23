import assert from "node:assert/strict";

import {
  normalizeIssuerDocumentCandidates
} from "../src/modules/fundamental-evidence/apifyIssuerDocumentDiscovery.adapter.js";

console.log(
  "===== A5 RAG DISCOVERY ADAPTER REGRESSION ====="
);

const rows = [
  {
    title: "Official Safaricom FY2024 report",
    url:
      "https://www.safaricom.co.ke/investor-relations/fy2024-report.pdf"
  },
  {
    title: "Duplicate",
    url:
      "https://www.safaricom.co.ke/investor-relations/fy2024-report.pdf"
  },
  {
    title: "Unrelated host",
    url:
      "https://example.com/safaricom-report.pdf"
  },
  {
    title: "Insecure issuer URL",
    url:
      "http://www.safaricom.co.ke/report.pdf"
  },
  {
    title: "Private host",
    url:
      "https://127.0.0.1/report.pdf"
  }
];

const result =
  normalizeIssuerDocumentCandidates({
    symbol: "SCOM",
    rows
  });

assert.equal(result.length, 1);

assert.equal(
  result[0].symbol,
  "SCOM"
);

assert.equal(
  result[0].url,
  "https://www.safaricom.co.ke/investor-relations/fy2024-report.pdf"
);

assert.equal(
  result[0].discoveryProvider,
  "APIFY_RAG_WEB_BROWSER"
);

assert.equal(
  result[0].evidenceStatus,
  "DISCOVERED"
);

assert.equal(
  result[0].authoritative,
  false
);

assert.equal(
  result[0].verified,
  false
);

console.log(
  "PASS — qualified issuer URL retained."
);

console.log(
  "PASS — duplicate candidate removed."
);

console.log(
  "PASS — unrelated host rejected."
);

console.log(
  "PASS — insecure URL rejected."
);

console.log(
  "PASS — private host rejected."
);

console.log(
  "PASS — discovered evidence remains non-authoritative and unverified."
);

console.log(
  "PASS — A5 RAG discovery boundary."
);

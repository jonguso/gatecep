import assert from "node:assert/strict";

import {
  getSecurityBySymbol
} from "../src/data/nseSecurityMaster.js";

console.log(
  "===== FUND-010F13I — CMA ISSUER IDENTITY REGRESSION ====="
);

const expected = [
  [
    "KCB",
    "KCB Group",
    "Kenya Commercial Bank"
  ],
  [
    "EQT",
    "Equity Group Holdings Ltd",
    "Equity Bank"
  ],
  [
    "COOP",
    "Co-operative Bank of Kenya",
    "Co-operative Bank of Kenya"
  ]
];

for (
  const [
    symbol,
    canonicalName,
    cmaIssuerName
  ] of expected
) {
  const security =
    getSecurityBySymbol(symbol);

  assert.equal(
    security.symbol,
    symbol
  );

  assert.equal(
    security.name,
    canonicalName
  );

  assert.equal(
    security.cmaIssuerName,
    cmaIssuerName
  );

  console.log(
    "PASS — " +
    symbol +
    " canonical=" +
    canonicalName +
    " CMA=" +
    cmaIssuerName
  );
}

assert.equal(
  getSecurityBySymbol("EQTY").symbol,
  "EQT"
);

assert.equal(
  getSecurityBySymbol("IMH").symbol,
  "IM"
);

console.log(
  "PASS — existing ticker aliases remain unchanged."
);

assert.equal(
  getSecurityBySymbol("KCB")
    .aliases,
  undefined
);

console.log(
  "PASS — CMA issuer identity is not misused as a ticker alias."
);

console.log(
  "PASS — FUND-010F13I CMA issuer identity contract."
);

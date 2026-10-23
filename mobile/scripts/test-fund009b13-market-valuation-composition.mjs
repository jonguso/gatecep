import assert from "node:assert/strict";

import {
  buildSecurityEducationModel
} from "../src/services/markets/securityEducationService.js";

const marketSecurity = {
  symbol: "SCOM",
  price: 34.9,
  lastPrice: 34.9,
  hasVerifiedPrice: true,
  sharesOutstanding: 40065428000,
  marketCapitalization: 1211979197000
};

const publishedFundamentals = {
  totalEquity: 335747900000,
  earningsPerShare: 1.5565,
  dividendPerShare: 1.19
};

const model =
  buildSecurityEducationModel(
    marketSecurity,
    publishedFundamentals
  );

const expectedBvps =
  335747900000 /
  40065428000;

const expectedPb =
  34.9 /
  expectedBvps;

assert.equal(
  model.fields.sharesOutstanding,
  40065428000,
  "verified market shares must reach education model"
);

assert.equal(
  model.fields.marketCap,
  1211979197000,
  "verified market capitalization must reach education model"
);

assert.ok(
  Math.abs(
    model.fields.bookValuePerShare -
    expectedBvps
  ) < 1e-10,
  "BVPS must derive from published equity / verified market shares"
);

assert.ok(
  Math.abs(
    model.fields.pb -
    expectedPb
  ) < 1e-10,
  "P/B must derive from verified price / BVPS"
);

assert.ok(
  Math.abs(
    model.fields.pe -
    (34.9 / 1.5565)
  ) < 1e-10,
  "existing verified-price P/E derivation must remain intact"
);

assert.ok(
  Math.abs(
    model.fields.dividendYield -
    ((1.19 / 34.9) * 100)
  ) < 1e-10,
  "existing dividend-yield derivation must remain intact"
);

const publishedWins =
  buildSecurityEducationModel(
    marketSecurity,
    {
      ...publishedFundamentals,
      bookValuePerShare: 9.25,
      priceToBookRatio: 3.75
    }
  );

assert.equal(
  publishedWins.fields.bookValuePerShare,
  9.25,
  "published BVPS must remain preferred when available"
);

assert.equal(
  publishedWins.fields.pb,
  3.75,
  "published P/B must remain preferred when available"
);

const unavailableMarket =
  buildSecurityEducationModel(
    {
      symbol: "SCOM",
      price: 34.9,
      hasVerifiedPrice: false,
      sharesOutstanding: 40065428000,
      marketCapitalization: 1211979197000
    },
    publishedFundamentals
  );

assert.equal(
  unavailableMarket.fields.marketCap,
  null,
  "unverified market cap must not cross valuation boundary"
);

assert.equal(
  unavailableMarket.fields.sharesOutstanding,
  null,
  "unverified market shares must not cross valuation boundary"
);

assert.equal(
  unavailableMarket.fields.bookValuePerShare,
  null,
  "BVPS must not derive without verified shares"
);

assert.equal(
  unavailableMarket.fields.pb,
  null,
  "P/B must not derive without verified market evidence"
);

console.log(
  "B13_VERIFIED_MARKET_VALUATION=PASS"
);

console.log(
  "SCOM_DERIVED=" +
  JSON.stringify({
    marketCap:
      model.fields.marketCap,
    sharesOutstanding:
      model.fields.sharesOutstanding,
    bookValuePerShare:
      model.fields.bookValuePerShare,
    priceToBookRatio:
      model.fields.pb,
    pe:
      model.fields.pe,
    dividendYield:
      model.fields.dividendYield
  })
);

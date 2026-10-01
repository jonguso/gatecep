import assert from "node:assert/strict";
import fs from "node:fs";

import {
  applySecurityMaster,
  getSecurityBySymbol
} from "../src/utils/nseSecurityMaster.js";

console.log(
  "PC-031B4M7C5D7I6E2 — SECTOR NORMALIZATION CONTRACT"
);

const safaricom = getSecurityBySymbol("SCOM");

assert.equal(safaricom.sector, "Telecom");
console.log(
  "PASS — Safaricom canonical sector is Telecom."
);

const eabl = getSecurityBySymbol("EABL");

assert.equal(eabl.sector, "Manufacturing & Allied");
console.log(
  "PASS — EABL canonical sector is Manufacturing & Allied."
);

const legacyNseSafaricom =
  applySecurityMaster({
    symbol: "SCOM",
    name: "Safaricom PLC",
    sector: "NSE",
    price: 30
  });

assert.equal(
  legacyNseSafaricom.sector,
  "Telecom"
);
console.log(
  "PASS — legacy NSE placeholder resolves to canonical Telecom."
);

const legacyNseEabl =
  applySecurityMaster({
    symbol: "EABL",
    sector: "NSE",
    price: 200
  });

assert.equal(
  legacyNseEabl.sector,
  "Manufacturing & Allied"
);
console.log(
  "PASS — legacy NSE placeholder resolves to canonical Manufacturing & Allied."
);

const validBanking =
  applySecurityMaster({
    symbol: "KCB",
    sector: "Banking"
  });

assert.equal(
  validBanking.sector,
  "Banking"
);
console.log(
  "PASS — valid persisted sector is preserved."
);

const unknownSecurity =
  applySecurityMaster({
    symbol: "NOTREAL",
    sector: "NSE"
  });

assert.equal(
  unknownSecurity.sector,
  "Unknown"
);
console.log(
  "PASS — unknown symbol is not assigned a fabricated sector."
);

const dashboard =
  fs.readFileSync(
    "src/features/portfolio-home/PortfolioHomeScreen.js",
    "utf8"
  );

assert.ok(
  !dashboard.includes("%) total return")
);
console.log(
  "PASS — dashboard no longer displays total return label."
);

assert.ok(
  dashboard.includes("summary.totalGainPct")
);
console.log(
  "PASS — return amount and percentage remain."
);

console.log("");
console.log(
  "PC-031B4M7C5D7I6E2: PASS"
);

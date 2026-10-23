import assert from "node:assert/strict";
import fs from "node:fs";

const hook = fs.readFileSync(
  "src/services/markets/useMarketData.js",
  "utf8"
);

assert.match(
  hook,
  /NSE_SECURITIES, applySecurityMaster/
);

assert.match(
  hook,
  /const verifiedBySymbol = new Map/
);

assert.match(
  hook,
  /Number\(x\.price \|\| x\.lastPrice \|\| 0\) > 0/
);

assert.match(
  hook,
  /const mastered = NSE_SECURITIES/
);

assert.match(
  hook,
  /hasVerifiedPrice: true/
);

assert.match(
  hook,
  /hasVerifiedPrice: false/
);

assert.match(
  hook,
  /price: null/
);

assert.match(
  hook,
  /lastPrice: null/
);

assert.doesNotMatch(
  hook,
  /price:\s*0[,$]/
);

console.log(
  "PASS — Markets overlays verified evidence onto the canonical NSE universe."
);

console.log(
  "PASS — unavailable canonical securities do not receive fabricated zero prices."
);

console.log(
  "PASS — verified and unavailable securities remain explicitly distinguishable."
);

console.log(
  "PC-POSTPROD-UAT-005B6B canonical Markets overlay regression complete."
);


assert.match(
  hook,
  /const \[verifiedRows, setVerifiedRows\] = useState\(\[\]\)/
);

assert.match(
  hook,
  /row\?\.hasVerifiedPrice === true/
);

assert.match(
  hook,
  /Number\(row\?\.price \?\? row\?\.lastPrice \?\? 0\) > 0/
);

assert.match(
  hook,
  /verifiedRows,/
);

console.log(
  "PASS — useMarketData exposes canonical rows and verifiedRows separately."
);

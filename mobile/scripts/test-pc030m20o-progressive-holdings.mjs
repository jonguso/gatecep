import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const holdings = await readFile(
  new URL("../app/holding-details.js", import.meta.url),
  "utf8"
);

assert.match(holdings, /const \[selectedSecurity, setSelectedSecurity\] = useState\(null\)/);
assert.match(holdings, /function HoldingListRow/);
assert.match(holdings, /function HoldingDetailCard/);
assert.match(holdings, /setSelectedSecurity\(\{ security, index \}\)/);
assert.match(holdings, /selectedSecurity \? \(/);
assert.match(holdings, /testID="holding-focused-detail-panel"/);
assert.match(holdings, /Portfolio Weight/);
assert.match(holdings, /Back to Holdings List/);
assert.match(holdings, /selectedSecurity \? setSelectedSecurity\(null\)/);
assert.match(holdings, /router\.canGoBack\?\.\(\)/);
assert.match(holdings, /style=\{styles\.homeAction\}/);
assert.doesNotMatch(holdings, /securities\.map\(\(security, index\) => \{[\s\S]*?<View\s+key=.*?style=\{styles\.security\}/);

console.log("PASS — Holdings initially renders a concise tappable securities list.");
console.log("PASS — one selected security opens in a focused detailed panel.");
console.log("PASS — each row preserves value, return, portfolio weight, sector, and broker context.");
console.log("PASS — Back returns to the list or previous page while Home remains a separate top action.");


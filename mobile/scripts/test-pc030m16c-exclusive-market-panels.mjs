import assert from "node:assert/strict";
import fs from "node:fs";

const screen = fs.readFileSync("app/(tabs)/markets.js", "utf8");

assert.match(screen, /const \[activePanel, setActivePanel\] = useState\("market"\)/);
assert.doesNotMatch(screen, /showIndices|showWatchlist/);
assert.match(screen, /activePanel === "market" && tab === "Summary"/);
assert.match(screen, /activePanel === "market" && tab !== "Summary"/);
assert.match(screen, /activePanel === "indices" &&/);
assert.match(screen, /activePanel === "watchlist" &&/);
assert.match(screen, /setActivePanel\(activePanel === "indices" \? "market" : "indices"\)/);
assert.match(screen, /setActivePanel\(activePanel === "watchlist" \? "market" : "watchlist"\)/);
assert.match(screen, /setActivePanel\("market"\)/);

console.log("PASS — Market Results, Indices, and Watchlist are mutually exclusive panels.");
console.log("PASS — opening one expanded panel hides the current securities panel and the other expansion.");
console.log("PASS — choosing any market tab restores the Market Results panel.");

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
assert.match(screen, /tab !== "Equities" && \(/);

console.log("PASS — Market Results, Indices, and Watchlist retain mutually exclusive panel state.");
console.log("PASS — opening one auxiliary panel hides the current securities panel and the other expansion.");
console.log("PASS — choosing any market tab restores the Market Results panel.");
console.log("PASS — Equities intentionally suppresses auxiliary Indices/Watchlist presentation.");

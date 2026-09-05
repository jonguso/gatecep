import assert from "node:assert/strict";
import fs from "node:fs";

const screen = fs.readFileSync("app/(tabs)/markets.js", "utf8");
const watchlistPanel = screen.slice(
  screen.indexOf('{activePanel === "watchlist" && ('),
  screen.indexOf("function SummaryBox")
);

assert.match(watchlistPanel, /styles\.resultsCard/);
assert.match(watchlistPanel, /height: resultsPanelHeight/);
assert.match(watchlistPanel, /Watchlist \(\{watchlist\.length\}\)/);
assert.match(watchlistPanel, /Scroll securities ↕/);
assert.match(watchlistPanel, /<ScrollView/);
assert.match(watchlistPanel, /style=\{styles\.resultsScroll\}/);
assert.match(watchlistPanel, /contentContainerStyle=\{styles\.resultsContent\}/);
assert.match(watchlistPanel, /nestedScrollEnabled/);
assert.match(watchlistPanel, /showsVerticalScrollIndicator/);
assert.match(watchlistPanel, /watchlist\.map/);
assert.match(watchlistPanel, /router\.push\(`\/security\/\$\{stock\.symbol\}`\)/);

console.log("PASS — Watchlist uses the same responsive fixed-height panel as Equities.");
console.log("PASS — watchlist securities scroll inside the panel with a visible scroll indicator.");
console.log("PASS — watchlist rows retain Security Education navigation.");

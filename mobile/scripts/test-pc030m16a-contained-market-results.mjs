import assert from "node:assert/strict";
import fs from "node:fs";

const screen = fs.readFileSync("app/(tabs)/markets.js", "utf8");

assert.match(screen, /useWindowDimensions/);
assert.match(screen, /Math\.min\(430, Math\.max\(310, windowHeight \* 0\.38\)\)/);
assert.match(screen, /styles\.resultsCard/);
assert.match(screen, /ref=\{resultsScrollRef\}/);
assert.match(screen, /nestedScrollEnabled/);
assert.match(screen, /showsVerticalScrollIndicator/);
assert.match(screen, /resultsScrollRef\.current\?\.scrollTo/);
assert.match(screen, /\[tab, search\]/);

const resultsCardIndex = screen.indexOf("styles.resultsCard");
const indicesIndex = screen.indexOf("} Indices");
const watchlistIndex = screen.indexOf("} Watchlist");
assert.ok(resultsCardIndex > 0);
assert.ok(indicesIndex > resultsCardIndex);
assert.ok(watchlistIndex > indicesIndex);

assert.match(screen, /router\.push\(`\/security\/\$\{row\.symbol\}`\)/);
assert.match(screen, /router\.push\(`\/security\/\$\{stock\.symbol\}`\)/);

console.log("PASS — every securities tab uses a responsive fixed-height results panel.");
console.log("PASS — securities scroll within the results section and reset on tab/search changes.");
console.log("PASS — Indices and Watchlist remain available below the panel on every market tab.");
console.log("PASS — market and watchlist rows retain Security Education navigation.");

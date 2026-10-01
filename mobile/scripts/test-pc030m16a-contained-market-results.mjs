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

// PC-031M3C1:
// Equities is intentionally a focused verified-securities directory.
// Auxiliary Indices/Watchlist panels remain available on other
// non-Summary analytical market tabs.
assert.match(screen, /tab !== "Equities" && \(/);

// PC-031M4R2:
// Equities is now the reference contained-workspace implementation.
// Its primary results region receives available viewport space through
// flex layout rather than manufacturing a device-specific pixel height.
assert.match(
  screen,
  /import \{ ResponsiveWorkingRegion \} from "\.\.\/\.\.\/src\/components\/mobile\/MobileUI";/
);
assert.match(screen, /scrollEnabled=\{tab !== "Equities"\}/);
assert.match(
  screen,
  /tab === "Equities" && styles\.equitiesViewportContent/
);
assert.match(
  screen,
  /ResponsiveWorkingRegion[\s\S]*?tab === "Equities"[\s\S]*?styles\.equitiesWorkingRegion/
);
assert.match(
  screen,
  /tab === "Equities"[\s\S]*?styles\.equitiesResultsCard[\s\S]*?: \{ height: analyticalPanelHeight \}/
);
assert.match(
  screen,
  /equitiesWorkingRegion:\s*\{[\s\S]*?flex:\s*1[\s\S]*?minHeight:\s*0/
);
assert.match(
  screen,
  /equitiesResultsCard:\s*\{[\s\S]*?flex:\s*1[\s\S]*?minHeight:\s*0/
);

// Retired M3D1 Equities height manufacturing must not return.
assert.doesNotMatch(screen, /const compactMarketHeight = windowHeight < 700/);
assert.doesNotMatch(screen, /equitiesPanelHeight/);
assert.doesNotMatch(screen, /resultsPanelHeight/);
assert.doesNotMatch(screen, /windowHeight\s*-\s*(330|455)/);

// Analytical and Watchlist panels intentionally retain their existing
// bounded height during this reference migration.
assert.match(
  screen,
  /Math\.min\(430, Math\.max\(310, windowHeight \* 0\.38\)\)/
);

console.log("PASS — Equities uses a flex-owned contained results viewport; analytical tabs retain bounded results.");
console.log("PASS — securities scroll within the results section and reset on tab/search changes.");
console.log("PASS — Equities is focused on verified securities without auxiliary Indices/Watchlist panels.");
console.log("PASS — Indices and Watchlist remain available outside the Equities focused view.");
console.log("PASS — market and watchlist rows retain Security Education navigation.");

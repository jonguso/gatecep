import assert from "node:assert/strict";
import fs from "node:fs";

const mobileUi = fs.readFileSync("src/components/mobile/MobileUI.js", "utf8");
const home = fs.readFileSync("src/features/portfolio-home/PortfolioHomeScreen.js", "utf8");
const markets = fs.readFileSync("app/(tabs)/markets.js", "utf8");
const trading = fs.readFileSync("app/(tabs)/trading.js", "utf8");
const calendar = fs.readFileSync("app/(tabs)/calendar.js", "utf8");
const news = fs.readFileSync("app/(tabs)/news.js", "utf8");

assert.match(mobileUi, /export function ContainedPanel/);
assert.match(mobileUi, /Math\.min\(maxHeight, Math\.max\(minHeight, height \* heightRatio\)\)/);
assert.match(mobileUi, /nestedScrollEnabled/);
assert.match(mobileUi, /showsVerticalScrollIndicator/);

/*
 * Portfolio Home evolved during later responsive UAT.
 * It now uses one contained outer ScrollView with
 * viewport-aware compact-height calibration.
 */
assert.match(home, /useWindowDimensions/);
assert.match(home, /compactPhoneHeight\s*=\s*height\s*<\s*850/);
assert.match(
  home,
  /styles\.hero,\s*compactPhoneHeight\s*&&\s*styles\.heroCompact/
);
assert.match(
  home,
  /styles\.quickMetrics,\s*compactPhoneHeight\s*&&\s*styles\.quickMetricsCompact/
);
assert.match(
  home,
  /<ScrollView[^>]*style=\{styles\.screen\}[^>]*contentContainerStyle=\{styles\.content\}/
);
assert.match(
  home,
  /content:\s*\{[^}]*paddingBottom:\s*128[^}]*maxWidth:\s*960[^}]*alignSelf:\s*"center"/
);

/*
 * Trading also evolved beyond the earlier per-tab
 * ContainedPanel rendering contract. Its current screen
 * uses one responsive outer ScrollView with desktop
 * containment and explicit compact-mobile clearance.
 */
assert.match(trading, /useWindowDimensions/);
assert.match(
  trading,
  /const\s*\{\s*width:\s*av3dWidth\s*\}\s*=\s*useWindowDimensions\(\)/
);
assert.match(
  trading,
  /<ScrollView[^>]*style=\{s\.screen\}[^>]*contentContainerStyle=\{\[/
);
assert.match(
  trading,
  /av3dWidth\s*>=\s*720\s*&&\s*\{[^}]*maxWidth:\s*960[^}]*alignSelf:\s*"center"/
);
assert.match(
  trading,
  /av3dWidth\s*<\s*720\s*&&\s*\{[^}]*paddingHorizontal:\s*16[^}]*paddingTop:\s*32[^}]*paddingBottom:\s*128/
);

assert.match(markets, /activePanel === "market"/);
assert.match(markets, /styles\.resultsScroll/);
assert.match(news, /testID="news-contained-panel"/);
assert.match(calendar, /buildCalendarMonthDays/);
assert.match(calendar, /style=\{s\.modalScroll\}/);

console.log("PASS — the shared investor panel has responsive height and nested scrolling.");
console.log("PASS — Home, Markets, Trading, Calendar, and News use one active mobile-friendly content view.");
console.log("PASS — Calendar day events remain contained in a scrollable popup.");

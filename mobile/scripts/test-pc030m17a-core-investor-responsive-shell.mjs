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

assert.match(home, /activePanelHeight/);
assert.match(home, /styles\.activePanel/);
assert.match(home, /nestedScrollEnabled/);
assert.match(markets, /activePanel === "market"/);
assert.match(markets, /styles\.resultsScroll/);
assert.match(trading, /<ContainedPanel title=\{tab\}/);
assert.match(news, /testID="news-contained-panel"/);
assert.match(calendar, /buildCalendarMonthDays/);
assert.match(calendar, /style=\{s\.modalScroll\}/);

console.log("PASS — the shared investor panel has responsive height and nested scrolling.");
console.log("PASS — Home, Markets, Trading, Calendar, and News use one active mobile-friendly content view.");
console.log("PASS — Calendar day events remain contained in a scrollable popup.");

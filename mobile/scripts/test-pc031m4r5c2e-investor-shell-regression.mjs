import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function requireText(source, text, message) {
  if (!source.includes(text)) {
    throw new Error(`FAIL ${message}\nMissing: ${text}`);
  }
  pass(message);
}

function rejectText(source, text, message) {
  if (source.includes(text)) {
    throw new Error(`FAIL ${message}\nUnexpected: ${text}`);
  }
  pass(message);
}

const mobileUI = read("src/components/mobile/MobileUI.js");
const menu = read("src/components/navigation/AppMenuButton.js");
const coach = read("src/components/coach/FloatingCoachG.js");
const root = read("app/_layout.js");
const tabs = read("app/(tabs)/_layout.js");

const markets = read("app/(tabs)/markets.js");
const trading = read("app/(tabs)/trading.js");
const calendar = read("app/(tabs)/calendar.js");
const news = read("app/(tabs)/news.js");
const performance = read("app/performance.js");

console.log("===== PC-031M4R5C2E INVESTOR SHELL REGRESSION =====");

/*
 * 1. Shared header primitive.
 */
requireText(
  mobileUI,
  "export function InvestorTopChromeHeader(",
  "shared InvestorTopChromeHeader exists"
);

requireText(
  mobileUI,
  "compact && reserveLeft && styles.investorTopChromeHeaderLeft",
  "shared header preserves optional left chrome reservation"
);

requireText(
  mobileUI,
  "compact && reserveRight && styles.investorTopChromeHeaderRight",
  "shared header preserves optional right chrome reservation"
);

requireText(
  mobileUI,
  "responsiveWorkingRegion: {",
  "shared responsive working-region contract exists"
);

requireText(
  mobileUI,
  "minHeight: 0",
  "shared responsive shell retains minHeight containment"
);

/*
 * 2. Global application chrome ownership.
 */
requireText(
  root,
  "<FloatingCoachG />",
  "root owns global Coach G"
);

requireText(
  root,
  "<AppMenuButton />",
  "root owns global application Menu"
);

requireText(
  menu,
  '"/dashboard"',
  "global Menu preserves dashboard exception"
);

requireText(
  menu,
  '"/(tabs)/dashboard"',
  "global Menu preserves tab-dashboard exception"
);

requireText(
  menu,
  "const useTopChrome = true;",
  "global Menu remains top chrome"
);

requireText(
  coach,
  "const useTopChrome = true;",
  "Coach G remains top chrome"
);

requireText(
  menu,
  "left: 14",
  "Menu remains anchored to left chrome lane"
);

requireText(
  coach,
  "right: 14",
  "Coach G remains anchored to right chrome lane"
);

/*
 * 3. Primary navigation contract.
 */
for (const route of [
  'name="dashboard"',
  'name="markets"',
  'name="trading"',
  'name="calendar"',
  'name="news"'
]) {
  requireText(tabs, route, `primary tab preserved: ${route}`);
}

for (const icon of [
  '"home"',
  '"trending-up"',
  '"swap-horizontal"',
  '"calendar"',
  '"newspaper"'
]) {
  requireText(tabs, icon, `vector tab icon preserved: ${icon}`);
}

requireText(
  tabs,
  'tabBarActiveTintColor: "#67e8f9"',
  "active tab color preserved"
);

/*
 * 4. Markets — proven contained workspace.
 */
requireText(
  markets,
  "equitiesViewportContent: {",
  "Markets viewport contract preserved"
);

requireText(
  markets,
  "equitiesWorkingRegion: {",
  "Markets working-region contract preserved"
);

requireText(
  markets,
  "equitiesResultsCard: {",
  "Markets results-card contract preserved"
);

requireText(
  markets,
  "resultsScroll: {",
  "Markets inner scroll owner preserved"
);

requireText(
  markets,
  "equitiesContainedContent: {",
  "Markets contained bottom-clearance override preserved"
);

requireText(
  markets,
  "paddingBottom: 0",
  "Markets does not reserve legacy bottom flow clearance"
);

requireText(
  markets,
  'key: "Equities", label: "Market"',
  "investor-facing Market tab label preserved"
);

/*
 * 5. Shared top-chrome adoption.
 */
requireText(
  performance,
  "<InvestorTopChromeHeader",
  "Performance uses shared top chrome"
);

requireText(
  trading,
  '<InvestorTopChromeHeader testID="trading-top-chrome">',
  "Trading uses shared top chrome"
);

requireText(
  calendar,
  '<InvestorTopChromeHeader testID="calendar-top-chrome">',
  "Calendar uses shared top chrome"
);

requireText(
  news,
  '<InvestorTopChromeHeader testID="news-top-chrome">',
  "News uses shared top chrome"
);

/*
 * 6. Performance remains hybrid:
 * overview = flow page; focused detail = bounded inner workspace.
 */
requireText(
  performance,
  "<ScrollView ref={scrollRef}",
  "Performance overview retains outer flow scroll"
);

requireText(
  performance,
  "detailViewportReserve",
  "Performance focused detail retains viewport budget"
);

requireText(
  performance,
  "performanceDetailWorkspace",
  "Performance focused workspace preserved"
);

requireText(
  performance,
  "detailPanelScroll",
  "Performance focused detail inner scroll preserved"
);

/*
 * 7. Trading / Calendar / News keep their established scroll owners.
 */
requireText(
  trading,
  "return <ScrollView",
  "Trading outer flow scroll preserved"
);

requireText(
  calendar,
  "return <ScrollView",
  "Calendar outer flow scroll preserved"
);

requireText(
  news,
  "return <ScrollView",
  "News outer flow scroll preserved"
);

/*
 * Trading bottom navigation already supplies Home.
 * Keep the redundant header Home control removed.
 */
rejectText(
  trading,
  '<Text style={s.headerButtonText}>Home</Text>',
  "Trading redundant header Home control remains removed"
);

/*
 * 8. Business/data boundaries that responsive work must not remove.
 */
for (const contract of [
  "loadTradingHubData",
  "DecisionLabHome",
  'pathname:"/trade"',
  'pathname:"/basket-execution"'
]) {
  requireText(trading, contract, `Trading contract preserved: ${contract}`);
}

for (const contract of [
  "loadVerifiedCalendar",
  "loadCorporateActions",
  "loadUnifiedPortfolioRuntime",
  "buildPortfolioAwareInvestorAlert"
]) {
  requireText(calendar, contract, `Calendar contract preserved: ${contract}`);
}

for (const contract of [
  "loadVerifiedNews",
  "loadCorporateActions",
  "loadUnifiedPortfolioRuntime",
  "buildPortfolioAwareInvestorAlerts",
  "savePortfolioAwareAlerts"
]) {
  requireText(news, contract, `News contract preserved: ${contract}`);
}

console.log();
console.log("PC-031M4R5C2E INVESTOR SHELL REGRESSION PASS");

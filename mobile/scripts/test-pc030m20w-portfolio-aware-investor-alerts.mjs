import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPortfolioAwareInvestorAlert, buildPortfolioAwareInvestorAlerts, PORTFOLIO_ALERT_ACTIONS } from "../src/features/intelligence/portfolioAwareInvestorAlertService.js";

const holdings = [
  { symbol: "SCOM", sector: "Telecom", quantity: 1000, marketValue: 30000 },
  { symbol: "KCB", sector: "Banking", quantity: 5000, marketValue: 250000 },
  { symbol: "EABL", sector: "Consumer", quantity: 200, marketValue: 50000 }
];

const heldDividend = buildPortfolioAwareInvestorAlert({
  evidence: { id: "DIV-SCOM", symbol: "SCOM", sector: "Telecom", category: "Dividends", type: "EX_DATE", title: "SCOM dividend", detail: "Declared final dividend.", trustLevel: "OFFICIAL", verified: true, exDate: "2026-10-01", dividendPerShare: 1.2, source: "Issuer", url: "https://example.test/dividend" },
  holdings,
  asOfDate: "2026-09-08"
});
assert.equal(heldDividend.action, PORTFOLIO_ALERT_ACTIONS.DIVIDEND_REMINDER);
assert.equal(heldDividend.dividendImpact.phase, "CUM_DIVIDEND");
assert.equal(heldDividend.dividendImpact.estimatedGrossDividend, 1200);
assert.equal(heldDividend.dividendImpact.eligibilityConfirmed, false);

const unheldUnderweight = buildPortfolioAwareInvestorAlert({
  evidence: { id: "DIV-NEW", symbol: "NEW", sector: "Insurance", category: "Dividends", title: "NEW dividend", detail: "Declared dividend.", trustLevel: "OFFICIAL", verified: true, exDate: "2026-10-01" },
  holdings,
  sectorTargets: { Insurance: 15 },
  asOfDate: "2026-09-08"
});
assert.equal(unheldUnderweight.action, PORTFOLIO_ALERT_ACTIONS.ADD_GRADUALLY);
assert.match(unheldUnderweight.rationale, /valuation evidence is still required before buying/);

const unverifiedNegative = buildPortfolioAwareInvestorAlert({ evidence: { id: "RUMOR", symbol: "KCB", title: "Unverified trading suspension rumor", detail: "Rumor only", trustLevel: "REPORTED" }, holdings });
assert.equal(unverifiedNegative.action, PORTFOLIO_ALERT_ACTIONS.INSUFFICIENT_EVIDENCE);
assert.equal(unverifiedNegative.safeguards.tradeCreated, false);

const verifiedExit = buildPortfolioAwareInvestorAlert({ evidence: { id: "EXIT", symbol: "KCB", actionType: "DELISTING", title: "Verified delisting", detail: "Issuer lifecycle notice", trustLevel: "OFFICIAL", verified: true }, holdings });
assert.equal(verifiedExit.action, PORTFOLIO_ALERT_ACTIONS.CONSIDER_REDUCING);

const deduped = buildPortfolioAwareInvestorAlerts({ evidence: [heldDividend, heldDividend].map((item) => ({ id: item.evidenceId, symbol: item.symbol, category: "Dividends", title: item.title, date: "2026-10-01", verified: true, trustLevel: "OFFICIAL" })), holdings });
assert.equal(deduped.length, 1);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [newsData, news, calendar, review, intelligence] = await Promise.all([
  read("src/services/news/newsHubData.js"), read("app/(tabs)/news.js"), read("app/(tabs)/calendar.js"), read("app/investor-alert-review.js"), read("app/intelligence-center.js")
]);
assert.match(newsData, /"For You"/);
assert.match(news, /Review portfolio impact/);
assert.match(calendar, /Review portfolio impact/);
assert.match(review, /Cum-dividend period/);
assert.match(review, /Buying on or after the ex-dividend date should not be assumed to qualify/i);
assert.match(review, /This message does not place a trade/);
assert.match(intelligence, /Open Portfolio-Aware News Alerts/);

console.log("PASS — verified news and dated corporate actions are evaluated against the REAL portfolio.");
console.log("PASS — cum/ex-dividend alerts disclose eligibility uncertainty and estimate income only from known quantities and rates.");
console.log("PASS — unsupported headlines cannot create Buy, Sell, or Reduce guidance.");
console.log("PASS — material verified lifecycle events can surface a reviewable Consider Reducing alert without creating a trade.");
console.log("PASS — News, Calendar, and Intelligence Center reuse one portfolio-impact review route.");

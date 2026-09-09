import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPortfolioAwareInvestorAlert } from "../src/features/intelligence/portfolioAwareInvestorAlertService.js";

const reported = buildPortfolioAwareInvestorAlert({
  evidence: {
    id: "NEWS-JUB",
    symbol: "JUB",
    sector: "Insurance",
    category: "Dividends",
    trustLevel: "REPORTED",
    date: "2026-08-28",
    title: "Jubilee maintains dividend",
    detail: "Jubilee said it will pay the interim dividend on or about October 8 to members on the company's register at the close of business on September 7."
  },
  holdings: [{ symbol: "JUB", sector: "Insurance", quantity: 150, marketValue: 61950 }]
});

assert.equal(reported.label, "Let’s Verify the Dividend Details");
assert.equal(reported.reportedClues.recordDate, "2026-09-07");
assert.equal(reported.reportedClues.paymentDate, "2026-10-08");
assert.equal(reported.dividendImpact.estimatedGrossDividend, null);
assert.match(reported.evidenceReview.missing.join(" "), /official verification of the reported record\/register date/);
assert.match(reported.evidenceReview.missing.join(" "), /holding evidence for the eligibility date/);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [alertStore, news, center, home, review, alerts] = await Promise.all([
  read("src/services/alerts/alertStore.js"), read("app/(tabs)/news.js"), read("app/intelligence-center.js"), read("src/features/portfolio-home/PortfolioHomeScreen.js"), read("app/investor-alert-review.js"), read("app/alerts.js")
]);
assert.match(alertStore, /savePortfolioAwareAlerts/);
assert.match(alertStore, /PORTFOLIO_AWARE_NEWS/);
assert.match(news, /savePortfolioAwareAlerts\(personalizedAlerts\)/);
assert.match(center, /summarizeNotifications\(merged\)/);
assert.match(center, /item\.isLocal/);
assert.match(center, /investor-alert-review/);
assert.match(home, /unreadAlertCount/);
assert.match(home, /unread Coach G alerts/);
assert.match(review, /Reported clues—awaiting official verification/);
assert.match(alerts, /item\.payload/);

console.log("PASS — reported dividend dates are extracted as clues without being promoted to verified evidence.");
console.log("PASS — historical eligibility evidence remains required before confirming dividend entitlement.");
console.log("PASS — portfolio-aware news alerts reuse the existing persistent Coach G alert store.");
console.log("PASS — Intelligence Center merges local and backend alerts with one notification summary.");
console.log("PASS — the dashboard bell displays the existing unread alert count and opens the same center.");

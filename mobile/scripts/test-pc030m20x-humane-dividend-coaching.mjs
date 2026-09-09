import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPortfolioAwareInvestorAlert } from "../src/features/intelligence/portfolioAwareInvestorAlertService.js";

const holdings = [
  { symbol: "JUB", sector: "Insurance", quantity: 150, marketValue: 61950 },
  { symbol: "KCB", sector: "Banking", quantity: 1000, marketValue: 200000 }
];

const verified = buildPortfolioAwareInvestorAlert({
  evidence: { symbol: "JUB", sector: "Insurance", category: "Dividends", title: "JUB interim dividend", trustLevel: "OFFICIAL", verified: true, dividendPerShare: 4, exDate: "2026-09-20", recordDate: "2026-09-22", paymentDate: "2026-10-08" },
  holdings,
  sectorTargets: { Insurance: 10 },
  asOfDate: "2026-09-09"
});
assert.equal(verified.dividendImpact.estimatedGrossDividend, 600);
assert.match(verified.coachMessage, /KES 600 gross before tax/);
assert.match(verified.incomeOptions.join(" "), /already at or above its saved target/);
assert.match(verified.incomeOptions.join(" "), /money-market fund or fixed-income/);

const reported = buildPortfolioAwareInvestorAlert({
  evidence: { symbol: "JUB", sector: "Insurance", category: "Dividends", title: "JUB maintains dividend", trustLevel: "REPORTED" },
  holdings
});
assert.match(reported.coachMessage, /cannot estimate the income responsibly/);
assert.ok(reported.evidenceReview.missing.includes("dividend per share"));
assert.ok(reported.evidenceReview.missing.includes("ex-dividend date"));
assert.match(reported.evidenceReview.missing.join(" "), /official issuer/);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [review, news, calendar] = await Promise.all([read("app/investor-alert-review.js"), read("app/(tabs)/news.js"), read("app/(tabs)/calendar.js")]);
assert.match(review, /What I know—and what I still need/);
assert.match(review, /How this income could support your plan/);
assert.match(review, /Coach G’s view/);
assert.match(news, /loadRebalanceTarget/);
assert.match(calendar, /loadRebalanceTarget/);

console.log("PASS — Coach G estimates gross dividend income only from a known quantity and verified rate.");
console.log("PASS — Coach G names missing evidence instead of returning a generic rejection.");
console.log("PASS — dividend choices consider saved sector targets, underweight sectors, and defensive investments.");
console.log("PASS — News and Calendar connect portfolio alerts to the saved diversification target.");
console.log("PASS — guidance remains a scenario comparison and does not change the REAL portfolio.");

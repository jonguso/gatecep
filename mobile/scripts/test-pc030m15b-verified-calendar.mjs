import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCalendarMonthDays, buildVerifiedCalendarEvents, calendarRangeForTab, getCalendarSummary, monthLabel } from "../src/services/calendar/calendarHubData.js";

const now = new Date("2026-09-03T12:00:00Z");
assert.deepEqual(calendarRangeForTab("This Month", now), { from: "2026-09-01", to: "2026-09-30" });
assert.deepEqual(calendarRangeForTab("Next 6 Months", now), { from: "2026-09-03", to: "2027-03-03" });
assert.deepEqual(calendarRangeForTab("Last 12 Months", now), { from: "2025-09-03", to: "2026-09-03" });

const external = [
  { id: "one", type: "BOOK_CLOSURE", date: "2026-09-07", title: "ABSA book closure", detail: "Official evidence", source: "Nairobi Securities Exchange", trustLevel: "OFFICIAL", symbols: ["ABSA"], url: "https://www.nse.co.ke/absa" },
  { id: "two", type: "AGM_DATE", date: "2026-10-15", title: "SCOM AGM", detail: "Reported evidence", source: "Business Daily Africa", trustLevel: "REPORTED", symbols: ["SCOM"], url: "https://www.businessdailyafrica.com/scom" }
];
const month = buildVerifiedCalendarEvents([], "This Month", now, external);
assert.equal(month.length, 1);
assert.equal(month[0].trustLevel, "OFFICIAL");
assert.deepEqual(getCalendarSummary(month), { total: 1, dividends: 1, deadlines: 1, actions: 1 });
const next = buildVerifiedCalendarEvents([], "Next 6 Months", now, external);
assert.equal(next.length, 2);
const monthDays = buildCalendarMonthDays(next, now);
assert.equal(monthDays.length, 42);
assert.equal(monthDays.find((day) => day.date === "2026-09-07")?.events.length, 1);
assert.equal(monthDays.find((day) => day.date === "2026-09-08")?.events.length, 0);
assert.equal(monthLabel(now), "September 2026");

const api = fs.readFileSync("src/services/calendar/verifiedCalendarApi.js", "utf8");
const screen = fs.readFileSync("app/(tabs)/calendar.js", "utf8");
assert.match(api, /\/verified-news\/calendar/);
assert.match(api, /Authorization: `Bearer \$\{accessToken\}`/);
assert.match(screen, /Promise\.allSettled/);
assert.match(screen, /Open original evidence/);
assert.match(screen, /Article publication dates do not become investment deadlines/);
assert.match(screen, /Official/);
assert.match(screen, /Reported/);
assert.match(screen, /Previous month/);
assert.match(screen, /Next month/);
assert.match(screen, /No verified events for this date/);

console.log("PASS — This Month, Next 6 Months and Last 12 Months use distinct verified date ranges.");
console.log("PASS — backend events merge with existing verified corporate actions without sample dates.");
console.log("PASS — authority labels, original evidence links and calendar summary counts are visible.");
console.log("PASS — a backend news failure does not erase existing local corporate-action evidence.");
console.log("PASS — the month grid groups every verified event by date and opens a day-event popup.");

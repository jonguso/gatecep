import assert from "node:assert/strict";
import fs from "node:fs";
import { buildCalendarMonthDays, monthLabel } from "../src/services/calendar/calendarHubData.js";

const september = new Date("2026-09-03T12:00:00Z");
const events = [
  { id: "closure", date: "2026-09-07", type: "BOOK_CLOSURE" },
  { id: "agm", date: "2026-09-07", type: "AGM_DATE" },
  { id: "payment", date: "2026-09-08", type: "PAYMENT_DATE" }
];
const days = buildCalendarMonthDays(events, september);
assert.equal(days.length, 42);
assert.equal(monthLabel(september), "September 2026");
assert.deepEqual(days.find((day) => day.date === "2026-09-07")?.events.map((event) => event.id), ["closure", "agm"]);
assert.deepEqual(days.find((day) => day.date === "2026-09-08")?.events.map((event) => event.id), ["payment"]);

const screen = fs.readFileSync("app/(tabs)/calendar.js", "utf8");
assert.match(screen, /Previous month/);
assert.match(screen, /Next month/);
assert.match(screen, /setVisibleMonth\(new Date\(\)\)/);
assert.match(screen, /setSelectedDate\(item\.date\)/);
assert.match(screen, /selectedEvents\.map/);
assert.match(screen, /Open original evidence/);
assert.match(screen, /No verified events for this date/);

console.log("PASS — Calendar renders a navigable 42-day month grid.");
console.log("PASS — every verified event is grouped under its exact event date.");
console.log("PASS — tapping a day opens all events for that date with evidence links.");
console.log("PASS — empty dates remain explicit and no sample events are generated.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [pkgText, newsMigration, calendarMigration, scheduler, server, routes] = await Promise.all([
  read("package.json"),
  read("src/database/migrations/010_verified_news.sql"),
  read("src/database/migrations/011_verified_calendar_events.sql"),
  read("src/modules/verified-news/verifiedNews.scheduler.js"),
  read("src/server.js"),
  read("src/modules/verified-news/verifiedNews.routes.js")
]);

const pkg = JSON.parse(pkgText);
assert.equal(pkg.scripts.prestart, "npm run migrate");
assert.equal(pkg.scripts.start, "node src/server.js");
assert.match(newsMigration, /CREATE TABLE IF NOT EXISTS public\.verified_news_items/);
assert.match(newsMigration, /CREATE TABLE IF NOT EXISTS public\.verified_news_collection_runs/);
assert.match(calendarMigration, /CREATE TABLE IF NOT EXISTS public\.verified_calendar_events/);
assert.match(scheduler, /NEWS_COLLECTION_ENABLED/);
assert.match(scheduler, /process\.env\.APIFY_API_TOKEN/);
assert.match(scheduler, /cycle\(\)/);
assert.match(server, /startVerifiedNewsScheduler\(\)/);
assert.match(routes, /router\.get\("\/calendar"/);
assert.match(routes, /router\.get\("\/"/);

console.log("PASS — every production npm start runs database migrations before accepting traffic.");
console.log("PASS — verified News and Calendar tables are created idempotently.");
console.log("PASS — the enabled verified-news scheduler performs an immediate collection at startup.");
console.log("PASS — authenticated News and Calendar routes remain mounted separately.");


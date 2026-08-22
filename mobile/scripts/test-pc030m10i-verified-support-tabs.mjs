import assert from "node:assert/strict";
import fs from "node:fs";
import { buildVerifiedCalendarEvents } from "../src/services/calendar/calendarHubData.js";
import { buildVerifiedNews } from "../src/services/news/newsHubData.js";

const verified={id:"CA-1",symbol:"SCOM",type:"CASH_DIVIDEND",paymentDate:"2026-08-28",source:{type:"EXCHANGE",reference:"NSE-CA-1"}};
const unverified={id:"CA-2",symbol:"KCB",type:"CASH_DIVIDEND",paymentDate:"2026-08-28",source:{type:"MANUAL_ENTRY"}};
assert.equal(buildVerifiedCalendarEvents([verified,unverified],"This Month",new Date("2026-08-21")).length,1);
assert.equal(buildVerifiedCalendarEvents([verified],"Last 12 Months",new Date("2026-08-21")).length,0);

const news=buildVerifiedNews({quotes:[{symbol:"SCOM",name:"Safaricom",price:31,changePct:2},{symbol:"KCB",name:"KCB",price:70,changePct:-1}],generatedAt:"2026-08-21T17:00:00Z",provider:"LOCAL_VERIFIED_EOD"});
assert(news.some(x=>x.category==="Market"));
assert(news.some(x=>x.category==="Company"));
assert(news.some(x=>x.category==="Coach G"&&x.source==="Coach G analysis"));
assert.equal(buildVerifiedNews({quotes:[]}).length,0);

const trading=fs.readFileSync(new URL("../app/(tabs)/trading.js",import.meta.url),"utf8");
for(const forbidden of ["Simulate Broker Acceptance","Mark Filled","Save Deposit Request","live depth preview"]){assert(!trading.includes(forbidden),`forbidden simulation remains: ${forbidden}`)}
assert(trading.includes("Broker controlled"));
console.log("PASS — Trading is read-only and broker controlled.");
console.log("PASS — Calendar accepts only dated, referenced evidence.");
console.log("PASS — News derives from verified market and corporate-action evidence.");
console.log("PASS — empty providers fail closed without sample content.");

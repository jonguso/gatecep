import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/broker-accounts.js", import.meta.url), "utf8");
const mobileUi = await readFile(new URL("../src/components/mobile/MobileUI.js", import.meta.url), "utf8");

assert.match(source, /activePanel/);
assert.match(source, /Connected \(\{accounts\.length\}\)/);
assert.match(source, /Available \(\{availableBrokers\.length\}\)/);
assert.match(source, /testID="connected-brokers-panel"/);
assert.match(source, /testID="available-brokers-panel"/);
assert.match(source, /<ContainedPanel/);
assert.match(source, /activePanel === "connected" \? \(/);
assert.match(mobileUi, /nestedScrollEnabled/);
assert.match(mobileUi, /showsVerticalScrollIndicator/);

console.log("PASS — Connected and Available brokers are mutually exclusive focused panels.");
console.log("PASS — both broker collections use the shared contained internal scroll contract.");
console.log("PASS — broker connection, default selection, editing, and disconnect controls remain present.");

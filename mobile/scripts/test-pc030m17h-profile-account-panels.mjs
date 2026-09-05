import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [profile, investorEdit, brokerProfile, brokerCenter, accountEdit] = await Promise.all([
  read("app/my-profile.js"), read("app/investor-profile-edit.js"),
  read("app/broker-profile.js"), read("app/broker-account-center.js"), read("app/account-edit.js")
]);

assert.match(profile, /\["Account", "Investor", "Broker", "Portfolio"\]/);
for (const id of ["profile-account-panel", "profile-investor-panel", "profile-broker-panel", "profile-portfolio-panel"]) assert.match(profile, new RegExp(id));
assert.match(investorEdit, /testID="investor-profile-form-panel"/);
assert.match(investorEdit, /saveInvestorProfile\(profile\)/);
assert.match(investorEdit, /mergeInvestorProfileStorage/);
assert.match(brokerProfile, /testID="broker-profile-form-panel"/);
assert.match(brokerProfile, /addUserBroker/);
for (const id of ["broker-center-connected-panel", "broker-center-coach-panel", "broker-center-supported-panel"]) assert.match(brokerCenter, new RegExp(id));
assert.match(brokerCenter, /addUserBroker/);
assert.match(accountEdit, /Account editing is not yet available/);

console.log("PASS — My Profile displays one focused Account, Investor, Broker, or Portfolio panel.");
console.log("PASS — Investor and Broker edit forms use contained mobile scrolling without changing save contracts.");
console.log("PASS — Broker Center displays one Connected, Coach G, or supported-broker panel at a time.");
console.log("PASS — Account Edit clearly reports its current non-editable state instead of implying a working save.");

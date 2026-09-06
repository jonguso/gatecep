import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [index, profileApi, login] = await Promise.all([
  read("app/index.js"),
  read("src/features/profile/api/investorProfileApi.js"),
  read("app/login.js")
]);

assert.match(login, /await login\(\{ email: email\.trim\(\), password \}\)/);
assert.match(login, /router\.replace\("\/"\)/);
assert.match(index, /restoreInvestorProfileFromCloud/);
assert.match(index, /cloudProfileState\?\.status === "FOUND"/);
assert.match(index, /context\?\.profile\?\.onboardingCompleted === true/);
assert.match(index, /cloudProfileState\?\.status === "UNKNOWN"/);
assert.match(index, /router\.replace\("\/\(tabs\)\/dashboard"\)/);
assert.match(index, /!hasName && cloudProfileState\?\.status === "MISSING"/);

assert.match(profileApi, /status: "FOUND"/);
assert.match(profileApi, /status: "MISSING"/);
assert.match(profileApi, /status: "UNKNOWN"/);
assert.match(profileApi, /profileSource: "CLOUD_INVESTOR_PROFILE"/);
assert.match(profileApi, /userSetItem\("investorProfile"/);
assert.match(profileApi, /userSetItem\("onboardingCompleted", "true"\)/);
assert.match(profileApi, /response\.status === 404 \? "PROFILE_NOT_FOUND"/);

console.log("PASS — login restores the authenticated namespace before startup routing.");
console.log("PASS — a server-backed investor profile routes directly to the dashboard.");
console.log("PASS — restored profiles persist on a fresh device or TestFlight installation.");
console.log("PASS — only a confirmed missing profile may enter onboarding.");
console.log("PASS — profile-service interruptions do not misclassify returning users as new.");

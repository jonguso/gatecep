import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), "utf8"));
const exists = async (name) => access(new URL(name, root)).then(() => true, () => false);

const [app, eas, pkg, easignore] = await Promise.all([
  readJson("app.json"),
  readJson("eas.json"),
  readJson("package.json"),
  readFile(new URL(".easignore", root), "utf8")
]);

const expo = app.expo || {};
assert.equal(expo.ios?.bundleIdentifier, "com.gatecep.mobile");
assert.equal(expo.ios?.supportsTablet, false);
assert.equal(expo.ios?.config?.usesNonExemptEncryption, false);
assert.match(expo.ios?.buildNumber || "", /^\d+$/);
assert.equal(eas.cli?.appVersionSource, "remote");
assert.equal(eas.build?.preview?.distribution, "internal");
assert.equal(eas.build?.preview?.ios?.simulator, false);
assert.equal(eas.build?.production?.environment, "production");
assert.equal(eas.build?.production?.autoIncrement, true);
assert.ok(eas.submit?.production?.ios);

assert.match(pkg.scripts?.["eas:device:register:ios"] || "", /eas-cli@23\.2\.0 device:create/);
assert.match(pkg.scripts?.["build:preview:ios"] || "", /build --platform ios --profile preview/);
assert.match(pkg.scripts?.["build:testflight:ios"] || "", /build --platform ios --profile production/);
assert.match(pkg.scripts?.["submit:testflight:ios"] || "", /submit --platform ios --profile production --latest/);

for (const asset of ["assets/icon.png", "assets/splash.png"]) {
  assert.equal(await exists(asset), true, `${asset} is required`);
}
for (const pattern of [/\.env/, /\*\.p8/, /\*\.p12/, /credentials\.json/]) {
  assert.match(easignore, pattern);
}

console.log("PASS — GateCEP has an explicit Apple bundle identity and iOS release metadata.");
console.log("PASS — registered-device preview and TestFlight builds use separate distributions.");
console.log("PASS — production iOS build numbers auto-increment through EAS remote versioning.");
console.log("PASS — TestFlight upload uses the latest production iOS build.");
console.log("PASS — Apple signing files and local environment files are excluded from uploads.");

const projectId = expo.extra?.eas?.projectId;
if (projectId) {
  console.log(`PASS — GateCEP is linked to EAS project ${projectId}.`);
} else {
  console.log("LOCAL NOTE — this patch preserves the EAS project link already created in your working copy.");
}

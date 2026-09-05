import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), "utf8"));
const exists = async (name) => access(new URL(name, root)).then(() => true, () => false);

const [app, eas, pkg, gitignore, easignore] = await Promise.all([
  readJson("app.json"),
  readJson("eas.json"),
  readJson("package.json"),
  readFile(new URL(".gitignore", root), "utf8"),
  readFile(new URL(".easignore", root), "utf8")
]);

const expo = app.expo || {};
assert.equal(expo.android?.package, "com.gatecep.mobile");
assert.equal(eas.build?.preview?.distribution, "internal");
assert.equal(eas.build?.preview?.android?.buildType, "apk");
assert.equal(eas.build?.preview?.environment, "preview");
assert.equal(eas.build?.production?.android?.buildType, "app-bundle");
assert.equal(eas.build?.preview?.channel, undefined);
assert.equal(eas.build?.production?.channel, undefined);
assert.match(pkg.scripts?.["build:preview:android"] || "", /eas-cli@23\.2\.0 build --platform android --profile preview/);

for (const asset of ["assets/icon.png", "assets/adaptive-icon.png", "assets/splash.png"]) {
  assert.equal(await exists(asset), true, `${asset} is required`);
}

for (const ignore of [gitignore, easignore]) {
  assert.match(ignore, /\.env/);
  assert.match(ignore, /\*\.jks/);
  assert.match(ignore, /\*\.keystore/);
  assert.match(ignore, /credentials\.json/);
  assert.match(ignore, /google-service-account\*\.json/);
}

console.log("PASS — the preview profile produces an installable internal Android APK.");
console.log("PASS — the production profile remains an Android App Bundle for Google Play.");
console.log("PASS — release artwork and Android application identity are present.");
console.log("PASS — local environment and signing credentials are excluded from build uploads.");
console.log("PASS — preview builds do not require the optional expo-updates package.");

const projectId = expo.extra?.eas?.projectId;
if (projectId) {
  console.log(`PASS — GateCEP is linked to EAS project ${projectId}.`);
} else {
  console.log("NEXT — run npm run eas:login, then npm run eas:init to link GateCEP to your Expo account.");
}

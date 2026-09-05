import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (name) => JSON.parse(await readFile(new URL(name, root), "utf8"));
const exists = async (name) => access(new URL(name, root)).then(() => true, () => false);

const [app, eas, pkg, apiConfig] = await Promise.all([
  readJson("app.json"),
  readJson("eas.json"),
  readJson("package.json"),
  readFile(new URL("src/config/apiConfig.js", root), "utf8")
]);

const expo = app.expo || {};
assert.equal(expo.icon, "./assets/icon.png");
assert.equal(expo.splash?.image, "./assets/splash.png");
assert.equal(expo.splash?.backgroundColor, "#020617");
assert.equal(expo.ios?.bundleIdentifier, "com.gatecep.mobile");
assert.equal(expo.android?.package, "com.gatecep.mobile");
assert.equal(expo.android?.adaptiveIcon?.foregroundImage, "./assets/adaptive-icon.png");
assert.equal(expo.android?.adaptiveIcon?.backgroundColor, "#08A9E6");
assert.match(expo.ios?.buildNumber || "", /^\d+$/);
assert.ok(Number.isInteger(expo.android?.versionCode) && expo.android.versionCode > 0);
assert.equal(expo.ios?.config?.usesNonExemptEncryption, false);
assert.equal(eas.build?.production?.android?.buildType, "app-bundle");
assert.equal(eas.build?.production?.autoIncrement, true);
assert.equal(eas.build?.preview?.android?.buildType, "apk");
assert.match(apiConfig, /https:\/\/gatecep-trader-production\.up\.railway\.app/);
assert.doesNotMatch(apiConfig, /PROD_API_URL\s*=\s*["']http:/);

for (const dependency of ["expo", "expo-router", "expo-audio", "expo-speech", "expo-secure-store"]) {
  assert.ok(pkg.dependencies?.[dependency], `${dependency} must be declared in package.json`);
}

const missingAssets = [];
for (const asset of ["assets/icon.png", "assets/adaptive-icon.png", "assets/splash.png"]) {
  if (!(await exists(asset))) missingAssets.push(asset);
}

console.log("PASS — Android and iOS application identities and build versions are explicit.");
console.log("PASS — EAS preview and store build profiles are separated.");
console.log("PASS — production API traffic uses the verified HTTPS backend.");
console.log("PASS — release dependencies are explicitly declared.");

if (missingAssets.length) {
  console.log(`NEXT — approved production artwork is still required: ${missingAssets.join(", ")}.`);
} else {
  console.log("PASS — production icon, adaptive icon, and splash artwork are present.");
}

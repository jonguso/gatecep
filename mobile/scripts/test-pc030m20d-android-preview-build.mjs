import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [easText, pkgText, preflight, gitignore, easignore] = await Promise.all([
  read("eas.json"),
  read("package.json"),
  read("scripts/check-android-preview-build.mjs"),
  read(".gitignore"),
  read(".easignore")
]);
const eas = JSON.parse(easText);
const pkg = JSON.parse(pkgText);

assert.equal(eas.build.preview.android.buildType, "apk");
assert.equal(eas.build.preview.distribution, "internal");
assert.equal(eas.build.production.android.buildType, "app-bundle");
assert.equal(eas.build.preview.channel, undefined);
assert.equal(eas.build.production.channel, undefined);
assert.match(pkg.scripts["eas:init"], /eas-cli@23\.2\.0 init/);
assert.match(pkg.scripts["build:preview:android"], /--profile preview/);
assert.match(preflight, /extra\?\.eas\?\.projectId/);

for (const ignore of [gitignore, easignore]) {
  assert.match(ignore, /google-service-account\*\.json/);
  assert.match(ignore, /\*\.keystore/);
  assert.match(ignore, /\.env/);
}

console.log("PASS — Android preview builds are installable APKs, not store bundles.");
console.log("PASS — Google Play production builds remain AABs.");
console.log("PASS — EAS commands use a pinned CLI release.");
console.log("PASS — secrets and signing materials cannot enter the build upload by default.");
console.log("PASS — no OTA channel is declared without expo-updates.");

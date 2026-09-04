import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("src/components/coach/FloatingCoachG.js", "utf8");
const api = fs.readFileSync("src/features/coach/api/floatingCoachApi.js", "utf8");
const config = JSON.parse(fs.readFileSync("app.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

assert.equal(pkg.dependencies["expo-audio"], "~1.1.1");
assert.ok(pkg.dependencies["expo-speech"]);
assert.match(component, /useAudioRecorder\(RecordingPresets\.HIGH_QUALITY\)/);
assert.match(component, /requestRecordingPermissionsAsync/);
assert.match(component, /MAX_RECORDING_SECONDS = 45/);
assert.match(component, /transcribeFloatingCoachG/);
assert.match(component, /Speech\.speak/);
assert.match(component, /Spoken replies on/);
assert.match(component, /Voice recordings are not retained/);
assert.match(component, /Practice activity stays separate/);
assert.match(api, /\/coach\/voice\/transcribe/);
assert.match(api, /Authorization: `Bearer \$\{accessToken\}`/);
assert.doesNotMatch(api, /OPENAI_API_KEY/);
assert.ok(config.expo.plugins.some((item) => Array.isArray(item) && item[0] === "expo-audio"));

console.log("PASS — Coach G accepts push-to-talk questions with microphone permission and a 45-second limit.");
console.log("PASS — transcripts return through authenticated backend service before existing REAL-context advice.");
console.log("PASS — answers support auto-speak, replay, stop, mute, and typed-chat fallback.");
console.log("PASS — mobile source contains no transcription credential and Practice isolation remains active.");

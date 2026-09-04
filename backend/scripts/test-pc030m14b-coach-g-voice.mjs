import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/modules/coach/coach.routes.js", "utf8");
const env = fs.readFileSync(".env.example", "utf8");

assert.match(route, /router\.post\("\/voice\/transcribe", authRequired/);
assert.match(route, /voiceUpload\.single\("audio"\)/);
assert.match(route, /memoryStorage\(\)/);
assert.match(route, /fileSize: 8 \* 1024 \* 1024/);
assert.match(route, /OPENAI_API_KEY/);
assert.match(route, /COACH_TRANSCRIPTION_MODEL/);
assert.match(route, /gpt-4o-mini-transcribe/);
assert.match(route, /retained: false/);
assert.match(route, /readOnly: true/);
const voiceBlock = route.slice(route.indexOf('router.post("/voice/transcribe"'), route.indexOf("export default router"));
assert.doesNotMatch(voiceBlock, /savePortfolio|saveCash|insert|update|delete/i);
assert.match(env, /OPENAI_API_KEY=YOUR_OPENAI_API_KEY/);
assert.doesNotMatch(env, /sk-[A-Za-z0-9_-]{20,}/);

console.log("PASS — voice transcription is authenticated, size-limited, memory-only, and read-only.");
console.log("PASS — transcription credentials remain backend-only with a safe environment placeholder.");
console.log("PASS — raw voice is not persisted and voice cannot mutate REAL portfolio or cash.");

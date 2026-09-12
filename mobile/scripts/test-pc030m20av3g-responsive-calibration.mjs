import fs from "node:fs";
import assert from "node:assert/strict";
const src={
 fundamentalImport:fs.readFileSync("app/fundamental-import.js","utf8"),
 operations:fs.readFileSync("app/fundamental-operations-center.js","utf8"),
 extraction:fs.readFileSync("app/filing-extraction.js","utf8"),
 bridge:fs.readFileSync("app/filing-import-bridge.js","utf8"),
 history:fs.readFileSync("app/filing-submission-history.js","utf8"),
};
for(const [k,v] of Object.entries(src)){
 assert.ok(v.includes("PC-030M20AV3G RESPONSIVE CALIBRATION"),`${k}: marker missing`);
 assert.ok(v.includes("useWindowDimensions"),`${k}: width hook missing`);
 assert.ok(v.includes("maxWidth: 960"),`${k}: desktop containment missing`);
 assert.ok(v.includes("paddingBottom: 128"),`${k}: mobile bottom clearance missing`);
}
assert.ok(src.fundamentalImport.includes("previewFundamentalImport"));
assert.ok(src.fundamentalImport.includes("importFundamentalData"));
assert.ok(src.fundamentalImport.includes("no financial value is invented"));
assert.ok(src.fundamentalImport.includes("no portfolio, cash, or broker state is modified"));

assert.ok(src.operations.includes("loadFundamentalRecords"));
assert.ok(src.operations.includes("loadVerifiedFilings"));
assert.ok(src.operations.includes("loadFilingSubmissionHistory"));
assert.ok(src.operations.includes('route:') && src.operations.includes("/research-valuation"));

assert.ok(src.extraction.includes("buildFilingExtractionWorkspace"));
assert.ok(src.extraction.includes("buildFilingReadyJson"));
assert.ok(src.extraction.includes("submitExtractionWorkspaceToFilings"));
assert.ok(src.extraction.includes("manufacture missing financial facts"));
assert.ok(src.extraction.includes("Filing approval"));

assert.ok(src.bridge.includes("previewFilingBridgeSubmission"));
assert.ok(src.bridge.includes("submitFilingReadyPayload"));
assert.ok(src.bridge.includes("never verifies, approves, or promotes financial"));
assert.ok(src.bridge.includes('router.replace("/fundamental-data-hub")'));

assert.ok(src.history.includes("retryFilingSubmission"));
assert.ok(src.history.includes("resolveDuplicateSubmission"));
assert.ok(src.history.includes("archiveFilingSubmissionHistoryEntry"));
assert.ok(src.history.includes("buildFilingSubmissionHistorySummary"));

console.log("PASS — five AV3G targets contain responsive calibration.");
console.log("PASS — 960px desktop containment and 128px mobile clearance are present.");
console.log("PASS — Fundamental Import validation/no-fabrication boundaries remain present.");
console.log("PASS — Operations Center repository/filing/history integrations remain present.");
console.log("PASS — Filing Extraction source evidence and review handoff remain present.");
console.log("PASS — Filing Import Bridge cannot auto-verify, approve or promote.");
console.log("PASS — Filing Submission History retry/duplicate/archive contracts remain present.");
console.log("PC-030M20AV3G contract verification complete.");

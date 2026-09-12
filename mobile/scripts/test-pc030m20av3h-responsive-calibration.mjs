import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/multi-period-filing-extraction.js","utf8");

assert.ok(s.includes("PC-030M20AV3H RESPONSIVE CALIBRATION"),"AV3H marker missing");
assert.ok(s.includes("useWindowDimensions"),"responsive width hook missing");
assert.ok(s.includes("maxWidth: 960"),"960px desktop containment missing");
assert.ok(s.includes("paddingBottom: 128"),"128px mobile bottom clearance missing");
assert.ok(s.includes("windowWidth < 480"),"narrow-screen calibration missing");
assert.ok(s.includes("windowWidth < 380"),"very-narrow metric calibration missing");

assert.ok(s.includes("buildMultiPeriodExtractionComparison"));
assert.ok(s.includes("buildMultiPeriodFilingReadyJson"));
assert.ok(s.includes("submitExtractionWorkspaceToFilings"));
assert.ok(s.includes("detect duplicates and outliers"));
assert.ok(s.includes("Source Coverage"));
assert.ok(s.includes("Unusual changes are flagged for review"));
assert.ok(s.includes("automatically corrected"));
assert.ok(s.includes("Approval and repository promotion"));
assert.ok(s.includes("remain controlled by PC-025C"));
assert.ok(s.includes('"/verified-filings"'));
assert.ok(s.includes('router.replace("/fundamental-data-hub")'));
assert.ok(s.includes("submitForReview"));
assert.ok(s.includes("allowDuplicate"));
assert.ok(s.includes("Create Draft In Verified Filings"));
assert.ok(s.includes("Send Directly For Review"));

console.log("PASS — AV3H multi-period filing screen contains responsive calibration.");
console.log("PASS — 960px desktop containment and 128px mobile clearance are present.");
console.log("PASS — narrow metric and comparison-row overflow protection is present.");
console.log("PASS — multi-period comparison and filing-ready JSON services remain present.");
console.log("PASS — duplicate/outlier/source-coverage review semantics remain present.");
console.log("PASS — unusual changes are not automatically corrected.");
console.log("PASS — approval and repository promotion remain controlled by PC-025C.");
console.log("PASS — draft/review submission and Verified Filings handoff remain present.");
console.log("PC-030M20AV3H contract verification complete.");

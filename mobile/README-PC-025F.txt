PC-025F — Filing Import Bridge and Direct Submission

Files:

1. src/features/fundamentals/filings/filingImportBridgeService.js
2. src/features/fundamentals/extraction/extractionSubmissionHandoff.js
3. app/filing-import-bridge.js
4. app/filing-extraction-PC-025F-patch.js
5. app/multi-period-filing-extraction-PC-025F-patch.js
6. README-PC-025F.txt

Route:

  http://localhost:8081/filing-import-bridge

Main functions:

- validateFilingBridgePayload()
- previewFilingBridgeSubmission()
- submitFilingReadyPayload()
- submitSinglePeriodExtraction()
- submitMultiPeriodExtraction()
- submitExtractionWorkspaceToFilings()

Submission modes:

- CREATE_DRAFT
- CREATE_AND_SUBMIT_FOR_REVIEW

The bridge never verifies, approves, or promotes a filing automatically.
Duplicate submissions require explicit override.

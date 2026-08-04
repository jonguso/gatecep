PC-025G — Filing Workflow Integration

Replace these files:

1. app/filing-extraction.js
2. app/multi-period-filing-extraction.js
3. app/verified-filings.js

PC-025G adds:

- direct submission from PC-025D and PC-025E,
- draft or submit-for-review modes,
- explicit duplicate override,
- submission receipts,
- filing ID and filing status display,
- Open Created Filing navigation,
- route-based selection in PC-025C,
- an extraction-workflow banner on the selected filing.

Required PC-025F files must already exist:

- src/features/fundamentals/filings/filingImportBridgeService.js
- src/features/fundamentals/extraction/extractionSubmissionHandoff.js

Routes:

- /filing-extraction
- /multi-period-filing-extraction
- /verified-filings?filingId=<created filing id>

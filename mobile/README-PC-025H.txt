PC-025H — Filing Workflow Status and Submission History

Files:

1. src/features/fundamentals/filings/filingSubmissionHistoryService.js
2. src/features/fundamentals/filings/filingImportBridgeService.js
3. app/filing-submission-history.js
4. README-PC-025H.txt

Replace the existing PC-025F bridge file with the included version.

Route:

  http://localhost:8081/filing-submission-history

Main functions:

- saveFilingSubmissionHistoryEntry()
- loadFilingSubmissionHistory()
- loadFilingSubmissionHistoryEntry()
- retryFilingSubmission()
- resolveDuplicateSubmission()
- archiveFilingSubmissionHistoryEntry()
- buildFilingSubmissionHistorySummary()

PC-025H records every bridge result, including successful, invalid,
duplicate-blocked, and failed submissions. Stored payload snapshots allow
controlled retries. Duplicate resolutions support override-and-submit,
link-existing, or cancel.

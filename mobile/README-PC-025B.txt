PC-025B — Verified Filing Dataset Manager

Files:

1. src/features/fundamentals/filings/verifiedFilingDatasetManager.js
2. src/features/fundamentals/filings/verifiedFilingReviewService.js
3. README-PC-025B.txt

Main functions:

- normalizeVerifiedFiling()
- loadVerifiedFilings()
- loadVerifiedFiling()
- createVerifiedFiling()
- saveVerifiedFiling()
- detectVerifiedFilingDuplicate()
- submitVerifiedFilingForReview()
- verifyVerifiedFiling()
- approveVerifiedFiling()
- rejectVerifiedFiling()
- createVerifiedFilingRevision()
- promoteApprovedVerifiedFiling()
- loadVerifiedFilingsBySymbol()
- loadPendingVerifiedFilings()
- loadApprovedVerifiedFilings()
- loadDuplicateVerifiedFilings()
- buildVerifiedFilingSummary()
- buildVerifiedFilingReviewQueue()
- batchVerifyVerifiedFilings()
- batchApproveVerifiedFilings()
- batchRejectVerifiedFilings()

Lifecycle:

DRAFT
  -> PENDING_REVIEW
  -> VERIFIED
  -> APPROVED
  -> promoted into PC-024B repository

Rejected, superseded, and archived filings remain preserved for audit history.

Important:

Only APPROVED filings may be promoted into the main fundamental repository.
Exact duplicates are detected by content hash. Same-symbol, same-year,
same-type filings are marked as possible duplicates or revisions.

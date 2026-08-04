PC-025E — Multi-Period Filing Extraction and Comparison

Files:

1. src/features/fundamentals/extraction/multiPeriodFilingExtractionService.js
2. app/multi-period-filing-extraction.js
3. README-PC-025E.txt

Route:

  http://localhost:8081/multi-period-filing-extraction

Main functions:

- buildMultiPeriodExtractionComparison()
- buildMultiPeriodFilingReadyJson()

Features:

- Multiple fiscal years in one workspace
- Duplicate fiscal-period detection
- Fiscal-year sequence checks
- Revenue, earnings, cash-flow, balance-sheet, EPS, dividend, and share-count trends
- Growth outlier warnings
- Share-count change warnings
- Dividend payout checks
- Margin change checks
- Source-reference coverage by fiscal year
- One combined filing-ready JSON record for PC-025C

No financial value is invented or automatically corrected.

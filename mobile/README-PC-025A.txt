PC-025A — NSE Fundamental Dataset Generator

Files:

1. src/features/fundamentals/dataset/nseFundamentalDatasetGenerator.js
2. src/features/fundamentals/dataset/nseDatasetRepositoryAssembler.js
3. src/features/fundamentals/dataset/verifiedNseFilingTemplate.js
4. README-PC-025A.txt

Main functions:

- buildNseFundamentalDataset()
- buildNormalizedFundamentalJson()
- buildNseFundamentalAnnualRows()
- buildNseFundamentalCsv()
- exportNseFundamentalDataset()
- buildNseFundamentalDatasetSummary()
- buildNseDatasetFromRepository()
- exportNseDatasetFromRepository()

Important:

PC-025A is a generator and export layer. It does not invent or scrape
financial facts. Feed it verified annual reports, filings, imports, or
licensed provider data.

Example:

  const dataset = buildNseFundamentalDataset({
    companies: verifiedCompanies
  });

  const csv = buildNseFundamentalCsv(dataset);

Repository export:

  const result = await exportNseDatasetFromRepository({
    format: "CSV"
  });

Supported export formats:

- RESEARCH_JSON
- NORMALIZED_JSON
- ANNUAL_ROWS
- CSV

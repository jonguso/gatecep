PC-024C — Fundamental Data Import and Provider Adapter Service

Files:

1. src/features/fundamentals/fundamentalImportService.js
2. src/features/fundamentals/providers/genericFundamentalProviderAdapter.js
3. src/features/fundamentals/providers/registerBuiltInFundamentalAdapters.js
4. README-PC-024C.txt

Main functions:

- parseFundamentalCsv()
- buildCompaniesFromFundamentalRows()
- previewFundamentalImport()
- importFundamentalData()
- registerFundamentalImportAdapter()
- unregisterFundamentalImportAdapter()
- listFundamentalImportAdapters()
- buildFundamentalCsvTemplate()
- buildFundamentalJsonTemplate()

Recommended startup registration:

  import {
    registerBuiltInFundamentalAdapters
  } from "./src/features/fundamentals/providers/registerBuiltInFundamentalAdapters";

  registerBuiltInFundamentalAdapters();

CSV preview example:

  const preview = previewFundamentalImport({
    format: "CSV",
    payload: csvText
  });

CSV import example:

  const result = await importFundamentalData({
    format: "CSV",
    payload: csvText,
    importMode: "MERGE"
  });

Provider JSON example:

  const result = await importFundamentalData({
    format: "PROVIDER_JSON",
    providerId: "GENERIC_PROVIDER",
    payload,
    importMode: "MERGE"
  });

Important:

Blank cells remain null. They are never converted to zero.
Only records that pass validation are saved.
Use PREVIEW mode before committing large imports.

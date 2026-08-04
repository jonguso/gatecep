PC-024A — Fundamental Data Engine

Save:
  fundamentalDataEngine.js

To:
  src/features/fundamentals/fundamentalDataEngine.js

The engine does not invent or fetch company fundamentals. It normalizes,
validates, derives, caches, and converts supplied data into research-ready
records for PC-023B.

Recommended integration:
  1. Load fundamentals from your provider/import.
  2. Call saveCompanyFundamentals() or buildResearchReadyFundamentals().
  3. Merge the returned record into each holding before calling
     buildResearchMarketIntelligence().

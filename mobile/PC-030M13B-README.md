# PC-030M13B — Security Education + Company Logos

V2 installation marker: the Markets header displays **Tap a company to explore its price, market depth and verified fundamentals.**

- Market rows render the issuer logo supplied as `logoUrl`, `logoUri`, or `companyLogoUrl`.
- Missing or failed logos fall back to a clean ticker badge; GateCEP never guesses an issuer logo.
- The existing read-only depth sheet remains the quick market view and links to `/security/[symbol]`.
- Security Details now teaches company profile, valuation, income, financial strength, evidence, and an investor review checklist.
- Fundamental values come from GateCEP's persistent verified-fundamentals repository.
- Missing P/E, dividend, revenue, profit, balance-sheet, or source data displays `N/A` or an explicit unavailable state.
- The prior hard-coded dividend-yield table was removed.

Logo ingestion contract: include an approved HTTPS issuer logo URL in the NSE security master or verified company profile under `logoUrl`. A later asset pack can replace remote URLs with bundled images without changing the screen contract.

# PC-030M13C — Canonical Security → Trade Price Contract

- Removes the legacy six-security `STOCKS` array and its hard-coded prices from `app/trade.js`.
- Trade consumes the same verified market service as Markets and Security Details.
- `/trade?symbol=ABSA` selects ABSA after verified prices load instead of defaulting to SCOM.
- The security picker contains the complete verified NSE universe.
- Basket prices remain preserved as order evidence, but are not presented as the current market quote.
- When verified prices are unavailable, the screen shows an unavailable state instead of fallback prices.

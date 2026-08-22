# PC-030M10A — Automatic NSE Market Prices

This patch automatically revalues the canonical REAL portfolio with genuine NSE quotes.

## Authority boundary

- Broker evidence remains authoritative for investor identity, broker account, security, quantity, average cost, and cash.
- The market endpoint is authoritative only for the latest current price.
- Price refreshes are runtime valuation overlays. They do not create trades, change quantities, alter cash, or overwrite broker evidence.
- A missing quote retains the most recent broker valuation and is explicitly marked as broker valuation.
- Synthetic, demo, mock, generated, or fallback sources are rejected for REAL portfolio valuation.

## Refresh behavior

- Prices load when the Home portfolio gains focus.
- During the weekday NSE session (09:00–15:30 Africa/Nairobi), Home refreshes every 60 seconds.
- A verified quote snapshot may be used for up to 24 hours if the feed becomes temporarily unavailable.
- The UI shows quote coverage and whether prices are current or retained from verified evidence.

The backend `/prices` endpoint must expose genuine NSE/vendor quotes. A provider labeled demo, mock, generated, simulated, or fallback will deliberately fail closed.

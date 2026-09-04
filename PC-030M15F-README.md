# PC-030M15F — Issuer-Scoped NSE Calendar Events

This correction binds each official NSE corporate action to the issuer heading that directly contains the announcement. It replaces the earlier character-window matching that could pull symbols from neighboring companies.

## Corrected behavior

- Every `### Issuer Name` section is parsed independently.
- Each book-closure and payment date inherits only that section's issuer.
- Similar names are ranked by full issuer identity, preventing Standard Chartered Bank Kenya from also matching Standard Group.
- Semicolon formats such as `Payment Date; 8-Sep-2026` and `Books Closure; 18-Sep-2026` are recognized.
- A fresh collection removes old combined-symbol rows when the corrected issuer-specific event is stored.
- The supplied eight NSE announcements produce 16 events: one book closure and one payment date per issuer.

## Install and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15f-issuer-scoped-calendar-events.zip

cd backend
bash scripts/verify-pc030m15a-verified-apify-news.sh
bash scripts/verify-pc030m15b-verified-calendar.sh
```

Run a fresh verified-news collection and restart the backend afterward.

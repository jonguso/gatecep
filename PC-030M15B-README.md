# PC-030M15B v3 — Contextual NSE Calendar Matching

This package connects Calendar to the verified Apify news pipeline introduced in PC-030M15A and merges those events with GateCEP's existing verified corporate-action records.

Version 3 preserves `NSE` as the valid ticker for Nairobi Securities Exchange Plc while preventing the exchange website or source name from being mistaken for the issuer of every corporate action. It also recognizes labels such as `Payment 08-Oct-2026`, cleans crawler phrases such as `2 hours ago` and `Read more`, and replaces stale source-level `NSE` matches during the next collection.

## Calendar evidence contract

- Only explicitly labelled dates are extracted: ex-dividend, record, book-closure, payment, AGM, results, effective and election-deadline dates.
- Article publication timestamps remain News evidence and never become Calendar deadlines.
- Invalid or ambiguous dates are rejected.
- NSE evidence is labelled **Official**; publisher evidence is labelled **Reported**; broker/manual/provider corporate actions remain **Verified**.
- Every imported event preserves its original evidence link and matched NSE symbols.
- `NSE` is attached only when nearby event text explicitly identifies Nairobi Securities Exchange Plc or NSE Plc as the issuer.
- Book-closure and dividend-payment dates are stored as separate calendar events.
- Full scraped article text is never stored in the calendar table.
- Calendar writes are isolated from prices, holdings, broker cash and performance snapshots.

## Install and verify

Extract from the GateCEP repository root:

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15b-verified-market-calendar-context-fix-v3.zip

cd backend
npm run migrate
bash scripts/verify-pc030m15b-verified-calendar.sh

cd ../mobile
bash scripts/verify-pc030m15b-verified-calendar.sh
```

Restart the backend so the existing verified-news scheduler can extract dated events during its next collection. Existing news records collected before this package do not contain the transient page evidence required for date extraction; run a fresh news collection or restart with `NEWS_COLLECTION_ENABLED=true`.

Then restart Expo:

```bash
cd ~/gatecep/mobile
npx expo start --clear --lan
```

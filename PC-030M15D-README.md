# PC-030M15D — NSE Corporate Actions Actor Compatibility

This correction accepts the current titleless response shape returned by `apify/rag-web-browser` for the official NSE corporate-actions page without weakening GateCEP's source allowlist.

## Controls

- The fallback applies only when the canonical URL is the exact allowlisted NSE corporate-actions path and extracted page evidence is present.
- A Markdown heading is preferred when the actor supplies one; otherwise the verified fallback title is `NSE Corporate Actions`.
- Unapproved domains remain rejected even if they imitate the same path or content.
- `NSE` remains a valid listed security and is attached only when nearby text explicitly identifies Nairobi Securities Exchange Plc as the issuer.
- A successful fresh collection replaces stale `NSE, BOC` event rows with BOC-only records.

## Install and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15d-nse-corporate-actions-actor-fix.zip

cd backend
bash scripts/verify-pc030m15b-verified-calendar.sh
bash scripts/verify-pc030m15a-verified-apify-news.sh
```

Then run a fresh verified-news collection and refresh Calendar.

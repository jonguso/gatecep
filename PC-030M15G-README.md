# PC-030M15G — Calendar Evidence Structure Preservation

This update fixes the integration boundary between the Apify normalizer and the issuer-scoped calendar extractor. Calendar evidence now preserves Markdown headings and line boundaries long enough for each event to remain attached to its own issuer section.

## Corrected behavior

- Transient calendar evidence preserves `### Issuer Name` headings and newlines.
- HTML scripts and styles are removed, links are reduced to their labels, and evidence remains capped at 20,000 characters.
- The end-to-end actor-row → normalizer → extractor test produces 16 single-issuer events.
- `Standard Chartered Bank Kenya` resolves to `SCBK` without also matching `SGL`.
- A fresh collection replaces the existing combined-symbol rows automatically.
- Full scraped page text remains transient and is not stored in the news or calendar tables.

## Install and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15g-calendar-evidence-structure-fix.zip

cd backend
bash scripts/verify-pc030m15a-verified-apify-news.sh
bash scripts/verify-pc030m15b-verified-calendar.sh
```

Run one fresh collection and restart the backend afterward.

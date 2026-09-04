# PC-030M15A — Verified Apify News Pipeline

GateCEP now collects attributable Kenyan market news through `apify/rag-web-browser`, stores normalized evidence in PostgreSQL, and presents it through the existing News & Insights categories.

## Evidence policy

- Nairobi Securities Exchange records are labelled **Official**.
- Business Daily Africa and The Standard Business are labelled **Reported**.
- Coach G observations remain labelled **Analysis**.
- GateCEP stores a short source description, title, dates when supplied, matched NSE symbols and the canonical publisher link.
- Full scraped article bodies are not stored or republished.
- Missing publication dates remain unavailable.
- News ingestion has no imports or writes to market prices, holdings, broker cash or portfolio snapshots.

## Installation

Extract from the GateCEP repository root:

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m15a-verified-apify-news.zip

cd backend
npm run migrate
bash scripts/verify-pc030m15a-verified-apify-news.sh

cd ../mobile
bash scripts/verify-pc030m15a-verified-apify-news.sh
```

## Configuration

Add these backend-only values to `backend/.env` and Railway Variables:

```env
NEWS_COLLECTION_ENABLED=true
APIFY_NEWS_ACTOR_ID=apify/rag-web-browser
NEWS_COLLECTION_INTERVAL_MS=21600000
NEWS_LOOKBACK_DAYS=7
APIFY_NEWS_MAX_RESULTS=8
APIFY_NEWS_TIMEOUT_SECONDS=90
APIFY_NEWS_MAX_TOTAL_CHARGE_USD=0.10
```

The pipeline reuses the existing backend-only `APIFY_API_TOKEN`. Six hours is the default collection interval to constrain actor consumption. Restart the backend after migrating and configuring the variables.

For an immediate administrative collection, call `POST /verified-news/collect` with the signed-in bearer token and the existing `x-market-import-key` header. Opening the mobile News page only reads stored PostgreSQL evidence and never triggers Apify.

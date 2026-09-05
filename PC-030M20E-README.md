# PC-030M20E — Mobile Broker PDF Evidence

GateCEP now accepts text-based broker PDF valuation, cash-statement, and order-history reports from Android, iOS, and web document pickers. PDF extraction runs through the authenticated backend and returns structured rows plus broker, client, and CDS identity evidence.

The CDS inside the broker document is authoritative. A CDS embedded in the filename remains supporting evidence and duplicate mobile download suffixes continue to work. Scanned/image-only PDFs are rejected instead of being treated as verified evidence.

## Install and verify

```bash
cd backend
npm install
bash scripts/verify-pc030m20e-broker-pdf.sh

cd ../mobile
npm install
bash scripts/verify-pc030m20e-mobile-broker-pdf.sh
npm run build:preview:android
```

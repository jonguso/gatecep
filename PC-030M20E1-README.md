# PC-030M20E1 — PDF Statement Effective Date

Android Hermes does not consistently parse broker dates such as `03-Sep-2026`. GateCEP now normalizes named-month dates explicitly and, when the statement has no separate effective-date heading, uses the highest valid date in the statement's Date column. Upload time is never substituted.

```bash
cd mobile
bash scripts/verify-pc030m20e1-pdf-statement-date.sh
npm run build:preview:android
```
